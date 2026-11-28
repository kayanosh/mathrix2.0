import { getOpenAI } from "@/lib/openai";
import { NextRequest } from "next/server";

// Allow longer execution time for multi-stage solving and verification.
export const maxDuration = 120;
import { classifyQuestion, detectRequiredVisuals, getRequiredBlockTypes } from "@/lib/prompts/classify";
import { buildSystemPrompt, buildFollowUpPrompt } from "@/lib/prompts/system";
import { buildTeacherExplanationPrompt, buildLessonPrompt, getTeacherRequiredVisuals } from "@/lib/prompts/teacher";
import {
  validateLessonContract,
  buildLessonRetryMessage,
} from "@/lib/lesson-contract";
import {
  normalizeLessonForDisplay,
  validateGcseLessonQuality,
} from "@/lib/gcse-lesson-quality";
import {
  hashLessonKey,
  lookupLessonCache,
  writeLessonCache,
} from "@/lib/lesson-cache";
import {
  buildCriticSystemPrompt,
  buildCriticUserMessage,
  buildCorrectionMessage,
  parseCriticResponse,
  type CriticResult,
} from "@/lib/prompts/critic";
import {
  validateResponse,
  sanitizeWhiteboardResponse,
  validateNoMissingSteps,
  buildContinuityRetryMessage,
  withoutBrokenArrows,
} from "@/lib/validate";
import { casSolve } from "@/lib/cas-solver";
import { sympySolve, inferSympyTask } from "@/lib/sympy-solver";
import { buildGroundTruth } from "@/lib/ground-truth";
import { claudeSolve, convertToAnthropicMessages, CLAUDE_SOLVER_MODEL } from "@/lib/claude-solver";
import { logAiUsage } from "@/lib/ai-usage-log";
import type { CallUsage } from "@/lib/ai-cost";
import { simplifyLanguage } from "@/lib/plain-language";
import { drawBareMaths } from "@/lib/maths-text";
import { settleShapeAnswers } from "@/lib/shape-answers";
import { planVersionFor } from "@/lib/topic-plans";
import {
  followUpFallback,
  followUpMessages as buildFollowUpMessages,
  readTurn,
  solverMessages,
} from "@/lib/conversation";
import { runCasChecks, summariseVerification, type Agreement } from "@/lib/answer-agreement";
import { runToolChecks, repairArithmetic } from "@/lib/verification-tools";
import type { WhiteboardResponse, VerificationStatus } from "@/types/whiteboard";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { normalizeQuestion, hashQuestion, lookupCache, writeCache, worthSaving } from "@/lib/question-cache";
import { retrieveContentChunks, buildContentChunkBlock } from "@/lib/rag";
import {
  detectKS2RequiredVisuals,
  mergeVisualRequirements,
} from "@/lib/ks2-required-visuals";
import { applyMethodBuilderToWhiteboard } from "@/lib/methods/apply-builder";
import { boardReady } from "@/lib/board-ready";
import { checkInputSafety, INJECTION_GUARD } from "@/lib/input-safety";
import { checkAnonAllowance, recordAnonUse } from "@/lib/anon-usage";
import { mathsAnswersEquivalent } from "@/lib/ks2-maths-accuracy";

// Critic still uses GPT-4o for cross-model verification (decorrelated errors)

/* ── Model configuration ─────────────────────────────────────────────────── */

/** Critic model — GPT-4o: cross-model verification (solver = Claude, critic = GPT-4o) */
const CRITIC_MODEL = "gpt-4o";
/** Max tokens for critic responses (much smaller — just JSON verdict) */
const CRITIC_MAX_TOKENS = 2048;

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
        // Every answer leaves through here — fresh, saved, corrected, or a
        // follow-up — so this is where its wording is made plain. See
        // lib/plain-language.ts.
        // … and where the board is given its last tidy-up. See lib/board-ready.ts.
        const worded = event === "error" ? data : drawBareMaths(simplifyLanguage(data));
        const withBoard = worded as { whiteboard?: WhiteboardResponse } | null;
        const payload =
          withBoard && typeof withBoard === "object" && withBoard.whiteboard
            ? { ...withBoard, whiteboard: boardReady(withBoard.whiteboard) }
            : worded;
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`)
        );
      }

      try {
        const body = await req.json();
    const {
      messages,
      level,
      examBoard,
      tier,
      hintMode = false,
      teacherMode = false,
      lessonMode = false,
      topic: topicContext,
      subtopics: subtopicsContext,
    } = body;

    if (!messages || !Array.isArray(messages)) {
      send("error", { error: "Invalid messages" });
      controller.close();
      return;
    }

    // ── Input safety: size limits, off-topic/unsafe redirect, injection guard ──
    const safety = checkInputSafety(messages);
    if (!safety.ok) {
      if (safety.reason === "non_maths" || safety.reason === "blocked") {
        // Gentle, friendly redirect rendered as a normal whiteboard response
        const friendly: WhiteboardResponse = {
          intro: safety.message || "I'm your maths tutor.",
          blocks: [
            {
              type: "text",
              content: safety.detail || safety.message || "Ask me a maths question to get started.",
            },
          ],
          conclusion: safety.conclusion || "What maths shall we work on?",
        };
        send("solver_done", {
          whiteboard: friendly,
          response: { type: "explanation", intro: friendly.intro, steps: [], conclusion: friendly.conclusion },
          category: "number",
          validationWarnings: [],
        });
        send("verification_done", {
          verification: { confidence: "low", casVerified: false, criticVerified: false, toolChecksPassed: false },
          whiteboard: friendly,
        });
        controller.close();
        return;
      }
      // empty / too_long / too_many_messages — technical error
      send("error", { error: safety.message || "Invalid request" });
      controller.close();
      return;
    }

    // Apply sanitised text back onto the last user message so downstream
    // classification, prompting and caching all use the cleaned version.
    if (safety.sanitizedText !== undefined) {
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i]?.role === "user") {
          messages[i] = { ...messages[i], content: safety.sanitizedText };
          break;
        }
      }
    }

    // Defensive instruction appended to LLM system prompts when the student's
    // message looks like a prompt-injection / role-hijack attempt.
    const injectionGuard = safety.injectionDetected ? "\n\n" + INJECTION_GUARD : "";

    // ── AI cost telemetry: accumulate every model call this request makes ──
    const aiCalls: CallUsage[] = [];
    const recordClaude = (r: {
      usage?: { inputTokens: number; outputTokens: number };
      model?: string;
    }) => {
      if (r.usage) {
        aiCalls.push({
          model: r.model || CLAUDE_SOLVER_MODEL,
          inputTokens: r.usage.inputTokens,
          outputTokens: r.usage.outputTokens,
        });
      }
    };
    const recordOpenAI = (
      model: string,
      resp: { usage?: { prompt_tokens?: number; completion_tokens?: number } | null },
    ) => {
      aiCalls.push({
        model,
        inputTokens: resp.usage?.prompt_tokens ?? 0,
        outputTokens: resp.usage?.completion_tokens ?? 0,
      });
    };

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
    } else {
      // Anonymous visitors were enforced ONLY in localStorage — this branch used
      // to read "server allows the request through (no user row to check)". So
      // clearing site data reset the quota and gave unlimited free Claude,
      // GPT-4o and TTS. The counter is now server-side, keyed on a SALTED HASH of
      // the IP: these visitors are children and an IP is personal data under UK
      // GDPR, so we store enough to count and nothing that identifies anyone
      // (see lib/anon-usage.ts).
      const allowance = await checkAnonAllowance(req.headers);
      if (!allowance.allowed) {
        send("error", {
          error: "anon_limit_reached",
          message:
            "You've used today's free questions. Create a free account for more, or upgrade for unlimited.",
          used: allowance.used,
          limit: allowance.limit,
        });
        controller.close();
        return;
      }
      // Counted before the model call, not after: an abandoned or failed request
      // still spent the money, which is the thing being bounded.
      void recordAnonUse(req.headers);
    }

    // ── Stage 0: Parse input ──────────────────────────────────────────
    // The conversation is read once, here (lib/conversation.ts). Everything
    // below is about the message the pupil just sent: an earlier photo does
    // not make this a photo question, and an earlier answer is background, not
    // something to solve again.
    const turn = readTurn(messages);
    const hasImage = turn.images.length > 0;
    // Only a question that makes sense on its own may be answered from, or
    // saved to, the answer cache shared between pupils.
    const cacheable = !hasImage && turn.standalone;

    const lastUserMsg = [...messages]
      .reverse()
      .find((m: { role: string }) => m.role === "user");
    const questionText = lastUserMsg?.content || "";

    // ── Stage 1: Classify the question ────────────────────────────────
    const category = classifyQuestion(questionText);

    // Set when a cached answer is found to contradict the CAS: it is not
    // served, and the fresh answer replaces it instead of being ignored as a
    // duplicate.
    let replaceCachedAnswer = false;

    // ── Stage 1a: Check question cache ────────────────────────────────
    // Skip cache for image questions — hash is text-only, so different images
    // with the same generic text ("Solve this question from the photo") would collide.
    if (cacheable) {
      const normalized = normalizeQuestion(questionText);
      const qHash = hashQuestion(normalized, level || "GCSE", tier, examBoard);
      const cached = await lookupCache(qHash);

      if (cached) {
        console.log(`[Cache] HIT for hash ${qHash.slice(0, 12)}...`);
        // Overlay deterministic builders even on cache hits — otherwise stale
        // prose-only boards (pre-algebra-builder) keep serving forever.
        const subtopicsArr = Array.isArray(subtopicsContext)
          ? (subtopicsContext as string[])
          : undefined;
        // The verification stored with a cached answer is NOT trusted as-is.
        // Rows written before the checks were made honest carry "CAS verified"
        // stamps that were never earned (and ground truths like "6" for 6 × 7),
        // and a row with no verification at all used to be served as
        // high-confidence with every check passed. The CAS checks are local and
        // instant, so they are simply run again against what is about to be
        // shown. The critic and tool results are the only things reused.
        const cachedCas = casSolve(questionText);
        const cachedTruth = cachedCas?.verified && cachedCas.answers.length ? cachedCas.answers : null;
        const overlaid = applyMethodBuilderToWhiteboard(
          cached.response_json,
          questionText,
          typeof topicContext === "string" ? topicContext : undefined,
          subtopicsArr,
          {
            level,
            agreesWithGroundTruth: cachedTruth
              ? (builderAnswer) =>
                  cachedTruth.some((truth) => mathsAnswersEquivalent(builderAnswer, truth))
              : undefined,
          },
        );
        const board = repairArithmetic(settleShapeAnswers(overlaid, questionText), questionText);
        const cachedChecks = runCasChecks(board, questionText, cachedTruth);
        // The arithmetic checks are local and instant too, so a saved answer
        // gets today's checks rather than the ones it was saved with.
        const cachedTools = runToolChecks(board, questionText);

        // A cached answer the CAS contradicts is not served. Rows cached while
        // the old question reader was live were written by a model that had
        // been told its answer "MUST match" ground truths like 6 for 6 × 7, so
        // some of them hold exactly that. Serving one with a warning badge
        // would still be teaching the wrong answer; solve it again instead.
        //
        // The same goes for a saved answer that fails a check which is
        // certain: a sum that does not come to what its own line says, or a
        // line that does not follow from the one above. Those checks are
        // newer than many saved answers, and a saved answer is only as good
        // as the checks that existed the day it was saved.
        const certainFailures = cachedTools.checks.filter((c) => !c.passed && c.decisive);
        if (cachedChecks.agreement === "disagree" || certainFailures.length > 0) {
          replaceCachedAnswer = true;
          console.warn(
            `[Cache] Discarding cached answer for ${qHash.slice(0, 12)}: ` +
              `${[...cachedChecks.warnings, ...certainFailures.map((c) => `${c.check}: ${c.detail}`)].join("; ")}`,
          );
        } else {
          const storedVerification = cached.verification_json;
          const cachedFlags = {
            agreement: cachedChecks.agreement,
            preCasVerified: cachedChecks.preCasVerified,
            postCasVerified: cachedChecks.postCasVerified,
            criticVerified: storedVerification?.criticVerified === true,
            toolChecksPassed: cachedTools.ran && cachedTools.allPassed,
            crossModel: storedVerification?.crossModelVerified === true,
          };
          const cachedSummary = summariseVerification(cachedFlags);
          // The badge is drawn from these fields on the board itself, so the
          // stamps the row was cached with have to be overwritten, not just
          // accompanied by a fresh verification event.
          board.casVerified = cachedSummary.casVerified;
          board.verification = {
            preCasVerified: cachedFlags.preCasVerified,
            postCasVerified: cachedFlags.postCasVerified,
            criticVerified: cachedFlags.criticVerified,
            toolChecksPassed: cachedFlags.toolChecksPassed,
            confidence: cachedSummary.confidence,
            agreementCount: cachedSummary.agreementCount,
            warnings: cachedChecks.warnings,
            crossModelVerified: storedVerification?.crossModelVerified === true,
          };
          send("solver_done", {
            whiteboard: board,
            response: whiteboardToLegacy(board),
            category: cached.category,
            validationWarnings: [],
          });
          send("verification_done", {
            verification: {
              confidence: cachedSummary.confidence,
              casVerified: cachedSummary.casVerified,
              criticVerified: cachedFlags.criticVerified,
              toolChecksPassed: cachedFlags.toolChecksPassed,
            },
            whiteboard: board,
          });

          // Still increment usage
          if (user) {
            const today = new Date().toISOString().split("T")[0];
            try {
              await supabaseAdmin.rpc("increment_usage", { p_user_id: user.id, p_date: today });
            } catch { /* ignore */ }
          }

          logAiUsage({
            userId: user?.id,
            mode: "cache",
            category: cached.category,
            level: level || "GCSE",
            tier: tier || null,
            cached: true,
            confidence: cachedSummary.confidence,
            calls: [],
          });

          controller.close();
          return;
        }
      }
      console.log(`[Cache] MISS for hash ${qHash.slice(0, 12)}...`);
    }

    // ── Stage 1b: Detect required visual diagrams ─────────────────────
    let requiredVisuals = detectRequiredVisuals(questionText, category);
    if (level === "KS2") {
      const subtopicsArr = Array.isArray(subtopicsContext)
        ? (subtopicsContext as string[])
        : undefined;
      const ks2Visuals = detectKS2RequiredVisuals(
        questionText,
        typeof topicContext === "string" ? topicContext : undefined,
        subtopicsArr
      );
      requiredVisuals = mergeVisualRequirements(requiredVisuals, ks2Visuals);
    }
    const requiredBlockTypes = getRequiredBlockTypes(requiredVisuals);
    if (requiredVisuals.length > 0) {
      console.log(
        `[Visuals] Required: ${requiredVisuals.map((v) => v.matchedTopic).join(", ")} → blocks: ${requiredBlockTypes.join(", ")}`
      );
    }

    // ── Fast path: follow-up clarification question ──────────────────────
    const isFollowUp = turn.kind === "follow_up" && !teacherMode && !lessonMode;

    if (isFollowUp) {
      console.log("[FastPath] Follow-up detected — skipping CAS/SymPy/critic");
      const followUpSystemPrompt = buildFollowUpPrompt() + injectionGuard;
      // The model is shown the question the pupil is asking about and the full
      // working they were given — not the bare opening and closing lines, which
      // is all it used to get.
      const followUpMessages = buildFollowUpMessages(turn);
      const anthropicFollowUp = convertToAnthropicMessages(followUpMessages);
      let followUpRaw = "";
      try {
        const r = await claudeSolve(followUpSystemPrompt, anthropicFollowUp);
        followUpRaw = r.content;
        recordClaude(r);
      } catch {
        const fb = await getOpenAI().chat.completions.create({
          model: "gpt-4o",
          max_tokens: 1024,
          response_format: { type: "json_object" },
          messages: [
            { role: "system" as const, content: followUpSystemPrompt },
            ...followUpMessages,
          ],
        });
        followUpRaw = fb.choices[0]?.message?.content || "";
        recordOpenAI("gpt-4o", fb);
      }
      // The checks in validateResponse are written for a full solution: one of
      // them fails any answer that is all words and mentions an equation, which
      // is what a good answer to "why did you subtract 5?" looks like. A reply
      // in the right shape is used whether or not it passed them. One that is
      // not is read for its sentences; the raw reply is never shown, because
      // it is JSON and pupils were being shown the JSON.
      const followUpResult = validateResponse(followUpRaw, []);
      const followUpData: WhiteboardResponse = followUpResult.data ?? followUpFallback(followUpRaw);
      send("solver_done", { whiteboard: followUpData, response: whiteboardToLegacy(followUpData), category, validationWarnings: [] });
      send("verification_done", { verification: { confidence: "low", casVerified: false, criticVerified: false, toolChecksPassed: false }, whiteboard: followUpData });
      logAiUsage({
        userId: user?.id,
        mode: "followup",
        category,
        level: level || "GCSE",
        tier: tier || null,
        confidence: "high",
        calls: aiCalls,
      });
      controller.close();
      return;
    }

    // ── Teacher mode fast path: topic explanation (skip CAS/critic) ───────
    if (teacherMode) {
      console.log("[TeacherMode] Generating topic explanation — skipping CAS/critic");

      // Extract topic/subtopic from the message (format: "[TEACHER MODE] Explain ...")
      const teacherMatch = questionText.match(/\[TEACHER MODE\].*?"(.+?)\s*—\s*(.+?)"/);
      const teacherTopic = teacherMatch?.[1] || "Maths";
      const teacherSubtopic = teacherMatch?.[2] || questionText;

      // Look up required visuals for this subtopic
      const visuals = getTeacherRequiredVisuals(teacherSubtopic);
      const requiredBlocks = visuals.blocks;
      if (requiredBlocks.length > 0) {
        console.log(`[TeacherMode] Required visuals for "${teacherSubtopic}": ${requiredBlocks.join(", ")}`);
      }

      const teacherSystemPrompt = buildTeacherExplanationPrompt(
        teacherTopic,
        teacherSubtopic,
        level || "GCSE",
        visuals,
      ) + injectionGuard;

      const teacherMessages = convertToAnthropicMessages([
        { role: "user" as const, content: questionText },
      ]);

      // First attempt
      let teacherRaw = "";
      try {
        const r = await claudeSolve(teacherSystemPrompt, teacherMessages);
        teacherRaw = r.content;
        recordClaude(r);
      } catch {
        const fb = await getOpenAI().chat.completions.create({
          model: "gpt-4o",
          max_tokens: 8192,
          response_format: { type: "json_object" },
          messages: [
            { role: "system" as const, content: teacherSystemPrompt },
            { role: "user" as const, content: questionText },
          ],
        });
        teacherRaw = fb.choices[0]?.message?.content || "";
        recordOpenAI("gpt-4o", fb);
      }

      let teacherResult = validateResponse(teacherRaw, requiredBlocks);

      // Retry once if required visuals are missing
      if (!teacherResult.ok && requiredBlocks.length > 0) {
        const missingVisuals = (teacherResult.errors || []).filter(e => e.includes("Missing required visual block"));
        if (missingVisuals.length > 0) {
          console.log(`[TeacherMode] Retrying — missing visuals: ${missingVisuals.join("; ")}`);
          const retryMessages = convertToAnthropicMessages([
            { role: "user" as const, content: questionText },
            { role: "assistant" as const, content: teacherRaw },
            { role: "user" as const, content: `Your response was rejected because: ${missingVisuals.join(". ")}. You MUST include ${requiredBlocks.map(b => `a "${b}" block`).join(" and ")}. Please regenerate the full response with the required visual diagram(s).` },
          ]);
          try {
            const r2 = await claudeSolve(teacherSystemPrompt, retryMessages);
            recordClaude(r2);
            const retryResult = validateResponse(r2.content, requiredBlocks);
            if (retryResult.ok || retryResult.data) {
              teacherResult = retryResult;
            }
          } catch {
            // Accept the first attempt if retry fails
          }
        }
      }

      const teacherData: WhiteboardResponse = teacherResult.ok && teacherResult.data
        ? teacherResult.data
        : teacherResult.data
          ? teacherResult.data
          : {
              intro: "Let's explore this topic together.",
              blocks: [{ type: "text", content: teacherRaw.replace(/```json|```/g, "").trim() }],
              conclusion: "And that covers the essentials.",
            };

      send("solver_done", {
        whiteboard: teacherData,
        response: { type: "explanation", intro: teacherData.intro, steps: [], conclusion: teacherData.conclusion },
        category,
        validationWarnings: teacherResult.errors || [],
      });
      send("verification_done", {
        verification: { confidence: "low", casVerified: false, criticVerified: false, toolChecksPassed: false },
        whiteboard: teacherData,
      });

      // Increment usage for authenticated users
      if (user) {
        const today = new Date().toISOString().split("T")[0];
        try {
          await supabaseAdmin.rpc("increment_usage", { p_user_id: user.id, p_date: today });
        } catch { /* ignore */ }
      }

      logAiUsage({
        userId: user?.id,
        mode: "teacher",
        category,
        level: level || "GCSE",
        tier: tier || null,
        confidence: "high",
        calls: aiCalls,
      });

      controller.close();
      return;
    }

    // ── Teach-me-a-topic fast path: full structured lesson ────────────────
    if (lessonMode) {
      console.log("[LessonMode] Generating a full topic lesson — skipping CAS/critic");

      // Extract the topic from the message (format: [LESSON MODE] ... "<topic>")
      const lessonMatch = questionText.match(/\[LESSON MODE\][^"]*"(.+?)"/);
      const lessonTopic =
        lessonMatch?.[1] ||
        (typeof topicContext === "string" && topicContext) ||
        questionText.replace(/\[LESSON MODE\]/i, "").trim() ||
        "Maths";

      const lessonHash = hashLessonKey(lessonTopic, level || "GCSE", tier, planVersionFor(lessonTopic));

      // Topic-aware visual requirements are part of validation, including cache hits.
      const visuals = getTeacherRequiredVisuals(lessonTopic);

      // ── Cache lookup: replay a previously generated lesson ──────────────
      const cachedLesson = await lookupLessonCache(lessonHash);
      if (cachedLesson) {
        const cachedValidation = validateResponse(
          JSON.stringify(cachedLesson.response_json),
          visuals.blocks,
          { requireAlgebraArrows: false },
        );
        const cachedData = cachedValidation.data
          ? normalizeLessonForDisplay(cachedValidation.data)
          : null;
        const cachedContract = cachedData ? validateLessonContract(cachedData) : null;
        const cachedQuality = cachedData
          ? validateGcseLessonQuality(cachedData, lessonTopic)
          : null;
        if (
          cachedValidation.ok &&
          cachedData &&
          cachedContract?.teachable &&
          cachedQuality?.ok
        ) {
          console.log(`[LessonMode] Valid cache HIT for "${lessonTopic}"`);
          send("solver_done", {
            whiteboard: cachedData,
            response: {
              type: "explanation",
              intro: cachedData.intro,
              steps: [],
              conclusion: cachedData.conclusion,
            },
            category,
            validationWarnings: cachedValidation.errors || [],
          });
          send("verification_done", {
            verification: { confidence: "low", casVerified: false, criticVerified: false, toolChecksPassed: false },
            whiteboard: cachedData,
          });
          if (user) {
            const today = new Date().toISOString().split("T")[0];
            try {
              await supabaseAdmin.rpc("increment_usage", { p_user_id: user.id, p_date: today });
            } catch { /* ignore */ }
          }
          controller.close();
          return;
        }
        console.warn(`[LessonMode] Ignoring stale or invalid cache entry for "${lessonTopic}"`);
      }

      const lessonSystemPrompt = buildLessonPrompt(
        lessonTopic,
        level || "GCSE",
        tier,
        visuals,
      ) + injectionGuard;

      const lessonUserMsg = `Teach me a full lesson on: "${lessonTopic}". Follow the lesson contract exactly.`;

      async function runLesson(sys: string, convo: { role: "user" | "assistant"; content: string }[]) {
        const anthropic = convertToAnthropicMessages(convo);
        try {
          // Full lessons need careful reasoning, but not the solver's 4k-token
          // derivation budget. A smaller budget materially reduces first-load time.
          const r = await claudeSolve(sys, anthropic, {
            thinkingBudget: 2048,
            maxTokens: 10000,
          });
          return r.content;
        } catch {
          const fb = await getOpenAI().chat.completions.create({
            model: "gpt-4o",
            max_tokens: 8192,
            response_format: { type: "json_object" },
            messages: [
              { role: "system" as const, content: sys },
              ...convo,
            ],
          });
          return fb.choices[0]?.message?.content || "";
        }
      }

      let lessonRaw = await runLesson(lessonSystemPrompt, [
        { role: "user", content: lessonUserMsg },
      ]);
      let lessonResult = validateResponse(lessonRaw, visuals.blocks, {
        requireAlgebraArrows: false,
      });
      let lessonData = lessonResult.data
        ? normalizeLessonForDisplay(lessonResult.data)
        : null;
      let contract = validateLessonContract(
        lessonData ?? { intro: "", blocks: [], conclusion: "" },
      );
      let quality = validateGcseLessonQuality(
        lessonData ?? { intro: "", blocks: [], conclusion: "" },
        lessonTopic,
      );

      const initialIssues = [
        ...(lessonResult.errors || []),
        ...contract.errors,
        ...quality.errors,
      ];
      const needsRetry = !lessonResult.ok || !lessonData || !contract.ok || !quality.ok;

      // Retry malformed JSON, schema failures, missing stages and inaccurate diagrams.
      if (needsRetry) {
        console.log(`[LessonMode] Retrying lesson — ${initialIssues.join(" | ")}`);
        try {
          const contractRetry = buildLessonRetryMessage(contract.missing);
          const qualityRetry = initialIssues.length
            ? `\n\nFix every validation problem below:\n${initialIssues.map((issue) => `• ${issue}`).join("\n")}`
            : "";
          const retryRaw = await runLesson(lessonSystemPrompt, [
            { role: "user", content: lessonUserMsg },
            { role: "assistant", content: lessonRaw },
            { role: "user", content: `${contractRetry}${qualityRetry}\n\nReturn the full corrected lesson as JSON only.` },
          ]);
          const retryResult = validateResponse(retryRaw, visuals.blocks, {
            requireAlgebraArrows: false,
          });
          if (retryResult.data) {
            const retryData = normalizeLessonForDisplay(retryResult.data);
            const retryContract = validateLessonContract(retryData);
            const retryQuality = validateGcseLessonQuality(retryData, lessonTopic);
            if (retryResult.ok && retryContract.teachable && retryQuality.ok) {
              lessonRaw = retryRaw;
              lessonResult = retryResult;
              lessonData = retryData;
              contract = retryContract;
              quality = retryQuality;
            }
          }
        } catch {
          // The safe failure card below handles an unavailable retry.
        }
      }

      // Show the lesson when it is TEACHABLE, not only when it is perfect. The
      // full contract is still demanded of the model and still retried above —
      // but a lesson whose only flaw is an untagged "vocabulary" heading used to
      // be replaced wholesale by "I need to rebuild this lesson before teaching
      // it", so a cosmetic omission cost the pupil the entire lesson. Any missing
      // supporting section is reported through validationWarnings instead.
      const lessonIsSafe = !!lessonData && lessonResult.ok && contract.teachable && quality.ok;
      const pupilLesson: WhiteboardResponse = lessonIsSafe && lessonData
        ? lessonData
        : {
            generationFailed: true,
            // Pupil-facing copy. The conclusion is no longer rendered for a failed
            // generation (it was appearing in the green tick "Answer" card), so the
            // text block has to carry the whole message, including what to do next.
            intro: "Sorry — I could not put this lesson together properly.",
            blocks: [{
              type: "text",
              heading: "Let us try that again",
              content:
                "I check every lesson before teaching it, and this one did not pass, so I have not shown it — I would rather give you nothing than teach you something wrong. Ask for the same topic again and I will build it from scratch.",
            }],
            conclusion: "",
          };

      const lessonWarnings = [
        ...(lessonResult.errors || []),
        ...(contract.missing.length > 0
          ? [`Lesson missing sections: ${contract.missing.join(", ")}`]
          : []),
        ...(contract.missingCore.length > 0
          ? [`Lesson missing core teaching sections: ${contract.missingCore.join(", ")}`]
          : []),
        ...contract.errors,
        ...contract.warnings,
        ...quality.errors,
      ];

      send("solver_done", {
        whiteboard: pupilLesson,
        response: { type: "explanation", intro: pupilLesson.intro, steps: [], conclusion: pupilLesson.conclusion },
        category,
        validationWarnings: lessonWarnings,
      });
      send("verification_done", {
        verification: { confidence: "low", casVerified: false, criticVerified: false, toolChecksPassed: false },
        whiteboard: pupilLesson,
      });

      // ── Persist the lesson — only cache complete, structurally-valid lessons ──
      if (lessonIsSafe && lessonData) {
        writeLessonCache({
          lessonHash,
          topic: lessonTopic,
          level: level || "GCSE",
          tier: tier || null,
          responseJson: lessonData,
          contractJson: contract,
        }).catch((err) => {
          console.warn("[LessonCache] Write failed:", (err as Error).message);
        });
      }

      if (user) {
        const today = new Date().toISOString().split("T")[0];
        try {
          await supabaseAdmin.rpc("increment_usage", { p_user_id: user.id, p_date: today });
        } catch { /* ignore */ }
      }

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

    // ── Stage 2b: Retrieve relevant content chunks (RAG) ─────────────
    let contentChunkBlock = "";
    try {
      const chunks = await retrieveContentChunks(questionText, category, tier);
      contentChunkBlock = buildContentChunkBlock(chunks);
      if (chunks.length > 0) {
        console.log(`[RAG] Retrieved ${chunks.length} content chunks for topic: ${category}`);
      }
    } catch (ragErr) {
      console.warn(`[RAG] Content retrieval skipped: ${(ragErr as Error).message}`);
    }

    // ── Stage 3: Build solver system prompt ───────────────────────────
    const systemPrompt = buildSystemPrompt(
      category,
      groundTruth.verified ? groundTruth : null,
      requiredVisuals.length > 0 ? requiredVisuals : undefined,
      hasImage || undefined,
      level || undefined,
      contentChunkBlock || undefined,
      questionText || undefined,
    ) + injectionGuard;

    // ── Stage 4: Prepare messages ─────────────────────────────────────
    const contextPrefix =
      level && examBoard
        ? `[Student context: ${level} student, ${examBoard} exam board]\n\n`
        : "";

    const formattedMessages = solverMessages(turn, contextPrefix);

    // NOTE on verification metadata in the modes above (safety redirect,
    // follow-ups, teacher mode, lesson mode): these legitimately skip the
    // verification pipeline, and they used to report `confidence: "high"` with
    // every check flag false. getVerificationBadge mapped that to
    // "Checked & consistent" — telling a student we had checked an answer we had
    // not looked at. They now report "low", and the badge additionally refuses
    // to render any claim with no passing check behind it.

    // ── Hint mode: append directive to last user message ─────────────
    //
    // This used to require `typeof last.content === "string"`, so it silently
    // did nothing for a photo or PDF question — where the content is an array of
    // blocks — and a student who asked for a hint got the full worked solution.
    // Photographing the question is the most common way students ask, so "Hint
    // only" was broken on the path that matters most.
    const HINT_DIRECTIVE =
      "\n\n[HINT MODE: Do NOT reveal the full solution. Give one guiding question or a small nudge toward the method. Maximum 1 text block — no worked answer.]";
    if (hintMode) {
      const lastIdx = formattedMessages.length - 1;
      const last = formattedMessages[lastIdx];
      if (last && last.role === "user") {
        if (typeof last.content === "string") {
          formattedMessages[lastIdx] = {
            ...last,
            content: last.content + HINT_DIRECTIVE,
          };
        } else if (Array.isArray(last.content)) {
          // Append to the final text part so the directive stays adjacent to the
          // question; if the message is images only, add a text part for it.
          const parts = [...(last.content as Array<Record<string, unknown>>)];
          const lastTextIdx = parts.map((p) => p.type).lastIndexOf("text");
          if (lastTextIdx >= 0) {
            parts[lastTextIdx] = {
              ...parts[lastTextIdx],
              text: String(parts[lastTextIdx].text ?? "") + HINT_DIRECTIVE,
            };
          } else {
            parts.push({ type: "text", text: HINT_DIRECTIVE.trim() });
          }
          // `role` is narrowed explicitly: the array-content branch of the
          // message union is user-only.
          formattedMessages[lastIdx] = {
            role: "user",
            content: parts as Extract<typeof last, { role: "user" }>["content"],
          };
        }
      }
    }

    // ══════════════════════════════════════════════════════════════════
    //  PASS 1 — SOLVER: Claude Sonnet with extended thinking
    // ══════════════════════════════════════════════════════════════════

    console.log(`[Pass 1] Solver: calling Claude Sonnet (extended thinking)...`);

    // Convert OpenAI-format messages to Anthropic format
    const anthropicMessages = convertToAnthropicMessages(formattedMessages);

    let rawContent = "";
    // Which model actually wrote the solution on the board. The critic is
    // GPT-4o, so a GPT-4o fallback here means the answer is NOT cross-checked
    // by a second model, whatever the pipeline was designed to do.
    let solverModel: string = CLAUDE_SOLVER_MODEL;
    try {
      const solverResult = await claudeSolve(systemPrompt, anthropicMessages);
      rawContent = solverResult.content;
      recordClaude(solverResult);
    } catch (claudeErr) {
      // Fallback to GPT-4o if Claude is unavailable
      solverModel = "gpt-4o";
      console.warn(`[Pass 1] Claude failed, falling back to GPT-4o: ${(claudeErr as Error).message}`);
      const fallbackResponse = await getOpenAI().chat.completions.create({
        model: "gpt-4o",
        max_tokens: 8192,
        response_format: { type: "json_object" },
        messages: [
          { role: "system" as const, content: systemPrompt },
          ...formattedMessages,
        ],
      });
      rawContent = fallbackResponse.choices[0]?.message?.content || "";
      recordOpenAI("gpt-4o", fallbackResponse);
    }

    // ── Validate solver output (Zod + required visuals) ───────────────
    let result = validateResponse(rawContent, requiredBlockTypes);

    // Retry once on schema validation failure (Claude retry)
    if (!result.ok && result.errors) {
      console.log(`[Pass 1] Validation failed, retrying: ${result.errors.join("; ")}`);

      const fixRequest = `Your JSON had validation errors:\n${result.errors.join("\n")}\n\nFix these and output corrected JSON matching the WhiteboardResponse schema. Output ONLY valid JSON.`;
      const retryAnthropicMessages = convertToAnthropicMessages([
        ...formattedMessages,
        { role: "assistant" as const, content: rawContent },
        { role: "user" as const, content: fixRequest },
      ]);

      let retried = "";
      try {
        const retryResult = await claudeSolve(systemPrompt, retryAnthropicMessages);
        retried = retryResult.content;
        solverModel = CLAUDE_SOLVER_MODEL;
        recordClaude(retryResult);
      } catch {
        // Claude is unavailable. The retry used to stop here, so with Claude
        // down every answer that failed a check first time got no second go
        // and reached the pupil as a block of text.
        try {
          const retryResponse = await getOpenAI().chat.completions.create({
            model: "gpt-4o",
            max_tokens: 8192,
            response_format: { type: "json_object" },
            messages: [
              { role: "system" as const, content: systemPrompt },
              ...formattedMessages,
              { role: "assistant" as const, content: rawContent },
              { role: "user" as const, content: fixRequest },
            ],
          });
          retried = retryResponse.choices[0]?.message?.content || "";
          recordOpenAI("gpt-4o", retryResponse);
        } catch {
          // Keep the first attempt.
        }
      }

      // Keep the retry only if it is no worse than the first attempt.
      if (retried) {
        const retriedResult = validateResponse(retried, requiredBlockTypes);
        if (retriedResult.ok || !result.data) {
          rawContent = retried;
          result = retriedResult;
        }
      }
    }

    // ── Continuity-aware retry: fix unexplained jumps in the working ──
    // If the schema-valid solution skips steps (latexBefore ≠ previous
    // latexAfter, or missing explanations), regenerate ONCE with the specific
    // gaps fed back. Accept the retry only if it reduces the number of jumps.
    if (result.ok && result.data) {
      const continuityIssues = validateNoMissingSteps(result.data);
      if (continuityIssues.length > 0) {
        console.log(
          `[Pass 1] ${continuityIssues.length} continuity gap(s) — retrying for missing steps`,
        );
        const continuityMessages = convertToAnthropicMessages([
          ...formattedMessages,
          { role: "assistant" as const, content: rawContent },
          { role: "user" as const, content: buildContinuityRetryMessage(continuityIssues) },
        ]);

        try {
          const retry = await claudeSolve(systemPrompt, continuityMessages);
          const retryResult = validateResponse(retry.content, requiredBlockTypes);
          if (retryResult.ok && retryResult.data) {
            const retryIssues = validateNoMissingSteps(retryResult.data);
            if (retryIssues.length < continuityIssues.length) {
              console.log(
                `[Pass 1] Continuity retry improved: ${continuityIssues.length} → ${retryIssues.length} gap(s)`,
              );
              result = retryResult;
              rawContent = retry.content;
              solverModel = CLAUDE_SOLVER_MODEL;
            }
          }
        } catch {
          // Keep the original solution if the retry fails.
        }
      }
    }

    // If still invalid, try a deterministic builder before falling back to prose.
    if (!result.ok || !result.data) {
      const subtopicsArr = Array.isArray(subtopicsContext)
        ? (subtopicsContext as string[])
        : undefined;
      const builderRescue = applyMethodBuilderToWhiteboard(
        {
          intro: "Let me walk you through this step by step.",
          blocks: [],
          conclusion: "",
          subject: "Maths",
        },
        questionText,
        typeof topicContext === "string" ? topicContext : undefined,
        subtopicsArr,
        { level },
      );
      const rescued = (builderRescue.blocks || []).some(
        (b) =>
          b.type === "equation_steps" ||
          b.type === "column_method" ||
          b.type === "table" ||
          b.type === "number_line",
      );
      if (rescued) {
        send("solver_done", {
          whiteboard: builderRescue,
          response: whiteboardToLegacy(builderRescue),
          category,
          validationWarnings: result.errors || ["Recovered with method builder"],
        });
        controller.close();
        return;
      }
      // An answer in the right shape that still fails a check has failed on
      // presentation: an arrow without its anchor tags, a drawing we asked for
      // and did not get. None of those checks is about the maths. It used to
      // be flattened to a block of text, which cost the pupil the drawing and
      // the steps, and skipped every accuracy check below. It now carries on,
      // without the arrows that cannot be drawn, and is checked like any other.
      const kept = result.data ? withoutBrokenArrows(result.data) : null;
      if (kept && kept.blocks.some((block) => block.type !== "text")) {
        console.log(`[Pass 1] Keeping the structured answer despite: ${(result.errors || []).join("; ")}`);
        result = { ok: true, data: kept, errors: result.errors };
      } else {
        sendFallback(send, rawContent, category, result.errors);
        controller.close();
        return;
      }
    }

    // At this point result.data is guaranteed to exist — capture the reference
    if (!result.data) {
      sendFallback(send, rawContent, category, result.errors);
      controller.close();
      return;
    }
    let solutionData: WhiteboardResponse = result.data;

    // Prefer deterministic method builders whenever the question parses
    // (algebra arrows, KS2 column methods, place value, etc.).
    {
      const subtopicsArr = Array.isArray(subtopicsContext)
        ? (subtopicsContext as string[])
        : undefined;
      solutionData = applyMethodBuilderToWhiteboard(
        solutionData,
        questionText,
        typeof topicContext === "string" ? topicContext : undefined,
        subtopicsArr,
        {
          level,
          // Free safety rail: groundTruth was already computed above from the
          // ORIGINAL question by SymPy/nerdamer, so comparing costs nothing and
          // catches a mis-parsing builder before it overwrites a correct answer.
          agreesWithGroundTruth: groundTruth.verified && groundTruth.answers.length
            ? (builderAnswer) =>
                groundTruth.answers.some((truth) =>
                  mathsAnswersEquivalent(builderAnswer, truth),
                )
            : undefined,
        },
      );
    }

    // What follows from the drawing is worked out from the drawing: the area of
    // an L-shape, and which corner of a triangle is the right angle.
    solutionData = repairArithmetic(settleShapeAnswers(solutionData, questionText), questionText);

    // Attach uploaded image URL so the whiteboard can display it inline
    if (hasImage && lastUserMsg?.imageUrl) {
      solutionData.questionImageUrl = lastUserMsg.imageUrl;
    }

    // ── Post-classification for image questions ─────────────────────────
    // When a student uploads an image with generic text ("Solve this"),
    // classification is unreliable. Re-classify using Claude's restated
    // question from the intro + conclusion to get accurate category.
    let effectiveCategory = category;
    if (hasImage) {
      const solverText = [
        solutionData.intro || "",
        solutionData.conclusion || "",
        solutionData.topic || "",
      ].join(" ");
      const reclassified = classifyQuestion(solverText);
      if (reclassified !== category) {
        console.log(`[PostClassify] Image question reclassified: ${category} → ${reclassified}`);
        effectiveCategory = reclassified;
      }
    }

    const legacyResponse = whiteboardToLegacy(solutionData);

    // ══════════════════════════════════════════════════════════════════
    //  STREAM PASS 1 RESULT TO CLIENT (fast perceived response)
    // ══════════════════════════════════════════════════════════════════

    send("solver_done", {
      whiteboard: solutionData,
      response: legacyResponse,
      category: effectiveCategory,
      validationWarnings: result.errors || [],
    });

    // ══════════════════════════════════════════════════════════════════
    //  VERIFICATION PIPELINE (runs while client already shows solution)
    // ══════════════════════════════════════════════════════════════════

    const truthAnswers =
      groundTruth.verified && groundTruth.answers.length ? groundTruth.answers : null;

    const verification: VerificationStatus = {
      preCasVerified: false,
      postCasVerified: false,
      criticVerified: false,
      toolChecksPassed: false,
      confidence: "low",
      warnings: [],
      // The answer is only "SymPy verified" if SymPy's answer was the one it
      // was compared with AND they agreed — set below, with the CAS checks.
      sympyVerified: false,
      // True only when the solver really was a different model from the
      // critic. It used to be hard-coded true while a bad model ID sent every
      // solve to the GPT-4o fallback, i.e. GPT-4o marking its own work.
      crossModelVerified: solverModel !== CRITIC_MODEL,
    };

    // Attach ground-truth metadata to solution
    solutionData.groundTruthSource = groundTruth.source;
    if (groundTruth.answers.length > 0) {
      solutionData.sympyAnswer = groundTruth.answers.join(", ");
    }

    // ── CAS verification ──────────────────────────────────────────────
    //
    // Two checks, and each one compares the answer ON THE BOARD with something
    // derived from the question alone:
    //   pre  — it equals the answer the CAS computed before the model ran
    //   post — it satisfies the question's equation when substituted back
    //
    // This used to set casVerified (and count TWO of the four sources) the
    // moment the CAS produced any answer, without comparing it to anything.
    //
    // What the checks are run against. For a typed question that is the
    // question itself. For a photo there is no question text — only the
    // solver's reading of the image, which is the thing being checked — so
    // these are replaced below by the CRITIC's independent reading once it
    // has one.
    let checkQuestion: string = questionText;
    let checkTruth: string[] | null = truthAnswers;
    let casAgreement = applyCasChecks(solutionData, verification, checkQuestion, checkTruth);
    verification.sympyVerified = groundTruth.sympyVerified && verification.preCasVerified;

    // ── Deterministic tool checks ─────────────────────────────────────
    const toolReport = runToolChecks(solutionData, questionText);
    // Only a check that actually RAN can count as verification. Many questions
    // have no applicable deterministic check, and those used to score as a pass.
    verification.toolChecksPassed = toolReport.ran && toolReport.allPassed;
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

    // The photo(s) the pupil sent, so the critic can read the question for
    // itself instead of trusting the solver's account of it.
    const questionImages: string[] =
      Array.isArray(lastUserMsg?.imageUrls) && lastUserMsg.imageUrls.length > 0
        ? lastUserMsg.imageUrls
        : lastUserMsg?.imageUrl
          ? [lastUserMsg.imageUrl]
          : [];

    /**
     * One critic review of a draft. Returns null if the critic could not be
     * reached or its reply could not be read — the caller treats that as "not
     * reviewed", never as approval. (A failure here used to throw out of the
     * whole request, after the solution had already been sent to the pupil.)
     */
    const runCritic = async (draftJSON: string): Promise<CriticResult | null> => {
      const text = buildCriticUserMessage(
        questionText,
        draftJSON,
        hasImage,
        groundTruth.verified ? groundTruth : null,
      );
      try {
        const response = await getOpenAI().chat.completions.create({
          model: CRITIC_MODEL,
          max_tokens: CRITIC_MAX_TOKENS,
          response_format: { type: "json_object" },
          messages: [
            { role: "system" as const, content: criticSystemPrompt },
            {
              role: "user" as const,
              content:
                questionImages.length > 0
                  ? [
                      ...questionImages.map((url) => ({
                        type: "image_url" as const,
                        image_url: { url, detail: "high" as const },
                      })),
                      { type: "text" as const, text },
                    ]
                  : text,
            },
          ],
        });
        recordOpenAI(CRITIC_MODEL, response);
        return parseCriticResponse(response.choices[0]?.message?.content || "");
      } catch (criticErr) {
        console.warn(`[Pass 2] Critic call failed: ${(criticErr as Error).message}`);
        return null;
      }
    };

    const criticResult = await runCritic(rawContent);

    // Photo questions: re-run the CAS checks against the critic's own reading
    // of the image. Two models have then read the photo independently, and the
    // algebra engine has solved what the second one read — the first check a
    // photo answer has ever had that did not rest on the solver's own reading.
    if (hasImage && criticResult?.questionAsRead) {
      checkQuestion = criticResult.questionAsRead;
      const read = casSolve(checkQuestion);
      checkTruth = read?.verified && read.answers.length ? read.answers : null;
      console.log(`[Pass 2] Critic read the photo as: ${checkQuestion.slice(0, 120)}`);
      casAgreement = applyCasChecks(solutionData, verification, checkQuestion, checkTruth);
    }

    // A check that is certain outranks the reviewing model's opinion. The mean
    // of a frequency table was passed by the reviewer as 2.6 with 53 ÷ 20
    // written above it.
    const decisiveFailures = toolReport.checks.filter((c) => !c.passed && c.decisive);
    if (criticResult && decisiveFailures.length > 0) {
      criticResult.verified = false;
      for (const failure of decisiveFailures) {
        criticResult.issues.push({
          step: 0,
          type: "arithmetic",
          severity: "critical",
          description: `${failure.check}: ${failure.detail}`,
        });
      }
    }

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
        let correctionModel: string = CLAUDE_SOLVER_MODEL;
        try {
          const correctionResult = await claudeSolve(systemPrompt, correctionAnthropicMessages);
          correctedContent = correctionResult.content;
          recordClaude(correctionResult);
        } catch {
          // Fall back to GPT-4o for correction
          correctionModel = "gpt-4o";
          const fallback = await getOpenAI().chat.completions.create({
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
          recordOpenAI("gpt-4o", fallback);
        }
        const correctedResult = validateResponse(
          correctedContent,
          requiredBlockTypes
        );

        if (correctedResult.ok && correctedResult.data) {
          console.log("[Pass 2] Correction accepted, using corrected solution");
          solutionData = repairArithmetic(settleShapeAnswers(correctedResult.data, questionText), questionText);
          rawContent = correctedContent;
          solverModel = correctionModel;
          // The critic rejected the first draft and has never seen this
          // rewrite. This line used to set criticVerified to true regardless,
          // so the answers the critic had most reason to doubt were the ones
          // reported as critic-approved. The rewrite now gets its own review —
          // one extra call, only on this path — and earns the flag or doesn't.
          // There is no second rewrite: a draft that fails twice is shown as
          // unverified rather than looped on.
          const recheck = await runCritic(correctedContent);
          const recheckPassed =
            !!recheck &&
            recheck.verified &&
            !recheck.issues.some((issue) => issue.severity === "critical");
          verification.criticVerified = recheckPassed;
          if (!recheckPassed) {
            verification.warnings.push(
              recheck
                ? "The rewritten solution did not pass a second review"
                : "The rewritten solution could not be re-reviewed",
            );
          }
          verification.crossModelVerified = solverModel !== CRITIC_MODEL;

          // Re-run the CAS checks against the corrected answer. This used to
          // re-stamp casVerified because the CAS had solved the QUESTION,
          // whatever the new answer was.
          if (hasImage && recheck?.questionAsRead) checkQuestion = recheck.questionAsRead;
          casAgreement = applyCasChecks(solutionData, verification, checkQuestion, checkTruth);
          verification.sympyVerified = groundTruth.sympyVerified && verification.preCasVerified;

          // Re-run tool checks
          const reToolReport = runToolChecks(solutionData, questionText);
          verification.toolChecksPassed = reToolReport.ran && reToolReport.allPassed;
        } else {
          // Correction failed validation — keep original, mark as unverified by critic
          console.log("[Pass 2] Correction failed validation, keeping original draft");
          verification.warnings.push(
            "Critic found issues but correction failed validation — using original solution"
          );
        }
      }
    } else {
      // Critic unreachable or its reply unreadable — treat as unverified
      console.log("[Pass 2] No usable critic response");
      verification.warnings.push("Critic review was not available");
    }

    // ══════════════════════════════════════════════════════════════════
    //  COMPUTE CONFIDENCE & RETURN
    // ══════════════════════════════════════════════════════════════════

    // Confidence from the four checks — each of which now has to have compared
    // something to count. A CAS that contradicts the displayed answer forces
    // "low" whatever the critic said.
    const summary = summariseVerification({
      agreement: casAgreement,
      preCasVerified: verification.preCasVerified,
      postCasVerified: verification.postCasVerified,
      criticVerified: verification.criticVerified,
      toolChecksPassed: verification.toolChecksPassed,
      crossModel: verification.crossModelVerified === true,
    });
    verification.agreementCount = summary.agreementCount;
    verification.confidence = summary.confidence;
    verification.warnings = [...new Set(verification.warnings)];
    solutionData.casVerified = summary.casVerified;

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

    // ── Write to question cache (async, non-blocking) ─────────────────
    // Never cache an answer the CAS contradicts: the cache has no expiry, so a
    // wrong answer stored once is a wrong answer served to every later pupil.
    //
    // Nor one the checks could not stand behind. Every answer used to be saved
    // unless the algebra engine had contradicted it, which it can only do for
    // the few questions it can solve. A paper of 97 known-answer questions
    // (scripts/accuracy-check.ts) got four wrong, and all four were saved to
    // be served to the next pupil who asked. Two of them the app had itself
    // rated "low". An answer rated low is shown once, with its warning, and
    // worked out afresh next time.
    if (cacheable && worthSaving(casAgreement, verification.confidence)) {
      const normalized = normalizeQuestion(questionText);
      const qHash = hashQuestion(normalized, level || "GCSE", tier, examBoard);
      writeCache({
        overwrite: replaceCachedAnswer,
        questionHash: qHash,
        questionText: questionText,
        level: level || "GCSE",
        tier: tier || null,
        examBoard: examBoard || null,
        category: effectiveCategory,
        responseJson: solutionData,
        verificationJson: verification,
        groundTruth: groundTruth.answers?.join(", ") || null,
      }).catch((err) => {
        console.warn("[Cache] Write failed:", (err as Error).message);
      });
    }

    logAiUsage({
      userId: user?.id,
      mode: hintMode ? "hint" : "solve",
      category: effectiveCategory,
      level: level || "GCSE",
      tier: tier || null,
      confidence: verification.confidence,
      calls: aiCalls,
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

// ── CAS checks helper ─────────────────────────────────────────────────────────

/**
 * Run both CAS checks against the board as it stands and record the outcome.
 * Called again after a correction, because the flags describe the answer being
 * shown, not the question.
 */
function applyCasChecks(
  board: WhiteboardResponse,
  verification: VerificationStatus,
  question: string,
  truthAnswers: string[] | null,
): Agreement {
  const checks = runCasChecks(board, question, truthAnswers);
  verification.preCasVerified = checks.preCasVerified;
  verification.postCasVerified = checks.postCasVerified;
  verification.warnings.push(...checks.warnings);
  console.log(
    `[CAS] Displayed answer vs ground truth: ${checks.agreement}` +
      ` (pre=${checks.preCasVerified}, post=${checks.postCasVerified})`,
  );
  return checks.agreement;
}

// ── Fallback helper ───────────────────────────────────────────────────────────

function sendFallback(
  send: (event: string, data: unknown) => void,
  rawContent: string,
  category: string,
  errors?: string[]
) {
  // Try to extract readable content from raw JSON instead of dumping it verbatim
  let fallback: WhiteboardResponse;
  const stripped = rawContent
    .replace(/```json\s*/g, "")
    .replace(/```/g, "")
    .trim();

  try {
    const parsed = JSON.parse(stripped);
    // If it looks like a WhiteboardResponse, salvage what we can
    if (parsed && typeof parsed === "object" && (parsed.intro || parsed.blocks || parsed.conclusion)) {
      const textParts: string[] = [];
      if (parsed.intro) textParts.push(String(parsed.intro));
      if (Array.isArray(parsed.blocks)) {
        for (const block of parsed.blocks) {
          if (block.type === "text" && block.content) {
            textParts.push(String(block.content));
          } else if (block.type === "equation_steps" && Array.isArray(block.steps)) {
            for (const step of block.steps) {
              if (step.explanation) textParts.push(String(step.explanation));
            }
          }
        }
      }
      if (parsed.conclusion) textParts.push(String(parsed.conclusion));

      fallback = {
        intro: parsed.intro ? String(parsed.intro) : "Let me explain this for you.",
        blocks: [{ type: "text", content: textParts.join("\n\n") || stripped }],
        conclusion: parsed.conclusion ? String(parsed.conclusion) : "",
      };
    } else {
      // JSON but not a recognisable response shape — dump as text
      fallback = {
        intro: "Let me explain this for you.",
        blocks: [{ type: "text", content: stripped }],
        conclusion: "",
      };
    }
  } catch {
    // Not JSON — use the raw text as-is
    fallback = {
      intro: "Let me explain this for you.",
      blocks: [{ type: "text", content: stripped }],
      conclusion: "",
    };
  }

  send("solver_done", {
    whiteboard: sanitizeWhiteboardResponse(fallback),
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
    whiteboard: sanitizeWhiteboardResponse(fallback),
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
    // Not drawn by the page. Kept so that when this answer comes back as part
    // of the conversation, the next turn knows what the pupil was told.
    blocks: wb.blocks
      .filter((b): b is Extract<typeof b, { type: "text" }> => b.type === "text")
      .map((b) => ({ type: "text" as const, content: b.content })),
    conclusion: wb.conclusion,
    hint: wb.hint || undefined,
  };
}
