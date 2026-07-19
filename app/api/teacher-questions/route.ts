/**
 * POST /api/teacher-questions
 *
 * Generates 20 practice questions (5 easy, 5 medium, 5 hard, 5 exam-style)
 * for a given topic/subtopic. Returns structured TeacherWorksheetData JSON.
 *
 * Usage limits:
 *   - Anonymous/free: 1 lesson/day (enforced client-side + server check for logged-in)
 *   - Pro: unlimited
 */

import { NextRequest, NextResponse } from "next/server";
import { claudeSolve, convertToAnthropicMessages } from "@/lib/claude-solver";
import { buildTeacherQuestionsPrompt } from "@/lib/prompts/teacher";
import { TeacherQuestionsResponseSchema } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getOpenAI } from "@/lib/openai";

export const maxDuration = 60;


export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { topic, subtopic, level = "GCSE", examBoard } = body;

    if (!topic || !subtopic) {
      return NextResponse.json(
        { error: "topic and subtopic are required" },
        { status: 400 }
      );
    }

    // ── Auth & Usage Check ──────────────────────────────────────────
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("subscription_status")
        .eq("id", user.id)
        .single();

      const subStatus = profile?.subscription_status || "free";

      if (subStatus !== "pro") {
        // Check teacher-mode daily usage (reuse daily_usage, count teacher lessons)
        const today = new Date().toISOString().split("T")[0];
        const { data: usage } = await supabaseAdmin
          .from("daily_usage")
          .select("prompt_count")
          .eq("user_id", user.id)
          .eq("usage_date", today)
          .single();

        // Free users: teacher mode counts toward daily limit
        if ((usage?.prompt_count || 0) >= 5) {
          return NextResponse.json(
            { error: "limit_reached" },
            { status: 429 }
          );
        }
      }
    }

    // ── Generate Questions ──────────────────────────────────────────
    const systemPrompt = buildTeacherQuestionsPrompt(topic, subtopic, level, examBoard);

    const userMessage = `Generate 20 practice questions for "${topic} — ${subtopic}" at ${level} level. Return valid JSON only.`;

    const anthropicMessages = convertToAnthropicMessages([
      { role: "user" as const, content: userMessage },
    ]);

    let rawContent = "";
    try {
      const result = await claudeSolve(systemPrompt, anthropicMessages);
      rawContent = result.content;
    } catch {
      // Fallback to GPT-4o
      console.warn("[TeacherQuestions] Claude failed, falling back to GPT-4o");
      const fallback = await getOpenAI().chat.completions.create({
        model: "gpt-4o",
        max_tokens: 4096,
        response_format: { type: "json_object" },
        messages: [
          { role: "system" as const, content: systemPrompt },
          { role: "user" as const, content: userMessage },
        ],
      });
      rawContent = fallback.choices[0]?.message?.content || "";
    }

    // ── Parse & Validate ────────────────────────────────────────────
    const stripped = rawContent
      .replace(/```json\s*/g, "")
      .replace(/```/g, "")
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(stripped);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse question response" },
        { status: 500 }
      );
    }

    const validated = TeacherQuestionsResponseSchema.safeParse(parsed);
    if (!validated.success) {
      console.error("[TeacherQuestions] Validation errors:", validated.error.issues);
      // Try to salvage: if we have an array at top level or questions array
      const questionsArray = Array.isArray(parsed) ? parsed : parsed?.questions;
      if (questionsArray && Array.isArray(questionsArray) && questionsArray.length > 0) {
        // Use raw questions even if some fields are slightly off
        const worksheetData = {
          topic,
          subtopic,
          level,
          examBoard,
          questions: questionsArray,
          generatedAt: new Date().toISOString(),
        };
        return NextResponse.json(worksheetData);
      }
      return NextResponse.json(
        { error: "Generated questions failed validation" },
        { status: 500 }
      );
    }

    // ── Increment usage ─────────────────────────────────────────────
    if (user) {
      const today = new Date().toISOString().split("T")[0];
      try {
        await supabaseAdmin.rpc("increment_usage", { p_user_id: user.id, p_date: today });
      } catch { /* ignore */ }
    }

    // ── Return ──────────────────────────────────────────────────────
    const worksheetData = {
      topic,
      subtopic,
      level,
      examBoard,
      questions: validated.data.questions,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(worksheetData);
  } catch (error) {
    console.error("[TeacherQuestions] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate questions" },
      { status: 500 }
    );
  }
}
