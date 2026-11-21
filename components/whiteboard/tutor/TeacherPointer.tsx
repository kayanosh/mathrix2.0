"use client";

import { useEffect, useState } from "react";
import { animate, motion, useMotionValue } from "framer-motion";
import { inkPen } from "@/lib/ink-pen";

export interface PointerHighlight {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface Props {
  /** Where the tip rests when it is not writing: the thing being pointed at. */
  x: number;
  y: number;
  visible: boolean;
  /** Writing vs pointing */
  mode?: "point" | "write" | "check";
  /** The exact term being talked about, washed with highlighter while it is. */
  highlight?: PointerHighlight | null;
  /**
   * Which side of its target the pen comes in from when pointing. "below" is
   * the natural writing position; "above" is for a term on an earlier line,
   * where coming from below would lay the barrel across the line under it.
   */
  side?: "below" | "above";
}

const INK = { point: "#1d4ed8", write: "#1e293b", check: "#059669" } as const;

/**
 * The teacher's pen.
 *
 * It does two jobs with one object, the way a teacher at a board does. While a
 * line is being written its tip rides the ink: lib/ink-pen.ts reports where the
 * glyph being drawn is, frame by frame, and the pen is moved straight there
 * with no easing so the ink never gets ahead of it. When the writing stops it
 * lifts and springs across to whatever is being talked about, and points.
 *
 * The barrel hangs down and to the right of the tip — where a right hand
 * holding it would be — so it never covers the line it is writing or the term
 * it is pointing at.
 */
export default function TeacherPointer({
  x,
  y,
  visible,
  mode = "point",
  highlight = null,
  side = "below",
}: Props) {
  const tipX = useMotionValue(x);
  const tipY = useMotionValue(y);
  const [writing, setWriting] = useState(false);

  // Ride the ink while something is being written.
  useEffect(
    () =>
      inkPen.subscribe((point) => {
        if (point) {
          tipX.set(point.x);
          tipY.set(point.y);
          setWriting(true);
        } else {
          setWriting(false);
        }
      }),
    [tipX, tipY],
  );

  // Otherwise travel to the target and point at it.
  useEffect(() => {
    if (writing) return;
    const spring = { type: "spring" as const, stiffness: 210, damping: 26, mass: 0.7 };
    const moveX = animate(tipX, x, spring);
    const moveY = animate(tipY, y, spring);
    return () => {
      moveX.stop();
      moveY.stop();
    };
  }, [x, y, writing, tipX, tipY]);

  const ink = writing ? INK.write : INK[mode];
  const pointing = visible && !writing;

  return (
    <>
      {highlight && pointing && (
        <motion.div
          className="pointer-events-none fixed z-[55] rounded-md"
          initial={{ opacity: 0, scaleX: 0.4 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          style={{
            left: highlight.left - 4,
            top: highlight.top - 2,
            width: highlight.width + 8,
            height: highlight.height + 4,
            background: "rgba(250, 204, 21, 0.42)",
            mixBlendMode: "multiply",
            transformOrigin: "left center",
          }}
          aria-hidden
        />
      )}

      <motion.div
        className="pointer-events-none fixed z-[60]"
        initial={false}
        animate={{ opacity: visible || writing ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        style={{ left: 0, top: 0, x: tipX, y: tipY }}
        data-teacher-pen={writing ? "writing" : mode}
        aria-hidden
      >
        {pointing && (
          <motion.span
            className="absolute rounded-full border-2"
            style={{ left: -9, top: -9, width: 18, height: 18, borderColor: ink }}
            animate={{ scale: [0.7, 1.35, 0.7], opacity: [0.75, 0.15, 0.75] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        {/* Drawn tip-down with the tip at the origin, then swung to hang below
            and to the right. The wobble while writing is the hand moving. */}
        <motion.svg
          className="absolute overflow-visible drop-shadow-md"
          style={{ left: 0, top: 0, originX: 0, originY: 0 }}
          width="1"
          height="1"
          viewBox="0 0 1 1"
          fill="none"
          animate={{ rotate: writing ? [132, 139, 132] : side === "above" ? 48 : 135 }}
          transition={
            writing
              ? { duration: 0.34, repeat: Infinity, ease: "easeInOut" }
              : { type: "spring", stiffness: 260, damping: 24 }
          }
        >
          {/* nib */}
          <path d="M0 0 L-3.6 -11 L3.6 -11 Z" fill={ink} />
          {/* collar */}
          <path d="M-4.6 -11 H4.6 L5.6 -19 H-5.6 Z" fill="#cbd5e1" stroke="white" strokeWidth="0.8" />
          {/* barrel */}
          <rect x="-6" y="-56" width="12" height="37" rx="3.2" fill="#0f172a" stroke="white" strokeWidth="1.4" />
          {/* colour band, so the pen visibly is the ink it writes */}
          <rect x="-6" y="-30" width="12" height="6" fill={ink} />
          {/* cap end */}
          <rect x="-6" y="-60" width="12" height="7" rx="3" fill={ink} stroke="white" strokeWidth="1.2" />
        </motion.svg>
      </motion.div>
    </>
  );
}
