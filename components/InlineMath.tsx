"use client";

import MathRenderer from "./MathRenderer";
import { repairMangledBackslashes } from "@/lib/validate";

/**
 * Renders a string that may contain inline LaTeX delimited by `$...$`.
 * Text outside delimiters is rendered as plain text;
 * text inside is rendered via KaTeX (inline mode).
 *
 * If the string contains no `$`, it's returned as-is (zero overhead).
 */
export default function InlineMath({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  if (!text) return null;

  // Repair JSON-mangled LaTeX (e.g. tab+"imes" from a broken \times)
  const repaired = repairMangledBackslashes(text);

  // Fast path: no dollar signs → plain text (still show × if mangled without $)
  if (!repaired.includes("$")) {
    const plain = repaired.replace(/\\times/g, "×").replace(/\\div/g, "÷");
    return <>{plain}</>;
  }

  // Split on $...$ (non-greedy), keeping the delimiters as captured groups
  const parts = repaired.split(/\$([^$]+?)\$/g);

  // parts alternates: [text, mathContent, text, mathContent, ...]
  return (
    <span className={className}>
      {parts.map((part, i) =>
        i % 2 === 0 ? (
          // Plain text part
          <span key={i}>{part}</span>
        ) : (
          // LaTeX part (was inside $...$)
          <MathRenderer key={i} latex={part} />
        ),
      )}
    </span>
  );
}
