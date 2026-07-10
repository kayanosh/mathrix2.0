import {
  hasMathDelimiters,
  looksLikeLatex,
  wrapLatexForSend,
} from "@/lib/latex-input";

describe("hasMathDelimiters", () => {
  it("detects a $...$ span", () => {
    expect(hasMathDelimiters("solve $x^2$ please")).toBe(true);
  });

  it("returns false for plain text", () => {
    expect(hasMathDelimiters("solve x squared")).toBe(false);
  });

  it("returns false for a lone dollar sign", () => {
    expect(hasMathDelimiters("costs $5")).toBe(false);
  });
});

describe("looksLikeLatex", () => {
  it("flags backslash commands", () => {
    expect(looksLikeLatex("\\frac{1}{2}")).toBe(true);
    expect(looksLikeLatex("\\sqrt{2}")).toBe(true);
  });

  it("flags subscripts/superscripts with braces", () => {
    expect(looksLikeLatex("x^{2} + 1")).toBe(true);
    expect(looksLikeLatex("a_{n}")).toBe(true);
  });

  it("does not flag ordinary prose", () => {
    expect(looksLikeLatex("what is a fraction")).toBe(false);
  });
});

describe("wrapLatexForSend", () => {
  it("wraps a raw expression in $...$", () => {
    expect(wrapLatexForSend("\\frac{1}{2} + x^2")).toBe("$\\frac{1}{2} + x^2$");
  });

  it("trims surrounding whitespace before wrapping", () => {
    expect(wrapLatexForSend("   x^2   ")).toBe("$x^2$");
  });

  it("leaves text that already has $...$ delimiters untouched", () => {
    expect(wrapLatexForSend("solve $x^2$ now")).toBe("solve $x^2$ now");
  });

  it("collapses newlines into a single inline expression", () => {
    expect(wrapLatexForSend("x^2\n+ 1")).toBe("$x^2 + 1$");
  });

  it("returns empty string for empty/whitespace input", () => {
    expect(wrapLatexForSend("")).toBe("");
    expect(wrapLatexForSend("   ")).toBe("");
  });
});
