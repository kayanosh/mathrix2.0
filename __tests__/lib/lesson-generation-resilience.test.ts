/**
 * Regressions for the "I need to rebuild this lesson before teaching it" card.
 *
 * A user hit it on GCSE "circle theorem". Reproducing the real generation showed
 * THREE independent causes, each on its own sufficient to blank the lesson. All
 * three are covered here, plus the A-Level half of the same problem, which was
 * provable without an LLM call at all.
 */
import { validateResponse } from "@/lib/validate";
import { validateGcseLessonQuality } from "@/lib/gcse-lesson-quality";
import { validateLessonContract } from "@/lib/lesson-contract";
import { getTeacherRequiredVisuals } from "@/lib/prompts/teacher";
import type { WhiteboardResponse } from "@/types/whiteboard";

describe("null fields must not discard the whole lesson", () => {
  it("treats null as absent for an optional field", () => {
    // Captured from a real generation: three nulls
    // (blocks.11.latex, blocks.13.latex, blocks.10.angles.1.degrees) failed Zod
    // and every one of the lesson's blocks was thrown away, so the pupil saw the
    // failure card instead of a lesson that was otherwise fine.
    const raw = JSON.stringify({
      intro: "Let us look at circle theorems together, step by step.",
      blocks: [
        { type: "text", section: "rule", heading: "The rule", content: "The angle at the centre is twice the angle at the circumference.", latex: null },
      ],
      conclusion: "That is the theorem applied from start to finish.",
    });
    const result = validateResponse(raw, [], { requireAlgebraArrows: false });
    expect(result.ok).toBe(true);
    expect(result.data?.blocks).toHaveLength(1);
  });

  it("reads an unmeasured angle as the unknown rather than a type error", () => {
    // In a circle-theorem diagram one angle is the "x" the lesson exists to find,
    // so a model nulls its degrees. Zero is this codebase's existing idiom for
    // "no numeric measure": the renderer skips such arcs when placing vertices
    // and infers the missing angle from the other two.
    const raw = JSON.stringify({
      intro: "We shall find the missing angle using a circle theorem.",
      blocks: [
        {
          type: "labeled_shape",
          shape: "circle",
          vertices: [{ label: "A" }, { label: "B" }, { label: "O" }],
          angles: [
            { vertex: "O", degrees: 130, label: "130°" },
            { vertex: "B", degrees: null, label: "x" },
          ],
        },
      ],
      conclusion: "So x is half of the angle at the centre.",
    });
    const result = validateResponse(raw, [], { requireAlgebraArrows: false });
    expect(result.ok).toBe(true);
    const shape = result.data?.blocks[0] as { angles: { label: string; degrees: number }[] };
    // The unknown's LABEL survives — dropping the entry would lose the "x".
    expect(shape.angles.map((a) => a.label)).toEqual(["130°", "x"]);
    expect(shape.angles[1].degrees).toBe(0);
  });

  it("does not strip legitimately falsy values", () => {
    // Guarding against an over-eager cleanup: 0, "" and false are real values.
    const raw = JSON.stringify({
      intro: "A quick check of the axes and the origin.",
      blocks: [
        {
          type: "labeled_shape",
          shape: "triangle",
          vertices: [{ label: "A" }, { label: "B" }, { label: "C" }],
          angles: [{ vertex: "B", degrees: 90, label: "90°", isRightAngle: false }],
        },
      ],
      conclusion: "Done.",
    });
    const result = validateResponse(raw, [], { requireAlgebraArrows: false });
    expect(result.ok).toBe(true);
    const shape = result.data?.blocks[0] as { angles: { isRightAngle?: boolean }[] };
    expect(shape.angles[0].isRightAngle).toBe(false);
  });
});

describe("the quality gate must not demand a diagram nobody asked for", () => {
  // A prose+algebra lesson. Perfectly good for an identity or an integral.
  const lesson = {
    intro: "We shall build this up one step at a time.",
    blocks: [
      { type: "text", section: "rule", heading: "The idea", content: "We use a standard identity and justify each rearrangement." },
      { type: "equation_steps", steps: [{ latexBefore: "\\sin^2 x + \\cos^2 x", latexAfter: "1", explanation: "Pythagorean identity" }] },
    ],
    conclusion: "That is the identity applied cleanly.",
  } as unknown as WhiteboardResponse;

  it.each([
    "Trigonometric identities",
    "Trigonometric equations",
    "Area under a curve",
    "Integration to find the area under a curve",
  ])("accepts A-Level algebra/calculus without a labelled shape: %s", (topic) => {
    // A /pythag|trig|angle|polygon|circle|geometry|area|perimeter/ regex used to
    // demand a labelled diagram here, independently of the prompt. These topics
    // matched it, so the model was rejected for omitting a diagram it was never
    // asked for and that the topic does not want — an unsatisfiable requirement.
    expect(validateGcseLessonQuality(lesson, topic).ok).toBe(true);
  });

  it("accepts a misspelled geometry topic instead of failing it", () => {
    // "circle theorm" misses the required-visuals map, so the instruction to draw
    // the circle was dropped — while the regex still judged the lesson as
    // geometry and rejected it. That was the reported intermittent failure.
    expect(validateGcseLessonQuality(lesson, "circle theorm").ok).toBe(true);
  });

  it("still rejects a placeholder circle when a lesson does include one", () => {
    // The accuracy checks must survive: only the "you must have one" demand moved.
    const withPlaceholder = {
      ...lesson,
      blocks: [...lesson.blocks, { type: "labeled_shape", shape: "circle", vertices: [{ label: "A" }] }],
    } as unknown as WhiteboardResponse;
    const result = validateGcseLessonQuality(withPlaceholder, "Circle theorems");
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toMatch(/placeholder/i);
  });
});

describe("topic → required visuals", () => {
  it("resolves a misspelling to the right diagram", () => {
    expect(getTeacherRequiredVisuals("circle theorm").blocks).toEqual(["labeled_shape"]);
    expect(getTeacherRequiredVisuals("circle theorem").blocks).toEqual(["labeled_shape"]);
  });

  it("never lets a fuzzy match create a hard requirement", () => {
    // "trigonometric" is within a typo's reach of the "trigonometry" key, but
    // A-Level trig identities are algebra and want no triangle. `blocks` is
    // enforced as a hard rejection, so a guess must only ever offer the hint.
    const identities = getTeacherRequiredVisuals("Trigonometric identities");
    expect(identities.blocks).toEqual([]);
    expect(identities.hint).not.toBe("");
  });

  it("prefers the more specific entry over map order", () => {
    // "angles" is the first key in the literal; it must not win on position.
    expect(getTeacherRequiredVisuals("Circle theorems").blocks).toEqual(["labeled_shape"]);
    expect(getTeacherRequiredVisuals("tree diagrams").blocks).toEqual(["probability_tree"]);
    expect(getTeacherRequiredVisuals("venn diagrams").blocks).toEqual(["venn_diagram"]);
  });

  it("asks for nothing when the topic is unknown", () => {
    expect(getTeacherRequiredVisuals("Binomial expansion").blocks).toEqual([]);
    expect(getTeacherRequiredVisuals("").blocks).toEqual([]);
  });
});

describe("a lesson is teachable without every supporting section", () => {
  const section = (name: string, content: string) => ({
    type: "text" as const,
    section: name,
    heading: name,
    content,
  });
  const worked = { type: "equation_steps", steps: [{ latexBefore: "x+1", latexAfter: "2", explanation: "solve" }] };

  const build = (sections: string[]) =>
    ({
      intro: "Intro",
      blocks: sections.flatMap((s) =>
        s === "example"
          ? [section("example", "Here is a fully worked example to follow."), worked]
          : [section(s, `Content for the ${s} section, long enough to count.`)],
      ),
      conclusion: "Conclusion",
    }) as unknown as WhiteboardResponse;

  const ALL = ["objective", "prerequisites", "vocabulary", "rule", "example", "example", "guided", "practice", "check", "mistakes", "recap"];

  it("meets the full contract when every section is present", () => {
    const r = validateLessonContract(build(ALL));
    expect(r.missing).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.teachable).toBe(true);
  });

  it("is teachable with a supporting section missing, and says which", () => {
    // The real failure: two separate A-Level generations produced a complete
    // lesson bar an untagged "vocabulary" heading, and the pupil got a blank
    // screen. The contract is still unmet — it is just no longer fatal.
    const r = validateLessonContract(build(ALL.filter((s) => s !== "vocabulary")));
    expect(r.ok).toBe(false);
    expect(r.teachable).toBe(true);
    expect(r.missing).toContain("vocabulary");
    expect(r.missingCore).toEqual([]);
  });

  it("is NOT teachable when the teaching core is missing", () => {
    for (const core of ["rule", "practice", "check"]) {
      const r = validateLessonContract(build(ALL.filter((s) => s !== core)));
      expect(r.teachable).toBe(false);
      expect(r.missingCore).toContain(core);
    }
  });

  it("is NOT teachable without a worked example", () => {
    const r = validateLessonContract(build(ALL.filter((s) => s !== "example")));
    expect(r.teachable).toBe(false);
    expect(r.missingCore).toContain("example");
  });
});
