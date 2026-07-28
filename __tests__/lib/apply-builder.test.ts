import { applyMethodBuilderToWorkedExample } from "@/lib/methods/apply-builder";
import type { ColumnMethodBlock } from "@/types/whiteboard";

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
    expect(out.steps.some((s) => /135 \+ 900|ones line \(135\)|Add 135/.test(s))).toBe(
      true,
    );
    expect(out.teachingSteps?.length).toBeGreaterThanOrEqual(6);
    expect(out.teachingSteps?.[0]?.title).toMatch(/Set up/i);
    expect(out.teachingSteps?.some((s) => !!s.why)).toBe(true);
    expect(out.steps[0]).toMatch(/^Set up the columns:/);
    expect(out.whiteboard?.intro).toBe("Let's multiply 45 × 23.");
    const block = out.whiteboard?.blocks.find((b) => b.type === "column_method");
    expect(block?.type).toBe("column_method");
    if (block?.type === "column_method") {
      const column = block as ColumnMethodBlock;
      expect(column.placeValueHeaders).toEqual(["Th", "H", "T", "O"]);
      expect(column.carries?.[0]).toMatchObject({ row: 0, digit: "1" });
      expect(block.rows).toEqual(["45", "×23", "135", "900", "1035"]);
      expect(column.rowLabels).toEqual(
        expect.arrayContaining([
          "45 × 3 = 135",
          "45 × 20 = 900",
          "Add both lines",
        ]),
      );
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

  it("uses the full LaTeX question instead of a digit sub-calculation", () => {
    const out = applyMethodBuilderToWorkedExample(
      {
        question: "Calculate $23 \\\\times 47$ using long multiplication.",
        steps: [
          "First calculate $7 \\\\times 3 = 21$.",
          "Continue with the remaining digits.",
        ],
        // Mirrors a cached worksheet corrupted by the old sub-step selector.
        answer: "21",
        whiteboard: {
          intro: "Let's break the multiplication down.",
          blocks: [
            {
              type: "column_method",
              method: "column_multiplication",
              // Mirrors the bad production worksheet: only the first digit sum.
              rows: ["7", "×3", "21"],
              question: "7 × 3",
              answer: "21",
            },
          ],
          conclusion: "The answer is 1081.",
        },
      },
      "Multiplication and Division",
      ["Long multiplication"],
    );

    expect(out.answer).toBe("1081");
    const block = out.whiteboard?.blocks.find((b) => b.type === "column_method");
    expect(block?.type).toBe("column_method");
    if (block?.type === "column_method") {
      expect(block.question).toBe("23 × 47");
      expect(block.rows).toEqual(["23", "×47", "161", "920", "1081"]);
      expect(block.answer).toBe("1081");
    }
    expect(out.steps.some((step) => step.includes("7 × 3"))).toBe(true);
    expect(
      out.steps.some((step) => /161 \+ 920|ones line \(161\).*tens line \(920\)/.test(step)),
    ).toBe(true);
  });

  it("uses the full question for Addition & Subtraction curriculum topics", () => {
    const out = applyMethodBuilderToWorkedExample(
      {
        question: "Work out 503 − 178",
        steps: ["Set up", "Subtract"],
        answer: "325",
        whiteboard: {
          intro: "Let's subtract.",
          blocks: [
            {
              type: "column_method",
              method: "column_subtraction",
              rows: ["503", "-178", "325"],
              question: "503 − 178",
              answer: "325",
            },
          ],
          conclusion: "325",
        },
      },
      "Addition & Subtraction",
      ["Column subtraction"],
    );

    expect(out.answer).toBe("325");
    expect(out.steps.some((s) => /borrow|take away|−|subtract/i.test(s))).toBe(
      true,
    );
  });

  it("DEF-020: a coordinate_graph block wins over an earlier, stray number_line block in the same worked example", () => {
    // Reproduces a real cached lesson (y6m-position-direction / "coordinates
    // in four quadrants" / guided) where the LLM emitted BOTH a number_line
    // block and a coordinate_graph block for the same worked example. The
    // per-block-type loop used to return on the first matching block type it
    // walked into, so the number_line (earlier in the array) won purely by
    // array position and produced an unrelated "compare two numbers on a
    // number line" answer for a "read the coordinates" question.
    const out = applyMethodBuilderToWorkedExample(
      {
        question: "What are the coordinates of point $P$?",
        steps: [
          "Mark both numbers: Place -3 and 2 on the number line (0 is the middle reference).",
          "Compare / difference: 2 is greater. The difference is 5.",
        ],
        answer: "difference 5; greater 2",
        whiteboard: {
          intro: "Use a number line through zero to compare -3 and 2.",
          blocks: [
            {
              type: "number_line",
              range: [-4, 3],
              markers: [
                { label: "-3", style: "filled", value: -3 },
                { label: "2", style: "filled", value: 2 },
                { label: "0", style: "open", value: 0 },
              ],
              tickInterval: 1,
            },
            {
              type: "coordinate_graph",
              points: [{ point: { x: -3, y: 2 }, label: "$P$" }],
              plots: [],
              xLabel: "$x$",
              xRange: [-5, 5],
              yLabel: "$y$",
              yRange: [-5, 5],
              grid: true,
            },
          ],
          conclusion: "What are the coordinates of point $P$? = difference 5; greater 2",
        },
      },
      "Position & Direction",
      ["Coordinates in four quadrants"],
    );

    expect(out.answer).toBe("(-3,2)");
    expect(out.steps.some((s) => /move 3 left/i.test(s))).toBe(true);
    expect(out.steps.some((s) => /move 2 up/i.test(s))).toBe(true);
    // The point's own "$P$" label (LaTeX-wrapped) should be used, not a
    // fallback letter derived from array index.
    expect(out.steps.some((s) => /^P\b/.test(s) || /\bP:/.test(s))).toBe(true);
  });
});
