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
  /**
   * Anchors the teacher cursor should visit this step, in teaching order,
   * matched against a rendered element's `data-teacher-id` (DEF-004).
   *
   * Authoritative when present: the cursor visits exactly these, in this
   * order, instead of inferring anchors from the board. Timing within the
   * step comes from aligning each anchor's label to the narration. Leave
   * unset to keep the inferred behaviour — an anchor id that matches nothing
   * on the board is skipped rather than freezing the cursor.
   */
  focusTargetIds?: string[];
  /**
   * Things on the board this step talks about, named rather than positioned.
   *
   * `cellKeys` can only ever name a grid cell ("row-col"), which is why 30-odd
   * non-grid builders satisfy that contract with `[]`. A label can name
   * anything a renderer has labelled — the 3/4 tick on a number line, the
   * shaded third of a bar, a side of a shape — and `teacherTargetIndex()`
   * already matches anchors to narration **by label**, so this reuses the
   * existing alignment rather than adding a second mechanism. Resolved at
   * runtime against `[data-teacher-label]` inside the focused block when no
   * `id` is given.
   */
  anchors?: TeachingAnchor[];
  /**
   * A separate question for the pupil, spoken after the explanation. Drives the
   * player's `check` phase and the pause that follows it.
   *
   * Present on the runtime shape (`types/whiteboard.ts`) but previously absent
   * here, so no deterministic builder could ever produce one and builder-built
   * lessons silently lost the "Your turn" beat.
   */
  check?: string;
  /** Which whiteboard block this step belongs to, when a board has several. */
  blockIndex?: number;
  /** Progressive-reveal position within that block. */
  revealStep?: number;
  showAnswer?: boolean;
}

export interface TeachingAnchor {
  /** Exact `data-teacher-id` when the renderer emits one (grid methods). */
  id?: string;
  /** Spoken label to match against `data-teacher-label`, e.g. "3/4", "700". */
  label: string;
}

export type MethodBuilderId =
  | "order_of_operations"
  | "column_multiplication"
  | "column_addition"
  | "column_subtraction"
  | "long_division"
  | "place_value_shift"
  | "place_value_chart"
  | "roman_numerals"
  | "rounding_number_line"
  | "fraction_ops"
  | "fraction_equivalent"
  | "fraction_number_line"
  | "fraction_simplify"
  | "decimal_column"
  | "linear_equation"
  | "quadratic_solve"
  | "fdp_equivalence"
  | "multiples_number_line"
  | "signed_number_line"
  | "rect_perimeter_area"
  | "rectilinear_perimeter"
  | "irregular_area_estimate"
  | "counted_squares_area"
  | "cuboid_volume"
  | "angle_diagram"
  | "protractor_measure"
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
  /** Replaces an awkward question-equals-answer sentence on the whiteboard. */
  conclusion?: string;
}

export function teachingStepsToCaptions(steps: TeachingStep[]): string[] {
  return steps
    .filter((s) => s.explanation && s.title !== "Answer")
    .map((s) => `${s.title}: ${s.explanation}`);
}

/**
 * Preserve the whole method while keeping pupil-facing navigation to 3-6 cards.
 *
 * NOTE this merges TEACHING ATOMS, which is the wrong level: the 3-6 cap is a
 * navigation decision and belongs to presentation, not to the data. Grouping
 * for display now lives in `lib/teaching-cards.ts`; this remains only so
 * callers that have not moved over keep working, and because legacy cache rows
 * were written through it.
 *
 * It also used to rebuild the step object field-by-field and silently omit
 * `focusTargetIds`, so any authored cursor path was deleted the moment a method
 * exceeded six steps — a latent bug that would have fired the instant anything
 * started authoring them. Every field is now carried through.
 */
export function compactTeachingSteps(
  steps: TeachingStep[],
  maxSteps = 6,
): TeachingStep[] {
  const clean = steps.filter((step) => step.title !== "Answer");
  if (clean.length <= maxSteps) return clean;

  return Array.from({ length: maxSteps }, (_, index) => {
    const start = Math.floor((index * clean.length) / maxSteps);
    const end = Math.floor(((index + 1) * clean.length) / maxSteps);
    const group = clean.slice(start, Math.max(start + 1, end));
    const first = group[0];
    const unique = (values: string[]) => [...new Set(values)];
    return {
      title: first.title,
      explanation: group.map((step) => step.explanation).join(" "),
      why:
        group
          .map((step) => step.why)
          .filter((value): value is string => Boolean(value))
          .join(" ") || undefined,
      narration: group.map((step) => step.narration).join(" "),
      cellKeys: unique(group.flatMap((step) => step.cellKeys)),
      carryKeys: unique(group.flatMap((step) => step.carryKeys)),
      noteKeys: unique(group.flatMap((step) => step.noteKeys)),
      // Carried, not dropped. Pen order across a merge boundary is the
      // concatenation of each step's order, deduped the same way the keys are.
      focusTargetIds: (() => {
        const merged = unique(
          group.flatMap((step) => step.focusTargetIds ?? []),
        );
        return merged.length > 0 ? merged : undefined;
      })(),
      anchors: (() => {
        const merged = group.flatMap((step) => step.anchors ?? []);
        const seen = new Set<string>();
        const deduped = merged.filter((a) => {
          const k = `${a.id ?? ""}|${a.label}`;
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });
        return deduped.length > 0 ? deduped : undefined;
      })(),
      // The first check in the group wins: a merged card asks one question, and
      // stacking several "Your turn" prompts into one pause teaches nothing.
      check: group.find((step) => step.check)?.check,
      blockIndex: first.blockIndex,
      revealStep: first.revealStep,
      showAnswer: group.some((step) => step.showAnswer),
    };
  });
}
