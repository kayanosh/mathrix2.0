/**
 * Strict Zod schemas for KS2 teaching lessons (canonical single-skill contract).
 */

import { z } from "zod";

export const KS2MicroStepSchema = z.object({
  stepNumber: z.number().int().positive(),
  title: z.string().min(1),
  teacherText: z.string().min(8),
  calculation: z.string().optional(),
  visualInstruction: z.string().optional(),
  highlightedValues: z.array(z.string()).optional(),
  misconceptionWarning: z.string().optional(),
  why: z.string().optional(),
});

export const KS2RichWorkedExampleSchema = z.object({
  question: z.string().min(3),
  method: z.string().min(3),
  steps: z.array(KS2MicroStepSchema).min(3).max(6),
  finalAnswer: z.string().min(1),
  check: z.string().min(3),
  visualBlocks: z.array(z.record(z.string(), z.unknown())).optional(),
});

const MistakeSchema = z.object({
  mistake: z.string().min(5),
  correction: z.string().min(5),
});

const PracticeItemSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
  hint: z.string().optional(),
});

/**
 * Canonical single-skill lesson.
 * Accepts both new keys (priorKnowledge, coreExplanation, commonMistake)
 * and legacy aliases (prerequisiteKnowledge, conceptExplanation, commonMistakes).
 */
export const KS2StrictLessonSchema = z
  .object({
    keyStage: z.literal("KS2"),
    yearGroup: z.string().min(1),
    strand: z.string().min(1),
    topic: z.string().min(1),
    skill: z.string().min(1),
    method: z.string().min(1),
    learningObjective: z.string().min(8),
    priorKnowledge: z.array(z.string().min(1)).min(1).optional(),
    prerequisiteKnowledge: z.array(z.string().min(1)).min(1).optional(),
    coreExplanation: z.string().min(20).optional(),
    conceptExplanation: z.string().min(20).optional(),
    visualModel: z
      .object({
        type: z.string().min(1).optional(),
        types: z.array(z.string().min(1)).optional(),
        data: z.record(z.string(), z.unknown()).optional(),
      })
      .optional(),
    workedExample: KS2RichWorkedExampleSchema.optional(),
    workedExamples: z.array(KS2RichWorkedExampleSchema).optional(),
    commonMistake: MistakeSchema.optional(),
    commonMistakes: z.array(MistakeSchema).min(1).optional(),
    guidedPractice: z.array(PracticeItemSchema).min(1),
    independentPractice: z.array(PracticeItemSchema).min(1),
    quickCheck: PracticeItemSchema,
    recap: z.string().min(20),
  })
  .superRefine((data, ctx) => {
    const prior = data.priorKnowledge || data.prerequisiteKnowledge;
    if (!prior?.length) {
      ctx.addIssue({
        code: "custom",
        message: "priorKnowledge (or prerequisiteKnowledge) is required",
        path: ["priorKnowledge"],
      });
    }
    const core = data.coreExplanation || data.conceptExplanation;
    if (!core || core.length < 20) {
      ctx.addIssue({
        code: "custom",
        message: "coreExplanation (or conceptExplanation) is required",
        path: ["coreExplanation"],
      });
    }
    const examples =
      data.workedExamples ||
      (data.workedExample ? [data.workedExample] : []);
    if (!examples.length) {
      ctx.addIssue({
        code: "custom",
        message: "workedExample / workedExamples is required",
        path: ["workedExample"],
      });
    }
    const mistakes =
      data.commonMistakes ||
      (data.commonMistake ? [data.commonMistake] : []);
    if (!mistakes.length) {
      ctx.addIssue({
        code: "custom",
        message: "commonMistake / commonMistakes is required",
        path: ["commonMistake"],
      });
    }
  });

export type KS2MicroStep = z.infer<typeof KS2MicroStepSchema>;
export type KS2RichWorkedExample = z.infer<typeof KS2RichWorkedExampleSchema>;
export type KS2StrictLesson = z.infer<typeof KS2StrictLessonSchema>;

/** Convert rich micro-steps into TeachingStep-compatible captions for LessonPanel. */
export function microStepsToTeachingSteps(
  steps: KS2MicroStep[],
): {
  title: string;
  explanation: string;
  why?: string;
  narration: string;
  cellKeys: string[];
  carryKeys: string[];
  noteKeys: string[];
}[] {
  return steps.map((s) => ({
    title: s.title,
    explanation: [s.teacherText, s.calculation].filter(Boolean).join(" "),
    why: s.why || s.misconceptionWarning,
    narration: s.teacherText,
    cellKeys: [],
    carryKeys: [],
    noteKeys: [],
  }));
}

/** Normalize canonical/legacy GPT payload keys into one internal shape. */
export function coerceCanonicalLessonKeys(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const out = { ...raw };
  if (!out.prerequisiteKnowledge && Array.isArray(out.priorKnowledge)) {
    out.prerequisiteKnowledge = out.priorKnowledge;
  }
  if (!out.conceptExplanation && typeof out.coreExplanation === "string") {
    out.conceptExplanation = out.coreExplanation;
  }
  if (
    !Array.isArray(out.commonMistakes) &&
    out.commonMistake &&
    typeof out.commonMistake === "object"
  ) {
    out.commonMistakes = [out.commonMistake];
  }
  if (
    !out.workedExample &&
    Array.isArray(out.workedExamples) &&
    out.workedExamples[0]
  ) {
    out.workedExample = out.workedExamples[0];
  }
  const we = out.workedExample as Record<string, unknown> | undefined;
  if (we && Array.isArray(we.steps) && we.steps.length > 0) {
    const first = we.steps[0];
    if (first && typeof first === "object" && "teacherText" in (first as object)) {
      we.microSteps = we.steps;
      we.steps = (we.steps as KS2MicroStep[]).map((s) =>
        [s.title, s.teacherText, s.calculation].filter(Boolean).join(": "),
      );
      if (!we.answer && we.finalAnswer) we.answer = we.finalAnswer;
    }
  }
  return out;
}
