"use client";

import { useMemo } from "react";
import HandwrittenText from "./HandwrittenText";
import MathWriteIn from "./MathWriteIn";
import { repairMangledBackslashes } from "@/lib/validate";
import { estimateMathWriteMs, HAND_CHAR_MS } from "@/lib/handwriting";

interface Props {
  text: string;
  className?: string;
  /** ms before the first character appears. */
  startDelay?: number;
  /** false = render instantly (static/card mode). */
  animate?: boolean;
}

interface Segment {
  content: string;
  isMath: boolean;
  delay: number;
}

/**
 * Handwritten version of InlineMath: plain text writes letter by letter and
 * `$...$` maths ink-sweeps in, each segment starting when the previous one
 * finishes — so a mixed sentence is written in one continuous pen stroke.
 */
export default function HandwrittenInline({
  text,
  className,
  startDelay = 0,
  animate = true,
}: Props) {
  const segments = useMemo<Segment[]>(() => {
    const repaired = repairMangledBackslashes(text || "");

    if (!repaired.includes("$")) {
      const plain = repaired.replace(/\\times/g, "×").replace(/\\div/g, "÷");
      return plain ? [{ content: plain, isMath: false, delay: startDelay }] : [];
    }

    // parts alternates: [text, mathContent, text, mathContent, ...]
    const parts = repaired.split(/\$([^$]+?)\$/g);
    const out: Segment[] = [];
    let delay = startDelay;
    parts.forEach((part, i) => {
      if (!part) return;
      const isMath = i % 2 === 1;
      out.push({ content: part, isMath, delay });
      delay += isMath
        ? estimateMathWriteMs(part)
        : part.length * HAND_CHAR_MS;
    });
    return out;
  }, [text, startDelay]);

  if (segments.length === 0) return null;

  return (
    <span className={className}>
      {segments.map((seg, i) =>
        seg.isMath ? (
          <MathWriteIn
            key={i}
            latex={seg.content}
            startDelay={seg.delay}
            animate={animate}
          />
        ) : (
          <HandwrittenText
            key={i}
            text={seg.content}
            startDelay={seg.delay}
            animate={animate}
          />
        ),
      )}
    </span>
  );
}
