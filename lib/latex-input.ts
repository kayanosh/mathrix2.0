/**
 * Pure helpers for the explicit-LaTeX input mode.
 *
 * When a student turns on LaTeX mode and types an expression (e.g.
 * "\frac{1}{2} + x^2"), we wrap it in `$...$` so the rest of the pipeline —
 * classification, the solver prompt, and KaTeX rendering — treats it as maths.
 * If the student already added their own `$...$` delimiters we leave it alone.
 *
 * No DOM / no deps — fully unit-testable.
 */

/** Does the text already contain at least one $...$ math span? */
export function hasMathDelimiters(text: string): boolean {
  return /\$[^$]+\$/.test(text);
}

/**
 * Heuristic: does this look like raw LaTeX the student would want rendered?
 * Used only to *offer* LaTeX mode — never to force it.
 */
export function looksLikeLatex(text: string): boolean {
  return /\\[a-zA-Z]+|[_^]\{|\\frac|\\sqrt|\\int|\\sum/.test(text);
}

/**
 * Prepare LaTeX-mode input for sending. Trims, and wraps the whole expression
 * in `$...$` unless the student already provided delimiters. Empty in → empty out.
 */
export function wrapLatexForSend(raw: string): string {
  const trimmed = (raw || "").trim();
  if (!trimmed) return "";
  if (hasMathDelimiters(trimmed)) return trimmed;
  // Collapse internal newlines so the whole thing is one inline expression.
  const oneLine = trimmed.replace(/\s*\n+\s*/g, " ");
  return `$${oneLine}$`;
}
