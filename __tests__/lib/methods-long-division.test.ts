import {
  buildLongDivision,
  parseDivisionOperands,
} from "@/lib/methods/long-division";
import { buildMethodForQuestion } from "@/lib/methods";
import { buildColumnRevealTimeline } from "@/lib/column-reveal";

describe("buildLongDivision", () => {
  it("builds 384 ÷ 12 with correct bus-stop rows and answer", () => {
    const built = buildLongDivision(384, 12);
    expect(built.builderId).toBe("long_division");
    expect(built.block.type).toBe("column_method");
    if (built.block.type !== "column_method") return;
    expect(built.block.answer).toBe("32");
    expect(built.block.rows[0].replace(/\s/g, "")).toBe("32");
    expect(built.block.rows[1]).toContain("12)384");
    expect(built.block.rows.map((r) => r.replace(/\s/g, ""))).toEqual(
      expect.arrayContaining(["36", "24", "24", "0"]),
    );
  });

  it("produces digit-level teaching steps for each stage", () => {
    const built = buildLongDivision(384, 12);
    const titles = built.teachingSteps.map((s) => s.title);
    expect(titles).toContain("Set up the bus stop");
    expect(titles).toContain("Divide 38");
    expect(titles).toContain("Multiply 3 × 12");
    expect(titles).toContain("Subtract and bring down");
    expect(titles).toContain("Divide 24");
    expect(titles).toContain("Answer");
  });

  it("aligns cellKeys to quotient digits on row 0", () => {
    const built = buildLongDivision(384, 12);
    const divide38 = built.teachingSteps.find((s) => s.title === "Divide 38");
    expect(divide38?.cellKeys).toHaveLength(1);
    expect(divide38?.cellKeys[0].startsWith("0-")).toBe(true);
  });

  it("handles remainders", () => {
    const built = buildLongDivision(25, 4);
    if (built.block.type !== "column_method") return;
    expect(built.block.answer).toBe("6 r 1");
    expect(built.teachingSteps.at(-1)?.explanation).toMatch(/remainder 1/);
  });
});

describe("parseDivisionOperands", () => {
  it("parses ÷ and / and 'divided by'", () => {
    expect(parseDivisionOperands("384 ÷ 12")).toEqual({ a: 384, b: 12 });
    expect(parseDivisionOperands("384 / 12")).toEqual({ a: 384, b: 12 });
    expect(parseDivisionOperands("384 divided by 12")).toEqual({
      a: 384,
      b: 12,
    });
  });
});

describe("buildMethodForQuestion — long division", () => {
  it("routes 384 ÷ 12 to long division", () => {
    const r = buildMethodForQuestion("384 ÷ 12");
    expect(r?.builderId).toBe("long_division");
  });
});

describe("reveal timeline uses builder for long division", () => {
  it("matches builder teaching step count", () => {
    const built = buildLongDivision(384, 12);
    const steps = buildColumnRevealTimeline({
      type: "column_method",
      method: "long_division",
      rows: built.block.type === "column_method" ? built.block.rows : [],
      separatorAfterRows:
        built.block.type === "column_method"
          ? built.block.separatorAfterRows
          : [],
      question: "384 ÷ 12",
      answer: "32",
    });
    expect(steps.length).toBe(built.teachingSteps.length);
    expect(steps[0].title).toBe("Set up the bus stop");
  });
});
