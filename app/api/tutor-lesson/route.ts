import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import {
  tutorLessonCacheKey,
  lookupTutorLessonCache,
  writeTutorLessonCache,
} from "@/lib/tutor-lesson-cache";
import type { TutorLesson } from "@/types";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * POST /api/tutor-lesson
 * Body: { stageId, stageLabel, subjectId, subjectName, examBoard?, topicId,
 *         topicName, subtopics?, level?, force? }
 * Returns a structured, printable teaching lesson for the tutor to teach from.
 * Cached per topic + board + level so a lesson is generated once and shared.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const stageId: string = body.stageId || "gcse";
    const stageLabel: string = body.stageLabel || "GCSE";
    const subjectId: string = body.subjectId || "maths";
    const subjectName: string = body.subjectName || "Maths";
    const examBoard: string | null = body.examBoard || null;
    const topicId: string = (body.topicId || "").toString();
    const topicName: string = body.topicName || "the topic";
    const subtopics: string[] = Array.isArray(body.subtopics) ? body.subtopics : [];
    const level: string | null = body.level || null;
    const force: boolean = body.force === true;

    if (topicId && !force) {
      const cached = await lookupTutorLessonCache(
        tutorLessonCacheKey(topicId, examBoard, level, "lesson"),
      );
      if (cached) return NextResponse.json({ lesson: cached, cached: true });
    }

    const isMaths = /math/i.test(subjectName) || subjectId === "maths";
    const mathsRule = isMaths
      ? "Wrap every number, calculation, fraction, equation, or symbol in $...$ so it renders (for example $\\frac{3}{4}$, $2x + 5 = 11$). Use double backslashes for LaTeX commands."
      : "Do not use LaTeX or $ symbols; write formulae and terms in plain words.";

    const boardLine = examBoard
      ? `This lesson is for the ${examBoard} specification — use its terminology and question style.`
      : "";
    const subtopicLine = subtopics.length ? `Cover these objectives: ${subtopics.join("; ")}.` : "";
    const levelLine = level ? `Pitch the difficulty at: ${level}.` : "";

    const sys = `You are Mathrix, an outstanding UK tutor preparing a ${stageLabel} ${subjectName} lesson on "${topicName}" for a private tuition session.
${boardLine}
${subtopicLine}
${levelLine}
Write a clear, well-structured lesson the tutor can teach from and print. Be precise and correct. ${mathsRule}

Return ONLY valid JSON in exactly this shape (no markdown fences):
{
  "intro": "1-2 sentence introduction to the topic and why it matters",
  "objectives": ["what the student will be able to do", "..."],
  "sections": [{ "heading": "short heading", "body": "1-4 sentences of clear teaching" }],
  "workedExamples": [{ "question": "an example question", "steps": ["step 1", "step 2"], "answer": "final answer" }],
  "keyPoints": ["a fact/rule to remember", "..."],
  "commonMistakes": ["a common error and how to avoid it", "..."],
  "examTip": "one exam-technique tip"
}
Use 3-5 sections, 2-3 worked examples (each with 3-6 steps), 3-5 key points, and 2-3 common mistakes.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: sys },
        { role: "user", content: `Create the lesson on "${topicName}" now.` },
      ],
      max_tokens: 2200,
      temperature: 0.5,
    });

    const raw = completion.choices[0]?.message?.content || "{}";
    let lesson: TutorLesson | null = null;
    try {
      const parsed = JSON.parse(raw);
      const asStrArray = (v: unknown): string[] =>
        Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : [];
      lesson = {
        intro: (parsed.intro || "").toString(),
        objectives: asStrArray(parsed.objectives),
        sections: Array.isArray(parsed.sections)
          ? parsed.sections
              .filter((s: unknown): s is { heading?: string; body?: string } => !!s && typeof s === "object")
              .map((s: { heading?: string; body?: string }) => ({
                heading: (s.heading || "").toString(),
                body: (s.body || "").toString(),
              }))
              .filter((s: { heading: string; body: string }) => s.body)
          : [],
        workedExamples: Array.isArray(parsed.workedExamples)
          ? parsed.workedExamples
              .filter((e: unknown): e is { question?: string; steps?: unknown; answer?: string } => !!e && typeof e === "object")
              .map((e: { question?: string; steps?: unknown; answer?: string }) => ({
                question: (e.question || "").toString(),
                steps: asStrArray(e.steps),
                answer: (e.answer || "").toString(),
              }))
              .filter((e: { question: string }) => e.question)
          : [],
        keyPoints: asStrArray(parsed.keyPoints),
        commonMistakes: asStrArray(parsed.commonMistakes),
        examTip: parsed.examTip ? parsed.examTip.toString() : undefined,
      };
    } catch {
      /* fall through */
    }

    if (!lesson || (!lesson.intro && lesson.sections.length === 0)) {
      return NextResponse.json({ error: "Could not generate lesson" }, { status: 502 });
    }

    if (topicId) {
      await writeTutorLessonCache({
        cacheKey: tutorLessonCacheKey(topicId, examBoard, level, "lesson"),
        stageId,
        subject: subjectName,
        examBoard,
        topicId,
        topicName,
        level,
        kind: "lesson",
        lesson,
      });
    }

    return NextResponse.json({ lesson, cached: false });
  } catch (err) {
    console.error("tutor-lesson error:", err);
    return NextResponse.json({ error: "Failed to generate lesson" }, { status: 500 });
  }
}
