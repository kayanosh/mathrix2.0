import {
  buildRectilinearPerimeter,
  parseRectilinearPerimeter,
} from "@/lib/methods/rectilinear-perimeter";
import { deterministicMathsAnswer } from "@/lib/ks2-maths-accuracy";
import { satisfiesSkillVisuals } from "@/lib/ks2-skill-visuals";
import { isBlockFit } from "@/lib/ks2-visual-fitness";
import type { VisualBlock } from "@/types/whiteboard";

describe("parseRectilinearPerimeter", () => {
  it("uses the canonical example when the question names no dimensions", () => {
    expect(
      parseRectilinearPerimeter("Find the perimeter of the L-shaped rectilinear shape."),
    ).toEqual({ width: 10, height: 8, notchWidth: 6, notchHeight: 5, unit: "cm" });
  });

  it("uses four named dimensions, largest first", () => {
    const p = parseRectilinearPerimeter(
      "The rectilinear shape has sides 12 cm, 9 cm, 7 cm and 4 cm. Find the perimeter.",
    );
    expect(p).toEqual({ width: 12, height: 9, notchWidth: 7, notchHeight: 4, unit: "cm" });
  });

  it("rejects non-perimeter and non-rectilinear questions", () => {
    expect(parseRectilinearPerimeter("Find the area of the L-shaped shape.")).toBeNull();
    expect(parseRectilinearPerimeter("Find the perimeter of a rectangle.")).toBeNull();
  });
});

describe("buildRectilinearPerimeter", () => {
  const built = buildRectilinearPerimeter({
    width: 10,
    height: 8,
    notchWidth: 6,
    notchHeight: 5,
    unit: "cm",
  });

  it("answers 36 cm with correct missing sides", () => {
    expect(built.answer).toBe("36 cm");
    const text = built.teachingSteps
      .map((s) => `${s.explanation} ${s.why || ""}`)
      .join(" ");
    expect(text).toContain("10 − 6 = 4 cm");
    expect(text).toContain("8 − 5 = 3 cm");
    expect(text).toContain("10 + 3 + 6 + 5 + 4 + 8 = 36 cm");
    expect(text).toContain("2 × (10 + 8) = 36 cm");
  });

  it("emits a canonical rectilinear shape plus worked steps", () => {
    expect(built.block.type).toBe("labeled_shape");
    if (built.block.type !== "labeled_shape") throw new Error("expected labeled_shape");
    expect(built.block.shape).toBe("rectilinear");
    expect(built.block.rectilinear).toEqual({
      width: 10,
      height: 8,
      notchWidth: 6,
      notchHeight: 5,
      unit: "cm",
      showMissing: true,
    });
    const types = [built.block.type, ...(built.extraBlocks || []).map((b) => b.type)];
    expect(types).toContain("equation_steps");
    expect(satisfiesSkillVisuals(types, "geometry")).toBe(true);
    expect(built.teachingSteps.length).toBeLessThanOrEqual(6);
  });

  it("the block passes fitness and validation", () => {
    expect(isBlockFit(built.block, "Find the perimeter of the L-shaped rectilinear shape.")).toBe(true);
  });

  it("the deterministic solver covers the lesson question", () => {
    const solved = deterministicMathsAnswer(
      "Find the perimeter of the L-shaped rectilinear shape.",
    );
    expect(solved).not.toBeNull();
    expect(solved?.answer).toBe("36 cm");
  });
});

describe("labeled_shape fitness guards against model dialect", () => {
  it("rejects unknown shape names with x/y vertices and sideLabels", () => {
    const dialect = {
      type: "labeled_shape",
      shape: "L-shaped rectilinear polygon",
      vertices: [
        { label: "A", x: 0, y: 8 },
        { label: "B", x: 10, y: 8 },
      ],
      sideLabels: [{ from: "A", to: "B", label: "$10\\text{ cm}$" }],
    } as unknown as VisualBlock;
    expect(isBlockFit(dialect, "Find the perimeter of the L-shaped rectilinear shape.")).toBe(false);
  });

  it("rejects rectilinear blocks with impossible dimensions", () => {
    const bad: VisualBlock = {
      type: "labeled_shape",
      shape: "rectilinear",
      rectilinear: { width: 4, height: 8, notchWidth: 6, notchHeight: 5 },
    };
    expect(isBlockFit(bad, "Find the perimeter of the L-shape.")).toBe(false);
  });

  it("keeps ordinary named shapes", () => {
    const triangle: VisualBlock = { type: "labeled_shape", shape: "triangle" };
    expect(isBlockFit(triangle, "Find the angles of this triangle.")).toBe(true);
  });
});
