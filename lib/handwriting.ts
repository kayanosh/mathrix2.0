/**
 * Handwriting timing — pure helpers shared by the write-in components and the
 * tutor's playback loop, so the pause before narration always matches how long
 * the "ink" actually takes to appear on the board.
 *
 * All estimates are millisecond durations derived from how many visible
 * symbols get drawn, clamped so a huge block never stalls playback and a tiny
 * one never feels instant.
 */

/** Per-character pace for plain handwritten text. */
export const HAND_CHAR_MS = 32;
/** Per-symbol pace for KaTeX ink (maths symbols are slower to draw). */
export const MATH_CHAR_MS = 45;
/** Per-cell pace when writing digits into a column-method grid. */
export const CELL_WRITE_MS = 160;

function clamp(ms: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(ms)));
}

/**
 * Roughly how many symbols a LaTeX string draws on the board.
 * Meta arguments (\htmlId ids, \textcolor colours) are invisible, \text{...}
 * counts its content, and every other command counts as one drawn symbol
 * (\frac draws a bar, \sqrt draws a radical, ...).
 */
export function visibleLatexLength(latex: string): number {
  let s = latex;
  s = s.replace(/\\htmlId\{[^}]*\}/g, "");
  s = s.replace(/\\htmlClass\{[^}]*\}/g, "");
  s = s.replace(/\\textcolor\{[^}]*\}/g, "");
  s = s.replace(/\\phantom\{[^}]*\}/g, "");
  s = s.replace(/\\text\{([^}]*)\}/g, "$1");
  s = s.replace(/\\[a-zA-Z]+/g, "#");
  s = s.replace(/[{}\s]/g, "");
  return s.length;
}

/** How long the KaTeX left-to-right ink sweep takes for a LaTeX string. */
export function estimateMathWriteMs(latex: string): number {
  return clamp(visibleLatexLength(latex) * MATH_CHAR_MS, 250, 2500);
}

/**
 * How long a mixed text string (may contain $...$ maths) takes to handwrite.
 */
export function estimateTextWriteMs(text: string): number {
  if (!text) return 300;
  const parts = text.split(/\$([^$]+?)\$/g);
  let ms = 0;
  parts.forEach((part, i) => {
    ms +=
      i % 2 === 0
        ? part.length * HAND_CHAR_MS
        : visibleLatexLength(part) * MATH_CHAR_MS;
  });
  return clamp(ms, 300, 3500);
}

/** How long writing `keyCount` grid cells/carries/notes of a column step takes. */
export function estimateColumnStepWriteMs(keyCount: number): number {
  return clamp(250 + keyCount * CELL_WRITE_MS, 400, 2500);
}

/** True when the user asked the OS to minimise motion — skip write-in effects. */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}
