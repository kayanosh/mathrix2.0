/**
 * `equation_steps_incomplete` was mostly a key name, not missing teaching.
 *
 * The validator requires each step to carry latexBefore or latexAfter and
 * rejects the whole block otherwise. Measured across the live cache that fired
 * on 35 lessons, and in 48 of 49 failing blocks the teaching was PRESENT in a
 * different shape — so those lessons were discarded and regenerated on every
 * single request because of a field name.
 *
 * Every fixture below is a real shape taken from the live cache.
 */
import { normalizeEquationStepsDialect } from "@/lib/ks2-visual-fitness";
import { validateVisualBlock } from "@/lib/ks2-lesson-validator";
import type { VisualBlock } from "@/types/whiteboard";

// normalizeEquationStepsDialect operates on a block LIST, as the route does.
const block = (steps: unknown[]): VisualBlock[] =>
  [{ type: "equation_steps", steps }] as unknown as VisualBlock[];

const codes = (b: VisualBlock) =>
  validateVisualBlock(b as never, "").map((i: { code: string }) => i.code);

describe("normalizeEquationStepsDialect", () => {
  it("converts the {expression, explanation} dialect", () => {
    // From "Multiply up to 4-digit by 1-digit", question $2,347 \times 6$.
    const out = normalizeEquationStepsDialect(
      block([
        { expression: "$7 \\times 6 = 42$", explanation: "Write $2$; carry $4$." },
        { expression: "$4 \\times 6 + 4 = 28$", explanation: "Write $8$; carry $2$." },
      ]),
    )[0] as unknown as { steps: { latexBefore: string; latexAfter: string; explanation: string }[] };

    expect(out.steps[0].latexBefore).toBe("7 \\times 6");
    expect(out.steps[0].latexAfter).toBe("42");
    // The explanation is the pupil-facing part — it must survive untouched.
    expect(out.steps[0].explanation).toBe("Write $2$; carry $4$.");
    expect(out.steps[1].latexBefore).toBe("4 \\times 6 + 4");
    expect(out.steps[1].latexAfter).toBe("28");
  });

  it("converts bare string steps", () => {
    // From "Add and subtract integers", question $468 + 357$.
    const out = normalizeEquationStepsDialect(
      block(["$8 + 7 = 15$", "$1 + 6 + 5 = 12$", "$468 + 357 = 825$"]),
    )[0] as unknown as { steps: { latexBefore: string; latexAfter: string }[] };
    expect(out.steps[0]).toEqual({ latexBefore: "8 + 7", latexAfter: "15" });
    expect(out.steps[2]).toEqual({ latexBefore: "468 + 357", latexAfter: "825" });
  });

  it("makes a previously-rejected block valid", () => {
    // The whole point: this is what stops the lesson being thrown away.
    const before = block([{ expression: "$7 \\times 6 = 42$" }]);
    expect(codes(before[0])).toContain("equation_steps_incomplete");
    expect(codes(normalizeEquationStepsDialect(before)[0])).not.toContain(
      "equation_steps_incomplete",
    );
  });

  it("splits on the LAST equals sign", () => {
    const out = normalizeEquationStepsDialect(
      block(["$2 \\times 3 = 6 = 6$"]),
    )[0] as unknown as { steps: { latexBefore: string; latexAfter: string }[] };
    expect(out.steps[0].latexBefore).toBe("2 \\times 3 = 6");
    expect(out.steps[0].latexAfter).toBe("6");
  });

  it("states an expression with identical sides when there is no equals", () => {
    // Matches the existing house style for a "Start" step.
    const out = normalizeEquationStepsDialect(
      block(["250 \\times 10"]),
    )[0] as unknown as { steps: { latexBefore: string; latexAfter: string }[] };
    expect(out.steps[0].latexBefore).toBe("250 \\times 10");
    expect(out.steps[0].latexAfter).toBe("250 \\times 10");
  });

  it("leaves an already-canonical block completely alone", () => {
    const canonical = block([
      { latexBefore: "1 \\div 2", latexAfter: "0.5", explanation: "Short division." },
    ]);
    expect(normalizeEquationStepsDialect(canonical)[0]).toBe(canonical[0]);
  });

  it("DECLINES when any step is unconvertible, rather than shipping a thinner block", () => {
    // R2: a repair that guesses caused five wrong-answer defects. A block with
    // one prose step is returned untouched and left to fail validation, so the
    // failure stays visible instead of becoming a silently shortened lesson.
    const mixed = block([{ expression: "$7 \\times 6 = 42$" }, { explanation: "Line up the digits." }]);
    const out = normalizeEquationStepsDialect(mixed);
    expect(out[0]).toBe(mixed[0]);
    expect(codes(out[0])).toContain("equation_steps_incomplete");
  });

  it("declines an empty step list", () => {
    const empty = block([]);
    expect(normalizeEquationStepsDialect(empty)[0]).toBe(empty[0]);
  });

  it("ignores every other block type", () => {
    const other = [{ type: "number_line", min: 0, max: 10 }] as unknown as VisualBlock[];
    expect(normalizeEquationStepsDialect(other)[0]).toBe(other[0]);
  });

  it("never invents mathematics", () => {
    // Whatever comes out must be a substring of what went in.
    const source = "$7 \\times 6 = 42$";
    const out = normalizeEquationStepsDialect(
      block([{ expression: source }]),
    )[0] as unknown as { steps: { latexBefore: string; latexAfter: string }[] };
    const stripped = source.replace(/\$/g, "");
    expect(stripped).toContain(out.steps[0].latexBefore);
    expect(stripped).toContain(out.steps[0].latexAfter);
  });
});
