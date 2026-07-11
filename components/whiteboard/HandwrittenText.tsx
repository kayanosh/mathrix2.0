"use client";

import { useMemo } from "react";
import { HAND_CHAR_MS, prefersReducedMotion } from "@/lib/handwriting";

interface Props {
  text: string;
  /** ms between characters (default HAND_CHAR_MS). */
  charMs?: number;
  /** ms before the first character appears. */
  startDelay?: number;
  className?: string;
  /** false = render instantly (static/card mode). */
  animate?: boolean;
}

/** Longest a single text run may take to write, however long it is. */
const MAX_RUN_MS = 3500;

/**
 * Renders text one character at a time, like a teacher writing on the board.
 * Characters are staggered CSS animations (no timers, no re-renders), grouped
 * into non-breaking word spans so line wrapping stays natural. Whitespace
 * renders as plain text to preserve wrap opportunities.
 */
export default function HandwrittenText({
  text,
  charMs = HAND_CHAR_MS,
  startDelay = 0,
  className,
  animate = true,
}: Props) {
  // Words with their character offset into the full string, so per-character
  // delays keep flowing across word boundaries.
  const words = useMemo(() => {
    const out: { part: string; start: number; isSpace: boolean }[] = [];
    let offset = 0;
    for (const part of text.split(/(\s+)/)) {
      if (part.length > 0) {
        out.push({ part, start: offset, isSpace: /^\s+$/.test(part) });
      }
      offset += part.length;
    }
    return out;
  }, [text]);

  if (!text) return null;

  if (!animate || prefersReducedMotion()) {
    return <span className={className}>{text}</span>;
  }

  const effMs = Math.min(charMs, MAX_RUN_MS / Math.max(text.length, 1));

  return (
    <span className={className}>
      {words.map((w, wi) =>
        w.isSpace ? (
          <span key={wi}>{w.part}</span>
        ) : (
          <span key={wi} className="wb-word">
            {Array.from(w.part).map((ch, ci) => (
              <span
                key={ci}
                className="wb-char"
                style={{
                  animationDelay: `${Math.round(startDelay + (w.start + ci) * effMs)}ms`,
                }}
              >
                {ch}
              </span>
            ))}
          </span>
        ),
      )}
    </span>
  );
}
