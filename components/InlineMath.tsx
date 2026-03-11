"use client";

import MathRenderer from "./MathRenderer";

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

  // Fast path: no dollar signs → plain text
  if (!text.includes("$")) {
    return <>{text}</>;
  }

  // Split on $...$ (non-greedy), keeping the delimiters as captured groups
  const parts = text.split(/\$([^$]+?)\$/g);

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
