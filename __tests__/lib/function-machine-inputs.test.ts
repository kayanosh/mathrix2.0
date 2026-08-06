/**
 * DEF-029 regression. parseFunctionMachine required `input\s*(\d+)`, which
 * cannot match the PLURAL "inputs 1, 2, 3 and 4" (the "s" is not whitespace).
 * The taxonomy names function_machine as preferred for this skill, but a
 * preferred builder returning null falls through — so column_addition claimed
 * the question and showed a COLUMN-ARITHMETIC board for a function machine,
 * failing the `algebra` contract (table | equation_steps) with visual_mismatch.
 *
 * Separately, the question asks for FOUR outputs; a single-input trace would
 * answer a question that wasn't asked (the DEF-025 class), so several stated
 * inputs now produce an input/output table.
 */
import { buildMethodForQuestion } from "@/lib/methods";
import { parseFunctionMachine } from "@/lib/methods/ks2-topic-builders";
import { satisfiesSkillVisuals } from "@/lib/ks2-skill-visuals";

describe("function machine inputs (DEF-029)", () => {
  it("parses the plural 'inputs' phrasing", () => {
    const p = parseFunctionMachine(
      "The rule is $\\times 3 + 2$. Find the output values for inputs $1$, $2$, $3$ and $4$.",
    );
    expect(p).not.toBeNull();
    expect(p!.inputs).toEqual([1, 2, 3, 4]);
  });

  it("answers every stated input, not just the first", () => {
    const b = buildMethodForQuestion(
      "The rule is $\\times 3 + 2$. Find the output values for inputs $1$, $2$, $3$ and $4$.",
    );
    expect(b?.builderId).toBe("function_machine");
    expect(b?.answer).toBe("5, 8, 11, 14");
  });

  it("produces a table that satisfies the algebra visual contract", () => {
    const b = buildMethodForQuestion(
      "The rule is $\\times 3 + 2$. Find the output values for inputs $1$, $2$, $3$ and $4$.",
    );
    expect(b?.block.type).toBe("table");
    expect(satisfiesSkillVisuals([b!.block.type], "algebra")).toBe(true);
    if (b?.block.type === "table") {
      expect(b.block.rows).toEqual([["1", "5"], ["2", "8"], ["3", "11"], ["4", "14"]]);
    }
  });

  it("is no longer claimed by column_addition", () => {
    const b = buildMethodForQuestion(
      "The rule is $\\times 3 + 2$. Find the output values for inputs $1$, $2$, $3$ and $4$.",
    );
    expect(b?.builderId).not.toBe("column_addition");
    expect(b?.block.type).not.toBe("column_method");
  });

  it("still handles a single-input machine as a step-by-step trace", () => {
    const b = buildMethodForQuestion("Input 4 then × 3 then + 1. What is the output?");
    expect(b?.builderId).toBe("function_machine");
    expect(b?.answer).toBe("13");
  });
});
