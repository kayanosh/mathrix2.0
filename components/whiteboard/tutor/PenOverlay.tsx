"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { hashSeed } from "@/lib/emphasis-paths";
import { INK_ROUGH_FILTER_ID } from "@/components/whiteboard/InkFilterDefs";

interface Props {
  /** Position in the BOARD's coordinate space, not the viewport. */
  x: number;
  y: number;
  visible: boolean;
  /** `write` puts the nib down and scribbles; the others just indicate. */
  mode?: "point" | "write" | "check";
  /**
   * Identifies the mark being written, so the scribble is the same every time
   * a pupil replays the step instead of jittering differently on each run.
   */
  seedKey?: string;
}

/**
 * Deterministic small offsets, so a replay draws the identical wobble.
 *
 * Exported for testing: the values feed framer-motion's `animate` prop, which
 * does not render them into the DOM, so determinism cannot be observed from
 * the markup and has to be asserted here.
 */
export function seededWobble(seedKey: string): { dx: number[]; dy: number[] } {
  let a = hashSeed(seedKey) || 1;
  const next = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const dx: number[] = [];
  const dy: number[] = [];
  for (let i = 0; i < 4; i++) {
    dx.push(Math.round((next() * 2 - 1) * 180) / 100);
    dy.push(Math.round((next() * 2 - 1) * 140) / 100);
  }
  // Return to the start so the loop does not jump.
  dx.push(dx[0]);
  dy.push(dy[0]);
  return { dx, dy };
}

/**
 * The teacher's pen.
 *
 * Replaces TeacherPointer's viewport-fixed arrow. Two things were wrong with
 * that: it could not WRITE (its `mode` only changed the arrow's fill colour),
 * and it lived in a different coordinate space from the ink it was supposedly
 * drawing — the cursor in viewport coordinates from getBoundingClientRect, the
 * marks in container-relative ones. The two could never meet, and once the
 * player went inline a fixed pointer would track a target that had scrolled
 * away.
 *
 * This is positioned inside the board, so it scrolls with the content for
 * free and shares one space with the ink.
 */
export default function PenOverlay({
  x,
  y,
  visible,
  mode = "point",
  seedKey = "pen",
}: Props) {
  const reduceMotion = useReducedMotion();
  const writing = mode === "write";
  const wobble = useMemo(() => seededWobble(seedKey), [seedKey]);

  /*
   * The nib sits ON the target and the barrel trails DOWN-RIGHT.
   *
   * The first version pointed the barrel up-right, which is how a hand really
   * holds a pen — and which covered the character being written. Trailing
   * down-right instead means the pen only ever overlaps the area to the lower
   * right of the nib, which during left-to-right writing is board the teacher
   * has not reached yet. Legibility of the thing being taught beats anatomical
   * accuracy of the grip.
   */
  const NIB_X = 6;
  const NIB_Y = 6;

  const colour =
    mode === "write" ? "#7c3aed" : mode === "check" ? "#059669" : "#2563eb";

  return (
    <motion.div
      className="pointer-events-none absolute z-[60]"
      initial={false}
      animate={{
        x: x - NIB_X,
        y: y - NIB_Y,
        opacity: visible ? 1 : 0,
        scale: visible ? 1 : 0.85,
      }}
      transition={{ type: "spring", stiffness: 320, damping: 30, mass: 0.55 }}
      style={{ left: 0, top: 0, width: 46, height: 52 }}
      aria-hidden
    >
      {/* Ink pooling where the nib meets the board. */}
      <motion.span
        className="absolute rounded-full"
        style={{
          left: NIB_X - 7,
          top: NIB_Y - 7,
          width: 14,
          height: 14,
          background: writing
            ? "rgba(124,58,237,0.22)"
            : "rgba(37,99,235,0.18)",
          border: `2px solid ${colour}`,
        }}
        animate={
          visible && !reduceMotion
            ? { scale: writing ? [0.9, 1.25, 0.9] : [0.8, 1.1, 0.8], opacity: [0.55, 0.95, 0.55] }
            : {}
        }
        transition={{
          duration: writing ? 0.75 : 1.4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/*
        While writing, the whole pen jitters by a small seeded amount — the
        hand moving as it forms a character. Off under reduced motion, where
        the pen simply rests on the target.
      */}
      <motion.svg
        className="absolute drop-shadow-md"
        style={{ left: 0, top: 0 }}
        width="46"
        height="52"
        viewBox="0 0 46 52"
        fill="none"
        animate={
          writing && visible && !reduceMotion
            ? { x: wobble.dx, y: wobble.dy, rotate: [-1.2, 1.2, -1.2] }
            : { x: 0, y: 0, rotate: 0 }
        }
        transition={
          writing && !reduceMotion
            ? { duration: 0.5, repeat: Infinity, ease: "easeInOut" }
            : { duration: 0.2 }
        }
      >
        {/* Barrel trailing down-right from the nib at the top-left. */}
        <g filter={`url(#${INK_ROUGH_FILTER_ID})`}>
          <path
            d="M6 6 L14 9 L42 41 L38 45 L9 14 Z"
            fill={colour}
            stroke="white"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* The nib: a darker tip so the exact contact point is unmistakable. */}
          <path d="M6 6 L14 9 L9 14 Z" fill="#1e1b4b" />
        </g>
        {/* Grip band, purely so the shape reads as a pen at small sizes. */}
        <path
          d="M24 23 L29 28"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.85"
        />
      </motion.svg>
    </motion.div>
  );
}
