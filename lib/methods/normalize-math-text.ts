/**
 * Normalise lesson / LaTeX text before operand parsing.
 * KS2 lessons often emit "$23 \\times 47$" — parsers must see "23 × 47".
 */
export function normalizeMathText(text: string): string {
  return text
    .replace(/\$+/g, "")
    .replace(/\\times/gi, "×")
    .replace(/\\cdot/gi, "×")
    .replace(/\\div/gi, "÷")
    .replace(/[−–]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}
