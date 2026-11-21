"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useReducedMotion } from "framer-motion";

interface Props {
  children: ReactNode;
  /** Element currently being explained — canvas pans toward it once per cue. */
  focusEl: HTMLElement | null;
  /** Changes when the active cue changes, even though the stage element is stable. */
  focusKey: string | number;
  className?: string;
}

/**
 * Stable camera: pans only when the line being written leaves the comfortable
 * viewing band. The board itself never scales; scaling the whole canvas while
 * cards are revealing content was a major source of perceived flicker.
 */
export default function WhiteboardCanvas({
  children,
  focusEl,
  focusKey,
  className = "",
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!focusEl || !scrollRef.current) return;

    const board = scrollRef.current;
    const frame = requestAnimationFrame(() => {
      const boardRect = board.getBoundingClientRect();
      const elRect = focusEl.getBoundingClientRect();
      const top = elRect.top - boardRect.top;
      const bottom = elRect.bottom - boardRect.top;

      // The board keeps its earlier lines, and they are the point: the pen
      // goes back to them. So the camera does not drag each new line to the
      // top (which scrolled everything above it away). It leaves the board
      // alone while the line being written is comfortably in view, and only
      // when the line runs off the bottom — or is above the top, on a step
      // back — moves it to the middle, where the lines above stay visible.
      const inView = top >= boardRect.height * 0.06 && bottom <= boardRect.height * 0.8;
      if (inView) return;

      const delta = top - boardRect.height * 0.42;
      if (Math.abs(delta) > 16) {
        board.scrollBy({
          top: delta,
          behavior: reduceMotion ? "auto" : "smooth",
        });
      }
    });

    return () => cancelAnimationFrame(frame);
  }, [focusEl, focusKey, reduceMotion]);

  return (
    <div
      ref={scrollRef}
      className={`flex-1 overflow-y-auto overflow-x-hidden overscroll-contain ${className}`}
    >
      <div className="relative min-h-full px-4 py-6 sm:px-8 sm:py-10">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.55]"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(59,130,246,0.07), transparent 60%), radial-gradient(ellipse 60% 40% at 80% 100%, rgba(16,185,129,0.05), transparent)",
          }}
        />
        <div className="relative z-[1]">{children}</div>
      </div>
    </div>
  );
}
