/**
 * KS2 teaching-lesson quality validator.
 * Rejects weak lessons so they can be regenerated — never show shallow textbook notes.
 */

import type {
  KS2CommonMistake,
  KS2TeachingBlock,
  KS2TeachingLesson,
  KS2WorkedExample,
} from "@/types/ks2-lesson";
import { filterFitBlocks, isBlockFit } from "@/lib/ks2-visual-fitness";
import type { VisualBlock } from "@/types/whiteboard";
import {
  detectSkillVisualFamily,
  satisfiesSkillVisuals,
} from "@/lib/ks2-skill-visuals";
import {
  KS2StrictLessonSchema,
  coerceCanonicalLessonKeys,
  type KS2MicroStep,
  type KS2StrictLesson,
} from "@/lib/ks2-lesson-zod";

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
    parts.push(
      ...(we.teachingSteps || []).map(
        (s) => `${s.title} ${s.explanation} ${s.why || ""}`,
      ),
    );
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
  if ((we.teachingSteps || []).some((s) => s.why && s.why.trim().length > 0))
    return true;
  return (we.steps || []).some((s) => /\bwhy\b|because|so that|equivalent/i.test(s));
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
  const compact = first.replace(/\s+/g, "");
  return compact === ans || (compact.includes(`=${ans}`) && steps.length < 2);
}

function visualsOk(we: KS2WorkedExample | undefined): boolean {
  if (!we?.whiteboard?.blocks?.length) return true;
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

function mistakeMatchesSkill(
  mistakes: KS2CommonMistake[] | undefined,
  family: string,
  prose: string,
): boolean {
  if (!mistakes?.length) return false;
  const blob = mistakes
    .map((m) => `${m.mistake} ${m.correction}`)
    .join(" ")
    .toLowerCase();
  if (family === "fraction_simplify") {
    if (/add(?:ing)? fractions|common denominator first/.test(blob)) {
      return false;
    }
    return /numerator|denominator|both|same number|hcf|only the/.test(blob);
  }
  if (family === "fraction_compare") {
    return /denominator|equivalent|common|numerators without/.test(blob);
  }
  if (family === "rounding") {
    if (/add(?:ing)? fractions|hcf|simplif|multiply|bus.?stop/.test(blob)) {
      return false;
    }
    return /round|digit|decimal|nearest|truncat|place/.test(blob);
  }
  void prose;
  return true;
}

function explainsHcfWhenNeeded(
  family: string,
  we: KS2WorkedExample | undefined,
  prose: string,
): boolean {
  if (family !== "fraction_simplify") return true;
  const blob = `${prose}\n${(we?.teachingSteps || [])
    .map((s) => s.explanation)
    .join("\n")}`.toLowerCase();
  const listsFactors = /factors?\s+of/.test(blob);
  const namesHcf = /\bhcf\b|highest common factor/.test(blob);
  return listsFactors && namesHcf;
}

function explainsRoundingWhenNeeded(
  family: string,
  we: KS2WorkedExample | undefined,
  prose: string,
): boolean {
  if (family !== "rounding") return true;
  const blob = `${prose}\n${(we?.teachingSteps || [])
    .map((s) => `${s.title} ${s.explanation} ${s.why || ""}`)
    .join("\n")}`.toLowerCase();
  const deciding = /decid(?:e|ing)\s+digit|look(?:s|ing)?\s+(?:at\s+)?(?:the\s+)?(?:next|digit)|digit\s+(?:to\s+the\s+)?right|one place to the right/.test(
    blob,
  );
  const fiveRule = /5\s+or\s+more|five\s+or\s+more|≥\s*5|>=\s*5/.test(blob);
  return deciding && fiveRule;
}

/** Flag when declared skill and worked example clearly teach different skills. */
function mixedSkill(
  skill: string | undefined,
  question: string,
): boolean {
  if (!skill || !question) return false;
  const skillFam = detectSkillVisualFamily("", "", skill);
  const qFam = detectSkillVisualFamily(question, "", "");
  if (skillFam === "general" || qFam === "general") return false;
  if (skillFam === "place_value" && qFam === "rounding") return false;
  if (skillFam === "rounding" && qFam === "place_value") return false;
  if (skillFam === "decimals" && qFam === "rounding") return false;
  // FDP equivalence can look like percentages or fraction_ops depending on wording
  if (
    (skillFam === "percentages" || skillFam === "fraction_ops" || skillFam === "decimals") &&
    (qFam === "percentages" || qFam === "fraction_ops" || qFam === "decimals")
  ) {
    return false;
  }
  return skillFam !== qFam;
}

/** Validate a teaching lesson. Visuals required for maths only (unless requireVisual set). */
export function validateKS2TeachingLesson(
  lesson: Partial<KS2TeachingLesson>,
  opts: {
    requireVisual?: boolean;
    /** @deprecated use subject */
    maths?: boolean;
    subject?: string;
    minSteps?: number;
  } = {},
): KS2LessonValidationResult {
  const issues: KS2LessonValidationIssue[] = [];
  const subject = (
    opts.subject || (opts.maths === false ? "english" : "maths")
  ).toLowerCase();
  const isMaths = subject === "maths" || opts.maths === true;
  const requireVisual =
    opts.requireVisual !== undefined ? opts.requireVisual : isMaths;
  const minSteps = opts.minSteps ?? (isMaths ? 6 : 4);

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
  if (steps < minSteps) {
    issues.push({
      code: "few_steps",
      message: `Worked example needs at least ${minSteps} micro-steps (found ${steps}).`,
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
  const longestSentenceWords = prose
    .split(/[.!?\n]+/)
    .reduce(
      (longest, sentence) =>
        Math.max(longest, sentence.trim().split(/\s+/).filter(Boolean).length),
      0,
    );
  if (longestSentenceWords > 32) {
    issues.push({
      code: "sentence_too_long",
      message: "Break long explanations into short child-friendly sentences.",
    });
  }
  if (VAGUE.test(prose)) {
    issues.push({
      code: "vague_language",
      message:
        'Avoid vague phrases like "simply", "obviously", "just", or "it is easy".',
    });
  }

  // UK KS2: never use GCD wording
  if (isMaths && /\bgcd\b|greatest common divisor/i.test(prose)) {
    issues.push({
      code: "uk_gcd_forbidden",
      message: "Use HCF (highest common factor), not GCD, for UK KS2.",
    });
  }

  const family = detectSkillVisualFamily(
    we?.question || "",
    lesson.topic || "",
    lesson.skill || "",
  );

  if (
    isMaths &&
    !mistakeMatchesSkill(lesson.commonMistakes, family, prose)
  ) {
    issues.push({
      code: "mistake_mismatch",
      message: "Common mistake must match the skill being taught.",
    });
  }

  if (isMaths && !explainsHcfWhenNeeded(family, we, prose)) {
    issues.push({
      code: "hcf_not_explained",
      message:
        "Simplifying lessons must list factors and name the HCF before dividing.",
    });
  }

  if (isMaths && !explainsRoundingWhenNeeded(family, we, prose)) {
    issues.push({
      code: "rounding_not_explained",
      message:
        "Rounding lessons must explain the deciding digit and the 5-or-more rule.",
    });
  }

  if (isMaths && mixedSkill(lesson.skill, we?.question || "")) {
    issues.push({
      code: "mixed_skill",
      message:
        "Lesson skill and worked example teach different skills — teach one skill only.",
    });
  }

  if (
    isMaths &&
    lesson.recap &&
    (/today we practised/i.test(lesson.recap) ||
      (/well done/i.test(lesson.recap) && lesson.recap.length < 60))
  ) {
    if (
      !/hcf|factor|simplif|equivalent|method|denominator|numerator|round|digit|decimal|place/i.test(
        lesson.recap,
      )
    ) {
      issues.push({
        code: "generic_recap",
        message: "Recap must be linked to the skill, not a generic remember box.",
      });
    }
  }

  if (requireVisual) {
    if (!we?.whiteboard?.blocks?.length) {
      issues.push({
        code: "missing_visual",
        message: "Maths worked example must include a whiteboard visual.",
      });
    } else if (!visualsOk(we)) {
      issues.push({
        code: "unfit_visual",
        message:
          "Whiteboard visual failed fitness (empty line, no markers, etc.).",
      });
    } else {
      const types = we.whiteboard.blocks.map((b) => b.type);
      if (!satisfiesSkillVisuals(types, family)) {
        issues.push({
          code: "visual_mismatch",
          message: `Visual does not match skill family "${family}".`,
        });
      }
    }
  } else if (we?.whiteboard?.blocks?.length && !visualsOk(we)) {
    issues.push({
      code: "unfit_visual",
      message: "Whiteboard visual failed fitness — fix or omit the diagram.",
    });
  }

  for (const b of we?.whiteboard?.blocks || []) {
    issues.push(...validateVisualBlock(b, we?.question || ""));
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
  if (block.type === "fraction_grid") {
    if (
      !Number.isFinite(block.numerator) ||
      !Number.isFinite(block.denominator) ||
      block.denominator <= 0
    ) {
      issues.push({
        code: "fraction_grid_invalid",
        message: "Fraction grids need numerator, denominator, and renderable cells.",
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
    if (
      !block.stem ||
      !Array.isArray(block.highlights) ||
      block.highlights.length === 0
    ) {
      issues.push({
        code: "key_info_empty",
        message: "Key-info blocks need a stem and highlights.",
      });
    }
  }
  return issues;
}

/** Validate a strict Zod lesson payload (rich micro-steps). */
export function validateStrictKS2Lesson(
  raw: unknown,
): KS2LessonValidationResult {
  const parsed = KS2StrictLessonSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((i) => ({
        code: "zod_schema",
        message: `${i.path.join(".")}: ${i.message}`,
      })),
    };
  }
  const lesson = parsed.data;
  const issues: KS2LessonValidationIssue[] = [];
  const prose = JSON.stringify(lesson);
  if (/\bgcd\b|greatest common divisor/i.test(prose)) {
    issues.push({
      code: "uk_gcd_forbidden",
      message: "Use HCF, not GCD.",
    });
  }
  if (VAGUE.test(prose)) {
    issues.push({ code: "vague_language", message: "Vague language found." });
  }
  const examples =
    lesson.workedExamples ||
    (lesson.workedExample ? [lesson.workedExample] : []);
  for (const ex of examples) {
    if (ex.steps.length < 6) {
      issues.push({
        code: "few_steps",
        message: `Worked example needs ≥6 steps (found ${ex.steps.length}).`,
      });
    }
  }
  return { ok: issues.length === 0, issues };
}

export function assertNoGcd(text: string): boolean {
  return !/\bgcd\b|greatest common divisor/i.test(text);
}

/** Soft-normalize LLM/legacy payloads into a teaching lesson shape. */
export function normalizeToTeachingLesson(
  rawIn: Record<string, unknown>,
  meta: {
    topic: string;
    yearGroup?: string;
    strand?: string;
    skill?: string;
    method?: string;
  },
): KS2TeachingLesson {
  const raw = coerceCanonicalLessonKeys(rawIn);
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
        answer: String(
          workedRaw.answer || workedRaw.finalAnswer || "",
        ),
        emoji: workedRaw.emoji ? String(workedRaw.emoji) : undefined,
        whiteboard: workedRaw.whiteboard as KS2WorkedExample["whiteboard"],
        teachingSteps: Array.isArray(workedRaw.teachingSteps)
          ? (workedRaw.teachingSteps as KS2WorkedExample["teachingSteps"])
          : Array.isArray(workedRaw.microSteps)
            ? (workedRaw.microSteps as KS2MicroStep[]).map((s) => ({
                title: s.title,
                explanation: [s.teacherText, s.calculation]
                  .filter(Boolean)
                  .join(" "),
                why: s.why || s.misconceptionWarning,
                narration: s.teacherText,
                cellKeys: [],
                carryKeys: [],
                noteKeys: [],
              }))
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
          question: String(
            (raw.tryThis as { question?: string })?.question || "",
          ),
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

  const conceptExplanation = String(
    raw.conceptExplanation ||
      (Array.isArray(raw.sections)
        ? (raw.sections as { body?: string }[])
            .map((s) => s.body || "")
            .join(" ")
        : ""),
  );

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
    intro: String(raw.intro || conceptExplanation.slice(0, 120) || ""),
    heroEmoji: raw.heroEmoji ? String(raw.heroEmoji) : undefined,
    sections: Array.isArray(raw.sections)
      ? (raw.sections as KS2TeachingLesson["sections"])
      : conceptExplanation
        ? [
            {
              heading: "Core idea",
              body: conceptExplanation,
            },
          ]
        : [],
    workedExample,
    keyPoints: Array.isArray(raw.keyPoints) ? raw.keyPoints.map(String) : [],
    tryThis,
  };
}

export type { KS2StrictLesson, KS2MicroStep };
