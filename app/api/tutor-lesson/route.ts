import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import {
  tutorLessonCacheKey,
  lookupTutorLessonCache,
  writeTutorLessonCache,
} from "@/lib/tutor-lesson-cache";
import { buildTutorLessonPrompt } from "@/lib/prompts/tutor";
import type { TutorLesson } from "@/types";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * POST /api/tutor-lesson
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const stageId: string = body.stageId || "gcse";
    const stageLabel: string = body.stageLabel || "GCSE";
    const subjectId: string = body.subjectId || "maths";
    const subjectName: string = body.subjectName || "Maths";
    const examBoard: string | null = body.examBoard || null;
    const scienceTrack: string | null = body.scienceTrack || null;
    const topicId: string = (body.topicId || "").toString();
    const topicName: string = body.topicName || "the topic";
    const subtopics: string[] = Array.isArray(body.subtopics) ? body.subtopics : [];
    const level: string | null = body.level || null;
    const force: boolean = body.force === true;

    if (topicId && !force) {
      const cached = await lookupTutorLessonCache(
        tutorLessonCacheKey(topicId, examBoard, level, "lesson", scienceTrack),
      );
      if (cached) return NextResponse.json({ lesson: cached, cached: true });
    }

    const sys = buildTutorLessonPrompt({
      stageLabel,
      subjectId,
      subjectName,
      topicName,
      subtopics,
      examBoard,
      level,
      scienceTrack,
    });

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
        cacheKey: tutorLessonCacheKey(topicId, examBoard, level, "lesson", scienceTrack),
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
