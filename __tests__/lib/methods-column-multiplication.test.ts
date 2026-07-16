import {
  buildColumnMultiplication,
  parseMultiplicationOperands,
} from "@/lib/methods/column-multiplication";
import {
  buildColumnAddition,
  buildColumnSubtraction,
} from "@/lib/methods/column-addition";
import { buildPlaceValueShift } from "@/lib/methods/place-value-shift";
import { buildMethodForQuestion } from "@/lib/methods";
import { buildColumnRevealTimeline, cellKey } from "@/lib/column-reveal";
import { lookupPedagogy, preferredBuilderId } from "@/lib/ks2-pedagogy/registry";
import { detectKS2RequiredVisuals } from "@/lib/ks2-required-visuals";

describe("buildColumnMultiplication — 36 × 15", () => {
  const result = buildColumnMultiplication(36, 15);

  it("builds correct rows, answer, and carry above multiplicand", () => {
    expect(result.block.type).toBe("column_method");
    if (result.block.type !== "column_method") return;
    expect(result.block.rows).toEqual(["36", "×15", "180", "360", "540"]);
    expect(result.block.answer).toBe("540");
    expect(result.block.carries).toEqual(
      expect.arrayContaining([{ row: 0, col: 1, digit: "3" }]),
    );
    expect(result.block.placeValueHeaders).toEqual(["H", "T", "O"]);
  });

  it("produces digit-level teaching steps a Year 5 can follow", () => {
    const titles = result.teachingSteps.map((s) => s.title);
    expect(titles[0]).toMatch(/Set up/i);
    expect(titles).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/Ones × 5/),
        expect.stringMatching(/place value/i),
        expect.stringMatching(/Add the partial/),
      ]),
    );
    // Ones digit-by-digit: 5×6 and 5×3+carry
    const ones = result.teachingSteps.filter((s) => s.title === "Ones × 5");
    expect(ones.length).toBeGreaterThanOrEqual(2);
    expect(ones[0].explanation).toMatch(/5 × 6/);
    expect(ones[0].explanation).toMatch(/carry 3/);
    expect(ones[1].explanation).toMatch(/5 × 3/);
  });

  it("keeps reveal cell keys aligned with the grid", () => {
    const onesFirst = result.teachingSteps.find((s) =>
      s.explanation.includes("5 × 6"),
    );
    expect(onesFirst?.cellKeys).toContain(cellKey(2, 2)); // write 0 in ones
    expect(onesFirst?.carryKeys).toContain(cellKey(0, 1)); // carry 3
  });
});

describe("buildColumnMultiplication — 23 × 47 carries match captions", () => {
  const result = buildColumnMultiplication(23, 47);

  it("keeps ones and tens carries on the multiplicand row", () => {
    expect(result.block.type).toBe("column_method");
    if (result.block.type !== "column_method") return;
    expect(result.block.rows).toEqual(["23", "×47", "161", "920", "1081"]);
    expect(result.block.answer).toBe("1081");
    // Ones: 7×3=21 → carry 2 above tens of 23
    expect(result.block.carries).toEqual(
      expect.arrayContaining([{ row: 0, col: 2, digit: "2" }]),
    );
    // Tens: 4×3=12 → carry 1 above hundreds column of multiplicand band
    expect(result.block.carries).toEqual(
      expect.arrayContaining([{ row: 0, col: 1, digit: "1" }]),
    );
  });

  it("emits a final-add carry above the total row for 1 + 9", () => {
    expect(result.block.type).toBe("column_method");
    if (result.block.type !== "column_method") return;
    expect(result.block.carries).toEqual(
      expect.arrayContaining([{ row: 4, col: 0, digit: "1" }]),
    );
    const hundreds = result.teachingSteps.find((s) =>
      /hundreds/i.test(s.title),
    );
    expect(hundreds?.explanation).toMatch(/1 \+ 9 = 10/);
    expect(hundreds?.explanation).toMatch(/carry 1/);
    expect(hundreds?.carryKeys).toContain(cellKey(4, 0));
  });

  it("mentions both multiplication carries in captions", () => {
    const captions = result.captions.join(" ");
    expect(captions).toMatch(/carry 2/);
    expect(captions).toMatch(/4 × 3 = 12.*carry 1|carry 1/);
  });

  it("includes titled captions and place-value-aware why lines", () => {
    expect(result.captions[0]).toMatch(/^Set up the columns:/);
    expect(
      result.teachingSteps.some((s) => /How we carry when multiplying/i.test(s.title)),
    ).toBe(false);
    const onesCarry = result.teachingSteps.find((s) =>
      /7 × 3 = 21/.test(s.explanation),
    );
    expect(onesCarry?.explanation).toMatch(/Write 1 and carry 2/);
    expect(onesCarry?.why).toMatch(/arrow shows carry 2/i);
    const tensWrite = result.teachingSteps.find((s) =>
      /4 × 3 = 12/.test(s.explanation),
    );
    expect(tensWrite?.explanation).toMatch(/Write 2 and carry 1/);
    expect(tensWrite?.why).toMatch(/arrow shows carry 1/i);
  });

  it("adds a summary after each partial-product line", () => {
    const summaries = result.teachingSteps.filter((s) =>
      /line complete/i.test(s.title),
    );
    expect(summaries.length).toBe(2);
    expect(summaries[0].explanation).toMatch(/23 × 7 = 161/);
    expect(summaries[1].explanation).toMatch(/23 × 40 = 920/);
  });

  it("labels each working row and provides a board intro", () => {
    expect(result.intro).toBe("Let's multiply 23 × 47.");
    if (result.block.type !== "column_method") return;
    expect(result.block.rowLabels).toEqual([
      "",
      "",
      "23 × 7 = 161",
      "23 × 40 = 920",
      "Add both lines",
    ]);
  });

  it("exposes matching carryKeys on the reveal timeline", () => {
    expect(result.block.type).toBe("column_method");
    if (result.block.type !== "column_method") return;
    const timeline = buildColumnRevealTimeline(result.block);
    const carryKeys = timeline.flatMap((s) => s.carryKeys);
    expect(carryKeys).toEqual(
      expect.arrayContaining([cellKey(0, 2), cellKey(0, 1), cellKey(4, 0)]),
    );
  });
});

describe("parseMultiplicationOperands", () => {
  it("parses common formats", () => {
    expect(parseMultiplicationOperands("36 × 15")).toEqual({ a: 36, b: 15 });
    expect(parseMultiplicationOperands("23x45")).toEqual({ a: 23, b: 45 });
    expect(parseMultiplicationOperands("12 * 8")).toEqual({ a: 12, b: 8 });
  });
});

describe("buildColumnRevealTimeline — digit-level multiplication", () => {
  const block = buildColumnMultiplication(36, 15).block;
  if (block.type !== "column_method") throw new Error("expected column_method");
  const steps = buildColumnRevealTimeline(block);

  it("has more steps than the old coarse partial-product timeline", () => {
    // setup + 2 ones digits + place-value zero + tens digits + add ≥ 6
    expect(steps.length).toBeGreaterThanOrEqual(6);
  });

  it("narrates digit products, not just whole partial rows", () => {
    const joined = steps.map((s) => s.narration).join(" ");
    expect(joined).toMatch(/5 by 6|5 times 6|5 × 6/i);
    expect(joined).toMatch(/carry 3/i);
    expect(joined).toMatch(/zero/i);
    expect(joined).toMatch(/180|360/);
  });

  it("exposes builder titles for the tutor card", () => {
    expect(steps[0].title).toMatch(/Set up/i);
    expect(steps.some((s) => s.title?.includes("Ones"))).toBe(true);
  });
});

describe("column addition / subtraction builders", () => {
  it("adds with carries", () => {
    const r = buildColumnAddition(456, 278);
    expect(r.block.type).toBe("column_method");
    if (r.block.type !== "column_method") return;
    expect(r.block.answer).toBe("734");
    expect(r.teachingSteps.length).toBeGreaterThan(3);
  });

  it("subtracts with borrowing", () => {
    const r = buildColumnSubtraction(503, 178);
    expect(r.block.type).toBe("column_method");
    if (r.block.type !== "column_method") return;
    expect(r.block.answer).toBe("325");
    expect(r.teachingSteps.some((s) => /borrow/i.test(s.explanation))).toBe(true);
  });
});

describe("place-value shift builder", () => {
  it("shifts digits left for ×100", () => {
    const r = buildPlaceValueShift(25, 100, "multiply");
    expect(r.block.type).toBe("table");
    if (r.block.type !== "table") return;
    expect(r.block.rows[r.block.rows.length - 1].join("")).toMatch(/2500/);
  });

  it("keeps the decimal point when multiplying a decimal by 100", () => {
    const r = buildMethodForQuestion("4.56 × 100", "place_value_shift");
    expect(r?.builderId).toBe("place_value_shift");
    expect(r?.answer).toBe("456");
    expect(r?.extraBlocks?.map((block) => block.type)).toContain(
      "equation_steps",
    );
    const equations = r?.extraBlocks?.find(
      (block) => block.type === "equation_steps",
    );
    expect(equations?.type).toBe("equation_steps");
    if (equations?.type === "equation_steps") {
      expect(equations.steps.map((step) => step.latexAfter)).toEqual([
        "4.56",
        "4.56 \\times 10 = 45.6",
        "45.6 \\times 10 = 456",
      ]);
    }
    expect(r?.block.type).toBe("table");
    if (r?.block.type !== "table") return;
    expect(r.block.rows[0].join("")).toBe("4.56".replace(".", ""));
    expect(r.block.rows.at(-1)?.join("")).toContain("456");
  });

  it("supports decimal results when dividing by powers of ten", () => {
    const r = buildMethodForQuestion("4.56 ÷ 100", "place_value_shift");
    expect(r?.builderId).toBe("place_value_shift");
    expect(r?.answer).toBe("0.0456");
    expect(r?.teachingSteps.at(-1)?.explanation).toContain("0.0456");
  });
});

describe("buildMethodForQuestion", () => {
  it("routes 36 × 15 to column multiplication", () => {
    const r = buildMethodForQuestion("Work out 36 × 15");
    expect(r?.builderId).toBe("column_multiplication");
  });

  it("routes 250 × 1000 to place-value shift", () => {
    const r = buildMethodForQuestion("250 × 1000");
    expect(r?.builderId).toBe("place_value_shift");
  });

  it("still resolves subtraction when preferred is column_addition", () => {
    const r = buildMethodForQuestion("503 − 178", "column_addition");
    expect(r?.builderId).toBe("column_subtraction");
    expect(r?.block.type === "column_method" && r.block.answer).toBe("325");
  });

  it("still resolves division when preferred is column_multiplication", () => {
    const r = buildMethodForQuestion("384 ÷ 12", "column_multiplication");
    expect(r?.builderId).toBe("long_division");
  });
});

describe("ks2 pedagogy registry", () => {
  it("prefers place-value shift before generic multiply", () => {
    expect(preferredBuilderId("multiply by 100", "Place value")).toBe(
      "place_value_shift",
    );
  });

  it("matches curriculum Addition & Subtraction topic names", () => {
    expect(preferredBuilderId("", "Addition & Subtraction")).toBe(
      "column_addition",
    );
  });

  it("matches curriculum Multiplication & Division topic names", () => {
    expect(preferredBuilderId("", "Multiplication & Division")).toBe(
      "column_multiplication",
    );
    expect(preferredBuilderId("", "Multiplication & Division A")).toBe(
      "column_multiplication",
    );
  });

  it("detects column multiplication visuals via thin wrapper", () => {
    const reqs = detectKS2RequiredVisuals("36 × 15", "Long multiplication");
    expect(reqs[0]?.matchedTopic).toMatch(/Column Multiplication/i);
    expect(reqs[0]?.requiredBlocks).toContain("column_method");
  });

  it("looks up Year 5/6 vocabulary", () => {
    const hits = lookupPedagogy("", "Column multiplication", []);
    expect(hits[0]?.vocabulary).toEqual(
      expect.arrayContaining(["partial product", "carry"]),
    );
  });
});
