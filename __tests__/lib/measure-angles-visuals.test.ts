import {
  detectSkillVisualFamily,
  satisfiesSkillVisuals,
} from "@/lib/ks2-skill-visuals";
import { isBlockFit } from "@/lib/ks2-visual-fitness";
import type { ProtractorBlock } from "@/types/whiteboard";

describe("measure_angles skill family", () => {
  it("detects measuring tasks from question text", () => {
    expect(detectSkillVisualFamily("Measure and classify angle ABC.")).toBe("measure_angles");
    expect(detectSkillVisualFamily("Use a protractor to measure this angle")).toBe("measure_angles");
    expect(detectSkillVisualFamily("", "Properties of Shape", "Measure angles in degrees")).toBe("measure_angles");
  });

  it("does not hijack missing-angle or shape topics", () => {
    expect(detectSkillVisualFamily("Find the missing angle x on a straight line")).toBe("geometry");
    expect(detectSkillVisualFamily("What is the perimeter of the rectangle?")).toBe("geometry");
    expect(detectSkillVisualFamily("", "Properties of Shape", "Angles in a triangle")).toBe("geometry");
  });

  it("requires a protractor block", () => {
    expect(satisfiesSkillVisuals(["protractor"], "measure_angles")).toBe(true);
    expect(satisfiesSkillVisuals(["labeled_shape"], "measure_angles")).toBe(false);
    expect(satisfiesSkillVisuals(["text"], "measure_angles")).toBe(false);
  });
});

describe("protractor block fitness", () => {
  const base: ProtractorBlock = {
    type: "protractor",
    angle: 45,
    vertex: "B",
    armLabels: ["C", "A"],
  };

  it("accepts valid angles", () => {
    expect(isBlockFit(base, "Measure angle ABC")).toBe(true);
    expect(isBlockFit({ ...base, angle: 1 }, "")).toBe(true);
    expect(isBlockFit({ ...base, angle: 180 }, "")).toBe(true);
  });

  it("rejects impossible or missing angles", () => {
    expect(isBlockFit({ ...base, angle: 0 }, "")).toBe(false);
    expect(isBlockFit({ ...base, angle: 190 }, "")).toBe(false);
    expect(isBlockFit({ ...base, angle: Number.NaN }, "")).toBe(false);
  });
});

describe("angle_scale block fitness", () => {
  it("accepts valid highlights and none", () => {
    expect(isBlockFit({ type: "angle_scale" }, "")).toBe(true);
    expect(isBlockFit({ type: "angle_scale", highlight: "obtuse" }, "")).toBe(true);
  });
  it("rejects unknown highlight values", () => {
    expect(isBlockFit({ type: "angle_scale", highlight: "reflex" as never }, "")).toBe(false);
  });
});

describe("geometry outranks word-problem phrasing", () => {
  it("classifies 'how many lines of symmetry' questions as geometry", () => {
    expect(
      detectSkillVisualFamily("How many lines of symmetry does this square have?", "Properties of Shape", "Lines of symmetry"),
    ).toBe("geometry");
    expect(
      detectSkillVisualFamily("How many sides does a pentagon have?"),
    ).toBe("geometry");
  });

  it("keeps genuine word problems as word_problems", () => {
    expect(
      detectSkillVisualFamily("How many sweets are left over altogether?"),
    ).toBe("word_problems");
  });
});
