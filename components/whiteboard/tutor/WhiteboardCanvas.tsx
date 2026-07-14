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
 * Stable camera: gently pans so the active step sits in the comfortable
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
      const targetY = boardRect.height * 0.2;
      const currentY = elRect.top - boardRect.top;
      const delta = currentY - targetY;

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
