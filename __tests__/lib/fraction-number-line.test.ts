import {
  buildFractionNumberLine,
  parseFractionCompare,
} from "@/lib/methods/fraction-number-line";
import {
  buildFractionOps,
  parseFractionOp,
} from "@/lib/methods/fraction-ops";
import { buildMethodForQuestion } from "@/lib/methods";
import { applyMethodBuilderToWorkedExample } from "@/lib/methods/apply-builder";
import { preferredBuilderId } from "@/lib/ks2-pedagogy/registry";
import { filterFitBlocks, isBlockFit } from "@/lib/ks2-visual-fitness";
import type { NumberLineBlock } from "@/types/whiteboard";

describe("fraction number line builder", () => {
  const q = "Compare/order 1/2, 3/4, 2/3";

  it("parses three fractions", () => {
    expect(parseFractionCompare(q)).toEqual([
      { n: 1, d: 2 },
      { n: 3, d: 4 },
      { n: 2, d: 3 },
    ]);
  });

  it("emits LCD twelfths line with markers at 1/2, 2/3, 3/4", () => {
    const built = buildFractionNumberLine([
      { n: 1, d: 2 },
      { n: 3, d: 4 },
      { n: 2, d: 3 },
    ]);
    expect(built.builderId).toBe("fraction_number_line");
    expect(built.block.type).toBe("number_line");
    const line = built.block as NumberLineBlock;
    expect(line.range).toEqual([0, 1]);
    expect(line.tickInterval).toBeCloseTo(1 / 12);
    const values = line.markers.map((m) => m.value).sort((a, b) => a - b);
    expect(values[0]).toBeCloseTo(0.5);
    expect(values[1]).toBeCloseTo(2 / 3);
    expect(values[2]).toBeCloseTo(0.75);
    expect(built.answer).toMatch(/1\/2.*2\/3.*3\/4/);
    expect(built.teachingSteps.some((s) => /common denominator/i.test(s.title))).toBe(
      true,
    );
    expect(built.extraBlocks?.some((b) => b.type === "table")).toBe(true);
    expect(built.extraBlocks?.some((b) => b.type === "equation_steps")).toBe(true);
  });

  it("preferred pedagogy is fraction_number_line", () => {
    expect(preferredBuilderId(q, "Fractions")).toBe("fraction_number_line");
  });

  it("resolves via buildMethodForQuestion", () => {
    const built = buildMethodForQuestion(q, "fraction_number_line");
    expect(built?.builderId).toBe("fraction_number_line");
  });

  it("overlays onto a blank LLM number line", () => {
    const blank: NumberLineBlock = {
      type: "number_line",
      range: [0, 1],
      tickInterval: 1,
      markers: [],
    };
    const next = applyMethodBuilderToWorkedExample({
      question: q,
      steps: ["Place fractions…", "Order them…"],
      answer: "?",
      whiteboard: {
        intro: "Let's compare",
        blocks: [blank],
        conclusion: "",
      },
    }, "Fractions");
    expect(next.whiteboard?.blocks?.[0].type).toBe("number_line");
    const line = next.whiteboard!.blocks![0] as NumberLineBlock;
    expect(line.markers.length).toBeGreaterThanOrEqual(3);
    expect(line.tickInterval).toBeLessThan(1);
    expect(next.steps.some((s) => /common denominator|Convert|Order/i.test(s))).toBe(
      true,
    );
  });
});

describe("fraction number-line fitness", () => {
  const q = "Compare/order 1/2, 3/4, 2/3";

  it("rejects blank [0,1] line with tickInterval >= 1 and no markers", () => {
    expect(
      isBlockFit(
        { type: "number_line", range: [0, 1], tickInterval: 1, markers: [] },
        q,
      ),
    ).toBe(false);
  });

  it("accepts builder line with fraction markers", () => {
    const built = buildFractionNumberLine([
      { n: 1, d: 2 },
      { n: 3, d: 4 },
      { n: 2, d: 3 },
    ]);
    expect(isBlockFit(built.block, q)).toBe(true);
  });

  it("drops unfit blank lines from a board", () => {
    const kept = filterFitBlocks(
      [
        { type: "number_line", range: [0, 1], tickInterval: 1, markers: [] },
        {
          type: "equation_steps",
          steps: [
            {
              stepNumber: 1,
              operationLabel: "x",
              explanation: "y",
              latexBefore: "a",
              latexAfter: "b",
              arrowDirection: "simplify",
            },
          ],
        },
      ],
      q,
    );
    expect(kept).toHaveLength(1);
    expect(kept[0].type).toBe("equation_steps");
  });
});

describe("fraction ops extensions", () => {
  it("parses fraction of an amount", () => {
    expect(parseFractionOp("Find 1/3 of 24")).toEqual({
      kind: "of_amount",
      fraction: { n: 1, d: 3 },
      amount: 24,
    });
    const built = buildFractionOps({
      kind: "of_amount",
      fraction: { n: 1, d: 3 },
      amount: 24,
    });
    expect(built.answer).toBe("8");
  });

  it("converts mixed to improper", () => {
    expect(parseFractionOp("Convert 2 1/3 to an improper fraction")).toEqual({
      kind: "to_improper",
      whole: 2,
      frac: { n: 1, d: 3 },
    });
    const built = buildFractionOps({
      kind: "to_improper",
      whole: 2,
      frac: { n: 1, d: 3 },
    });
    expect(built.answer).toBe("7/3");
  });

  it("converts improper to mixed", () => {
    expect(parseFractionOp("Write 7/3 as a mixed number")).toEqual({
      kind: "to_mixed",
      improper: { n: 7, d: 3 },
    });
    const built = buildFractionOps({
      kind: "to_mixed",
      improper: { n: 7, d: 3 },
    });
    expect(built.answer).toBe("2 1/3");
  });
});

describe("wave 2/3 builders smoke", () => {
  it("FDP equivalence", () => {
    const built = buildMethodForQuestion("Write 3/4 as a decimal and a percentage");
    expect(built?.builderId).toBe("fdp_equivalence");
  });

  it("multiples number line", () => {
    const built = buildMethodForQuestion("List the first 6 multiples of 4");
    expect(built?.builderId).toBe("multiples_number_line");
  });

  it("signed number line", () => {
    const built = buildMethodForQuestion(
      "What is the difference between −3 and 5 on a number line?",
    );
    expect(built?.builderId).toBe("signed_number_line");
  });

  it("perimeter", () => {
    const built = buildMethodForQuestion("Find the perimeter of a 6 cm by 4 cm rectangle");
    expect(built?.builderId).toBe("rect_perimeter_area");
  });

  it("volume", () => {
    const built = buildMethodForQuestion("Find the volume of a cuboid 3 × 4 × 5");
    expect(built?.builderId).toBe("cuboid_volume");
  });

  it("angles", () => {
    const built = buildMethodForQuestion(
      "Angles on a straight line: 110° and x. Find x.",
    );
    expect(built?.builderId).toBe("angle_diagram");
  });

  it("coordinates", () => {
    const built = buildMethodForQuestion("Plot the coordinates (2, 3) and (−1, 4)");
    expect(built?.builderId).toBe("coordinate_plot");
  });

  it("ratio", () => {
    const built = buildMethodForQuestion("Share 24 in the ratio 1:2");
    expect(built?.builderId).toBe("ratio_table");
  });

  it("function machine", () => {
    const built = buildMethodForQuestion(
      "Function machine: input 5 then × 3 then + 2. What is the output?",
    );
    expect(built?.builderId).toBe("function_machine");
  });
});
