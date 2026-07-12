/**
 * KS2 teaching-lesson quality validator.
 * Rejects vague prose, thin worked examples, unfit visuals, missing mistakes.
 */

import type {
  KS2CommonMistake,
  KS2TeachingBlock,
  KS2TeachingLesson,
  KS2WorkedExample,
} from "@/types/ks2-lesson";
import { filterFitBlocks, isBlockFit } from "@/lib/ks2-visual-fitness";
import type { VisualBlock } from "@/types/whiteboard";

const VAGUE =
  /\b(it is easy|simply|obviously|clearly just|as you can see)\b|\bjust\s+(do|add|subtract|multiply|divide|write|put|move)\b/i;

export interface KS2LessonValidationIssue {
  code: string;
  message: string;
}

export interface KS2LessonValidationResult {
  ok: boolean;
  issues: KS2LessonValidationIssue[];
}

function collectProse(lesson: Partial<KS2TeachingLesson>): string {
  const parts: string[] = [
    lesson.intro || "",
    lesson.learningObjective || "",
    lesson.recap || "",
    ...(lesson.prerequisiteKnowledge || []),
    ...(lesson.keyPoints || []),
    ...(lesson.sections || []).flatMap((s) => [s.heading, s.body]),
    ...(lesson.teachingBlocks || []).map((b) => b.body),
  ];
  const we = lesson.workedExample || lesson.workedExamples?.[0];
  if (we) {
    parts.push(we.question, we.answer, ...(we.steps || []));
    parts.push(...(we.teachingSteps || []).map((s) => `${s.title} ${s.explanation} ${s.why || ""}`));
  }
  return parts.join("\n");
}

function stepCount(we: KS2WorkedExample | undefined): number {
  if (!we) return 0;
  const teach = Array.isArray(we.teachingSteps) ? we.teachingSteps.length : 0;
  const caps = Array.isArray(we.steps) ? we.steps.length : 0;
  return Math.max(teach, caps);
}

function hasWhy(we: KS2WorkedExample | undefined): boolean {
  if (!we) return false;
  if ((we.teachingSteps || []).some((s) => s.why && s.why.trim().length > 0)) return true;
  return (we.steps || []).some((s) => /\bwhy\b|because|so that/i.test(s));
}

function answerTooEarly(we: KS2WorkedExample | undefined): boolean {
  if (!we || !we.answer) return false;
  const steps = we.teachingSteps?.length
    ? we.teachingSteps.map((s) => s.explanation)
    : we.steps || [];
  if (steps.length === 0) return true;
  const first = (steps[0] || "").toLowerCase();
  const ans = we.answer.toLowerCase().replace(/\s+/g, "");
  if (!ans) return false;
  // First step is basically just the answer
  const compact = first.replace(/\s+/g, "");
  return compact === ans || compact.includes(`=${ans}`) && steps.length < 2;
}

function visualsOk(we: KS2WorkedExample | undefined): boolean {
  if (!we?.whiteboard?.blocks?.length) return true; // non-maths ok without
  const fit = filterFitBlocks(we.whiteboard.blocks, we.question || "");
  return fit.length > 0 && fit.every((b) => isBlockFit(b, we.question || ""));
}

function mistakesOk(
  mistakes: KS2CommonMistake[] | undefined,
  blocks: KS2TeachingBlock[] | undefined,
): boolean {
  if (Array.isArray(mistakes) && mistakes.some((m) => m.mistake && m.correction)) {
    return true;
  }
  return (blocks || []).some(
    (b) =>
      b.type === "commonMistake" &&
      ((b.mistake && b.correction) || (b.body && b.body.length > 10)),
  );
}

/** Validate a teaching lesson (strict for maths Learn). */
export function validateKS2TeachingLesson(
  lesson: Partial<KS2TeachingLesson>,
  opts: { requireVisual?: boolean; maths?: boolean } = {},
): KS2LessonValidationResult {
  const issues: KS2LessonValidationIssue[] = [];
  const maths = opts.maths !== false;

  if (!lesson.learningObjective || lesson.learningObjective.trim().length < 8) {
    issues.push({
      code: "missing_objective",
      message: "Lesson must include a clear learning objective.",
    });
  }

  if (
    !Array.isArray(lesson.prerequisiteKnowledge) ||
    lesson.prerequisiteKnowledge.length === 0
  ) {
    issues.push({
      code: "missing_prereqs",
      message: "Lesson must list prerequisite knowledge.",
    });
  }

  const we = lesson.workedExample || lesson.workedExamples?.[0];
  const steps = stepCount(we);
  if (steps < 4) {
    issues.push({
      code: "few_steps",
      message: `Worked example needs at least 4 micro-steps (found ${steps}).`,
    });
  }

  if (answerTooEarly(we)) {
    issues.push({
      code: "answer_before_reasoning",
      message: "The answer must not appear before reasoning steps.",
    });
  }

  if (!hasWhy(we)) {
    issues.push({
      code: "missing_why",
      message: "Explain why the method works (at least one 'why').",
    });
  }

  if (!mistakesOk(lesson.commonMistakes, lesson.teachingBlocks)) {
    issues.push({
      code: "missing_mistake",
      message: "Include at least one common mistake with a correction.",
    });
  }

  if (!lesson.recap || lesson.recap.trim().length < 8) {
    issues.push({
      code: "missing_recap",
      message: "Include a short recap.",
    });
  }

  const prose = collectProse(lesson);
  if (VAGUE.test(prose)) {
    issues.push({
      code: "vague_language",
      message: 'Avoid vague phrases like "simply", "obviously", "just", or "it is easy".',
    });
  }

  if (maths && (opts.requireVisual !== false)) {
    if (!we?.whiteboard?.blocks?.length) {
      issues.push({
        code: "missing_visual",
        message: "Maths worked example must include a whiteboard visual.",
      });
    } else if (!visualsOk(we)) {
      issues.push({
        code: "unfit_visual",
        message: "Whiteboard visual failed fitness (empty line, no markers, etc.).",
      });
    }
  }

  // Number-line markers / fraction bars when present
  for (const b of we?.whiteboard?.blocks || []) {
    const blockIssues = validateVisualBlock(b, we?.question || "");
    issues.push(...blockIssues);
  }

  return { ok: issues.length === 0, issues };
}

export function validateVisualBlock(
  block: VisualBlock,
  question: string,
): KS2LessonValidationIssue[] {
  const issues: KS2LessonValidationIssue[] = [];
  if (block.type === "number_line") {
    const markers = Array.isArray(block.markers) ? block.markers : [];
    if (markers.length === 0 && /\d+\s*\/\s*\d+/.test(question)) {
      issues.push({
        code: "number_line_no_markers",
        message: "Fraction number lines must include markers.",
      });
    }
  }
  if (block.type === "fraction_bar") {
    if (
      !Number.isFinite(block.numerator) ||
      !Number.isFinite(block.denominator) ||
      block.denominator <= 0
    ) {
      issues.push({
        code: "fraction_bar_invalid",
        message: "Fraction bars need numerator, denominator, and shaded parts.",
      });
    }
  }
  if (block.type === "fraction_wall") {
    if (!Array.isArray(block.rows) || block.rows.length === 0) {
      issues.push({
        code: "fraction_wall_empty",
        message: "Fraction walls need at least one row of bars.",
      });
    }
  }
  if (block.type === "bar_model") {
    if (!Array.isArray(block.parts) || block.parts.length === 0) {
      issues.push({
        code: "bar_model_empty",
        message: "Bar models need labelled parts.",
      });
    }
  }
  if (block.type === "hundred_square") {
    if (!Number.isFinite(block.shaded) || block.shaded < 0 || block.shaded > 100) {
      issues.push({
        code: "hundred_square_invalid",
        message: "Hundred squares need shaded 0–100.",
      });
    }
  }
  if (block.type === "area_model") {
    if (!Number.isFinite(block.rows) || !Number.isFinite(block.cols)) {
      issues.push({
        code: "area_model_invalid",
        message: "Area models need rows and cols.",
      });
    }
  }
  if (block.type === "key_info") {
    if (!block.stem || !Array.isArray(block.highlights) || block.highlights.length === 0) {
      issues.push({
        code: "key_info_empty",
        message: "Key-info blocks need a stem and highlights.",
      });
    }
  }
  return issues;
}

/** Soft-normalize LLM/legacy payloads into a teaching lesson shape. */
export function normalizeToTeachingLesson(
  raw: Record<string, unknown>,
  meta: {
    topic: string;
    yearGroup?: string;
    strand?: string;
    skill?: string;
    method?: string;
  },
): KS2TeachingLesson {
  const workedRaw =
    (raw.workedExample as Record<string, unknown> | undefined) ||
    (Array.isArray(raw.workedExamples)
      ? (raw.workedExamples[0] as Record<string, unknown>)
      : undefined);

  const workedExample: KS2WorkedExample = workedRaw
    ? {
        question: String(workedRaw.question || ""),
        steps: Array.isArray(workedRaw.steps)
          ? workedRaw.steps.map(String)
          : [],
        answer: String(workedRaw.answer || ""),
        emoji: workedRaw.emoji ? String(workedRaw.emoji) : undefined,
        whiteboard: workedRaw.whiteboard as KS2WorkedExample["whiteboard"],
        teachingSteps: Array.isArray(workedRaw.teachingSteps)
          ? (workedRaw.teachingSteps as KS2WorkedExample["teachingSteps"])
          : undefined,
      }
    : { question: "", steps: [], answer: "" };

  const commonMistakes: KS2CommonMistake[] = Array.isArray(raw.commonMistakes)
    ? (raw.commonMistakes as KS2CommonMistake[])
        .filter((m) => m && (m.mistake || m.correction))
        .map((m) => ({
          mistake: String(m.mistake || ""),
          correction: String(m.correction || ""),
        }))
    : [];

  const teachingBlocks: KS2TeachingBlock[] = Array.isArray(raw.teachingBlocks)
    ? (raw.teachingBlocks as KS2TeachingBlock[])
    : [];

  const learningObjective = String(
    raw.learningObjective ||
      teachingBlocks.find((b) => b.type === "learningObjective")?.body ||
      "",
  );

  const prerequisiteKnowledge = Array.isArray(raw.prerequisiteKnowledge)
    ? raw.prerequisiteKnowledge.map(String)
    : [];

  const guidedPractice = Array.isArray(raw.guidedPractice)
    ? (raw.guidedPractice as KS2TeachingLesson["guidedPractice"])
    : [];
  const independentPractice = Array.isArray(raw.independentPractice)
    ? (raw.independentPractice as KS2TeachingLesson["independentPractice"])
    : [];

  const quickCheck =
    raw.quickCheck && typeof raw.quickCheck === "object"
      ? (raw.quickCheck as KS2TeachingLesson["quickCheck"])
      : {
          question: String((raw.tryThis as { question?: string })?.question || ""),
          answer: String((raw.tryThis as { answer?: string })?.answer || ""),
        };

  const tryThis =
    raw.tryThis && typeof raw.tryThis === "object"
      ? {
          question: String((raw.tryThis as { question: string }).question || ""),
          answer: String((raw.tryThis as { answer?: string }).answer || ""),
        }
      : guidedPractice[0]
        ? {
            question: guidedPractice[0].question,
            answer: guidedPractice[0].answer,
          }
        : undefined;

  return {
    schemaVersion: 2,
    keyStage: "KS2",
    yearGroup: meta.yearGroup,
    strand: meta.strand,
    topic: meta.topic,
    skill: meta.skill,
    method: meta.method,
    learningObjective,
    prerequisiteKnowledge,
    teachingBlocks,
    workedExamples: [workedExample],
    guidedPractice,
    independentPractice,
    quickCheck,
    commonMistakes,
    recap: String(raw.recap || ""),
    intro: String(raw.intro || ""),
    heroEmoji: raw.heroEmoji ? String(raw.heroEmoji) : undefined,
    sections: Array.isArray(raw.sections)
      ? (raw.sections as KS2TeachingLesson["sections"])
      : [],
    workedExample,
    keyPoints: Array.isArray(raw.keyPoints)
      ? raw.keyPoints.map(String)
      : [],
    tryThis,
  };
}
