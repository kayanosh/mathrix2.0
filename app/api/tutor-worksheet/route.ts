import { getOpenAI } from "@/lib/openai";
import { NextRequest, NextResponse } from "next/server";
import {
  tutorWorksheetCacheKey,
  lookupTutorWorksheetCache,
  writeTutorWorksheetCache,
} from "@/lib/tutor-lesson-cache";
import { buildTutorWorksheetPrompt } from "@/lib/prompts/tutor";
import { requireTutor, isAuthErr } from "@/lib/centre";
import { allowRequest } from "@/lib/rate-limit";
import type { TutorSolutionQuestion, TutorWorksheet } from "@/types";


export const maxDuration = 60;

const DIFFICULTIES = ["easy", "medium", "hard", "exam"] as const;

/** How many fresh worksheets one tutor may ask for in ten minutes. */
const REGENERATIONS_PER_WINDOW = 20;
const REGENERATION_WINDOW_MS = 600_000;

/**
 * POST /api/tutor-worksheet
 *
 * Body: the topic context, `count`, and optionally
 *   force: true        — write a new worksheet instead of returning the saved one
 *   avoid: string[]    — questions already on the tutor's screen, not to be repeated
 *
 * Tutor-only. It used to be open to anyone, signed in or not, which let any
 * visitor run paid model calls and — with `force` — overwrite the worksheet
 * every tutor is served for a topic.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireTutor();
    if (isAuthErr(auth)) return auth.error;

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
    const avoid: string[] = Array.isArray(body.avoid)
      ? body.avoid
          .filter((q: unknown): q is string => typeof q === "string" && q.trim().length > 0)
          .slice(0, 16)
          .map((q: string) => q.trim().slice(0, 300))
      : [];

    const cacheKey = tutorWorksheetCacheKey(topicId, examBoard, level, scienceTrack, count);

    if (topicId && !force) {
      const cached = await lookupTutorWorksheetCache(cacheKey);
      if (cached) return NextResponse.json({ ...cached, cached: true });
    }

    if (
      force &&
      !allowRequest(`tutor-worksheet:${auth.user.id}`, REGENERATIONS_PER_WINDOW, REGENERATION_WINDOW_MS)
    ) {
      return NextResponse.json(
        { error: "That's a lot of new worksheets — try again in a few minutes." },
        { status: 429 },
      );
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

    // "Regenerate" means the tutor has seen the current set and wants another.
    // Asking for the same thing again at the same temperature often returns
    // much the same questions, so the ones on screen are named as off-limits.
    const request =
      force && avoid.length > 0
        ? `Create a NEW ${count}-question worksheet on "${topicName}" now. It replaces an earlier one, so do not repeat or lightly reword any of these questions — use different numbers, contexts and question types:\n${avoid
            .map((q) => `- ${q}`)
            .join("\n")}`
        : `Create the ${count}-question worksheet on "${topicName}" now.`;

    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: sys },
        { role: "user", content: request },
      ],
      max_tokens: 3500,
      temperature: force ? 0.9 : 0.7,
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
        cacheKey,
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
