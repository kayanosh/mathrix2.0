"use client";

import {
  useEffect,
  useState,
  useCallback,
  type RefObject,
} from "react";
import { motion } from "framer-motion";
import type { TeacherMark } from "@/types/whiteboard";
import { buildMarkPath, type MarkRect } from "@/lib/emphasis-paths";
import InlineMath from "@/components/InlineMath";

interface Props {
  /** Ref to the positioned container holding the KaTeX equation. */
  containerRef: RefObject<HTMLDivElement | null>;
  mark: TeacherMark;
  /** Seconds before the pen starts drawing (after the equation writes in). */
  delay: number;
}

interface Measured {
  rect: MarkRect;
  container: { w: number; h: number };
}

/**
 * Draws a hand-drawn teacher's mark (circle / underline / box) around the
 * term tagged with `\htmlId{targetId}{...}` inside a KaTeX equation. The mark
 * animates on stroke by stroke, like a pen. If the tagged term can't be
 * found (model forgot the tag), it falls back to marking the whole equation
 * so the emphasis is never silently lost.
 */
export default function TeacherMarkOverlay({ containerRef, mark, delay }: Props) {
  const [measured, setMeasured] = useState<Measured | null>(null);

  const measure = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const cRect = container.getBoundingClientRect();
    const target =
      (container.querySelector(`[id="${mark.targetId}"]`) as HTMLElement | null) ||
      (container.querySelector(".katex") as HTMLElement | null);
    if (!target || cRect.width === 0) return;

    const tRect = target.getBoundingClientRect();
    setMeasured({
      rect: {
        x: tRect.left - cRect.left,
        y: tRect.top - cRect.top,
        width: tRect.width,
        height: tRect.height,
      },
      container: { w: cRect.width, h: cRect.height },
    });
  }, [containerRef, mark.targetId]);

  useEffect(() => {
    // Wait for KaTeX render + write-in layout, with a late second pass for fonts.
    const t1 = setTimeout(measure, 80);
    const t2 = setTimeout(measure, 350);

    const container = containerRef.current;
    let observer: ResizeObserver | null = null;
    if (container && typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => requestAnimationFrame(measure));
      observer.observe(container);
    }
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      observer?.disconnect();
    };
  }, [measure, containerRef]);

  if (!measured) return null;

  const color = mark.color || "#dc2626";
  const { d, length } = buildMarkPath(mark.style, measured.rect, mark.targetId);
  const filterId = `wb-mark-rough-${mark.targetId}`;

  // Label sits under the mark (or to the right for underlines).
  const labelX =
    mark.style === "underline"
      ? measured.rect.x + measured.rect.width + 10
      : measured.rect.x + measured.rect.width / 2;
  const labelY =
    mark.style === "underline"
      ? measured.rect.y + measured.rect.height + 6
      : measured.rect.y + measured.rect.height + 14;

  return (
    <>
      <svg
        className="absolute inset-0 pointer-events-none z-10"
        width={measured.container.w}
        height={measured.container.h}
        viewBox={`0 0 ${measured.container.w} ${measured.container.h}`}
        fill="none"
        overflow="visible"
      >
        <defs>
          <filter id={filterId}>
            <feTurbulence
              type="turbulence"
              baseFrequency="0.04"
              numOctaves="2"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="1.4"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
        <motion.path
          d={d}
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          strokeDasharray={length}
          initial={{ strokeDashoffset: length, opacity: 0 }}
          animate={{ strokeDashoffset: 0, opacity: 0.9 }}
          transition={{
            opacity: { delay, duration: 0.1 },
            strokeDashoffset: { delay, duration: 0.6, ease: "easeInOut" },
          }}
          style={{ filter: `url(#${filterId})` }}
        />
      </svg>

      {mark.label && (
        <motion.span
          className="absolute pointer-events-none z-10 font-[family-name:var(--font-caveat)] text-sm leading-tight whitespace-nowrap"
          style={{
            left: labelX,
            top: labelY,
            color,
            transform:
              mark.style === "underline" ? "none" : "translateX(-50%)",
          }}
          initial={{ opacity: 0, y: -3 }}
          animate={{ opacity: 0.95, y: 0 }}
          transition={{ delay: delay + 0.5, duration: 0.25 }}
        >
          <InlineMath text={mark.label} />
        </motion.span>
      )}
    </>
  );
}
