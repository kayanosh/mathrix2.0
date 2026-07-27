/**
 * Normalise lesson / LaTeX text before operand parsing.
 * KS2 lessons often emit "$23 \\times 47$" — parsers must see "23 × 47".
 */
export function normalizeMathText(text: string): string {
  return text
    .replace(/\$+/g, "")
    // Thousands separators: "62,403" must parse as one number, not "62" and
    // "403". Without this, every operand regex below (\d{1,6}) only sees the
    // digit run adjacent to an operator and silently computes the wrong
    // calculation on comma-grouped numbers >= 1,000 (the 62,403-27,568 → 376
    // production bug). The lookahead requires exactly three digits then a
    // word boundary, so list/coordinate commas ("1/2, 3/4", "(3, 4)") are
    // untouched — they're followed by a space, not immediately by digits.
    .replace(/(\d),(?=\d{3}\b)/g, "$1")
    // Mixed numbers: keep a space between the whole number and the fraction.
    // Without this, "2\frac{1}{2}" became "21/2" — the whole number was
    // glued onto the numerator and every downstream parser computed the
    // wrong value (the 2 1/2 → 21/2 production bug).
    .replace(/(\d)\s*(\\+frac)/gi, "$1 $2")
    .replace(/\\+frac\s*\{\s*(-?\d+)\s*\}\s*\{\s*(\d+)\s*\}/gi, "$1/$2")
    // Equivalent-fraction questions often use \square in one part:
    // \frac{\square}{12} or \frac{3}{\square}. Preserve that unknown as "?"
    // so the deterministic fraction parser can solve the requested form.
    .replace(
      /\\+frac\s*\{\s*(?:\\+square|□|\?|[a-z])\s*\}\s*\{\s*(\d+)\s*\}/gi,
      "?/$1",
    )
    .replace(
      /\\+frac\s*\{\s*(-?\d+)\s*\}\s*\{\s*(?:\\+square|□|\?|[a-z])\s*\}/gi,
      "$1/?",
    )
    .replace(/\\+times/gi, "×")
    .replace(/\\+cdot/gi, "×")
    .replace(/\\+div/gi, "÷")
    // Unwrap \text{...} to its plain content, e.g. "4\text{ cm}" -> "4 cm".
    // Without this, unit-labelled numbers written with \text{} (a normal,
    // expected LaTeX convention the model uses often) don't match any
    // downstream operand/dimension regex, since none of them expect a
    // literal backslash between a number and its unit.
    .replace(/\\+text\s*\{\s*([^{}]*)\s*\}/gi, "$1")
    .replace(/[−–]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}
