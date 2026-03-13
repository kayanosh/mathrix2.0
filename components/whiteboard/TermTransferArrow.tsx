"use client";

import { useEffect, useState, useCallback, type RefObject } from "react";
import { motion } from "framer-motion";

interface ArrowPoints {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface Props {
  /** Ref to the containing element (step-pair card) for relative positioning */
  containerRef: RefObject<HTMLDivElement | null>;
  /** DOM id of the source term (set via \htmlId in KaTeX) */
  fromId: string;
  /** DOM id of the destination term */
  toId: string;
  /** Fallback labels if DOM elements not found */
  fromTerm: string;
  toTerm: string;
  /** Sign rule text displayed along the arrow */
  signRule?: string;
  /** Arrow label (e.g. "Subtract 4") */
  label: string;
  /** Animation delay in seconds */
  delay: number;
  /** Arrow color */
  color?: string;
}

/**
 * Measures the position of two `\htmlId`-tagged terms inside KaTeX-rendered
 * equations and draws a hand-drawn-style SVG curly arrow from source to destination.
 *
 * Falls back to a center-based arrow if the tagged elements aren't found.
 */
export default function TermTransferArrow({
  containerRef,
  fromId,
  toId,
  fromTerm,
  toTerm,
  signRule,
  label,
  delay,
  color = "#dc2626",
}: Props) {
  const [pts, setPts] = useState<ArrowPoints | null>(null);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

  const measure = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const cRect = container.getBoundingClientRect();
    setContainerSize({ w: cRect.width, h: cRect.height });

    const fromEl = container.querySelector(`[id="${fromId}"]`) as HTMLElement | null;
    const toEl = container.querySelector(`[id="${toId}"]`) as HTMLElement | null;

    if (fromEl && toEl) {
      const fRect = fromEl.getBoundingClientRect();
      const tRect = toEl.getBoundingClientRect();

      setPts({
        x1: fRect.left + fRect.width / 2 - cRect.left,
        y1: fRect.top + fRect.height / 2 - cRect.top,
        x2: tRect.left + tRect.width / 2 - cRect.left,
        y2: tRect.top + tRect.height / 2 - cRect.top,
      });
    } else {
      // Fallback: find the "before" and "after" equation rows and anchor
      // the arrow at the right edge of each equation's KaTeX content
      const beforeRow = container.querySelector(".wb-step-before") as HTMLElement | null;
      const afterRow = container.querySelector(".wb-step-after") as HTMLElement | null;

      if (beforeRow && afterRow) {
        const bRect = beforeRow.getBoundingClientRect();
        const aRect = afterRow.getBoundingClientRect();
        // Find the KaTeX content to get the right edge of the equation
        const bKatex = beforeRow.querySelector(".katex") as HTMLElement | null;
        const aKatex = afterRow.querySelector(".katex") as HTMLElement | null;
        const bRight = bKatex
          ? bKatex.getBoundingClientRect().right - cRect.left + 10
          : cRect.width * 0.65;
        const aRight = aKatex
          ? aKatex.getBoundingClientRect().right - cRect.left + 10
          : cRect.width * 0.65;
        const x = Math.max(bRight, aRight);

        setPts({
          x1: x,
          y1: bRect.top + bRect.height / 2 - cRect.top,
          x2: x,
          y2: aRect.top + aRect.height / 2 - cRect.top,
        });
      } else {
        // Last resort: generic center-right position
        setPts({
          x1: cRect.width * 0.65,
          y1: cRect.height * 0.25,
          x2: cRect.width * 0.65,
          y2: cRect.height * 0.75,
        });
      }
    }
  }, [containerRef, fromId, toId]);

  useEffect(() => {
    // Wait for KaTeX to finish rendering, then measure
    const t1 = setTimeout(measure, 80);
    const t2 = setTimeout(measure, 300); // second pass in case fonts loaded late

    // Also observe container resizes
    const container = containerRef.current;
    let observer: ResizeObserver | null = null;
    if (container && typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => {
        requestAnimationFrame(measure);
      });
      observer.observe(container);
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      observer?.disconnect();
    };
  }, [measure, containerRef]);

  if (!pts || containerSize.w === 0) return null;

  // ── Compute SVG path ────────────────────────────────────────────────────

  const { x1, y1, x2, y2 } = pts;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Determine curve direction: if moving mostly downward, curve to the right
  // If moving mostly sideways, curve upward
  const isVertical = Math.abs(dy) > Math.abs(dx);

  // Control point offsets for the cubic Bézier
  const bulge = Math.min(60, dist * 0.4);

  let cp1x: number, cp1y: number, cp2x: number, cp2y: number;

  if (isVertical) {
    // Curve to the right
    cp1x = x1 + bulge;
    cp1y = y1 + dy * 0.25;
    cp2x = x2 + bulge;
    cp2y = y1 + dy * 0.75;
  } else {
    // Curve upward/over
    const curveDir = dy >= 0 ? -1 : 1;
    cp1x = x1 + dx * 0.25;
    cp1y = y1 + curveDir * bulge;
    cp2x = x1 + dx * 0.75;
    cp2y = y2 + curveDir * bulge;
  }

  const pathD = `M ${x1},${y1} C ${cp1x},${cp1y} ${cp2x},${cp2y} ${x2},${y2}`;

  // Arrowhead at the destination
  const angle = Math.atan2(y2 - cp2y, x2 - cp2x);
  const headLen = 10;
  const headAngle = Math.PI / 6;
  const ah1x = x2 - headLen * Math.cos(angle - headAngle);
  const ah1y = y2 - headLen * Math.sin(angle - headAngle);
  const ah2x = x2 - headLen * Math.cos(angle + headAngle);
  const ah2y = y2 - headLen * Math.sin(angle + headAngle);
  const arrowheadD = `M ${ah1x},${ah1y} L ${x2},${y2} L ${ah2x},${ah2y}`;

  // Label position — midpoint of the curve
  const midT = 0.5;
  const mx =
    (1 - midT) ** 3 * x1 +
    3 * (1 - midT) ** 2 * midT * cp1x +
    3 * (1 - midT) * midT ** 2 * cp2x +
    midT ** 3 * x2;
  const my =
    (1 - midT) ** 3 * y1 +
    3 * (1 - midT) ** 2 * midT * cp1y +
    3 * (1 - midT) * midT ** 2 * cp2y +
    midT ** 3 * y2;

  // Offset label away from the curve
  const labelOffsetX = isVertical ? 14 : 0;
  const labelOffsetY = isVertical ? 0 : -14;

  const filterId = `wb-rough-${fromId}`;
  const totalLen = dist * 1.4; // approximate path length

  return (
    <>
      <svg
        className="wb-transfer-overlay"
        width={containerSize.w}
        height={containerSize.h}
        viewBox={`0 0 ${containerSize.w} ${containerSize.h}`}
        fill="none"
        overflow="visible"
      >
        <defs>
          <filter id={filterId}>
            <feTurbulence
              type="turbulence"
              baseFrequency="0.035"
              numOctaves="2"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="1.5"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>

        {/* Main curve */}
        <motion.path
          d={pathD}
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
          strokeDasharray={totalLen}
          initial={{ strokeDashoffset: totalLen }}
          animate={{ strokeDashoffset: 0 }}
          transition={{ delay, duration: 0.5, ease: "easeInOut" }}
          style={{ filter: `url(#${filterId})` }}
        />

        {/* Arrowhead */}
        <motion.path
          d={arrowheadD}
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: delay + 0.45, duration: 0.15 }}
        />

        {/* Source dot */}
        <motion.circle
          cx={x1}
          cy={y1}
          r="3.5"
          fill={color}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay, duration: 0.2, type: "spring" }}
        />
      </svg>

      {/* Label floating near the arrow midpoint */}
      <motion.div
        className="absolute pointer-events-none z-10"
        style={{
          left: mx + labelOffsetX,
          top: my + labelOffsetY,
          transform: "translate(-50%, -50%)",
        }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: delay + 0.25, duration: 0.25 }}
      >
        <span className="wb-transfer-label font-[family-name:var(--font-caveat)]">
          {signRule || label}
        </span>
      </motion.div>
    </>
  );
}
