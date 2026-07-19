/**
 * Exact mathematical values for KS2 answer comparison.
 *
 * Answers reach us as free text: "1.25", "5/4", "1 1/4", "$1\frac{1}{4}$",
 * "1¼", "£1.25". Comparing them as floats (or worse, by regex on the raw
 * string) misjudges correct pupils and correct lessons. This module parses
 * the last value-bearing token of a string into an exact rational number
 * (BigInt numerator/denominator) so equivalence is structural, not lexical.
 */

import { normalizeMathText } from "@/lib/methods/normalize-math-text";

export interface Rational {
  num: bigint;
  den: bigint; // always positive, fraction always reduced
}

const VULGAR_FRACTIONS: Record<string, [number, number]> = {
  "½": [1, 2],
  "⅓": [1, 3],
  "⅔": [2, 3],
  "¼": [1, 4],
  "¾": [3, 4],
  "⅕": [1, 5],
  "⅖": [2, 5],
  "⅗": [3, 5],
  "⅘": [4, 5],
  "⅙": [1, 6],
  "⅚": [5, 6],
  "⅛": [1, 8],
  "⅜": [3, 8],
  "⅝": [5, 8],
  "⅞": [7, 8],
};

function gcd(a: bigint, b: bigint): bigint {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y !== 0n) {
    [x, y] = [y, x % y];
  }
  return x === 0n ? 1n : x;
}

export function makeRational(num: bigint, den: bigint): Rational | null {
  if (den === 0n) return null;
  const sign = den < 0n ? -1n : 1n;
  const d = gcd(num, den);
  return { num: (num * sign) / d, den: (den * sign) / d };
}

export function rationalEquals(a: Rational, b: Rational): boolean {
  return a.num === b.num && a.den === b.den;
}

function fromDecimal(whole: string, decimals: string, negative: boolean): Rational {
  const digits = `${whole}${decimals}`.replace(/^0+(?=\d)/, "");
  const num = BigInt(digits) * (negative ? -1n : 1n);
  const den = 10n ** BigInt(decimals.length);
  // fromDecimal never has a zero denominator
  return makeRational(num, den)!;
}

function mixedValue(
  whole: bigint,
  numerator: bigint,
  denominator: bigint,
): Rational | null {
  const frac = makeRational(numerator, denominator);
  if (!frac) return null;
  const magnitude = makeRational(
    (whole < 0n ? -whole : whole) * frac.den + frac.num,
    frac.den,
  );
  if (!magnitude) return null;
  return whole < 0n ? { num: -magnitude.num, den: magnitude.den } : magnitude;
}

/**
 * Guard the mixed-number boundary before normalisation: "1\frac{1}{4}"
 * becomes "11/4" once \frac is rewritten, so separate the whole number
 * from the fraction first.
 */
function preprocess(raw: string): string {
  return normalizeMathText(
    String(raw || "").replace(/(\d)\s*(\\+frac)/gi, "$1 $2"),
  ).replace(/,/g, "");
}

/** Parse a single numeric token (mixed number, fraction, decimal, integer). */
export function parseNumericToken(raw: string): Rational | null {
  let text = preprocess(raw);
  // Expand unicode vulgar fractions into plain fractions, preserving any
  // leading whole number as a mixed number ("1½" → "1 1/2").
  for (const [glyph, [n, d]] of Object.entries(VULGAR_FRACTIONS)) {
    text = text.split(glyph).join(` ${n}/${d}`);
  }
  text = text.trim();

  // Mixed number: integer followed by a proper fraction.
  const mixed = text.match(/^(-?\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixed) {
    return mixedValue(BigInt(mixed[1]), BigInt(mixed[2]), BigInt(mixed[3]));
  }

  // Plain fraction.
  const fraction = text.match(/^(-?\d+)\s*\/\s*(\d+)$/);
  if (fraction) {
    return makeRational(BigInt(fraction[1]), BigInt(fraction[2]));
  }

  // Decimal or integer.
  const decimal = text.match(/^(-?)(\d+)(?:\.(\d+))?$/);
  if (decimal) {
    return fromDecimal(decimal[2], decimal[3] || "", decimal[1] === "-");
  }

  return null;
}

interface ParsedAnswer {
  value: Rational;
  /** True when the source token carried a "%" sign. */
  isPercent: boolean;
}

/**
 * Extract the answer value from free text. Mirrors the long-standing rule
 * that the LAST number in the string is the answer ("£4.50 each, so £9
 * altogether" → 9), while keeping mixed numbers whole: the integer in
 * "1 1/4" belongs to the fraction and must not be read separately.
 */
export function parseMathsValue(raw: string): ParsedAnswer | null {
  let text = preprocess(raw).replace(/£/g, " ");
  for (const [glyph, [n, d]] of Object.entries(VULGAR_FRACTIONS)) {
    text = text.split(glyph).join(` ${n}/${d}`);
  }

  const token = /(-?\d+\s+\d+\s*\/\s*\d+|-?\d+\s*\/\s*\d+|-?\d+(?:\.\d+)?)(\s*%)?/g;
  let last: ParsedAnswer | null = null;
  for (const match of text.matchAll(token)) {
    const value = parseNumericToken(match[1].trim());
    if (value) {
      last = { value, isPercent: match[2] !== undefined };
    }
  }
  return last;
}

/** Every rational a percent-bearing token could reasonably mean. */
function interpretations(parsed: ParsedAnswer): Rational[] {
  if (!parsed.isPercent) return [parsed.value];
  const asFraction = makeRational(parsed.value.num, parsed.value.den * 100n);
  return asFraction ? [parsed.value, asFraction] : [parsed.value];
}

/** Structural equivalence of two free-text answers. */
export function mathsValuesEquivalent(supplied: string, expected: string): boolean {
  const a = parseMathsValue(supplied);
  const b = parseMathsValue(expected);
  if (!a || !b) return false;
  return interpretations(a).some((av) =>
    interpretations(b).some((bv) => rationalEquals(av, bv)),
  );
}
