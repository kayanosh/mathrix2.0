"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

interface Props {
  children: ReactNode;
  /** Element currently being explained — canvas pans/zooms toward it */
  focusEl: HTMLElement | null;
  className?: string;
}

/**
 * Soft camera: gently pans + scales so the active step sits in the
 * comfortable viewing band (upper-middle third).
 */
export default function WhiteboardCanvas({ children, focusEl, className = "" }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!focusEl || !scrollRef.current) return;

    const board = scrollRef.current;
    const boardRect = board.getBoundingClientRect();
    const elRect = focusEl.getBoundingClientRect();

    const targetY = boardRect.height * 0.28;
    const currentY = elRect.top - boardRect.top;
    const delta = currentY - targetY;

    if (Math.abs(delta) > 12) {
      board.scrollBy({
        top: delta,
        behavior: reduceMotion ? "auto" : "smooth",
      });
    }

    const narrow = typeof window !== "undefined" && window.innerWidth < 640;
    const nextScale = reduceMotion ? 1 : narrow ? 1.02 : 1.04;
    setScale(nextScale);

    const t = setTimeout(() => setScale(1), 900);
    return () => clearTimeout(t);
  }, [focusEl, reduceMotion]);

  return (
    <div
      ref={scrollRef}
      className={`flex-1 overflow-y-auto overflow-x-hidden overscroll-contain ${className}`}
    >
      <motion.div
        className="relative min-h-full px-4 py-6 sm:px-8 sm:py-10"
        animate={{ scale }}
        transition={{ type: "spring", stiffness: 220, damping: 26 }}
        style={{ transformOrigin: "center top" }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.55]"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(59,130,246,0.07), transparent 60%), radial-gradient(ellipse 60% 40% at 80% 100%, rgba(16,185,129,0.05), transparent)",
          }}
        />
        <div className="relative z-[1]">{children}</div>
      </motion.div>
    </div>
  );
}
