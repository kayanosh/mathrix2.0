/**
 * Answer keys must not reach a pupil's browser.
 *
 * `/api/ks2-lesson` has no authentication and returned the full lesson including
 * every practice answer. The lesson panel hid them behind a `staffMode` toggle,
 * but that toggle is plain client state — any pupil can click it, and the
 * answers were in the network response either way. Hiding is not withholding.
 */
import {
  isStaffRole,
  lessonForRole,
  stripStaffOnlyContent,
} from "@/lib/ks2-staff-content";

const lesson = {
  learningObjective: "Add two 4-digit numbers.",
  workedExample: { question: "47 + 36", answer: "83", steps: ["…"] },
  guidedPractice: [
    { question: "24 + 13", answer: "37", hint: "Line up the ones." },
    { question: "51 + 28", answer: "79" },
  ],
  independentPractice: [{ question: "62 + 19", answer: "81" }],
  quickCheck: { question: "What is 40 + 40?", answer: "80" },
  tryThis: { question: "35 + 47", answer: "82" },
};

describe("stripStaffOnlyContent", () => {
  it("removes the practice answer keys", () => {
    const out = stripStaffOnlyContent(lesson) as typeof lesson;
    expect(out.guidedPractice[0]).not.toHaveProperty("answer");
    expect(out.guidedPractice[1]).not.toHaveProperty("answer");
    expect(out.independentPractice[0]).not.toHaveProperty("answer");
    expect(out.quickCheck).not.toHaveProperty("answer");
  });

  it("keeps everything a pupil legitimately needs", () => {
    const out = stripStaffOnlyContent(lesson) as typeof lesson;
    // The questions themselves, and the hint, are the lesson.
    expect(out.guidedPractice[0].question).toBe("24 + 13");
    expect(out.guidedPractice[0].hint).toBe("Line up the ones.");
    expect(out.quickCheck.question).toBe("What is 40 + 40?");
    expect(out.learningObjective).toBe("Add two 4-digit numbers.");
  });

  it("keeps tryThis.answer — that one IS for the pupil", () => {
    // "Now you try" has its own Show answer button so a child can self-check
    // after attempting. Stripping it would break the one place a pupil is meant
    // to see a worked solution.
    const out = stripStaffOnlyContent(lesson) as typeof lesson;
    expect(out.tryThis.answer).toBe("82");
  });

  it("keeps the worked example — the lesson teaches by showing it", () => {
    const out = stripStaffOnlyContent(lesson) as typeof lesson;
    expect(out.workedExample.answer).toBe("83");
  });

  it("does not mutate the input", () => {
    // The same object is written to the shared cache and must keep its answers
    // for staff and for the review queue.
    const original = JSON.parse(JSON.stringify(lesson));
    stripStaffOnlyContent(lesson);
    expect(lesson).toEqual(original);
  });

  it("survives a lesson missing those sections", () => {
    expect(() => stripStaffOnlyContent({ intro: "hi" })).not.toThrow();
    expect(stripStaffOnlyContent({ intro: "hi" })).toEqual({ intro: "hi" });
    expect(stripStaffOnlyContent({ guidedPractice: [] })).toEqual({ guidedPractice: [] });
  });

  it("leaves an item that has no answer field alone", () => {
    const out = stripStaffOnlyContent({
      guidedPractice: [{ question: "no answer here" }],
    }) as { guidedPractice: { question: string }[] };
    expect(out.guidedPractice[0].question).toBe("no answer here");
  });
});

describe("isStaffRole", () => {
  it("admits staff", () => {
    for (const role of ["teacher", "tutor", "centre_owner", "admin"]) {
      expect(isStaffRole(role)).toBe(true);
    }
  });

  it("refuses pupils and anonymous callers", () => {
    // getCallerProfile() defaults an unreadable profile to "student", so the
    // failure mode of the whole chain is least-privilege.
    for (const role of ["student", "", null, undefined, "STUDENT", "Teacher"]) {
      expect(isStaffRole(role as string)).toBe(false);
    }
  });
});

describe("lessonForRole", () => {
  it("gives staff the answers", () => {
    const out = lessonForRole(lesson, "teacher") as typeof lesson;
    expect(out.guidedPractice[0].answer).toBe("37");
    expect(out.quickCheck.answer).toBe("80");
  });

  it("withholds them from a pupil", () => {
    const out = lessonForRole(lesson, "student") as typeof lesson;
    expect(out.guidedPractice[0]).not.toHaveProperty("answer");
    expect(out.quickCheck).not.toHaveProperty("answer");
  });

  it("withholds them from an unauthenticated caller", () => {
    // The route has no auth at all, so this is the common case, not the edge one.
    const out = lessonForRole(lesson, null) as typeof lesson;
    expect(out.independentPractice[0]).not.toHaveProperty("answer");
  });
});
