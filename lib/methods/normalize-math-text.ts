/**
 * Normalise lesson / LaTeX text before operand parsing.
 * KS2 lessons often emit "$23 \\times 47$" — parsers must see "23 × 47".
 */
export function normalizeMathText(text: string): string {
  return text
    .replace(/\$+/g, "")
    // Mixed numbers: keep a space between the whole number and the fraction.
    // Without this, "2\frac{1}{2}" became "21/2" — the whole number was
    // glued onto the numerator and every downstream parser computed the
    // wrong value (the 2 1/2 → 21/2 production bug).
    .replace(/(\d)\s*(\\+frac)/gi, "$1 $2")
    .replace(/\\+frac\s*\{\s*(-?\d+)\s*\}\s*\{\s*(\d+)\s*\}/gi, "$1/$2")
    .replace(/\\+times/gi, "×")
    .replace(/\\+cdot/gi, "×")
    .replace(/\\+div/gi, "÷")
    .replace(/[−–]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}
