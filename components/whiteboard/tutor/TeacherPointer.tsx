"use client";

import { motion } from "framer-motion";

interface Props {
  x: number;
  y: number;
  visible: boolean;
  /** Writing vs pointing */
  mode?: "point" | "write" | "check";
  label?: string;
}

/**
 * High-contrast teacher cursor. Its origin is the exact teaching target, so the
 * halo remains attached to a digit/term while the board scrolls.
 */
export default function TeacherPointer({
  x,
  y,
  visible,
  mode = "point",
  label,
}: Props) {
  return (
    <motion.div
      className="pointer-events-none fixed z-[60]"
      initial={false}
      animate={{
        x,
        y,
        opacity: visible ? 1 : 0,
        scale: visible ? 1 : 0.8,
      }}
      transition={{ type: "spring", stiffness: 320, damping: 30, mass: 0.55 }}
      style={{ left: 0, top: 0, width: 112, height: 62 }}
      aria-hidden
    >
      <motion.span
        className="absolute -left-2.5 -top-2.5 h-5 w-5 rounded-full border-2 border-blue-500 bg-blue-400/20"
        animate={visible ? { scale: [0.8, 1.12, 0.8], opacity: [0.5, 0.9, 0.5] } : {}}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
      />
      <svg
        className="absolute left-1 top-1 drop-shadow-md"
        width="32"
        height="42"
        viewBox="0 0 32 42"
        fill="none"
      >
        <path
          d="M1.5 1.5L2.5 31L10.2 23.8L16.8 39L23.2 36.2L16.7 21.5L27.5 21L1.5 1.5Z"
          fill={
            mode === "write" ? "#7c3aed" : mode === "check" ? "#059669" : "#2563eb"
          }
          stroke="white"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
      </svg>
      <div className="absolute left-8 top-7 whitespace-nowrap rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-bold text-white shadow-lg ring-2 ring-white/90">
        {label || (mode === "write" ? "Watch this" : mode === "check" ? "Your turn" : "Look here")}
      </div>
    </motion.div>
  );
}
