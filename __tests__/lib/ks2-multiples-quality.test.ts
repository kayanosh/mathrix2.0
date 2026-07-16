import { buildMethodForQuestion } from "@/lib/methods";
import {
  parseMultiplesQuestion,
  validateMultiplesVisual,
} from "@/lib/methods/multiples-factors";
import { applyMethodBuilderToWorkedExample } from "@/lib/methods/apply-builder";
import type { TableBlock } from "@/types/whiteboard";

function tableFrom(question: string): TableBlock {
  const built = buildMethodForQuestion(question);
  expect(built?.builderId).toBe("multiples_number_line");
  expect(built?.block.type).toBe("table");
  return built!.block as TableBlock;
}

function numbersInColumn(table: TableBlock, column: number): number[] {
  return table.rows
    .map((row) => Number(row[column]))
    .filter((value) => Number.isFinite(value) && value > 0);
}

describe("KS2 common-multiples teaching", () => {
  const question =
    "Find the smallest number greater than 20 that is a multiple of both 6 and 8.";

  it("parses the answer threshold separately from the sequence origins", () => {
    expect(parseMultiplesQuestion(question)).toEqual({
      kind: "common_multiples",
      a: 6,
      b: 8,
      greaterThan: 20,
      atLeast: undefined,
      lessThan: undefined,
      findAll: false,
    });
  });

  it("starts at 6 and 8, advances in order, and reaches 24", () => {
    const built = buildMethodForQuestion(question)!;
    const table = built.block as TableBlock;
    const sixes = numbersInColumn(table, 0);
    const eights = numbersInColumn(table, 1);

    expect(sixes).toEqual([6, 12, 18, 24]);
    expect(eights).toEqual([8, 16, 24]);
    expect(built.answer).toBe("24");
    expect(built.teachingSteps[0].title).toBe("Start the 6 sequence at 6");
    expect(built.teachingSteps[1].title).toBe("Start the 8 sequence at 8");
    expect(validateMultiplesVisual(table, question)).toEqual([]);
  });

  it("repairs the previously clipped cached table deterministically", () => {
    const repaired = applyMethodBuilderToWorkedExample({
      question,
      steps: ["Start the 6 sequence", "Start the 8 sequence", "Compare"],
      answer: "24",
      whiteboard: {
        intro: "Find the first matching number.",
        blocks: [{
          type: "table",
          headers: ["Multiples of 6", "Multiples of 8"],
          rows: [["24", "24"], ["30", "32"], ["36", "40"]],
        }],
        conclusion: "24",
      },
    });
    const table = repaired.whiteboard!.blocks[0] as TableBlock;

    expect(numbersInColumn(table, 0)[0]).toBe(6);
    expect(numbersInColumn(table, 1)[0]).toBe(8);
    expect(validateMultiplesVisual(table, question)).toEqual([]);
  });

  it("rejects clipped or backwards lists", () => {
    const broken: TableBlock = {
      type: "table",
      headers: ["Multiples of 6", "Multiples of 8"],
      rows: [["24", "24"], ["30", "32"]],
    };
    const errors = validateMultiplesVisual(broken, question);
    expect(errors.join(" ")).toContain("start at 6");
    expect(errors.join(" ")).toContain("start at 8");
  });

  it("handles a between-range without discarding earlier multiples", () => {
    const between =
      "A number is a common multiple of 6 and 8. It is between 40 and 50. What is it?";
    const built = buildMethodForQuestion(between)!;
    const table = built.block as TableBlock;
    expect(numbersInColumn(table, 0)[0]).toBe(6);
    expect(numbersInColumn(table, 1)[0]).toBe(8);
    expect(built.answer).toBe("48");
    expect(validateMultiplesVisual(table, between)).toEqual([]);
  });

  it("returns every common multiple requested inside a range", () => {
    const range =
      "Find all common multiples of 12 and 18 between 100 and 200.";
    const built = buildMethodForQuestion(range)!;
    const table = built.block as TableBlock;
    expect(built.answer).toBe("108, 144, 180");
    expect(numbersInColumn(table, 0)[0]).toBe(12);
    expect(numbersInColumn(table, 1)[0]).toBe(18);
    for (const answer of [108, 144, 180]) {
      expect(numbersInColumn(table, 0)).toContain(answer);
      expect(numbersInColumn(table, 1)).toContain(answer);
    }
    expect(validateMultiplesVisual(table, range)).toEqual([]);
  });

  it("drops unrelated AI visuals when repairing a common-multiples example", () => {
    const range =
      "Find all common multiples of 12 and 18 between 100 and 200.";
    const repaired = applyMethodBuilderToWorkedExample({
      question: range,
      steps: ["List multiples", "Compare", "Apply the range"],
      answer: "108, 144, 180",
      whiteboard: {
        intro: "Compare the lists.",
        blocks: [
          {
            type: "table",
            headers: ["Multiples of 12", "Multiples of 18"],
            rows: [["108", "108"]],
          },
          {
            type: "column_method",
            method: "column_multiplication",
            rows: ["12", "×9", "108"],
            question: "12 × 9",
            answer: "108",
          },
        ],
        conclusion: "108",
      },
    });
    expect(repaired.whiteboard?.blocks.map((block) => block.type)).toEqual([
      "table",
    ]);
  });

  it("audits common-multiple pairs across the KS2 times tables", () => {
    for (let a = 2; a <= 12; a += 1) {
      for (let b = 2; b <= 12; b += 1) {
        const q = `Find the smallest common multiple of ${a} and ${b} greater than 20.`;
        const table = tableFrom(q);
        expect(numbersInColumn(table, 0)[0]).toBe(a);
        expect(numbersInColumn(table, 1)[0]).toBe(b);
        expect(validateMultiplesVisual(table, q)).toEqual([]);
      }
    }
  });
});
