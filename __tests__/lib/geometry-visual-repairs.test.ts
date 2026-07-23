import {
  detectSkillVisualFamily,
  repairGeometryVisuals,
} from "@/lib/ks2-skill-visuals";
import { isBlockFit, KNOWN_SHAPES } from "@/lib/ks2-visual-fitness";
import type { LabeledShapeBlock } from "@/types/whiteboard";

describe("detectSkillVisualFamily — grid area is geometry, not multiplication", () => {
  it("classifies the 1 cm × 1 cm grid question as geometry", () => {
    expect(
      detectSkillVisualFamily(
        "Estimate the area of the irregular shape on a $1\\text{ cm} \\times 1\\text{ cm}$ square grid.",
        "Perimeter and area",
        "Estimate area of irregular shapes",
      ),
    ).toBe("geometry");
  });

  it("keeps real multiplication questions as multiplication", () => {
    expect(
      detectSkillVisualFamily("Work out 23 × 14 using an area model", "Multiplication", "Multiply 2-digit numbers"),
    ).toBe("multiplication");
  });
});

describe("repairGeometryVisuals — lines of symmetry", () => {
  it("synthesises a square with 4 symmetry lines", () => {
    const blocks = repairGeometryVisuals(
      [],
      "How many lines of symmetry does a square have?",
      "Shape",
      "Lines of symmetry",
      "4",
    );
    expect(blocks).toHaveLength(1);
    const b = blocks[0] as LabeledShapeBlock;
    expect(b.shape).toBe("square");
    expect(b.symmetryLines).toBe(4);
    expect(KNOWN_SHAPES.has("square")).toBe(true);
    expect(isBlockFit(blocks[0], "How many lines of symmetry does a square have?")).toBe(true);
  });

  it("synthesises a rectangle with 2 symmetry lines (diagonals are not mirror lines)", () => {
    const blocks = repairGeometryVisuals(
      [],
      "How many lines of symmetry does a rectangle have?",
      "Shape",
      "Lines of symmetry",
      "2",
    );
    const b = blocks[0] as LabeledShapeBlock;
    expect(b.shape).toBe("rectangle");
    expect(b.symmetryLines).toBe(2);
  });

  it("refuses to fake symmetry lines on a triangle", () => {
    expect(
      repairGeometryVisuals([], "How many lines of symmetry does a triangle have?", "Shape", "Lines of symmetry", "1"),
    ).toHaveLength(0);
  });
});

describe("repairGeometryVisuals — regular vs irregular polygons", () => {
  it("labels every side equally when the answer says regular", () => {
    const blocks = repairGeometryVisuals(
      [],
      "Is this pentagon regular or irregular?",
      "Shape",
      "Regular and irregular polygons",
      "It is a regular pentagon because all its sides are equal.",
    );
    const b = blocks[0] as LabeledShapeBlock;
    expect(b.shape).toBe("polygon");
    expect(b.vertices).toHaveLength(5);
    const labels = (b.sides || []).map((s) => s.label);
    expect(new Set(labels).size).toBe(1);
    expect(b.caption).toMatch(/regular/);
  });

  it("labels sides differently when the answer says irregular, marked not-to-scale", () => {
    const blocks = repairGeometryVisuals(
      [],
      "Is this hexagon regular or irregular?",
      "Shape",
      "Regular and irregular polygons",
      "This is an irregular hexagon.",
    );
    const b = blocks[0] as LabeledShapeBlock;
    expect(b.vertices).toHaveLength(6);
    const labels = (b.sides || []).map((s) => s.label);
    expect(new Set(labels).size).toBeGreaterThan(1);
    expect(b.caption).toMatch(/not drawn to scale/i);
  });

  it("leaves non-geometry questions alone", () => {
    expect(
      repairGeometryVisuals([], "What is 234 + 156?", "Addition", "Column addition", "390"),
    ).toHaveLength(0);
  });

  it("patches a bare drawn shape with the correct mirror lines", () => {
    const bare = [
      { type: "labeled_shape", shape: "rectangle", vertices: [{ label: "A" }, { label: "B" }, { label: "C" }, { label: "D" }] } as LabeledShapeBlock,
    ];
    const out = repairGeometryVisuals(
      bare,
      "How many lines of symmetry does a square have?",
      "Shape",
      "Lines of symmetry",
      "4",
    );
    const b = out[0] as LabeledShapeBlock;
    // Upgraded to a true square — 4 mirror lines on an oblong would lie.
    expect(b.shape).toBe("square");
    expect(b.symmetryLines).toBe(4);
  });

  it("does not touch lessons that already show mirror lines", () => {
    const existing = [
      { type: "labeled_shape", shape: "triangle", vertices: [{ label: "A" }, { label: "B" }, { label: "C" }] } as LabeledShapeBlock,
    ];
    const out = repairGeometryVisuals(
      existing,
      "What is the name of a three-sided shape?",
      "Shape",
      "Regular and irregular polygons",
      "triangle",
    );
    expect(out).toBe(existing);
  });
});
