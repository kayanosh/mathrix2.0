/**
 * Which validator issue codes are fatal to a lesson.
 *
 * This lived as a literal inside app/api/ks2-lesson/route.ts, which meant any
 * audit of cache health had to keep its own copy — and a copy that drifts turns
 * a health report into a confident lie. One definition, imported by both the
 * serving path and `scripts/audit-ks2-cache-health.ts`.
 *
 * The distinction is the point: a BLOCKING issue means the lesson would teach a
 * child something wrong or show them a broken diagram. Everything else
 * (`missing_recap`, `sentence_too_long`, `vague_language`, …) is a quality
 * shortfall worth reporting to staff and worth fixing, but not worth replacing
 * the lesson with an apology.
 */

/** Codes that make a lesson unfit to teach. */
export const BLOCKING_LESSON_ISSUES: ReadonlySet<string> = new Set([
  "answer_before_reasoning",
  "uk_gcd_forbidden",
  "mistake_mismatch",
  "hcf_not_explained",
  "rounding_not_explained",
  "mixed_skill",
  "missing_visual",
  "unfit_visual",
  "visual_mismatch",
  "number_line_no_markers",
  "fraction_bar_invalid",
  "fraction_grid_invalid",
  "fraction_wall_empty",
  "bar_model_empty",
  "hundred_square_invalid",
  "area_model_invalid",
  "cuboid_array_invalid",
  "key_info_empty",
  "force_diagram_invalid",
  "subject_visual_mismatch",
  "multiples_sequence_invalid",
  "math_answer_mismatch",
  "equation_steps_incomplete",
  // A structurally broken graph is as misleading as a wrong number, and this
  // was the only validateVisualBlock code missing from the set.
  "coordinate_graph_invalid",
]);

/**
 * Codes `enrichTeachingFields` backfills from the taxonomy before validating.
 * They cannot be a reason to reject a cached lesson, so cache-health reporting
 * discounts them to avoid overstating how much of the cache is unusable.
 */
export const ENRICH_BACKFILLED_ISSUES: ReadonlySet<string> = new Set([
  "missing_objective",
  "missing_prereqs",
  "missing_mistake",
  "missing_recap",
]);

/** Subjects that go through the teaching engine, and so get validated at all. */
export const TEACHING_SUBJECTS: ReadonlySet<string> = new Set([
  "maths",
  "english",
  "science",
  "computing",
  "arabic",
]);

export function blockingIssues(codes: readonly string[]): string[] {
  return codes.filter((c) => BLOCKING_LESSON_ISSUES.has(c));
}

/**
 * Issues that should stop a lesson being shown, ignoring anything the route
 * backfills. Used by both the cache-read gate and the health audit so the two
 * can never disagree about what "unusable" means.
 */
export function servingBlockers(codes: readonly string[]): string[] {
  return codes.filter(
    (c) => BLOCKING_LESSON_ISSUES.has(c) && !ENRICH_BACKFILLED_ISSUES.has(c),
  );
}
