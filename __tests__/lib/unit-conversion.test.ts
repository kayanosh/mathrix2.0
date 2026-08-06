/**
 * DEF-027 regression.
 *
 * parseUnitConversion() only understood unit ABBREVIATIONS, and its regex
 * alternation listed "m" before "mm"/"ml". Two consequences, one of them a
 * silent correctness bug rather than a miss:
 *
 *   "Convert 5 m to millimetres"    -> parsed m -> m  -> answered "5 m"  (5000 mm)
 *   "Convert 250 cm to millimetres" -> parsed cm -> m -> answered "2.5 m" (2500 mm)
 *
 * because "millimetres" prefix-matches "m". Spelled-out units were otherwise
 * invisible, which is how 57 real cached "Convert 3 l to millilitres"-style
 * questions went unverified — and several of those were serving answers to a
 * completely different question ("Convert 2.7 m to centimetres" -> "7/10 = 0.7
 * = 70%").
 *
 * Separately, metric factors are powers of ten, so raw IEEE754 arithmetic
 * leaked artefacts into pupil-facing text: 4.6 x 100 = 459.99999999999994.
 */
import { buildMethodForQuestion } from "@/lib/methods";
import { parseUnitConversion } from "@/lib/methods/ks2-topic-builders";

const answerFor = (q: string): string | null => {
  const b = buildMethodForQuestion(q);
  return b?.builderId === "unit_conversion" ? (b.answer ?? null) : null;
};

describe("unit conversion (DEF-027)", () => {
  it("does not let a spelled-out unit prefix-match a shorter abbreviation", () => {
    // The silent correctness bug: these previously parsed as "-> m".
    expect(answerFor("Convert 5 m to millimetres.")).toBe("5000 mm");
    expect(answerFor("Convert 250 cm to millimetres.")).toBe("2500 mm");
    expect(answerFor("Convert 3 l to millilitres.")).toBe("3000 ml");
  });

  it("understands spelled-out unit names in both positions", () => {
    expect(answerFor("Convert 2 km to metres.")).toBe("2000 m");
    expect(answerFor("Convert 2000 g to kilograms.")).toBe("2 kg");
    expect(answerFor("Convert 1.5 kg to grams.")).toBe("1500 g");
    expect(answerFor("Convert 500 cm to metres.")).toBe("5 m");
    expect(answerFor("Convert 750 mm to centimetres.")).toBe("75 cm");
  });

  it("handles the 'How many X are in Y?' phrasing, where the target unit comes first", () => {
    expect(answerFor("How many metres are in 5 kilometres?")).toBe("5000 m");
    expect(answerFor("How many millilitres are in 2.5 litres?")).toBe("2500 ml");
  });

  it("handles LaTeX-wrapped units and the 'into' connector", () => {
    expect(answerFor("Convert 3.5\\text{ l} to millilitres.")).toBe("3500 ml");
    expect(answerFor("Convert 4\\text{ m} to centimetres.")).toBe("400 cm");
    expect(answerFor("Convert 3l into ml.")).toBe("3000 ml");
  });

  it("never leaks a floating-point artefact into a pupil-facing answer", () => {
    // 4.6 * 100 === 459.99999999999994 in IEEE754.
    for (const q of [
      "Convert 4.6 m to centimetres.",
      "Convert 2.7 m to centimetres.",
      "Convert 1.35 m to centimetres.",
      "Convert 5.08 m to centimetres.",
      "Convert 6.4 m to centimetres.",
    ]) {
      const a = answerFor(q) ?? "";
      expect(a).not.toMatch(/\d\.\d{6,}/);
      expect(a).not.toMatch(/9{6,}/);
    }
    expect(answerFor("Convert 4.6 m to centimetres.")).toBe("460 cm");
    expect(answerFor("Convert 5.08 m to centimetres.")).toBe("508 cm");
  });

  it("keeps the teaching text free of artefacts too", () => {
    const built = buildMethodForQuestion("Convert 4.6 m to centimetres.");
    const text = [
      ...(built?.teachingSteps ?? []).map((s) => `${s.explanation} ${s.why} ${s.narration}`),
    ].join(" ");
    expect(text).not.toMatch(/\d\.\d{6,}/);
    expect(text).not.toMatch(/9{6,}/);
  });

  it("declines cross-family and no-op conversions", () => {
    expect(parseUnitConversion("Convert 3 l to metres.")).toBeNull();
    expect(parseUnitConversion("Convert 5 m to metres.")).toBeNull();
  });
});
