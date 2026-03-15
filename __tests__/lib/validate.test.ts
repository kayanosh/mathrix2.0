import { validateResponse } from "@/lib/validate";

describe("validateResponse", () => {
  const validResponse = JSON.stringify({
    intro: "Let's solve this equation.",
    blocks: [
      {
        type: "equation_steps",
        steps: [
          {
            stepNumber: 1,
            operationLabel: "Start",
            explanation: "We begin with the equation",
            latexBefore: "2x + 4 = 10",
            latexAfter: "2x + 4 = 10",
            arrowDirection: "down",
          },
          {
            stepNumber: 2,
            operationLabel: "Subtract 4",
            explanation: "Subtract 4 from both sides",
            latexBefore: "2x + 4 = 10",
            latexAfter: "2x = 6",
            arrowDirection: "down",
          },
          {
            stepNumber: 3,
            operationLabel: "Divide by 2",
            explanation: "Divide both sides by 2",
            latexBefore: "2x = 6",
            latexAfter: "x = 3",
            arrowDirection: "down",
          },
        ],
      },
    ],
    conclusion: "The solution is x = 3.",
  });

  it("validates a correct response", () => {
    const result = validateResponse(validResponse);
    expect(result.ok).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data!.intro).toBe("Let's solve this equation.");
  });

  it("validates response wrapped in markdown fences", () => {
    const fenced = "```json\n" + validResponse + "\n```";
    const result = validateResponse(fenced);
    expect(result.ok).toBe(true);
    expect(result.data).toBeDefined();
  });

  it("rejects invalid JSON", () => {
    const result = validateResponse("not json at all {{{");
    expect(result.ok).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBeGreaterThan(0);
  });

  it("rejects response with missing required fields", () => {
    const invalid = JSON.stringify({ intro: "Hello" });
    const result = validateResponse(invalid);
    expect(result.ok).toBe(false);
    expect(result.errors).toBeDefined();
  });

  it("rejects response with empty blocks", () => {
    const noBlocks = JSON.stringify({
      intro: "Hello",
      blocks: [],
      conclusion: "End",
    });
    const result = validateResponse(noBlocks);
    expect(result.ok).toBe(false);
  });

  it("rejects equation_steps with no steps", () => {
    const emptySteps = JSON.stringify({
      intro: "Hello",
      blocks: [{ type: "equation_steps", steps: [] }],
      conclusion: "End",
    });
    const result = validateResponse(emptySteps);
    expect(result.ok).toBe(false);
  });

  it("validates required block types - passes when present", () => {
    const result = validateResponse(validResponse, ["equation_steps"]);
    expect(result.ok).toBe(true);
  });

  it("validates required block types - fails when missing", () => {
    const result = validateResponse(validResponse, ["coordinate_graph"]);
    expect(result.ok).toBe(false);
    expect(result.errors!.some((e) => e.includes("Missing required visual block"))).toBe(true);
  });

  it("detects triangle angle sum errors", () => {
    const badTriangle = JSON.stringify({
      intro: "Triangle",
      blocks: [
        {
          type: "labeled_shape",
          shape: "triangle",
          angles: [
            { vertex: "A", degrees: 90, label: "90°" },
            { vertex: "B", degrees: 60, label: "60°" },
            { vertex: "C", degrees: 60, label: "60°" },
          ],
        },
      ],
      conclusion: "Done",
    });
    const result = validateResponse(badTriangle);
    // Should still return ok=true since semantic errors are warnings, but with errors listed
    expect(result.ok).toBe(true);
    expect(result.errors).toBeDefined();
    expect(result.errors!.some((e) => e.includes("Triangle angles sum to 210"))).toBe(true);
  });

  it("validates probability tree branches sum to 1", () => {
    const badTree = JSON.stringify({
      intro: "Probability",
      blocks: [
        {
          type: "probability_tree",
          rootLabel: "First pick",
          branches: [
            { event: "Red", probability: "0.3", probabilityValue: 0.3 },
            { event: "Blue", probability: "0.3", probabilityValue: 0.3 },
          ],
        },
      ],
      conclusion: "Done",
    });
    const result = validateResponse(badTree);
    expect(result.ok).toBe(true); // semantic errors are warnings
    expect(result.errors!.some((e) => e.includes("sum to"))).toBe(true);
  });

  it("validates a text block response", () => {
    const textResponse = JSON.stringify({
      intro: "Here's an explanation.",
      blocks: [
        {
          type: "text",
          content: "This is a text explanation of the concept.",
        },
      ],
      conclusion: "That's the concept!",
    });
    const result = validateResponse(textResponse);
    expect(result.ok).toBe(true);
  });

  it("validates a coordinate graph block", () => {
    const graphResponse = JSON.stringify({
      intro: "Here's the graph.",
      blocks: [
        {
          type: "coordinate_graph",
          xRange: [-10, 10],
          yRange: [-10, 10],
          plots: [
            { equation: "y = 2x + 1", fn: "2*x + 1", color: "blue" },
          ],
          grid: true,
        },
      ],
      conclusion: "The line passes through (0,1).",
    });
    const result = validateResponse(graphResponse);
    expect(result.ok).toBe(true);
  });

  it("validates a venn diagram block", () => {
    const vennResponse = JSON.stringify({
      intro: "Venn diagram",
      blocks: [
        {
          type: "venn_diagram",
          sets: [
            { label: "A", elements: ["1", "2", "3"] },
            { label: "B", elements: ["3", "4", "5"] },
          ],
          regions: [
            { region: "A_only", value: "1, 2" },
            { region: "A_and_B", value: "3" },
            { region: "B_only", value: "4, 5" },
          ],
        },
      ],
      conclusion: "The intersection is {3}.",
    });
    const result = validateResponse(vennResponse);
    expect(result.ok).toBe(true);
  });

  it("validates a number line block", () => {
    const nlResponse = JSON.stringify({
      intro: "Number line",
      blocks: [
        {
          type: "number_line",
          range: [-5, 5],
          tickInterval: 1,
          markers: [
            { value: 3, label: "3", style: "filled" },
          ],
          inequalityLabel: "x > 3",
        },
      ],
      conclusion: "x is greater than 3.",
    });
    const result = validateResponse(nlResponse);
    expect(result.ok).toBe(true);
  });

  it("validates a table block", () => {
    const tableResponse = JSON.stringify({
      intro: "Frequency table",
      blocks: [
        {
          type: "table",
          headers: ["Score", "Frequency"],
          rows: [["1", "5"], ["2", "3"], ["3", "7"]],
        },
      ],
      conclusion: "The mode is 3.",
    });
    const result = validateResponse(tableResponse);
    expect(result.ok).toBe(true);
  });

  it("validates a chart block", () => {
    const chartResponse = JSON.stringify({
      intro: "Bar chart",
      blocks: [
        {
          type: "chart",
          chartType: "bar",
          bars: [
            { label: "A", value: 10 },
            { label: "B", value: 20 },
          ],
        },
      ],
      conclusion: "B is the tallest bar.",
    });
    const result = validateResponse(chartResponse);
    expect(result.ok).toBe(true);
  });

  it("validates a column method block", () => {
    const colResponse = JSON.stringify({
      intro: "Long division",
      blocks: [
        {
          type: "column_method",
          method: "long_division",
          rows: ["384", "12", "32"],
          question: "384 ÷ 12",
          answer: "32",
        },
      ],
      conclusion: "384 ÷ 12 = 32.",
    });
    const result = validateResponse(colResponse);
    expect(result.ok).toBe(true);
  });
});
