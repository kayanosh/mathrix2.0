import {
  buildFractionOps,
  parseFractionOp,
  simplify,
} from "@/lib/methods/fraction-ops";
import {
  buildDecimalColumn,
  parseDecimalOp,
} from "@/lib/methods/decimal-column";
import { buildMethodForQuestion } from "@/lib/methods";
import { preferredBuilderId, lookupPedagogy, KS2_MATHS_TOPIC_COVERAGE } from "@/lib/ks2-pedagogy/registry";

describe("fraction ops builder", () => {
  it("adds with a common denominator", () => {
    const built = buildFractionOps({
      left: { n: 1, d: 2 },
      right: { n: 1, d: 3 },
      op: "add",
    });
    expect(built.builderId).toBe("fraction_ops");
    expect(built.answer).toBe("5/6");
    expect(built.block.type).toBe("equation_steps");
    expect(built.teachingSteps.some((s) => /common denominator/i.test(s.title))).toBe(
      true,
    );
  });

  it("multiplies a fraction by an integer", () => {
    const built = buildFractionOps({
      left: { n: 3, d: 4 },
      right: { n: 2, d: 1 },
      op: "multiply",
    });
    expect(built.answer).toBe("3/2");
  });

  it("divides by multiplying by the reciprocal", () => {
    const built = buildFractionOps({
      left: { n: 2, d: 3 },
      right: { n: 4, d: 1 },
      op: "divide",
    });
    expect(built.answer).toBe("1/6");
    expect(
      built.teachingSteps.some((s) => /reciprocal/i.test(s.title + s.explanation)),
    ).toBe(true);
  });

  it("parses a/b + c/d", () => {
    expect(parseFractionOp("1/2 + 1/3")).toEqual({
      left: { n: 1, d: 2 },
      right: { n: 1, d: 3 },
      op: "add",
    });
  });

  it("simplifies correctly", () => {
    expect(simplify({ n: 4, d: 6 })).toEqual({ n: 2, d: 3 });
  });
});

describe("decimal column builder", () => {
  it("adds decimals with aligned points", () => {
    const built = buildDecimalColumn({ a: 3.45, b: 2.7, op: "add" });
    expect(built.builderId).toBe("decimal_column");
    expect(built.answer).toBe("6.15");
    if (built.block.type !== "column_method") throw new Error("expected column");
    expect(built.block.rows[0]).toContain(".");
    expect(built.block.placeValueHeaders?.some((h) => h === ".")).toBe(true);
  });

  it("subtracts decimals", () => {
    const built = buildDecimalColumn({ a: 5.3, b: 2.15, op: "subtract" });
    expect(built.answer).toBe("3.15");
  });

  it("multiplies by counting decimal places", () => {
    const built = buildDecimalColumn({ a: 1.2, b: 0.3, op: "multiply" });
    expect(built.answer).toBe("0.36");
    expect(
      built.teachingSteps.some((s) => /decimal point/i.test(s.title)),
    ).toBe(true);
  });

  it("parses decimal addition", () => {
    expect(parseDecimalOp("3.45 + 2.7")).toEqual({
      a: 3.45,
      b: 2.7,
      op: "add",
    });
  });

  it("does not steal integer-only addition", () => {
    expect(parseDecimalOp("345 + 27")).toBeNull();
  });
});

describe("buildMethodForQuestion — new families", () => {
  it("routes fractions and decimals", () => {
    expect(buildMethodForQuestion("1/2 + 1/3")?.builderId).toBe("fraction_ops");
    expect(buildMethodForQuestion("3.45 + 2.7")?.builderId).toBe("decimal_column");
    expect(buildMethodForQuestion("384 ÷ 12")?.builderId).toBe("long_division");
  });
});

describe("pedagogy registry coverage", () => {
  it("prefers fraction and decimal builders from topic names", () => {
    expect(preferredBuilderId("", "Fractions")).toBe("fraction_ops");
    expect(preferredBuilderId("", "Decimals")).toBe("decimal_column");
    expect(preferredBuilderId("", "Long Division")).toBe("long_division");
  });

  it("registers a visual or builder for every Y5/Y6 maths topic name", () => {
    for (const [topic, expectedId] of Object.entries(KS2_MATHS_TOPIC_COVERAGE)) {
      const hits = lookupPedagogy("", topic);
      expect(hits.length).toBeGreaterThan(0);
      expect(hits[0].id).toBe(expectedId);
      expect(
        hits[0].builderId !== null || hits[0].requiredBlocks.length > 0,
      ).toBe(true);
    }
  });
});
