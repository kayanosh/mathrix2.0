/**
 * DEF-003 review-backlog triage (lib/ks2-lesson-triage).
 *
 * Every case here is taken from a real row in the live KS2 lesson cache, because
 * the thing this ranking gets wrong is always the same thing: scoring the STORED
 * lesson instead of the one the serve path actually produces.
 */
import {
  triageCachedLesson,
  servedFormOfCachedLesson,
  type LessonTriageContext,
} from "@/lib/ks2-lesson-triage";
import type { CachedKS2Lesson } from "@/lib/ks2-lesson-cache";

function lesson(partial: Partial<CachedKS2Lesson>): CachedKS2Lesson {
  return {
    intro: "Let's learn.",
    sections: [{ heading: "How", body: "Line up the columns." }],
    workedExample: { question: "", steps: [], answer: "" },
    keyPoints: ["Line up the place value columns."],
    schemaVersion: 2,
    ...partial,
  } as CachedKS2Lesson;
}

const mathsCtx = (hitCount: number): LessonTriageContext => ({
  topicId: "y6m-add-subtract",
  topicName: "Addition & Subtraction",
  subtopics: ["add and subtract integers"],
  subject: "maths",
  skill: "add and subtract integers",
  hitCount,
});

/**
 * The single most-served lesson in the live cache (33 hits) and the clearest
 * example of the gap: no builder parses a perimeter question, so nothing in the
 * system checks this answer. Copied verbatim from the cache — an invented
 * plain-text phrasing ("a rectangle 7 cm by 4 cm") IS parseable and quietly
 * tested the opposite of what it looked like.
 */
const perimeterLesson = () =>
  lesson({
    workedExample: {
      question:
        "Find the perimeter of a rectangle with length $8\\text{ cm}$ and width $5\\text{ cm}$.",
      steps: ["Add all four sides: $8 + 5 + 8 + 5$."],
      answer: "$26\\text{ cm}$",
      whiteboard: {
        intro: "",
        blocks: [
          {
            type: "labeled_shape",
            shape: "rectangle",
            vertices: [{ label: "A" }, { label: "B" }, { label: "C" }, { label: "D" }],
            sides: [
              { from: "A", to: "B", label: "8 cm" },
              { from: "B", to: "C", label: "5 cm" },
            ],
          },
        ],
        conclusion: "",
      },
    },
  });

const perimeterCtx = (hitCount: number): LessonTriageContext => ({
  topicId: "y5m-perimeter-area",
  topicName: "Perimeter & Area",
  subtopics: ["perimeter of rectangles"],
  subject: "maths",
  skill: "perimeter of rectangles",
  hitCount,
});

describe("servedFormOfCachedLesson", () => {
  /**
   * The row that motivated the whole triage. Stored, this lesson claims
   * 47,586 + 28,749 = 614 — every digit before a comma dropped. It has been
   * served 13 times. A reviewer looking at the stored JSON would reject it,
   * but the deterministic builder re-derives the example on every request, so
   * what a child is actually taught is correct.
   */
  it("re-derives a stored worked example whose digits were truncated at the comma", () => {
    const served = servedFormOfCachedLesson(
      lesson({
        workedExample: {
          question: "$47,586 + 28,749$",
          steps: ["Add the ones: 6 + 9 = 15.", "So 586 + 749 = 614."],
          answer: "614",
        },
      }),
      mathsCtx(13),
    );

    expect(served.workedExample?.answer).toBe("76335");
    // The prose steps are rebuilt too, not just the answer field — if only the
    // answer were repaired the lesson would contradict itself in front of a class.
    expect(served.workedExample?.steps.join(" ")).toContain("47586");
    expect(served.workedExample?.steps.join(" ")).not.toContain("586 + 749 = 614");
  });
});

describe("triageCachedLesson", () => {
  it("does not treat a self-healing stored answer as pupil-facing risk", () => {
    const t = triageCachedLesson(
      lesson({
        workedExample: {
          question: "$47,586 + 28,749$",
          steps: ["So 586 + 749 = 614."],
          answer: "614",
        },
      }),
      mathsCtx(13),
    );

    expect(t.unverifiable).toBe(false);
    expect(t.storedAnswerWasWrong).toEqual({
      stored: "614",
      correct: "76335",
      builderId: "column_addition",
    });
    // Reported, because the same generation wrote the un-repairable prose —
    // but the queue must show the reviewer the SERVED maths, not the stored.
    expect(t.servedWorkedExample?.answer).toBe("76335");
    expect(t.reasons.map((r) => r.code)).toContain("solver_verified_answer");
  });

  /**
   * The actual backlog: geometry and measure. No builder parses "find the
   * perimeter of this rectangle", so nothing in the system checks it — and
   * these are among the most-served lessons in the cache.
   */
  it("ranks unverifiable, high-traffic content above solver-checked content", () => {
    const geometry = triageCachedLesson(perimeterLesson(), perimeterCtx(33));
    const arithmetic = triageCachedLesson(
      lesson({
        workedExample: {
          question: "$468 + 357$",
          steps: ["Add the ones: 8 + 7 = 15."],
          answer: "825",
        },
      }),
      mathsCtx(33),
    );

    expect(geometry.unverifiable).toBe(true);
    expect(arithmetic.unverifiable).toBe(false);
    expect(geometry.score).toBeGreaterThan(arithmetic.score);
    expect(geometry.band).toBe("high");
  });

  it("treats a non-maths subject as unverifiable regardless of how tidy it looks", () => {
    const t = triageCachedLesson(
      lesson({
        workedExample: {
          question: "Which word is a synonym of 'rapid'?",
          steps: ["Look for a word meaning fast."],
          answer: "quick",
        },
      }),
      {
        topicId: "y5e-vocabulary",
        topicName: "Vocabulary",
        subtopics: ["synonyms"],
        subject: "english",
        skill: "synonyms",
        hitCount: 6,
      },
    );

    expect(t.unverifiable).toBe(true);
    expect(t.reasons.map((r) => r.code)).toContain("no_deterministic_check");
  });

  /**
   * A row the serve path discards is regenerated from scratch on every request,
   * so no pupil is ever taught what is stored in it. Approving or rejecting it
   * changes nothing, and letting it outrank served content would spend a
   * reviewer's hour on lessons that do not exist as far as a class is concerned.
   */
  it("keeps content the serve path discards below content pupils actually receive", () => {
    const discarded = triageCachedLesson(
      lesson({
        // missing_visual: maths requires one, and there is no whiteboard here.
        workedExample: {
          question: "Measure this angle in degrees.",
          steps: ["Line the protractor up with the vertex."],
          answer: "45 degrees",
        },
      }),
      {
        topicId: "y5m-shape",
        topicName: "Shape",
        subtopics: ["measure angles in degrees"],
        subject: "maths",
        skill: "measure angles in degrees",
        hitCount: 23,
      },
    );

    expect(discarded.discardedOnServe).toBe(true);
    expect(discarded.score).toBeLessThanOrEqual(20);
    expect(discarded.reasons.map((r) => r.code)).toContain("discarded_on_serve");
  });

  it("deprioritises a lesson no pupil has ever been served", () => {
    // Same lesson, different exposure — isolating the exposure term. 164 of the
    // 442 cached rows have never been served and must not crowd out teaching
    // children are actually receiving.
    const unserved = triageCachedLesson(perimeterLesson(), perimeterCtx(0));
    const served = triageCachedLesson(perimeterLesson(), perimeterCtx(33));

    expect(unserved.discardedOnServe).toBe(false);
    expect(served.score).toBeGreaterThan(unserved.score);
    expect(unserved.reasons.map((r) => r.code)).toContain("never_served");
  });

  /**
   * vr/nvr skip enrichTeachingFields by design, so missing_objective and
   * friends fire on every single one of those rows. Scoring them ranked the
   * entire vr/nvr set — served 1-3 times each — above every geometry lesson in
   * the cache, on a signal that distinguishes nothing within it.
   */
  it("ignores the enrich-backfilled missing_* codes when scoring quality", () => {
    const t = triageCachedLesson(
      lesson({
        schemaVersion: undefined,
        workedExample: {
          question: "Which figure comes next in the series?",
          steps: ["Count the sides each time."],
          answer: "the pentagon",
        },
      }),
      {
        topicId: "nvr-series",
        topicName: "Series & Sequences",
        subtopics: ["which figure comes next"],
        subject: "nvr",
        skill: "which figure comes next",
        hitCount: 1,
      },
    );

    const quality = t.reasons.find((r) => r.code === "quality_warnings");
    for (const code of ["missing_objective", "missing_prereqs", "missing_mistake", "missing_recap"]) {
      expect(quality?.detail ?? "").not.toContain(code);
    }
  });
});
