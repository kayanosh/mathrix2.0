"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";

interface Props {
  text: string;
  /** 0-based index of the word currently being spoken; -1 = none */
  activeWordIndex: number;
  isSpeaking: boolean;
  className?: string;
}

/** Karaoke-style word highlight synced to estimated speech progress. */
export default function SpeechHighlighter({
  text,
  activeWordIndex,
  isSpeaking,
  className = "",
}: Props) {
  const words = useMemo(() => text.split(/(\s+)/).filter(Boolean), [text]);

  let wordIdx = 0;

  return (
    <p
      className={`text-[15px] sm:text-base leading-relaxed text-slate-600 ${className}`}
      aria-live="polite"
    >
      {words.map((token, i) => {
        const isSpace = /^\s+$/.test(token);
        if (isSpace) {
          return <span key={i}>{token}</span>;
        }
        const thisWord = wordIdx;
        wordIdx += 1;
        const isActive = isSpeaking && thisWord === activeWordIndex;
        const isPast = isSpeaking && thisWord < activeWordIndex;

        return (
          <motion.span
            key={i}
            animate={{
              color: isActive ? "#1d4ed8" : isPast ? "#0f172a" : "#64748b",
              backgroundColor: isActive ? "rgba(59,130,246,0.12)" : "transparent",
            }}
            transition={{ duration: 0.12 }}
            className="rounded-sm px-0.5"
            style={{ fontWeight: isActive ? 600 : 400 }}
          >
            {token}
          </motion.span>
        );
      })}
    </p>
  );
}

/** Estimate which word index should be active given elapsed ms and total duration. */
export function wordIndexAtProgress(
  text: string,
  elapsedMs: number,
  durationMs: number,
): number {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0 || durationMs <= 0) return -1;
  const t = Math.min(1, Math.max(0, elapsedMs / durationMs));
  return Math.min(words.length - 1, Math.floor(t * words.length));
}

export function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}
