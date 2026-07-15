"use client";

import MathRenderer from "./MathRenderer";
import { splitInlineMath } from "@/lib/inline-math";

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

  const parts = splitInlineMath(text);
  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.isMath ? (
          <MathRenderer key={i} latex={part.content} />
        ) : (
          <span key={i}>{part.content}</span>
        ),
      )}
    </span>
  );
}
