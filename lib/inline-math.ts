import { repairMangledBackslashes } from "@/lib/validate";

export interface InlineMathSegment {
  content: string;
  isMath: boolean;
}

/**
 * Parse model-authored `$...$` maths without ever leaking delimiter characters
 * into the lesson UI. Stray delimiters are discarded because lesson copy does
 * not use dollar signs as currency.
 */
export function splitInlineMath(text: string): InlineMathSegment[] {
  const repaired = repairMangledBackslashes(text || "")
    // Treat display delimiters as inline delimiters in prose fields.
    .replace(/\$\$([^$]+?)\$\$/g, (_match, maths: string) => `$${maths}$`);

  if (!repaired.includes("$")) {
    const plain = repaired.replace(/\\times/g, "×").replace(/\\div/g, "÷");
    return plain ? [{ content: plain, isMath: false }] : [];
  }

  const parts = repaired.split(/\$([^$]+?)\$/g);
  return parts.flatMap((part, index) => {
    const isMath = index % 2 === 1;
    const content = isMath
      ? part
      : part
          .replace(/\$/g, "")
          .replace(/\\times/g, "×")
          .replace(/\\div/g, "÷");
    return content ? [{ content, isMath }] : [];
  });
}

/** Plain-text fallback for SVG <text>, which cannot contain KaTeX markup. */
export function inlineMathToPlainText(text: string): string {
  return splitInlineMath(text)
    .map(({ content }) => content)
    .join("");
}
