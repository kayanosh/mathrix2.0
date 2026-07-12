"use client";

import { motion } from "framer-motion";

interface Props {
  x: number;
  y: number;
  visible: boolean;
  /** Writing vs pointing */
  mode?: "point" | "write";
}

const SIZE = 40;

/** Animated teacher hand that follows the active board region. */
export default function TeacherPointer({ x, y, visible, mode = "point" }: Props) {
  return (
    <motion.div
      className="pointer-events-none fixed z-[60]"
      initial={false}
      animate={{
        x: x - SIZE / 2,
        y: y - SIZE * 0.15,
        opacity: visible ? 1 : 0,
        scale: visible ? (mode === "write" ? 0.92 : 1) : 0.65,
        rotate: mode === "write" ? -8 : 0,
      }}
      transition={{ type: "spring", stiffness: 260, damping: 24, mass: 0.7 }}
      style={{ width: SIZE, height: SIZE }}
      aria-hidden
    >
      <svg width={SIZE} height={SIZE} viewBox="0 0 36 36" fill="none">
        <ellipse cx="18" cy="33" rx="8" ry="2" fill="rgba(0,0,0,0.14)" />
        <path
          d="M12 16V8a2 2 0 0 1 4 0v6l1-1a2 2 0 0 1 3 0l1 1a2 2 0 0 1 3-1l1 2a2 2 0 0 1 3 0v4c0 5-3 9-8 9h-2c-4 0-7-3-7-7v-3a2 2 0 0 1 1-2z"
          fill="#FFD5A0"
          stroke="#D4915A"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path
          d="M14 8v8"
          stroke="#EDBA7A"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.5"
        />
      </svg>
    </motion.div>
  );
}
