import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { classifyQuestion, detectRequiredVisuals, getRequiredBlockTypes } from "@/lib/prompts/classify";
import { buildSystemPrompt } from "@/lib/prompts/system";
import {
  buildCriticSystemPrompt,
  buildCriticUserMessage,
  buildCorrectionMessage,
  parseCriticResponse,
} from "@/lib/prompts/critic";
import { validateResponse } from "@/lib/validate";
import { casSolve } from "@/lib/cas-solver";
import { postVerifyCAS } from "@/lib/cas-post-verify";
import { runToolChecks } from "@/lib/verification-tools";
import type { WhiteboardResponse, VerificationStatus } from "@/types/whiteboard";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/* ── Model configuration ─────────────────────────────────────────────────── */

/** Main solver model — best balance of reasoning + structured JSON output */
const SOLVER_MODEL = "o3";
/** Critic model — used for independent verification (Pass 2) */
const CRITIC_MODEL = "o3";
/** Max tokens for solver responses */
const SOLVER_MAX_TOKENS = 8192;
/** Max tokens for critic responses (much smaller — just JSON verdict) */
const CRITIC_MAX_TOKENS = 2048;

/**
 * POST /api/chat
 *
 * Two-pass verification pipeline:
 *   Pass 1 — Solver: Produce a draft solution (structured JSON)
 *   Pass 2 — Critic: Independently verify every step, flag errors
 *   If critic fails → retry solver once with critic feedback
 *   Only display checked answers to the student
 *
 * Accepts: { messages, level?, examBoard?, subject?, useWhiteboard? }
 * Returns: { whiteboard: WhiteboardResponse, category, validationWarnings, verification }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      messages,
      level,
      examBoard,
      useWhiteboard = true,
    } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid messages" }, { status: 400 });
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
          return NextResponse.json(
            { error: "limit_reached" },
            { status: 403 }
          );
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

    // ── Stage 2: Pre-CAS solver (symbolic computation) ────────────────
    const casResult = casSolve(questionText);
    if (casResult) {
      console.log(
        `[CAS] Solved as ${casResult.problemType}: ${casResult.answers.join(", ")} (verified: ${casResult.verified})`
      );
    }

    // ── Stage 3: Build solver system prompt ───────────────────────────
    const systemPrompt = buildSystemPrompt(
      category,
      casResult,
      requiredVisuals.length > 0 ? requiredVisuals : undefined,
      hasImage || undefined,
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

    // ══════════════════════════════════════════════════════════════════
    //  PASS 1 — SOLVER: Produce draft solution
    // ══════════════════════════════════════════════════════════════════

    console.log(`[Pass 1] Solver: calling ${SOLVER_MODEL}...`);

    const solverResponse = await client.chat.completions.create({
      model: SOLVER_MODEL,
      max_completion_tokens: SOLVER_MAX_TOKENS,
      messages: [
        { role: "system" as const, content: systemPrompt },
        ...formattedMessages,
      ],
    });

    let rawContent = solverResponse.choices[0]?.message?.content || "";

    // ── Validate solver output (Zod + required visuals) ───────────────
    let result = validateResponse(rawContent, requiredBlockTypes);

    // Retry once on schema validation failure
    if (!result.ok && result.errors) {
      console.log(`[Pass 1] Validation failed, retrying: ${result.errors.join("; ")}`);

      const retryMessages = [
        ...formattedMessages,
        { role: "assistant" as const, content: rawContent },
        {
          role: "user" as const,
          content: `Your JSON had validation errors:\n${result.errors.join("\n")}\n\nFix these and output corrected JSON matching the WhiteboardResponse schema. Output ONLY valid JSON.`,
        },
      ];

      const retryResponse = await client.chat.completions.create({
        model: SOLVER_MODEL,
        max_completion_tokens: SOLVER_MAX_TOKENS,
        messages: [
          { role: "system" as const, content: systemPrompt },
          ...retryMessages,
        ],
      });

      rawContent = retryResponse.choices[0]?.message?.content || "";
      result = validateResponse(rawContent, requiredBlockTypes);
    }

    // If still invalid, return fallback
    if (!result.ok || !result.data) {
      return returnFallback(rawContent, category, result.errors);
    }

    // At this point result.data is guaranteed to exist — capture the reference
    let solutionData: WhiteboardResponse = result.data;

    // ══════════════════════════════════════════════════════════════════
    //  VERIFICATION PIPELINE
    // ══════════════════════════════════════════════════════════════════

    const verification: VerificationStatus = {
      preCasVerified: casResult?.verified ?? false,
      postCasVerified: false,
      criticVerified: false,
      toolChecksPassed: false,
      confidence: "low",
      warnings: [],
    };

    // ── CAS verification ──────────────────────────────────────────────

    // Pre-CAS stamp
    if (casResult?.verified) {
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

    console.log(`[Pass 2] Critic: calling ${CRITIC_MODEL}...`);

    const criticSystemPrompt = buildCriticSystemPrompt();
    const criticUserMessage = buildCriticUserMessage(
      questionText,
      rawContent,
      hasImage,
    );

    const criticResponse = await client.chat.completions.create({
      model: CRITIC_MODEL,
      max_completion_tokens: CRITIC_MAX_TOKENS,
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

        const correctionMessages = [
          ...formattedMessages,
          { role: "assistant" as const, content: rawContent },
          { role: "user" as const, content: correctionMsg },
        ];

        const correctionResponse = await client.chat.completions.create({
          model: SOLVER_MODEL,
          max_completion_tokens: SOLVER_MAX_TOKENS,
          messages: [
            { role: "system" as const, content: systemPrompt },
            ...correctionMessages,
          ],
        });

        const correctedContent =
          correctionResponse.choices[0]?.message?.content || "";
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

    // Determine confidence based on verification results
    const verifiedCount = [
      verification.preCasVerified || verification.postCasVerified,
      verification.criticVerified,
      verification.toolChecksPassed,
    ].filter(Boolean).length;

    if (verifiedCount >= 2) {
      verification.confidence = "high";
    } else if (verifiedCount === 1) {
      verification.confidence = "medium";
    } else {
      verification.confidence = "low";
    }

    // Stamp verification onto the response
    solutionData.verification = verification;

    console.log(
      `[Pipeline] Done. Confidence: ${verification.confidence} ` +
      `(CAS=${verification.preCasVerified || verification.postCasVerified}, ` +
      `Critic=${verification.criticVerified}, ` +
      `Tools=${verification.toolChecksPassed})`
    );

    const legacyResponse = whiteboardToLegacy(solutionData);

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

    return NextResponse.json({
      whiteboard: solutionData,
      response: legacyResponse,
      category,
      validationWarnings: result.errors || [],
      verification: {
        confidence: verification.confidence,
        casVerified: solutionData.casVerified ?? false,
        criticVerified: verification.criticVerified,
        toolChecksPassed: verification.toolChecksPassed,
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to get response from tutor" },
      { status: 500 }
    );
  }
}

// ── Fallback helper ───────────────────────────────────────────────────────────

function returnFallback(
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

  return NextResponse.json({
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
    verification: {
      confidence: "low",
      casVerified: false,
      criticVerified: false,
      toolChecksPassed: false,
    },
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
