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

/** A Whisper transcription segment: one spoken sentence/clause and its real timing. */
export interface TranscriptSegment {
  text: string;
  start: number; // seconds
  end: number; // seconds
}

function splitIntoSentences(text: string): string[] {
  const matches = text.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g);
  return matches ? matches.map((s) => s.trim()).filter(Boolean) : [text];
}

/**
 * Word index at elapsed time, using real per-sentence timestamps when
 * available instead of one linear estimate across the whole clip (DEF-002).
 *
 * Word-level timestamps from the TTS/transcription pipeline are NOT used —
 * verified unreliable for exactly the case that matters most for maths
 * narration: a comma-formatted number like "62,403" transcribes as two words
 * ("62", "403"), desynchronising every following word index. Segment
 * (sentence-level) boundaries are robust to that and shrink the interpolation
 * span from a whole multi-sentence clip down to one sentence, which is what
 * actually removes the documented mid-phrase drift.
 *
 * Falls back to the original whole-clip linear estimate whenever segments are
 * missing or don't positionally match the source text's sentence count —
 * fail soft, same as the rest of the TTS pipeline.
 */
export function wordIndexAtProgressWithSegments(
  text: string,
  elapsedMs: number,
  durationMs: number,
  segments: TranscriptSegment[] | null | undefined,
): number {
  const sentences = splitIntoSentences(text);
  if (!segments || segments.length !== sentences.length) {
    return wordIndexAtProgress(text, elapsedMs, durationMs);
  }

  let offset = 0;
  for (let i = 0; i < sentences.length; i++) {
    const seg = segments[i];
    const wordsInSentence = countWords(sentences[i]);
    const segStartMs = seg.start * 1000;
    const segEndMs = seg.end * 1000;
    const isLast = i === sentences.length - 1;
    if (elapsedMs < segEndMs || isLast) {
      const local =
        segEndMs > segStartMs
          ? Math.min(1, Math.max(0, (elapsedMs - segStartMs) / (segEndMs - segStartMs)))
          : 0;
      const localIndex = Math.min(
        wordsInSentence - 1,
        Math.floor(local * wordsInSentence),
      );
      return offset + Math.max(0, localIndex);
    }
    offset += wordsInSentence;
  }
  return offset - 1;
}
