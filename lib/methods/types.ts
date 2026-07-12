/**
 * Shared teaching-step contract for deterministic KS2 method builders.
 * Used by column-reveal, LessonPanel captions, and WhiteboardTutor.
 */

export interface TeachingStep {
  /** Short card title, e.g. "Ones × 5" */
  title: string;
  /** What the pupil should do / notice (shown on the card) */
  explanation: string;
  /** Optional "why this works" for Year 5/6 intuition */
  why?: string;
  /** Spoken TTS line (may match explanation) */
  narration: string;
  /** Digit cells written this step ("row-col"), pen order */
  cellKeys: string[];
  /** Carry slots revealed this step */
  carryKeys: string[];
  /** Borrow notes revealed this step */
  noteKeys: string[];
  showAnswer?: boolean;
}

export type MethodBuilderId =
  | "column_multiplication"
  | "column_addition"
  | "column_subtraction"
  | "long_division"
  | "place_value_shift";

export interface MethodBuildResult {
  builderId: MethodBuilderId;
  /** Correct whiteboard block */
  block: import("@/types/whiteboard").ColumnMethodBlock | import("@/types/whiteboard").TableBlock;
  /** Digit/step teaching script — single source of truth */
  teachingSteps: TeachingStep[];
  /** Short captions for LessonPanel workedExample.steps */
  captions: string[];
}

export function teachingStepsToCaptions(steps: TeachingStep[]): string[] {
  return steps
    .filter((s) => !s.showAnswer || s.explanation)
    .map((s) => s.explanation)
    .slice(0, 8);
}
