"use client";

import { motion } from "framer-motion";

const PARTICLES = Array.from({ length: 14 }, (_, i) => {
  const angle = (i / 14) * Math.PI * 2;
  const distance = 90 + (i % 3) * 34;
  return {
    id: i,
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance,
    size: 12 + (i % 4) * 5,
    delay: (i % 5) * 0.04,
    glyph: i % 3 === 0 ? "✨" : "⭐",
  };
});

/**
 * One-shot radial star burst for earning a mastery star. Position it inside
 * a `relative` container. Disabled automatically when the OS asks for
 * reduced motion (via the MotionConfig in the KS2 layout).
 */
export default function StarBurst() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
    >
      {PARTICLES.map((p) => (
        <motion.span
          key={p.id}
          className="absolute"
          style={{ fontSize: p.size }}
          initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
          animate={{
            x: p.x,
            y: p.y,
            scale: [0, 1.2, 0.9],
            opacity: [1, 1, 0],
          }}
          transition={{
            duration: 1.1,
            delay: p.delay,
            ease: "easeOut",
          }}
        >
          {p.glyph}
        </motion.span>
      ))}
      {/* Central flash */}
      <motion.span
        className="absolute h-24 w-24 rounded-full bg-amber-300/60"
        initial={{ scale: 0, opacity: 0.9 }}
        animate={{ scale: 3, opacity: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      />
    </div>
  );
}
