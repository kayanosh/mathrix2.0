import { getOpenAI } from "@/lib/openai";
import { NextRequest, NextResponse } from "next/server";
import { allowRequest, requestClientKey } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Generate one practice question.
 *
 * This endpoint had NO authentication, NO rate limit and NO usage metering — a
 * public URL that spends OpenAI credit on every call, with nothing to stop a
 * loop. It is now gated the same way the rest of the paid surface is:
 *
 *   1. a burst limiter keyed on client IP (the pattern used by /api/tts),
 *   2. a signed-in session, so there is a user row to meter against,
 *   3. the shared `daily_usage` counter, so a free user's practice generations
 *      draw on the same allowance as their tutor questions.
 *
 * The burst limiter is defence in depth rather than the real gate:
 * `lib/rate-limit.ts` is an in-memory Map, so on serverless it is per-instance.
 * Authentication is what actually bounds the spend.
 */

/** Matches the free chat allowance in app/api/chat/route.ts. */
const FREE_DAILY_LIMIT = 5;

export async function POST(req: NextRequest) {
  try {
    // 1. Burst guard — cheap, and catches a runaway client before auth work.
    if (!allowRequest(`generate-practice:${requestClientKey(req.headers)}`, 30, 60_000)) {
      return NextResponse.json(
        { error: "Too many practice questions requested. Please wait a moment." },
        { status: 429 },
      );
    }

    // 2. Require a session. Without a user row there is nothing to meter, which
    //    is exactly how this endpoint was previously unbounded.
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Please sign in to generate practice questions.", reason: "auth_required" },
        { status: 401 },
      );
    }

    // 3. Meter against the shared daily allowance, unless the user is Pro.
    const today = new Date().toISOString().split("T")[0];
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("subscription_status")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.subscription_status !== "pro") {
      const { data: usage } = await supabaseAdmin
        .from("daily_usage")
        .select("prompt_count")
        .eq("user_id", user.id)
        .eq("usage_date", today)
        .maybeSingle();
      if ((usage?.prompt_count ?? 0) >= FREE_DAILY_LIMIT) {
        return NextResponse.json(
          { error: "Daily limit reached. Upgrade for unlimited practice.", reason: "limit_reached" },
          { status: 429 },
        );
      }
    }

    const { topic, tier, difficulty } = (await req.json()) as {
      topic?: string;
      tier?: string;
      difficulty?: string;
    };

    const resolvedTopic = topic?.trim().slice(0, 160) || "mixed maths";
    const resolvedTier = tier || "GCSE";
    const resolvedDifficulty = difficulty || "medium";

    const difficultyGuide =
      resolvedDifficulty === "easy" || resolvedDifficulty === "1-3"
        ? "Keep it simple: single-step, small friendly numbers, straightforward application of one concept."
        : resolvedDifficulty === "hard" || resolvedDifficulty === "7-9"
          ? "Make it challenging: multi-step, unfamiliar context, higher-tier skills, requires combining concepts."
          : "Standard difficulty: 2-3 steps, typical GCSE-style question.";

    const systemPrompt = `You are a UK maths teacher creating practice questions.
Generate ONE practice question suitable for a ${resolvedTier} student.
The question should be on the topic: "${resolvedTopic}".
Difficulty: ${resolvedDifficulty}. ${difficultyGuide}
It must be self-contained — include all necessary numbers and context.
Return ONLY the question text — no answer, no explanation, no preamble.`;

    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate a ${resolvedTier} maths practice question on: ${resolvedTopic}` },
      ],
      max_tokens: 120,
      temperature: 0.9,
    });

    const question = completion.choices[0]?.message?.content?.trim() || "";

    // Count the spend. Fire-and-forget: a metering failure must not cost the
    // student the question they already paid for with their allowance.
    void supabaseAdmin
      .rpc("increment_usage", { p_user_id: user.id, p_date: today })
      .then(({ error }) => {
        if (error) console.warn("[generate-practice] usage increment failed:", error.message);
      });

    return NextResponse.json({ question });
  } catch (err) {
    console.error("generate-practice error:", err);
    return NextResponse.json({ error: "Failed to generate question" }, { status: 500 });
  }
}
