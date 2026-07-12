import { applyMethodBuilderToWorkedExample } from "@/lib/methods/apply-builder";

describe("applyMethodBuilderToWorkedExample", () => {
  it("replaces LLM column board + vague captions for 45 × 23", () => {
    const out = applyMethodBuilderToWorkedExample(
      {
        question: "45 × 23",
        steps: ["Set up the numbers", "Multiply and add"],
        answer: "1035",
        whiteboard: {
          intro: "Let's multiply.",
          blocks: [
            {
              type: "column_method",
              method: "column_multiplication",
              rows: ["45", "×23", "135", "900", "1035"],
              question: "45 × 23",
              answer: "1035",
            },
          ],
          conclusion: "1035",
        },
      },
      "Order of Operations (BIDMAS)",
      [],
    );

    expect(out.steps.length).toBeGreaterThanOrEqual(6);
    expect(out.steps.some((s) => /3 × 5/.test(s))).toBe(true);
    expect(out.steps.some((s) => /135 \+ 900|Add 135/.test(s))).toBe(true);
    const block = out.whiteboard?.blocks.find((b) => b.type === "column_method");
    expect(block?.type).toBe("column_method");
    if (block?.type === "column_method") {
      expect(block.placeValueHeaders).toEqual(["Th", "H", "T", "O"]);
      expect(block.carries?.[0]).toMatchObject({ row: 0, digit: "1" });
      expect(block.rows).toEqual(["45", "×23", "135", "900", "1035"]);
    }
  });

  it("recovers operands from the column board when the title has no digits", () => {
    const out = applyMethodBuilderToWorkedExample(
      {
        question: "Work out this product",
        steps: [],
        answer: "540",
        whiteboard: {
          intro: "Watch carefully.",
          blocks: [
            {
              type: "column_method",
              method: "column_multiplication",
              rows: ["36", "×15", "180", "360", "540"],
              question: "36 × 15",
              answer: "540",
            },
          ],
          conclusion: "540",
        },
      },
      "Multiplication & Division",
      ["Long multiplication"],
    );

    expect(out.steps.some((s) => /5 × 6/.test(s))).toBe(true);
    expect(out.answer).toBe("540");
  });
});
