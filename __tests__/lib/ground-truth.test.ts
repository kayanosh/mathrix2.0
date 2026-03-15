import {
  buildGroundTruth,
  buildGroundTruthPromptBlock,
} from "@/lib/ground-truth";
import type { CASResult } from "@/lib/cas-solver";
import type { SympyResult } from "@/lib/sympy-solver";

describe("buildGroundTruth", () => {
  const sympySuccess: SympyResult = {
    success: true,
    answers: ["3"],
    answersLatex: ["3"],
    latencyMs: 100,
  };

  const nerdamerSuccess: CASResult = {
    problemType: "solve_equation",
    inputExpression: "2*x+4=10",
    answers: ["3"],
    answersLatex: ["3"],
    verified: true,
  };

  it("returns 'both' when both engines agree", () => {
    const result = buildGroundTruth(sympySuccess, nerdamerSuccess);
    expect(result.source).toBe("both");
    expect(result.verified).toBe(true);
    expect(result.sympyVerified).toBe(true);
    expect(result.answers).toEqual(["3"]);
  });

  it("returns 'sympy' when only sympy succeeds", () => {
    const result = buildGroundTruth(sympySuccess, null);
    expect(result.source).toBe("sympy");
    expect(result.verified).toBe(true);
    expect(result.sympyVerified).toBe(true);
  });

  it("returns 'nerdamer' when only nerdamer succeeds", () => {
    const result = buildGroundTruth(null, nerdamerSuccess);
    expect(result.source).toBe("nerdamer");
    expect(result.verified).toBe(true);
    expect(result.sympyVerified).toBe(false);
  });

  it("returns 'none' when both fail", () => {
    const result = buildGroundTruth(null, null);
    expect(result.source).toBe("none");
    expect(result.verified).toBe(false);
    expect(result.sympyVerified).toBe(false);
    expect(result.answers).toEqual([]);
  });

  it("returns 'none' when sympy has no answers", () => {
    const emptySympy: SympyResult = {
      success: true,
      answers: [],
      latencyMs: 50,
    };
    const result = buildGroundTruth(emptySympy, null);
    expect(result.source).toBe("none");
  });

  it("prefers sympy when answer counts differ", () => {
    const sympyMulti: SympyResult = {
      success: true,
      answers: ["2", "3"],
      answersLatex: ["2", "3"],
      latencyMs: 100,
    };
    const result = buildGroundTruth(sympyMulti, nerdamerSuccess);
    expect(result.source).toBe("sympy");
    expect(result.answers).toEqual(["2", "3"]);
  });

  it("handles failed sympy with working nerdamer", () => {
    const failedSympy: SympyResult = {
      success: false,
      error: "timeout",
      latencyMs: 8000,
    };
    const result = buildGroundTruth(failedSympy, nerdamerSuccess);
    expect(result.source).toBe("nerdamer");
    expect(result.verified).toBe(true);
  });

  it("handles unverified nerdamer", () => {
    const unverifiedNerdamer: CASResult = {
      problemType: "solve_equation",
      inputExpression: "x^3-1=0",
      answers: ["1"],
      answersLatex: ["1"],
      verified: false,
    };
    const result = buildGroundTruth(null, unverifiedNerdamer);
    expect(result.source).toBe("none");
    expect(result.verified).toBe(false);
  });
});

describe("buildGroundTruthPromptBlock", () => {
  it("returns empty string when no answers", () => {
    const result = buildGroundTruthPromptBlock({
      source: "none",
      answers: [],
      answersLatex: [],
      verified: false,
      sympyVerified: false,
    });
    expect(result).toBe("");
  });

  it("includes source label for sympy", () => {
    const result = buildGroundTruthPromptBlock({
      source: "sympy",
      answers: ["3"],
      answersLatex: ["3"],
      verified: true,
      sympyVerified: true,
    });
    expect(result).toContain("SymPy");
    expect(result).toContain("3");
    expect(result).toContain("GROUND TRUTH");
  });

  it("includes both label when both agree", () => {
    const result = buildGroundTruthPromptBlock({
      source: "both",
      answers: ["5"],
      answersLatex: ["5"],
      verified: true,
      sympyVerified: true,
    });
    expect(result).toContain("SymPy + Nerdamer (both agree)");
  });

  it("includes nerdamer label", () => {
    const result = buildGroundTruthPromptBlock({
      source: "nerdamer",
      answers: ["7"],
      answersLatex: ["7"],
      verified: true,
      sympyVerified: false,
    });
    expect(result).toContain("Nerdamer");
  });
});
