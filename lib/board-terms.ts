/**
 * Mark the individual terms of a rendered equation so the pen can point at them.
 *
 * KaTeX output is a forest of spans with no notion of "the 7" or "the x". The
 * only parts of a line the pen could find were terms a step had wrapped in an
 * id for one of its arrows; for everything else it pointed at the line as a
 * whole. This tags each number and each single-letter unknown with what it
 * says, which is what lets the pen land on "25" when the teacher says "25".
 *
 * Browser-only, and safe to run repeatedly on the same element.
 */
import { isPointableTerm, normaliseTermLabel } from "@/lib/spoken-terms";

export const TERM_ATTRIBUTE = "data-teacher-term";

export function tagMathTerms(root: HTMLElement | null): void {
  if (!root) return;

  root.querySelectorAll<HTMLElement>(".katex-html").forEach((html) => {
    // A term a step wrapped in an id ("− 7") is one thing to point at, sign and
    // all — so claim those first and leave their insides alone.
    html.querySelectorAll<HTMLElement>("[id]").forEach((wrapper) => {
      const label = normaliseTermLabel(wrapper.textContent || "");
      if (isPointableTerm(label)) wrapper.setAttribute(TERM_ATTRIBUTE, label);
    });

    html.querySelectorAll<HTMLElement>("*").forEach((node) => {
      if (node.childElementCount > 0 || node.closest("svg")) return;
      const owner = node.closest(`[${TERM_ATTRIBUTE}]`);
      if (owner && owner !== node) return;
      const label = normaliseTermLabel(node.textContent || "");
      if (isPointableTerm(label)) node.setAttribute(TERM_ATTRIBUTE, label);
    });
  });
}

/** The tagged terms inside `root` that are actually on screen, in reading order. */
export function visibleTerms(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>(`[${TERM_ATTRIBUTE}]`)).filter((el) => {
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });
}
