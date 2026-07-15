import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { englishQuizExtra } from "@/lib/ks2-english";
import { allowRequest, requestClientKey } from "@/lib/rate-limit";
import { withOpenAIModelFallback } from "@/lib/openai-retry";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const QUIZ_MODEL = process.env.OPENAI_KS2_QUIZ_MODEL || "gpt-5.6-luna";
const QUIZ_FALLBACK_MODEL =
  process.env.OPENAI_KS2_QUIZ_FALLBACK_MODEL || "gpt-5.4-mini";

interface QuizQuestion {
  question: string;
  answer: string;
}

/**
 * POST /api/ks2-quiz
 * Body: { subject, topic, subtopics?, target, tier, count? }
 * Returns: { questions: { question, answer }[] }
 *
 * Used by the KS2 mastery quiz. Questions come back with a model answer / mark
 * scheme so the pupil can self-mark (works for all subjects, including English
 * and Arabic where free-text auto-grading is unreliable).
 */
export async function POST(req: NextRequest) {
  try {
    if (!allowRequest(`ks2-quiz:${requestClientKey(req.headers)}`, 180, 600_000)) {
      return NextResponse.json({ error: "Too many quiz requests" }, { status: 429 });
    }
    const body = await req.json().catch(() => ({}));
    const subject: string = String(body.subject || "Mathematics").slice(0, 80);
    const topic: string = String(body.topic || "general").slice(0, 160);
    const subtopics: string[] = Array.isArray(body.subtopics)
      ? body.subtopics.slice(0, 20).map((value: unknown) => String(value).slice(0, 160))
      : [];
    const target: string = body.target || "curriculum";
    const tier: string = body.tier || "secure";
    const count: number = Math.min(Math.max(Number(body.count) || 4, 1), 8);

    const targetPhrase =
      target === "eleven_plus"
        ? "11+ entrance-exam"
        : target === "sats"
          ? "KS2 SATs"
          : "KS2 curriculum";

    const tierPhrase =
      tier === "developing"
        ? "Working Towards (easier, friendly numbers, single-step)"
        : tier === "greater_depth"
          ? "Greater Depth (challenging, multi-step reasoning, the highest standard)"
          : "Expected Standard (typical year-group difficulty)";

    const subtopicLine = subtopics.length
      ? `Focus on these objectives: ${subtopics.join("; ")}.`
      : "";

    const systemPrompt = `You are a UK primary school teacher writing a short ${targetPhrase} quiz for a Year 5/6 pupil.
Subject: ${subject}. Topic: "${topic}". ${subtopicLine}
Difficulty: ${tierPhrase}.
Write exactly ${count} questions appropriate for a 9-11 year old, in clear, child-friendly language.
For each question provide a concise correct answer or mark scheme (for writing tasks, give 2-3 key success criteria).
Return ONLY valid JSON: {"questions":[{"question":"...","answer":"..."}]}. No markdown, no extra text.
${englishQuizExtra(subject, topic, subtopics)}`;

    const completion = await withOpenAIModelFallback(
      QUIZ_MODEL,
      QUIZ_FALLBACK_MODEL,
      (model) => openai.chat.completions.create({
        model,
        reasoning_effort: "none",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Create the ${count}-question quiz now.` },
        ],
        max_completion_tokens: 900,
        temperature: 0.8,
      }),
    );

    const raw = completion.choices[0]?.message?.content || "{}";
    let questions: QuizQuestion[] = [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.questions)) {
        questions = parsed.questions
          .filter((q: unknown): q is QuizQuestion =>
            !!q && typeof (q as QuizQuestion).question === "string"
          )
          .map((q: QuizQuestion) => ({ question: q.question, answer: q.answer || "" }));
      }
    } catch {
      /* fall through to empty */
    }

    if (questions.length === 0) {
      return NextResponse.json({ error: "Could not generate quiz" }, { status: 502 });
    }

    return NextResponse.json({ questions });
  } catch (err) {
    console.error("ks2-quiz error:", err);
    return NextResponse.json({ error: "Failed to generate quiz" }, { status: 500 });
  }
}
