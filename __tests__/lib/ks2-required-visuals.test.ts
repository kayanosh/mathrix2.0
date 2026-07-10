import {
  detectKS2RequiredVisuals,
  mergeVisualRequirements,
  getKS2RequiredBlockTypes,
  ks2LessonVisualsPrompt,
} from "@/lib/ks2-required-visuals";

describe("detectKS2RequiredVisuals", () => {
  it("requires column_method for long multiplication subtopics", () => {
    const reqs = detectKS2RequiredVisuals("", "Multiplication & Division A", [
      "Multiply 2-digit by 2-digit",
      "Long multiplication",
    ]);
    expect(reqs.some((r) => r.requiredBlocks.includes("column_method"))).toBe(true);
    expect(reqs.some((r) => r.matchedTopic === "Column Multiplication")).toBe(true);
  });

  it("requires number_line for fraction number line topics", () => {
    const reqs = detectKS2RequiredVisuals("", "Fractions", [
      "Fractions on a number line",
      "Compare fractions",
    ]);
    expect(reqs.some((r) => r.requiredBlocks.includes("number_line"))).toBe(true);
  });

  it("requires labeled_shape for area and perimeter", () => {
    const reqs = detectKS2RequiredVisuals("", "Measurement", ["Area", "Perimeter of rectangles"]);
    expect(reqs.some((r) => r.requiredBlocks.includes("labeled_shape"))).toBe(true);
  });

  it("detects arithmetic from question text", () => {
    const reqs = detectKS2RequiredVisuals("What is 23 × 45?");
    expect(reqs.some((r) => r.requiredBlocks.includes("column_method"))).toBe(true);
  });
});

describe("mergeVisualRequirements", () => {
  it("deduplicates by matched topic", () => {
    const base = [
      {
        description: "a",
        requiredBlocks: ["column_method"],
        matchedTopic: "Column Multiplication",
      },
    ];
    const extra = [
      {
        description: "b",
        requiredBlocks: ["column_method"],
        matchedTopic: "Column Multiplication",
      },
      {
        description: "c",
        requiredBlocks: ["number_line"],
        matchedTopic: "Fractions on a Number Line",
      },
    ];
    const merged = mergeVisualRequirements(base, extra);
    expect(merged).toHaveLength(2);
  });
});

describe("getKS2RequiredBlockTypes", () => {
  it("returns flat unique block types", () => {
    const types = getKS2RequiredBlockTypes([
      { description: "a", requiredBlocks: ["column_method"], matchedTopic: "A" },
      { description: "b", requiredBlocks: ["column_method", "table"], matchedTopic: "B" },
    ]);
    expect(types.sort()).toEqual(["column_method", "table"]);
  });
});

describe("ks2LessonVisualsPrompt", () => {
  it("includes mandatory visuals for multiplication topics", () => {
    const prompt = ks2LessonVisualsPrompt("Multiplication & Division B", [
      "Multiply 3-digit and 4-digit by 2-digit",
    ]);
    expect(prompt).toContain("column_method");
    expect(prompt).toContain("workedExample.whiteboard");
  });
});
