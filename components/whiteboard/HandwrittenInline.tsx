"use client";

import { useMemo } from "react";
import HandwrittenText from "./HandwrittenText";
import MathWriteIn from "./MathWriteIn";
import { splitInlineMath } from "@/lib/inline-math";
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
    const out: Segment[] = [];
    let delay = startDelay;
    splitInlineMath(text).forEach(({ content, isMath }) => {
      out.push({ content, isMath, delay });
      delay += isMath
        ? estimateMathWriteMs(content)
        : content.length * HAND_CHAR_MS;
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
