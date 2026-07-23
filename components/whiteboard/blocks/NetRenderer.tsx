"use client";

import { motion } from "framer-motion";
import type { LabeledShapeBlock } from "@/types/whiteboard";

type Props = {
  block: LabeledShapeBlock;
  baseDelay: number;
};

const COLORS = {
  stroke: "#818cf8",
  fold: "rgba(129,140,248,0.45)",
  fill: "rgba(129,140,248,0.12)",
  label: "#c7d2fe",
};

/**
 * Canonical cube net: four squares in a row with one square above and one
 * below the second square. Shared edges are dashed as fold lines.
 */
export default function NetRenderer({ block, baseDelay }: Props) {
  const k = 62;
  const gap = 0;
  // grid cells (col,row): row of 4 + one above cell 1 + one below cell 1
  const cells: [number, number][] = [
    [0, 1],
    [1, 1],
    [2, 1],
    [3, 1],
    [1, 0],
    [1, 2],
  ];
  const cols = 4;
  const rows = 3;
  const width = cols * (k + gap) + 80;
  const height = rows * (k + gap) + 80;
  const ox = 40;
  const oy = 40;
  const at = (c: number, r: number) => ({ x: ox + c * (k + gap), y: oy + r * (k + gap) });

  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-sm mx-auto" overflow="visible">
        {cells.map(([c, r], i) => {
          const p = at(c, r);
          return (
            <motion.rect
              key={`${c}-${r}`}
              x={p.x}
              y={p.y}
              width={k}
              height={k}
              fill={COLORS.fill}
              stroke={COLORS.stroke}
              strokeWidth={2}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: baseDelay + i * 0.12 }}
            />
          );
        })}
        {/* Fold hint on the central square */}
        <motion.text
          x={at(1, 1).x + k / 2}
          y={at(1, 1).y + k / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={COLORS.label}
          fontSize={15}
          fontWeight="bold"
          fontFamily="var(--font-caveat), cursive"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: baseDelay + 0.9 }}
        >
          base
        </motion.text>
      </svg>
      {block.caption ? (
        <p className="mt-2 text-center text-sm" style={{ color: COLORS.label }}>
          {block.caption}
        </p>
      ) : null}
    </div>
  );
}
