import {
  estimateCost,
  isKnownModel,
  aggregateUsage,
  MODEL_PRICING,
} from "@/lib/ai-cost";

describe("isKnownModel", () => {
  it("recognises priced models", () => {
    expect(isKnownModel("gpt-4o")).toBe(true);
    expect(isKnownModel("claude-sonnet-4-6-20250514")).toBe(true);
  });
  it("rejects unknown models", () => {
    expect(isKnownModel("some-future-model")).toBe(false);
  });
});

describe("estimateCost", () => {
  it("computes cost from the price table", () => {
    // gpt-4o: $2.5/1M in, $10/1M out
    const cost = estimateCost("gpt-4o", 1_000_000, 1_000_000);
    expect(cost).toBeCloseTo(12.5, 6);
  });

  it("scales linearly with tokens", () => {
    const p = MODEL_PRICING["gpt-4o-mini"];
    const cost = estimateCost("gpt-4o-mini", 500_000, 250_000);
    const expected = 0.5 * p.inputPerM + 0.25 * p.outputPerM;
    expect(cost).toBeCloseTo(expected, 6);
  });

  it("returns 0 for unknown models", () => {
    expect(estimateCost("mystery", 1000, 1000)).toBe(0);
  });

  it("treats negative / NaN tokens as 0", () => {
    expect(estimateCost("gpt-4o", -100, Number.NaN)).toBe(0);
  });
});

describe("aggregateUsage", () => {
  it("sums tokens and cost across calls", () => {
    const agg = aggregateUsage([
      { model: "claude-sonnet-4-6-20250514", inputTokens: 1000, outputTokens: 2000 },
      { model: "gpt-4o", inputTokens: 500, outputTokens: 100 },
    ]);
    expect(agg.inputTokens).toBe(1500);
    expect(agg.outputTokens).toBe(2100);
    expect(agg.allModelsKnown).toBe(true);
    expect(agg.estCostUsd).toBeGreaterThan(0);
  });

  it("flags when an unpriced model was used", () => {
    const agg = aggregateUsage([
      { model: "gpt-4o", inputTokens: 100, outputTokens: 100 },
      { model: "mystery-model", inputTokens: 100, outputTokens: 100 },
    ]);
    expect(agg.allModelsKnown).toBe(false);
  });

  it("handles an empty call list", () => {
    const agg = aggregateUsage([]);
    expect(agg).toEqual({
      inputTokens: 0,
      outputTokens: 0,
      estCostUsd: 0,
      allModelsKnown: true,
    });
  });
});
