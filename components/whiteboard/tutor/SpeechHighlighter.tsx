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

function speechTokens(text: string): Array<{
  token: string;
  isSpace: boolean;
  wordIndex: number;
}> {
  let wordIndex = 0;
  return text.split(/(\s+)/).filter(Boolean).map((token) => {
    const isSpace = /^\s+$/.test(token);
    const result = { token, isSpace, wordIndex };
    if (!isSpace) wordIndex += 1;
    return result;
  });
}

/** Karaoke-style word highlight synced to estimated speech progress. */
export default function SpeechHighlighter({
  text,
  activeWordIndex,
  isSpeaking,
  className = "",
}: Props) {
  const words = useMemo(() => speechTokens(text), [text]);

  return (
    <p
      className={`text-[15px] sm:text-base leading-relaxed text-slate-600 ${className}`}
      aria-live="polite"
    >
      {words.map(({ token, isSpace, wordIndex: thisWord }, i) => {
        if (isSpace) {
          return <span key={i}>{token}</span>;
        }
        const isActive = isSpeaking && thisWord === activeWordIndex;
        const isPast = isSpeaking && thisWord < activeWordIndex;

        return (
          <motion.span
            key={i}
            animate={{
              color: isActive ? "#1d4ed8" : isPast ? "#0f172a" : "#64748b",
              backgroundColor: isActive
                ? "rgba(59,130,246,0.12)"
                : "rgba(0,0,0,0)",
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
