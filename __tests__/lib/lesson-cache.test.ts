import { normalizeTopic, hashLessonKey } from "@/lib/lesson-cache-key";

describe("normalizeTopic", () => {
  it("lowercases, trims and collapses whitespace", () => {
    expect(normalizeTopic("  Pythagoras'   Theorem  ")).toBe("pythagoras theorem");
  });

  it("strips quotes and a trailing period", () => {
    expect(normalizeTopic('"Fractions".')).toBe("fractions");
  });
});

describe("hashLessonKey", () => {
  it("is stable for equivalent topic phrasings", () => {
    const a = hashLessonKey("Pythagoras' Theorem", "GCSE", "higher");
    const b = hashLessonKey("  pythagoras'  theorem ", "GCSE", "higher");
    expect(a).toBe(b);
  });

  it("differs by level and tier", () => {
    const base = hashLessonKey("Fractions", "GCSE", "higher");
    expect(hashLessonKey("Fractions", "KS2", "higher")).not.toBe(base);
    expect(hashLessonKey("Fractions", "GCSE", "foundation")).not.toBe(base);
    expect(hashLessonKey("Fractions", "GCSE")).not.toBe(base);
  });

  it("differs by topic", () => {
    expect(hashLessonKey("Fractions", "GCSE", "higher")).not.toBe(
      hashLessonKey("Decimals", "GCSE", "higher"),
    );
  });

  it("produces a 64-char hex sha-256 digest", () => {
    expect(hashLessonKey("Fractions", "GCSE")).toMatch(/^[0-9a-f]{64}$/);
  });
});
