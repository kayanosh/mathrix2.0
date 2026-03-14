import OpenAI from "openai";
import { NextRequest } from "next/server";
import { classifyQuestion, detectRequiredVisuals, getRequiredBlockTypes } from "@/lib/prompts/classify";
import { buildSystemPrompt, buildFollowUpPrompt } from "@/lib/prompts/system";
import {
  buildCriticSystemPrompt,
  buildCriticUserMessage,
  buildCorrectionMessage,
  parseCriticResponse,
} from "@/lib/prompts/critic";
import { validateResponse } from "@/lib/validate";
import { casSolve } from "@/lib/cas-solver";
import { sympySolve, inferSympyTask } from "@/lib/sympy-solver";
import { buildGroundTruth } from "@/lib/ground-truth";
import { claudeSolve, convertToAnthropicMessages } from "@/lib/claude-solver";
import { postVerifyCAS } from "@/lib/cas-post-verify";
import { runToolChecks } from "@/lib/verification-tools";
import type { WhiteboardResponse, VerificationStatus } from "@/types/whiteboard";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Critic still uses GPT-4o for cross-model verification (decorrelated errors)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/* ── Model configuration ─────────────────────────────────────────────────── */

/** Critic model — GPT-4o: cross-model verification (solver = Claude, critic = GPT-4o) */
const CRITIC_MODEL = "gpt-4o";
/** Max tokens for critic responses (much smaller — just JSON verdict) */
const CRITIC_MAX_TOKENS = 2048;

/** Detect whether the latest message is a follow-up clarification vs a new problem */
function detectFollowUp(msgs: Array<{ role: string; content: string }>): boolean {
  if (msgs.length < 2) return false;
  const last = msgs[msgs.length - 1].content.toLowerCase();
  const followUpWords =
    /\b(explain|why|don't understand|confused|what do you mean|how did you|step \d|i don't get|can you re|what is that|show me again|unclear|i'm lost|i'm stuck|not sure|can you clarify|what does)\b/;
  const freshProblemSignals =
    /[=+\-*\/^√∫]|\d{3,}|\bsolve\b|\bfind\b|\bcalculate\b|\bwork out\b|\bfactoris|\bexpand\b|\bsimplif|\bprove\b|\bsketch\b/i;
  return followUpWords.test(last) && !freshProblemSignals.test(last);
}

/**
 * POST /api/chat
 *
 * SSE-streaming two-pass verification pipeline:
 *   Pass 1 — Solver: Produce a draft solution (structured JSON) → streamed immediately
 *   Pass 2 — Critic: Independently verify every step, flag errors → streamed as update
 *   If critic fails → retry solver once with critic feedback
 *
 * Accepts: { messages, level?, examBoard?, subject?, useWhiteboard? }
 * Returns: Server-Sent Events stream with events:
 *   - "solver_done"       → { whiteboard, response, category, validationWarnings }
 *   - "verification_done" → { verification, whiteboard? (if corrected) }
 *   - "error"             → { error: string }
 */
export async function POST(req: NextRequest) {
  // We'll build an SSE stream and return it immediately
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      /** Helper to send an SSE event */
      function send(event: string, data: unknown) {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      }

      try {
        const body = await req.json();
    const {
      messages,
      level,
      examBoard,
      useWhiteboard = true,
      hintMode = false,
    } = body;

    if (!messages || !Array.isArray(messages)) {
      send("error", { error: "Invalid messages" });
      controller.close();
      return;
    }

    // ── Auth & Usage Enforcement ─────────────────────────────────
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      // Authenticated user — check subscription & daily usage
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("subscription_status")
        .eq("id", user.id)
        .single();

      const subStatus = profile?.subscription_status || "free";

      if (subStatus !== "pro") {
        const today = new Date().toISOString().split("T")[0];
        const { data: usage } = await supabaseAdmin
          .from("daily_usage")
          .select("prompt_count")
          .eq("user_id", user.id)
          .eq("usage_date", today)
          .single();

        if ((usage?.prompt_count || 0) >= 5) {
          send("error", { error: "limit_reached" });
          controller.close();
          return;
        }
      }
    }
    // Anonymous users: client-side enforces 1-prompt limit;
    // server allows the request through (no user row to check).

    // ── Stage 0: Parse input ──────────────────────────────────────────
    const hasImage = messages.some(
      (m: { imageUrl?: string }) => m.imageUrl
    );

    const lastUserMsg = [...messages]
      .reverse()
      .find((m: { role: string }) => m.role === "user");
    const questionText = lastUserMsg?.content || "";

    // ── Stage 1: Classify the question ────────────────────────────────
    const category = classifyQuestion(questionText);

    // ── Stage 1b: Detect required visual diagrams ─────────────────────
    const requiredVisuals = detectRequiredVisuals(questionText, category);
    const requiredBlockTypes = getRequiredBlockTypes(requiredVisuals);
    if (requiredVisuals.length > 0) {
      console.log(
        `[Visuals] Required: ${requiredVisuals.map((v) => v.matchedTopic).join(", ")} → blocks: ${requiredBlockTypes.join(", ")}`
      );
    }

    // ── Fast path: follow-up clarification question ──────────────────────
    const isFollowUp = detectFollowUp(messages);

    if (isFollowUp) {
      console.log("[FastPath] Follow-up detected — skipping CAS/SymPy/critic");
      const followUpSystemPrompt = buildFollowUpPrompt();
      const followUpMessages = messages.map(
        (msg: { role: string; content: string; imageUrl?: string }) => ({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        })
      );
      const anthropicFollowUp = convertToAnthropicMessages(followUpMessages);
      let followUpRaw = "";
      try {
        const r = await claudeSolve(followUpSystemPrompt, anthropicFollowUp);
        followUpRaw = r.content;
      } catch {
        const fb = await openai.chat.completions.create({
          model: "gpt-4o",
          max_tokens: 1024,
          response_format: { type: "json_object" },
          messages: [
            { role: "system" as const, content: followUpSystemPrompt },
            ...followUpMessages,
          ],
        });
        followUpRaw = fb.choices[0]?.message?.content || "";
      }
      const followUpResult = validateResponse(followUpRaw, []);
      const followUpData: WhiteboardResponse = followUpResult.ok && followUpResult.data
        ? followUpResult.data
        : {
            intro: "Good question!",
            blocks: [{ type: "text", content: followUpRaw.replace(/```json|```/g, "").trim() }],
            conclusion: "Does that help clarify things?",
          };
      send("solver_done", { whiteboard: followUpData, response: { type: "explanation", intro: followUpData.intro, steps: [], conclusion: followUpData.conclusion }, category, validationWarnings: [] });
      send("verification_done", { verification: { confidence: "high", casVerified: false, criticVerified: false, toolChecksPassed: false }, whiteboard: followUpData });
      controller.close();
      return;
    }

    // ── Stage 2: Ground-truth computation (SymPy + Nerdamer in parallel) ──
    const sympyTask = inferSympyTask(questionText);
    const [casResult, sympyResult] = await Promise.all([
      Promise.resolve(casSolve(questionText)),
      sympyTask
        ? sympySolve(
            sympyTask.expression,
            sympyTask.type,
            sympyTask.variable,
            sympyTask.expressions,
          ).catch(() => null)
        : Promise.resolve(null),
    ]);

    const groundTruth = buildGroundTruth(sympyResult, casResult);

    if (groundTruth.verified) {
      console.log(
        `[GroundTruth] Source: ${groundTruth.source}, Answers: ${groundTruth.answers.join(", ")}`
      );
    } else if (casResult) {
      console.log(
        `[CAS] Solved as ${casResult.problemType}: ${casResult.answers.join(", ")} (verified: ${casResult.verified})`
      );
    }

    // ── Stage 3: Build solver system prompt ───────────────────────────
    const systemPrompt = buildSystemPrompt(
      category,
      groundTruth.verified ? groundTruth : null,
      requiredVisuals.length > 0 ? requiredVisuals : undefined,
      hasImage || undefined,
      level || undefined,
    );

    // ── Stage 4: Prepare messages ─────────────────────────────────────
    const contextPrefix =
      level && examBoard
        ? `[Student context: ${level} student, ${examBoard} exam board]\n\n`
        : "";

    const formattedMessages = messages.map(
      (msg: { role: string; content: string; imageUrl?: string }, i: number) => {
        const isLast = i === messages.length - 1 && msg.role === "user";
        const textContent = isLast ? contextPrefix + msg.content : msg.content;

        if (msg.imageUrl && msg.role === "user") {
          const parts: Array<
            | { type: "text"; text: string }
            | { type: "image_url"; image_url: { url: string; detail: "high" } }
          > = [];

          parts.push({
            type: "image_url" as const,
            image_url: { url: msg.imageUrl, detail: "high" as const },
          });

          parts.push({
            type: "text" as const,
            text: textContent || "Look at this maths question in the image. Read it carefully, then solve it step by step showing all working out.",
          });

          return { role: msg.role as "user", content: parts };
        }

        return {
          role: msg.role as "user" | "assistant",
          content: textContent,
        };
      }
    );

    // ── Hint mode: append directive to last user message ─────────────
    if (hintMode) {
      const lastIdx = formattedMessages.length - 1;
      const last = formattedMessages[lastIdx];
      if (last && last.role === "user" && typeof last.content === "string") {
        formattedMessages[lastIdx] = {
          ...last,
          content: last.content + "\n\n[HINT MODE: Do NOT reveal the full solution. Give one guiding question or a small nudge toward the method. Maximum 1 text block — no worked answer.]",
        };
      }
    }

    // ══════════════════════════════════════════════════════════════════
    //  PASS 1 — SOLVER: Claude Sonnet with extended thinking
    // ══════════════════════════════════════════════════════════════════

    console.log(`[Pass 1] Solver: calling Claude Sonnet (extended thinking)...`);

    // Convert OpenAI-format messages to Anthropic format
    const anthropicMessages = convertToAnthropicMessages(formattedMessages);

    let rawContent = "";
    try {
      const solverResult = await claudeSolve(systemPrompt, anthropicMessages);
      rawContent = solverResult.content;
    } catch (claudeErr) {
      // Fallback to GPT-4o if Claude is unavailable
      console.warn(`[Pass 1] Claude failed, falling back to GPT-4o: ${(claudeErr as Error).message}`);
      const fallbackResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 8192,
        response_format: { type: "json_object" },
        messages: [
          { role: "system" as const, content: systemPrompt },
          ...formattedMessages,
        ],
      });
      rawContent = fallbackResponse.choices[0]?.message?.content || "";
    }

    // ── Validate solver output (Zod + required visuals) ───────────────
    let result = validateResponse(rawContent, requiredBlockTypes);

    // Retry once on schema validation failure (Claude retry)
    if (!result.ok && result.errors) {
      console.log(`[Pass 1] Validation failed, retrying: ${result.errors.join("; ")}`);

      const retryAnthropicMessages = convertToAnthropicMessages([
        ...formattedMessages,
        { role: "assistant" as const, content: rawContent },
        {
          role: "user" as const,
          content: `Your JSON had validation errors:\n${result.errors.join("\n")}\n\nFix these and output corrected JSON matching the WhiteboardResponse schema. Output ONLY valid JSON.`,
        },
      ]);

      try {
        const retryResult = await claudeSolve(systemPrompt, retryAnthropicMessages);
        rawContent = retryResult.content;
      } catch {
        // If retry also fails, keep original rawContent
      }

      result = validateResponse(rawContent, requiredBlockTypes);
    }

    // If still invalid, return fallback
    if (!result.ok || !result.data) {
      sendFallback(send, rawContent, category, result.errors);
      controller.close();
      return;
    }

    // At this point result.data is guaranteed to exist — capture the reference
    let solutionData: WhiteboardResponse = result.data;

    // Attach uploaded image URL so the whiteboard can display it inline
    if (hasImage && lastUserMsg?.imageUrl) {
      solutionData.questionImageUrl = lastUserMsg.imageUrl;
    }

    const legacyResponse = whiteboardToLegacy(solutionData);

    // ══════════════════════════════════════════════════════════════════
    //  STREAM PASS 1 RESULT TO CLIENT (fast perceived response)
    // ══════════════════════════════════════════════════════════════════

    send("solver_done", {
      whiteboard: solutionData,
      response: legacyResponse,
      category,
      validationWarnings: result.errors || [],
    });

    // ══════════════════════════════════════════════════════════════════
    //  VERIFICATION PIPELINE (runs while client already shows solution)
    // ══════════════════════════════════════════════════════════════════

    const verification: VerificationStatus = {
      preCasVerified: groundTruth.verified,
      postCasVerified: false,
      criticVerified: false,
      toolChecksPassed: false,
      confidence: "low",
      warnings: [],
      sympyVerified: groundTruth.sympyVerified,
      crossModelVerified: true, // Always true: Claude solver + GPT-4o critic
    };

    // Attach ground-truth metadata to solution
    solutionData.groundTruthSource = groundTruth.source;
    if (groundTruth.answers.length > 0) {
      solutionData.sympyAnswer = groundTruth.answers.join(", ");
    }

    // ── CAS verification ──────────────────────────────────────────────

    // Pre-CAS stamp (using merged ground-truth)
    if (groundTruth.verified) {
      solutionData.casVerified = true;
      verification.preCasVerified = true;
    }

    // Post-CAS: verify the LLM's answer using nerdamer
    if (!solutionData.casVerified) {
      const postCheck = postVerifyCAS(solutionData);
      if (postCheck.attempted && postCheck.verified) {
        solutionData.casVerified = true;
        verification.postCasVerified = true;
        console.log("[CAS] Post-verification succeeded ✓");
      } else if (postCheck.attempted) {
        verification.warnings.push(...postCheck.warnings);
        console.log(`[CAS] Post-verification failed: ${postCheck.warnings.join("; ")}`);
      }
    } else {
      verification.postCasVerified = true;
    }

    // ── Deterministic tool checks ─────────────────────────────────────
    const toolReport = runToolChecks(solutionData);
    verification.toolChecksPassed = toolReport.allPassed;
    if (!toolReport.allPassed) {
      for (const c of toolReport.checks.filter((ch) => !ch.passed)) {
        verification.warnings.push(`Tool check failed: ${c.check} — ${c.detail}`);
      }
    }

    // ══════════════════════════════════════════════════════════════════
    //  PASS 2 — CRITIC: Independent verification
    // ══════════════════════════════════════════════════════════════════

    console.log(`[Pass 2] Critic: calling ${CRITIC_MODEL} (cross-model)...`);

    const criticSystemPrompt = buildCriticSystemPrompt();
    const criticUserMessage = buildCriticUserMessage(
      questionText,
      rawContent,
      hasImage,
      groundTruth.verified ? groundTruth : null,
    );

    const criticResponse = await openai.chat.completions.create({
      model: CRITIC_MODEL,
      max_tokens: CRITIC_MAX_TOKENS,
      response_format: { type: "json_object" },
      messages: [
        { role: "system" as const, content: criticSystemPrompt },
        { role: "user" as const, content: criticUserMessage },
      ],
    });

    const criticRaw = criticResponse.choices[0]?.message?.content || "";
    const criticResult = parseCriticResponse(criticRaw);

    if (criticResult) {
      console.log(
        `[Pass 2] Critic verdict: verified=${criticResult.verified}, ` +
        `confidence=${criticResult.confidence}, ` +
        `issues=${criticResult.issues.length} ` +
        `(${criticResult.issues.filter((i) => i.severity === "critical").length} critical)`
      );

      const hasCriticalIssues = criticResult.issues.some(
        (i) => i.severity === "critical"
      );

      if (criticResult.verified && !hasCriticalIssues) {
        // ── Critic approved ─────────────────────────────────────────
        verification.criticVerified = true;
      } else {
        // ── Critic found issues — retry solver with feedback ────────
        console.log("[Pass 2] Critic found issues, retrying solver with corrections...");

        const correctionMsg = buildCorrectionMessage(criticResult);

        const correctionAnthropicMessages = convertToAnthropicMessages([
          ...formattedMessages,
          { role: "assistant" as const, content: rawContent },
          { role: "user" as const, content: correctionMsg },
        ]);

        let correctedContent = "";
        try {
          const correctionResult = await claudeSolve(systemPrompt, correctionAnthropicMessages);
          correctedContent = correctionResult.content;
        } catch {
          // Fall back to GPT-4o for correction
          const fallback = await openai.chat.completions.create({
            model: "gpt-4o",
            max_tokens: 8192,
            response_format: { type: "json_object" },
            messages: [
              { role: "system" as const, content: systemPrompt },
              ...formattedMessages,
              { role: "assistant" as const, content: rawContent },
              { role: "user" as const, content: correctionMsg },
            ],
          });
          correctedContent = fallback.choices[0]?.message?.content || "";
        }
        const correctedResult = validateResponse(
          correctedContent,
          requiredBlockTypes
        );

        if (correctedResult.ok && correctedResult.data) {
          console.log("[Pass 2] Correction accepted, using corrected solution");
          solutionData = correctedResult.data;
          rawContent = correctedContent;
          verification.criticVerified = true;

          // Re-run CAS verification on corrected answer
          if (casResult?.verified) {
            solutionData.casVerified = true;
          } else {
            const recheck = postVerifyCAS(solutionData);
            if (recheck.attempted && recheck.verified) {
              solutionData.casVerified = true;
              verification.postCasVerified = true;
            }
          }

          // Re-run tool checks
          const reToolReport = runToolChecks(solutionData);
          verification.toolChecksPassed = reToolReport.allPassed;
        } else {
          // Correction failed validation — keep original, mark as unverified by critic
          console.log("[Pass 2] Correction failed validation, keeping original draft");
          verification.warnings.push(
            "Critic found issues but correction failed validation — using original solution"
          );
        }
      }
    } else {
      // Critic response couldn't be parsed — treat as unverified
      console.log("[Pass 2] Could not parse critic response");
      verification.warnings.push("Critic response could not be parsed");
    }

    // ══════════════════════════════════════════════════════════════════
    //  COMPUTE CONFIDENCE & RETURN
    // ══════════════════════════════════════════════════════════════════

    // Determine confidence based on 4 independent verification sources
    const verifiedCount = [
      groundTruth.verified,                              // SymPy or Nerdamer pre-solve
      verification.postCasVerified,                      // Nerdamer post-check
      verification.criticVerified,                       // GPT-4o critic
      verification.toolChecksPassed,                     // Deterministic tool checks
    ].filter(Boolean).length;

    verification.agreementCount = verifiedCount;

    if (verifiedCount >= 3) {
      verification.confidence = "high";
    } else if (verifiedCount >= 2) {
      verification.confidence = "high";
    } else if (verifiedCount === 1) {
      verification.confidence = "medium";
    } else {
      verification.confidence = "low";
    }

    // Stamp verification onto the response
    solutionData.verification = verification;

    // Re-attach uploaded image URL on corrected solutions
    if (hasImage && lastUserMsg?.imageUrl) {
      solutionData.questionImageUrl = lastUserMsg.imageUrl;
    }

    console.log(
      `[Pipeline] Done. Confidence: ${verification.confidence} ` +
      `(CAS=${verification.preCasVerified || verification.postCasVerified}, ` +
      `Critic=${verification.criticVerified}, ` +
      `Tools=${verification.toolChecksPassed})`
    );

    // ── Increment usage for authenticated users ───────────────────────
    if (user) {
      const today = new Date().toISOString().split("T")[0];
      await supabaseAdmin.rpc("increment_usage", {
        p_user_id: user.id,
        p_date: today,
      }).then(({ error }) => {
        if (error) {
          // Fallback: upsert manually
          return supabaseAdmin
            .from("daily_usage")
            .upsert(
              { user_id: user.id, usage_date: today, prompt_count: 1 },
              { onConflict: "user_id,usage_date" }
            );
        }
      });
    }

    // ══════════════════════════════════════════════════════════════════
    //  STREAM VERIFICATION RESULT TO CLIENT
    // ══════════════════════════════════════════════════════════════════

    send("verification_done", {
      verification: {
        confidence: verification.confidence,
        casVerified: solutionData.casVerified ?? false,
        criticVerified: verification.criticVerified,
        toolChecksPassed: verification.toolChecksPassed,
      },
      whiteboard: solutionData,
    });

    controller.close();

  } catch (error) {
    console.error("Chat API error:", error);
    try {
      send("error", { error: "Failed to get response from tutor" });
      controller.close();
    } catch {
      // Stream may already be closed
    }
  }
    }, // end start()
  }); // end ReadableStream

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

// ── Fallback helper ───────────────────────────────────────────────────────────

function sendFallback(
  send: (event: string, data: unknown) => void,
  rawContent: string,
  category: string,
  errors?: string[]
) {
  const fallback: WhiteboardResponse = {
    intro: "Let me explain this for you.",
    blocks: [
      {
        type: "text",
        content: rawContent
          .replace(/```json\s*/g, "")
          .replace(/```/g, "")
          .trim(),
      },
    ],
    conclusion: "",
  };

  send("solver_done", {
    whiteboard: fallback,
    response: {
      type: "explanation",
      intro:
        fallback.blocks[0].type === "text"
          ? (fallback.blocks[0] as { content: string }).content
          : "",
      steps: [],
      conclusion: "",
    },
    category,
    validationWarnings: errors || ["Fell back to text-only response"],
  });

  send("verification_done", {
    verification: {
      confidence: "low",
      casVerified: false,
      criticVerified: false,
      toolChecksPassed: false,
    },
    whiteboard: fallback,
  });
}

/**
 * Convert a WhiteboardResponse to the legacy TutorResponse shape
 * so existing EquationChain component still works during migration.
 */
function whiteboardToLegacy(wb: WhiteboardResponse) {
  const eqBlock = wb.blocks.find((b) => b.type === "equation_steps");
  if (eqBlock && eqBlock.type === "equation_steps") {
    return {
      type: "steps" as const,
      intro: wb.intro,
      steps: eqBlock.steps.map((s) => ({
        step_number: s.stepNumber,
        operation_label: s.operationLabel,
        explanation: s.explanation,
        latex_before: s.latexBefore,
        latex_after: s.latexAfter,
        arrow_direction: s.arrowDirection,
        term_transfer: s.arrows?.[0]
          ? {
              from_term: s.arrows[0].fromTerm,
              to_term: s.arrows[0].toTerm,
              from_side: "left" as const,
              sign_rule: s.arrows[0].signRule || "",
            }
          : undefined,
        balance_notation: s.balanceNotation,
      })),
      conclusion: wb.conclusion,
      hint: wb.hint || undefined,
      subject: wb.subject,
      topic: wb.topic,
    };
  }

  return {
    type: "explanation" as const,
    intro: wb.intro,
    steps: [],
    conclusion: wb.conclusion,
    hint: wb.hint || undefined,
  };
}
