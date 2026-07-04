import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import type { TutorSolutionQuestion, TutorWorksheet } from "@/types";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const maxDuration = 60;

const DIFFICULTIES = ["easy", "medium", "hard", "exam"] as const;

/**
 * POST /api/tutor-worksheet
 * Body: { stageId, stageLabel, subjectId, subjectName, examBoard?, topicId,
 *         topicName, subtopics?, level?, count? }
 * Returns a printable worksheet: each question has a full step-by-step solution.
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
    const count: number = Math.min(Math.max(Number(body.count) || 8, 4), 16);

    const isMaths = /math/i.test(subjectName) || subjectId === "maths";
    const mathsRule = isMaths
      ? "Wrap every number, calculation, fraction, equation or symbol in $...$ (for example $x = 4$, $\\frac{3}{4}$). Use double backslashes for LaTeX commands in JSON."
      : "Write in plain prose. For English, a 'solution' is a model answer / mark scheme with the key success criteria; for Science, show the reasoning and correct working.";

    const boardLine = examBoard
      ? `Model the questions on the ${examBoard} ${stageLabel} specification and its exam style.`
      : "";
    const subtopicLine = subtopics.length ? `Focus on these objectives: ${subtopics.join("; ")}.` : "";
    const levelLine = level ? `Overall difficulty target: ${level}.` : "";

    const sys = `You are Mathrix, an expert UK ${stageLabel} ${subjectName} question writer creating a tuition worksheet on "${topicName}".
${boardLine}
${subtopicLine}
${levelLine}

Write exactly ${count} questions, spread across increasing difficulty:
- roughly a quarter "easy" (single-step, builds confidence)
- roughly a quarter "medium" (typical ${stageLabel} difficulty)
- roughly a quarter "hard" (multi-step, combines ideas)
- roughly a quarter "exam" (full exam-style, allocate marks)

For EACH question, provide a COMPLETE step-by-step worked solution (not just the final answer) that a tutor can use to teach the method. ${mathsRule}

Return ONLY valid JSON in exactly this shape (no markdown fences):
{
  "questions": [
    {
      "id": 1,
      "questionText": "the question",
      "answer": "the concise final answer",
      "solutionSteps": ["step 1 of the working", "step 2", "..."],
      "difficulty": "easy",
      "marks": 2
    }
  ]
}
Every question needs 2-6 solutionSteps. Set "marks" for exam-style questions. Make every question distinct.`;

    const completion = await openai.chat.completions.create({
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
            questionText: (q.questionText || "").toString(),
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

    return NextResponse.json(worksheet);
  } catch (err) {
    console.error("tutor-worksheet error:", err);
    return NextResponse.json({ error: "Failed to generate worksheet" }, { status: 500 });
  }
}
