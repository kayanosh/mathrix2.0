import { classifyQuestion } from "@/lib/prompts/classify";
import {
  detectRequiredVisuals,
  getRequiredBlockTypes,
} from "@/lib/prompts/required-visuals";

describe("classifyQuestion", () => {
  it("classifies probability questions", () => {
    expect(classifyQuestion("What is the probability of getting heads?")).toBe("probability");
    expect(classifyQuestion("Draw a tree diagram for two coin flips")).toBe("probability");
    expect(classifyQuestion("A bag contains 3 red and 5 blue marbles")).toBe("probability");
  });

  it("classifies statistics questions", () => {
    expect(classifyQuestion("Find the mean of 3, 5, 7, 9")).toBe("statistics");
    expect(classifyQuestion("Draw a histogram for this data")).toBe("statistics");
    expect(classifyQuestion("Find the median and range")).toBe("statistics");
    expect(classifyQuestion("Draw a box plot for the data")).toBe("statistics");
  });

  it("classifies geometry questions", () => {
    expect(classifyQuestion("Find the area of a triangle with base 5")).toBe("geometry");
    expect(classifyQuestion("Use Pythagoras to find the hypotenuse")).toBe("geometry");
    expect(classifyQuestion("Find angle x in the circle theorem")).toBe("geometry");
  });

  it("classifies trigonometry questions", () => {
    expect(classifyQuestion("Use SOH CAH TOA to find the opposite")).toBe("trigonometry");
    expect(classifyQuestion("Apply the sine rule to find x")).toBe("trigonometry");
    expect(classifyQuestion("Find sin 30")).toBe("trigonometry");
  });

  it("classifies graphs questions", () => {
    expect(classifyQuestion("Plot y = 2x + 1")).toBe("graphs");
    expect(classifyQuestion("Find the gradient and intercept")).toBe("graphs");
    expect(classifyQuestion("Sketch the parabola y = x^2 - 4")).toBe("graphs");
  });

  it("classifies calculus questions", () => {
    expect(classifyQuestion("Find the derivative of x^2 + 3x")).toBe("calculus");
    expect(classifyQuestion("Find dy/dx for y = x^3")).toBe("calculus");
    expect(classifyQuestion("Use the chain rule to differentiate")).toBe("calculus");
  });

  it("classifies number questions", () => {
    expect(classifyQuestion("Convert 3/8 to a decimal")).toBe("number");
    expect(classifyQuestion("Find the HCF of 12 and 18")).toBe("number");
    expect(classifyQuestion("Write 0.00045 in standard form")).toBe("number");
  });

  it("classifies algebra questions", () => {
    expect(classifyQuestion("Solve 2x + 4 = 10")).toBe("algebra");
    expect(classifyQuestion("Expand (2x + 3)(x - 1)")).toBe("algebra");
    expect(classifyQuestion("Factorise x^2 - 5x + 6")).toBe("algebra");
    expect(classifyQuestion("Simplify 3x + 2y + 5x - y")).toBe("algebra");
  });

  it("defaults to algebra for unrecognized questions", () => {
    expect(classifyQuestion("What is the meaning of life?")).toBe("algebra");
  });
});

describe("detectRequiredVisuals", () => {
  it("detects labeled_shape for circle theorems", () => {
    const reqs = detectRequiredVisuals("Use the circle theorem to find angle x", "geometry");
    expect(reqs.length).toBeGreaterThan(0);
    const blockTypes = getRequiredBlockTypes(reqs);
    expect(blockTypes).toContain("labeled_shape");
  });

  it("detects probability_tree for tree diagram questions", () => {
    const reqs = detectRequiredVisuals("Draw a tree diagram for picking two balls", "probability");
    expect(reqs.length).toBeGreaterThan(0);
    const blockTypes = getRequiredBlockTypes(reqs);
    expect(blockTypes).toContain("probability_tree");
  });

  it("detects venn_diagram for Venn diagram questions", () => {
    const reqs = detectRequiredVisuals("Draw a Venn diagram for sets A and B", "probability");
    expect(reqs.length).toBeGreaterThan(0);
    const blockTypes = getRequiredBlockTypes(reqs);
    expect(blockTypes).toContain("venn_diagram");
  });

  it("detects coordinate_graph for equation of a line", () => {
    const reqs = detectRequiredVisuals("Find the equation of the line y = 2x + 1 with gradient and intercept", "graphs");
    expect(reqs.length).toBeGreaterThan(0);
    const blockTypes = getRequiredBlockTypes(reqs);
    expect(blockTypes).toContain("coordinate_graph");
  });

  it("detects chart for histogram questions", () => {
    const reqs = detectRequiredVisuals("Draw a histogram for the frequency density data", "statistics");
    const blockTypes = getRequiredBlockTypes(reqs);
    expect(blockTypes).toContain("chart");
  });

  it("detects number_line for inequality questions", () => {
    const reqs = detectRequiredVisuals("Represent x > 3 on a number line", "number");
    const blockTypes = getRequiredBlockTypes(reqs);
    expect(blockTypes).toContain("number_line");
  });

  it("detects column_method for long division", () => {
    const reqs = detectRequiredVisuals("Use long division to solve 384 ÷ 12", "number");
    const blockTypes = getRequiredBlockTypes(reqs);
    expect(blockTypes).toContain("column_method");
  });

  it("returns empty for unrecognized patterns", () => {
    const reqs = detectRequiredVisuals("Hello world", "algebra");
    expect(reqs.length).toBe(0);
  });

  it("respects category filtering", () => {
    // "triangle" matches geometry, not statistics category
    const reqs = detectRequiredVisuals("triangle area", "statistics");
    const blockTypes = getRequiredBlockTypes(reqs);
    expect(blockTypes).not.toContain("labeled_shape");
  });

  it("detects Pythagoras requirements", () => {
    const reqs = detectRequiredVisuals("Use Pythagoras theorem to find the hypotenuse", "geometry");
    const blockTypes = getRequiredBlockTypes(reqs);
    expect(blockTypes).toContain("labeled_shape");
    expect(blockTypes).toContain("equation_steps");
  });
});

describe("getRequiredBlockTypes", () => {
  it("deduplicates block types", () => {
    const reqs = [
      { description: "a", requiredBlocks: ["equation_steps", "labeled_shape"], matchedTopic: "A" },
      { description: "b", requiredBlocks: ["equation_steps", "coordinate_graph"], matchedTopic: "B" },
    ];
    const types = getRequiredBlockTypes(reqs);
    expect(types).toContain("equation_steps");
    expect(types).toContain("labeled_shape");
    expect(types).toContain("coordinate_graph");
    expect(types.filter((t) => t === "equation_steps").length).toBe(1);
  });

  it("returns empty array for empty input", () => {
    expect(getRequiredBlockTypes([])).toEqual([]);
  });
});
