import {
  normalizeTtsText,
  normalizeSpeed,
  hashTtsKey,
} from "@/lib/tts-cache-key";

describe("normalizeTtsText", () => {
  it("collapses whitespace and trims", () => {
    expect(normalizeTtsText("  Add   the\n\nnumbers  ")).toBe("Add the numbers");
  });

  it("preserves case and punctuation", () => {
    expect(normalizeTtsText("Now, divide by 2!")).toBe("Now, divide by 2!");
  });
});

describe("normalizeSpeed", () => {
  it("clamps to the valid range", () => {
    expect(normalizeSpeed(0)).toBe(0.25);
    expect(normalizeSpeed(10)).toBe(4);
  });

  it("rounds to 2 dp", () => {
    expect(normalizeSpeed(1.10001)).toBe(1.1);
  });

  it("defaults invalid input to 1", () => {
    expect(normalizeSpeed(NaN)).toBe(1);
  });
});

describe("hashTtsKey", () => {
  it("is stable for whitespace-equivalent text", () => {
    expect(hashTtsKey("Add  the numbers", "onyx", 1)).toBe(
      hashTtsKey(" Add the numbers ", "onyx", 1),
    );
  });

  it("is stable across speed rounding", () => {
    expect(hashTtsKey("hello", "onyx", 1.1)).toBe(
      hashTtsKey("hello", "onyx", 1.10001),
    );
  });

  it("differs when text differs", () => {
    expect(hashTtsKey("hello", "onyx", 1)).not.toBe(
      hashTtsKey("goodbye", "onyx", 1),
    );
  });

  it("differs when voice differs", () => {
    expect(hashTtsKey("hello", "onyx", 1)).not.toBe(
      hashTtsKey("hello", "nova", 1),
    );
  });

  it("differs when speed differs", () => {
    expect(hashTtsKey("hello", "onyx", 1)).not.toBe(
      hashTtsKey("hello", "onyx", 1.5),
    );
  });

  it("produces a 64-char hex sha256", () => {
    expect(hashTtsKey("hello", "onyx", 1)).toMatch(/^[a-f0-9]{64}$/);
  });
});
