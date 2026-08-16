/**
 * The cached-lesson serving gate.
 *
 * `validateKS2TeachingLesson` returns `ok: issues.length === 0` — ANY issue,
 * including cosmetic ones. The cache-read path used to gate on that `.ok`, so a
 * single `sentence_too_long` threw away a good lesson, spent up to three fresh
 * LLM calls regenerating it, and then never wrote the result back because a
 * soft failure set `cacheable = false`. Those combinations were permanently
 * cold: every request paid full generation, which in a classroom is a 30-90s
 * stall in front of thirty children, repeatedly.
 *
 * Measured across the live cache before the fix: 147 of 440 lessons (33%) were
 * discarded on read, 46% of maths, with 968 historical hits between them.
 *
 * These tests pin the distinction that fix rests on.
 */
import { readFileSync } from "fs";
import {
  BLOCKING_LESSON_ISSUES,
  ENRICH_BACKFILLED_ISSUES,
  TEACHING_SUBJECTS,
  blockingIssues,
  servingBlockers,
} from "@/lib/ks2-lesson-issues";

describe("what makes a lesson unfit to teach", () => {
  it("treats wrong maths and broken diagrams as blocking", () => {
    for (const code of [
      "math_answer_mismatch",
      "equation_steps_incomplete",
      "mistake_mismatch",
      "answer_before_reasoning",
      "missing_visual",
      "unfit_visual",
      "visual_mismatch",
      "uk_gcd_forbidden",
    ]) {
      expect(BLOCKING_LESSON_ISSUES.has(code)).toBe(true);
    }
  });

  it("does NOT treat a stylistic shortfall as a reason to withhold the lesson", () => {
    // Each of these was, in effect, a reason to show a child nothing.
    for (const code of [
      "sentence_too_long",
      "vague_language",
      "generic_recap",
      "few_steps",
      "missing_why",
      "missing_objective",
      "missing_prereqs",
      "missing_recap",
      "missing_mistake",
    ]) {
      expect(BLOCKING_LESSON_ISSUES.has(code)).toBe(false);
    }
  });

  it("blocks a structurally broken coordinate graph", () => {
    // The only validateVisualBlock code that was missing from the set, so a
    // broken graph was served while every other broken visual was rejected.
    expect(BLOCKING_LESSON_ISSUES.has("coordinate_graph_invalid")).toBe(true);
  });

  it("covers every visual-block code the validator can emit", () => {
    // Guards the gap above from reopening when a new visual type is added.
    const src = readFileSync("lib/ks2-lesson-validator.ts", "utf-8");
    const emitted = [...src.matchAll(/code:\s*"([a-z_]+_(?:invalid|empty|no_markers|incomplete))"/g)]
      .map((m) => m[1]);
    expect(emitted.length).toBeGreaterThan(5);
    for (const code of new Set(emitted)) {
      expect(BLOCKING_LESSON_ISSUES.has(code)).toBe(true);
    }
  });

  it("stays in step with the serving path", () => {
    // route.ts must import the shared set, never re-declare its own copy — a
    // drifted copy would make the health report a confident lie.
    const route = readFileSync("app/api/ks2-lesson/route.ts", "utf-8");
    expect(route).toContain('from "@/lib/ks2-lesson-issues"');
    expect(route).not.toMatch(/const BLOCKING_LESSON_ISSUES\s*=\s*new Set/);
  });
});

describe("servingBlockers", () => {
  it("ignores issues the route backfills before validating", () => {
    // enrichTeachingFields supplies these from the taxonomy, so they can never
    // be a reason to reject a cached lesson. Counting them overstates how much
    // of the cache is unusable.
    for (const code of ENRICH_BACKFILLED_ISSUES) {
      expect(BLOCKING_LESSON_ISSUES.has(code)).toBe(false);
      expect(servingBlockers([code])).toEqual([]);
    }
  });

  it("keeps a real blocker even alongside backfilled ones", () => {
    expect(servingBlockers(["missing_recap", "math_answer_mismatch"])).toEqual([
      "math_answer_mismatch",
    ]);
  });

  it("serves a lesson whose only faults are cosmetic", () => {
    expect(blockingIssues(["sentence_too_long", "vague_language", "few_steps"])).toEqual([]);
  });

  it("is empty for a clean lesson", () => {
    expect(blockingIssues([])).toEqual([]);
    expect(servingBlockers([])).toEqual([]);
  });
});

describe("TEACHING_SUBJECTS", () => {
  it("lists the subjects that get validated at all", () => {
    for (const s of ["maths", "english", "science", "computing", "arabic"]) {
      expect(TEACHING_SUBJECTS.has(s)).toBe(true);
    }
  });

  it("excludes vr/nvr, which currently bypass validation entirely", () => {
    // Documenting a real gap rather than asserting it is correct — cached vr
    // and nvr lessons are returned unchecked (route.ts). Phase 1 closes this.
    expect(TEACHING_SUBJECTS.has("vr")).toBe(false);
    expect(TEACHING_SUBJECTS.has("nvr")).toBe(false);
  });
});
