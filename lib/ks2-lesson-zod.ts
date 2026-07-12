/**
 * Strict Zod schemas for KS2 teaching lessons (maths quality gate).
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
  steps: z.array(KS2MicroStepSchema).min(6),
  finalAnswer: z.string().min(1),
  check: z.string().min(3),
  /** Optional whiteboard blocks (validated separately for fitness) */
  visualBlocks: z.array(z.record(z.string(), z.unknown())).optional(),
});

export const KS2StrictLessonSchema = z.object({
  keyStage: z.literal("KS2"),
  yearGroup: z.string().min(1),
  strand: z.string().min(1),
  topic: z.string().min(1),
  skill: z.string().min(1),
  method: z.string().min(1),
  learningObjective: z.string().min(8),
  prerequisiteKnowledge: z.array(z.string().min(1)).min(1),
  conceptExplanation: z.string().min(20),
  visualModel: z
    .object({
      type: z.string().min(1),
      data: z.record(z.string(), z.unknown()).optional(),
    })
    .optional(),
  workedExamples: z.array(KS2RichWorkedExampleSchema).min(1),
  commonMistakes: z
    .array(
      z.object({
        mistake: z.string().min(5),
        correction: z.string().min(5),
      }),
    )
    .min(1),
  guidedPractice: z
    .array(
      z.object({
        question: z.string().min(1),
        answer: z.string().min(1),
        hint: z.string().optional(),
      }),
    )
    .min(1),
  independentPractice: z
    .array(
      z.object({
        question: z.string().min(1),
        answer: z.string().min(1),
      }),
    )
    .min(1),
  quickCheck: z.object({
    question: z.string().min(1),
    answer: z.string().min(1),
  }),
  recap: z.string().min(20),
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
