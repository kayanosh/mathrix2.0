import {
  cleanLessonDisplayText,
  looksLikeInternalPayload,
  normalizeLessonForDisplay,
  validateGcseLessonQuality,
} from "@/lib/gcse-lesson-quality";
import type { WhiteboardResponse } from "@/types/whiteboard";

const validPythagorasLesson: WhiteboardResponse = {
  intro: "Learn Pythagoras' theorem.",
  blocks: [
    {
      type: "text",
      section: "rule",
      heading: "Core idea",
      content: "For a right-angled triangle, square the two shorter sides and add them.",
    },
    {
      type: "labeled_shape",
      shape: "triangle",
      vertices: [{ label: "A" }, { label: "B" }, { label: "C" }],
      angles: [{ vertex: "A", degrees: 90, label: "90°", isRightAngle: true }],
      sides: [
        { from: "A", to: "B", label: "3 cm" },
        { from: "A", to: "C", label: "4 cm" },
        { from: "B", to: "C", label: "c — hypotenuse" },
      ],
    },
    {
      type: "equation_steps",
      steps: [{
        stepNumber: 1,
        operationLabel: "Use the theorem",
        explanation: "The hypotenuse is opposite the right angle.",
        latexBefore: "a^2 + b^2 = c^2",
        latexAfter: "3^2 + 4^2 = c^2",
        arrowDirection: "down",
      }],
    },
  ],
  conclusion: "The theorem links all three sides of a right-angled triangle.",
};

describe("GCSE lesson quality", () => {
  it("recognises raw internal JSON", () => {
    expect(looksLikeInternalPayload('{"intro":"Hi","blocks":[]}')).toBe(true);
    expect(looksLikeInternalPayload("A clear explanation for a student.")).toBe(false);
  });

  it("cleans markdown presentation tokens without changing LaTeX", () => {
    expect(cleanLessonDisplayText("**Hypotenuse**\n- Opposite the right angle"))
      .toBe("Hypotenuse\n• Opposite the right angle");
    const lesson = normalizeLessonForDisplay({
      ...validPythagorasLesson,
      intro: "**Welcome**",
    });
    expect(lesson.intro).toBe("Welcome");
    const equations = lesson.blocks.find((block) => block.type === "equation_steps");
    expect(equations?.type === "equation_steps" && equations.steps[0].latexBefore)
      .toBe("a^2 + b^2 = c^2");
  });

  it("accepts a relevant, labelled Pythagoras diagram", () => {
    expect(validateGcseLessonQuality(validPythagorasLesson, "Pythagoras' theorem").ok)
      .toBe(true);
  });

  it("rejects a generic or mathematically incomplete geometry diagram", () => {
    const broken: WhiteboardResponse = {
      ...validPythagorasLesson,
      blocks: [{
        type: "labeled_shape",
        shape: "polygon",
        vertices: [{ label: "A" }, { label: "B" }, { label: "C" }, { label: "D" }, { label: "E" }],
      }],
    };
    const result = validateGcseLessonQuality(broken, "Pythagoras' theorem");
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("a² + b² = c²");
  });
});
