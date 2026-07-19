import { getOpenAI } from "@/lib/openai";
import { NextRequest, NextResponse } from "next/server";
import {
  tutorLessonCacheKey,
  lookupTutorWorksheetCache,
  writeTutorWorksheetCache,
} from "@/lib/tutor-lesson-cache";
import { buildTutorWorksheetPrompt } from "@/lib/prompts/tutor";
import type { TutorSolutionQuestion, TutorWorksheet } from "@/types";


export const maxDuration = 60;

const DIFFICULTIES = ["easy", "medium", "hard", "exam"] as const;

/**
 * POST /api/tutor-worksheet
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
    const count: number = Math.min(Math.max(Number(body.count) || 8, 4), 16);
    const force: boolean = body.force === true;

    if (topicId && !force) {
      const cached = await lookupTutorWorksheetCache(
        tutorLessonCacheKey(topicId, examBoard, level, "worksheet", scienceTrack),
      );
      if (cached) return NextResponse.json({ ...cached, cached: true });
    }

    const sys = buildTutorWorksheetPrompt({
      stageLabel,
      subjectId,
      subjectName,
      topicName,
      subtopics,
      examBoard,
      level,
      scienceTrack,
      count,
    });

    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: sys },
        { role: "user", content: `Create the ${count}-question worksheet on "${topicName}" now.` },
      ],
      max_tokens: 3500,
      temperature: 0.7,
    });

    const raw = completion.choices[0]?.message?.content || "{}";
    let questions: TutorSolutionQuestion[] = [];
    try {
      const parsed = JSON.parse(raw);
      const arr = Array.isArray(parsed.questions) ? parsed.questions : [];
      questions = arr
        .filter((q: unknown): q is Record<string, unknown> => !!q && typeof q === "object")
        .map((q: Record<string, unknown>, i: number): TutorSolutionQuestion => {
          const diff = DIFFICULTIES.includes(q.difficulty as (typeof DIFFICULTIES)[number])
            ? (q.difficulty as TutorSolutionQuestion["difficulty"])
            : "medium";
          const steps = Array.isArray(q.solutionSteps)
            ? q.solutionSteps.map((s) => String(s)).filter(Boolean)
            : [];
          return {
            id: typeof q.id === "number" ? q.id : i + 1,
            questionText: (q.questionText || q.question || "").toString(),
            answer: (q.answer || "").toString(),
            solutionSteps: steps,
            difficulty: diff,
            marks: typeof q.marks === "number" ? q.marks : undefined,
          };
        })
        .filter((q: TutorSolutionQuestion) => q.questionText);
    } catch {
      /* fall through */
    }

    if (questions.length === 0) {
      return NextResponse.json({ error: "Could not generate worksheet" }, { status: 502 });
    }

    const worksheet: TutorWorksheet = {
      stageId,
      stageLabel,
      subjectId,
      subjectName,
      examBoard: examBoard || undefined,
      topicId,
      topicName,
      level: level || undefined,
      questions,
      generatedAt: new Date().toISOString(),
    };

    if (topicId) {
      await writeTutorWorksheetCache({
        cacheKey: tutorLessonCacheKey(topicId, examBoard, level, "worksheet", scienceTrack),
        stageId,
        subject: subjectName,
        examBoard,
        topicId,
        topicName,
        level,
        worksheet,
      });
    }

    return NextResponse.json({ ...worksheet, cached: false });
  } catch (err) {
    console.error("tutor-worksheet error:", err);
    return NextResponse.json({ error: "Failed to generate worksheet" }, { status: 500 });
  }
}
