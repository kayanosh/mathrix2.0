"use client";

import { motion } from "framer-motion";

interface Props {
  total: number;
  current: number;
  className?: string;
}

/** Discrete progress rail: completed · current · remaining. */
export default function ProgressRail({ total, current, className = "" }: Props) {
  if (total <= 0) return null;

  return (
    <div
      className={`flex items-center gap-1.5 ${className}`}
      role="progressbar"
      aria-valuenow={current + 1}
      aria-valuemin={1}
      aria-valuemax={total}
      aria-label={`Step ${current + 1} of ${total}`}
    >
      {Array.from({ length: total }, (_, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <motion.div
            key={i}
            layout
            className="h-1.5 rounded-full flex-1 min-w-[6px] max-w-[28px]"
            animate={{
              backgroundColor: done
                ? "#22c55e"
                : active
                  ? "#3b82f6"
                  : "#e2e8f0",
              scaleY: active ? 1.35 : 1,
            }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
          />
        );
      })}
      <span className="ml-2 text-[11px] font-semibold tabular-nums text-slate-400 shrink-0">
        {current + 1}/{total}
      </span>
    </div>
  );
}
