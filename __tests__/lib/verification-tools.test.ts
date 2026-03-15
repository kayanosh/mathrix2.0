import {
  verifyArithmetic,
  verifyGradientSign,
} from "@/lib/verification-tools";

describe("verifyArithmetic", () => {
  it("verifies correct arithmetic", () => {
    const result = verifyArithmetic("2 + 3", "5");
    expect(result.passed).toBe(true);
  });

  it("detects incorrect arithmetic", () => {
    const result = verifyArithmetic("2 + 3", "6");
    expect(result.passed).toBe(false);
  });

  it("handles multiplication", () => {
    const result = verifyArithmetic("4 * 5", "20");
    expect(result.passed).toBe(true);
  });

  it("handles division", () => {
    const result = verifyArithmetic("10 / 2", "5");
    expect(result.passed).toBe(true);
  });

  it("handles complex expressions", () => {
    const result = verifyArithmetic("(3 + 4) * 2", "14");
    expect(result.passed).toBe(true);
  });

  it("handles LaTeX notation", () => {
    const result = verifyArithmetic("\\frac{6}{2}", "3");
    expect(result.passed).toBe(true);
  });

  it("returns failed for unparseable expressions", () => {
    const result = verifyArithmetic("hello world", "5");
    expect(result.passed).toBe(false);
  });
});

describe("verifyGradientSign", () => {
  it("detects positive gradient", () => {
    const result = verifyGradientSign(0, 0, 2, 4, "positive");
    expect(result.passed).toBe(true);
  });

  it("detects negative gradient", () => {
    const result = verifyGradientSign(0, 4, 2, 0, "negative");
    expect(result.passed).toBe(true);
  });

  it("fails when expected sign is wrong", () => {
    const result = verifyGradientSign(0, 0, 2, 4, "negative");
    expect(result.passed).toBe(false);
  });

  it("includes gradient value in detail", () => {
    const result = verifyGradientSign(0, 0, 1, 3, "positive");
    expect(result.detail).toContain("3.0000");
  });
});
