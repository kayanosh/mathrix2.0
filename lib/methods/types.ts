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
  | "place_value_shift"
  | "place_value_chart"
  | "rounding_number_line"
  | "fraction_ops"
  | "fraction_number_line"
  | "fraction_simplify"
  | "decimal_column"
  | "linear_equation"
  | "quadratic_solve"
  | "fdp_equivalence"
  | "multiples_number_line"
  | "signed_number_line"
  | "rect_perimeter_area"
  | "cuboid_volume"
  | "angle_diagram"
  | "coordinate_plot"
  | "bar_chart_stats"
  | "unit_conversion"
  | "ratio_table"
  | "function_machine";

export interface MethodBuildResult {
  builderId: MethodBuilderId;
  /** Primary whiteboard block */
  block: import("@/types/whiteboard").VisualBlock;
  /** Optional companion boards (table + steps beside a number line, etc.) */
  extraBlocks?: import("@/types/whiteboard").VisualBlock[];
  /** Digit/step teaching script — single source of truth */
  teachingSteps: TeachingStep[];
  /** Short captions for LessonPanel workedExample.steps */
  captions: string[];
  /** Canonical answer when the block has no answer field (e.g. equation_steps) */
  answer?: string;
  /** Replaces vague LLM whiteboard.intro when the builder owns the method */
  intro?: string;
}

export function teachingStepsToCaptions(steps: TeachingStep[]): string[] {
  return steps
    .filter((s) => s.explanation && s.title !== "Answer")
    .map((s) => `${s.title}: ${s.explanation}`);
}
