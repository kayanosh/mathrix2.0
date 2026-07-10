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

  it("validates a column multiplication block", () => {
    const colResponse = JSON.stringify({
      intro: "Let's multiply using the column method.",
      blocks: [
        {
          type: "column_method",
          method: "column_multiplication",
          rows: [" 23", "×45", "115", "920", "1035"],
          carries: [{ row: 0, col: 1, digit: "1" }],
          separatorAfterRows: [1, 3],
          question: "23 × 45",
          answer: "1035",
        },
      ],
      conclusion: "23 × 45 = 1035.",
    });
    const result = validateResponse(colResponse);
    expect(result.ok).toBe(true);
  });

  // ── Algebra arrow + step-block + language enforcement ──────────────────────

  it("rejects a maths question answered with only text blocks", () => {
    const proseOnly = JSON.stringify({
      intro: "Let's solve x + 5 = 12.",
      blocks: [
        {
          type: "text",
          content: "Subtract 5 from both sides to get x = 7.",
        },
      ],
      conclusion: "So x = 7.",
    });
    const result = validateResponse(proseOnly);
    expect(result.ok).toBe(false);
    expect(
      result.errors!.some((e) => e.includes("only text blocks")),
    ).toBe(true);
  });

  it("rejects an equation_steps step where a term crosses = without arrows", () => {
    const noArrows = JSON.stringify({
      intro: "Solve x + 5 = 12.",
      blocks: [
        {
          type: "equation_steps",
          steps: [
            {
              stepNumber: 1,
              operationLabel: "Move +5",
              explanation: "Move +5 across the equals sign.",
              latexBefore: "x + 5 = 12",
              latexAfter: "x = 12 - 5",
              arrowDirection: "both_sides",
            },
            {
              stepNumber: 2,
              operationLabel: "Simplify",
              explanation: "Work out the right-hand side.",
              latexBefore: "x = 12 - 5",
              latexAfter: "x = 7",
              arrowDirection: "simplify",
            },
          ],
        },
      ],
      conclusion: "So x = 7.",
    });
    const result = validateResponse(noArrows);
    expect(result.ok).toBe(false);
    expect(
      result.errors!.some((e) =>
        e.includes("term appears to cross the = sign"),
      ),
    ).toBe(true);
  });

  it("rejects a step that declares an arrow without matching \\htmlId tags", () => {
    const missingTags = JSON.stringify({
      intro: "Solve x + 5 = 12.",
      blocks: [
        {
          type: "equation_steps",
          steps: [
            {
              stepNumber: 1,
              operationLabel: "Move +5",
              explanation: "Move +5 across — it becomes -5.",
              latexBefore: "x + 5 = 12",
              latexAfter: "x = 12 - 5",
              arrowDirection: "both_sides",
              arrows: [
                {
                  id: "a1",
                  label: "-5",
                  fromTerm: "+5",
                  toTerm: "-5",
                  signRule: "adding becomes subtracting",
                  style: "curly",
                },
              ],
            },
          ],
        },
      ],
      conclusion: "x = 7",
    });
    const result = validateResponse(missingTags);
    expect(result.ok).toBe(false);
    expect(
      result.errors!.some((e) => e.includes("missing `\\htmlId{a1-from}`")),
    ).toBe(true);
    expect(
      result.errors!.some((e) => e.includes("missing `\\htmlId{a1-to}`")),
    ).toBe(true);
  });

  it("accepts a step with a properly tagged arrow", () => {
    const tagged = JSON.stringify({
      intro: "Let's solve x + 5 = 12.",
      blocks: [
        {
          type: "equation_steps",
          steps: [
            {
              stepNumber: 1,
              operationLabel: "Move +5 across",
              explanation: "Move +5 across the equals sign — it becomes -5.",
              latexBefore: "x + \\htmlId{a1-from}{5} = 12",
              latexAfter: "x = 12 \\htmlId{a1-to}{- 5}",
              arrowDirection: "both_sides",
              arrows: [
                {
                  id: "a1",
                  label: "-5",
                  fromTerm: "+5",
                  toTerm: "-5",
                  signRule: "adding becomes subtracting",
                  style: "curly",
                },
              ],
            },
            {
              stepNumber: 2,
              operationLabel: "Simplify",
              explanation: "Work out 12 minus 5.",
              latexBefore: "x = 12 - 5",
              latexAfter: "x = 7",
              arrowDirection: "simplify",
            },
          ],
        },
      ],
      conclusion: "So x = 7. Done!",
    });
    const result = validateResponse(tagged);
    expect(result.ok).toBe(true);
  });

  // ── No missing steps / step continuity ─────────────────────────────────────

  it("warns when a step jumps over the previous step's result", () => {
    const jump = JSON.stringify({
      intro: "Let's solve 2x + 4 = 10.",
      blocks: [
        {
          type: "equation_steps",
          steps: [
            {
              stepNumber: 1,
              operationLabel: "Start",
              explanation: "Here's the equation.",
              latexBefore: "2x + 4 = 10",
              latexAfter: "2x + 4 = 10",
              arrowDirection: "down",
            },
            {
              stepNumber: 2,
              operationLabel: "Jump",
              explanation: "Somehow we get here.",
              latexBefore: "2x = 6",
              latexAfter: "x = 3",
              arrowDirection: "simplify",
            },
          ],
        },
      ],
      conclusion: "So x = 3.",
    });
    const result = validateResponse(jump);
    expect(result.ok).toBe(true); // warnings are non-blocking
    expect(result.errors!.some((e) => e.includes("jumps from the previous line"))).toBe(true);
  });

  it("warns when a non-first step has no explanation", () => {
    const noReason = JSON.stringify({
      intro: "Let's solve 2x = 6.",
      blocks: [
        {
          type: "equation_steps",
          steps: [
            {
              stepNumber: 1,
              operationLabel: "Start",
              explanation: "Here's the equation.",
              latexBefore: "2x = 6",
              latexAfter: "2x = 6",
              arrowDirection: "down",
            },
            {
              stepNumber: 2,
              operationLabel: "Divide by 2",
              explanation: "",
              latexBefore: "2x = 6",
              latexAfter: "x = 3",
              arrowDirection: "simplify",
            },
          ],
        },
      ],
      conclusion: "So x = 3.",
    });
    const result = validateResponse(noReason);
    expect(result.ok).toBe(true);
    expect(result.errors!.some((e) => e.includes("no explanation given"))).toBe(true);
  });

  it("does not warn about continuity for a clean, continuous chain", () => {
    const result = validateResponse(validResponse);
    expect(result.ok).toBe(true);
    expect(
      (result.errors || []).some(
        (e) => e.includes("jumps from the previous line") || e.includes("no explanation given"),
      ),
    ).toBe(false);
  });

  it("warns when ornate words appear in explanation text", () => {
    const ornate = JSON.stringify({
      intro: "Splendid — let's tackle this rather elegant problem, shall we?",
      blocks: [
        {
          type: "equation_steps",
          steps: [
            {
              stepNumber: 1,
              operationLabel: "Divide",
              explanation: "Indeed, we divide both sides by 2.",
              latexBefore: "2x = 6",
              latexAfter: "x = 3",
              arrowDirection: "down",
            },
          ],
        },
      ],
      conclusion: "Precisely as expected — x = 3.",
    });
    const result = validateResponse(ornate);
    // Warnings only — should still be ok
    expect(result.ok).toBe(true);
    expect(
      result.errors!.some((e) => e.includes("ornate")),
    ).toBe(true);
  });
});
