"use client";

import { motion } from "framer-motion";
import type { CSSProperties } from "react";
import type { NumberLineBlock } from "@/types/whiteboard";
import MathRenderer from "@/components/MathRenderer";
import { inlineMathToPlainText } from "@/lib/inline-math";

interface Props {
  block: NumberLineBlock;
  baseDelay: number;
}

function parseRange(raw: unknown): [number, number] | null {
  if (!Array.isArray(raw) || raw.length < 2) return null;
  const min = Number(raw[0]);
  const max = Number(raw[1]);
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return null;
  return [min, max];
}

export default function NumberLineRenderer({ block, baseDelay }: Props) {
  const range = parseRange(block.range);
  const markers = Array.isArray(block.markers) ? block.markers : [];
  const shading = Array.isArray(block.shading) ? block.shading : [];
  const tickInterval =
    typeof block.tickInterval === "number" && block.tickInterval > 0
      ? block.tickInterval
      : 1;
  const { inequalityLabel } = block;

  if (!range) {
    return (
      <div className="rounded-xl p-4 bg-white border border-amber-100 text-sm text-amber-800">
        Number line could not be drawn (missing range).
      </div>
    );
  }

  const [min, max] = range;
  const width = 500;
  const height = 80;
  const padding = 40;
  const lineY = 45;
  const innerWidth = width - 2 * padding;

  function xPos(val: number): number {
    return padding + ((val - min) / (max - min)) * innerWidth;
  }

  const ticks: number[] = [];
  const safeInterval = Math.max(tickInterval, (max - min) / 50);
  for (let v = min; v <= max + 1e-9; v += safeInterval) {
    ticks.push(Math.round(v * 1000) / 1000);
  }

  return (
    <div className="rounded-xl p-4 bg-white border border-indigo-100 shadow-sm">
      {inequalityLabel && (
        <div className="mb-3 flex justify-center text-gray-900">
          <MathRenderer latex={inequalityLabel} display />
        </div>
      )}

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full max-w-lg mx-auto"
        overflow="visible"
      >
        {shading.map((s, i) => {
          const x1 = s.fromInfinity ? 0 : xPos(s.from);
          const x2 = s.toInfinity ? width : xPos(s.to);
          return (
            <motion.rect
              key={`shade-${i}`}
              x={x1}
              y={lineY - 12}
              width={Math.max(0, x2 - x1)}
              height={24}
              fill={s.color || "#818cf8"}
              opacity={0}
              animate={{ opacity: 0.2 }}
              transition={{ delay: baseDelay + 0.3, duration: 0.4 }}
              rx={4}
            />
          );
        })}

        <motion.line
          x1={padding - 10}
          y1={lineY}
          x2={width - padding + 10}
          y2={lineY}
          stroke="#334155"
          strokeWidth="2.5"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: baseDelay, duration: 0.5 }}
        />

        <motion.polygon
          points={`${width - padding + 14},${lineY} ${width - padding + 6},${lineY - 4} ${width - padding + 6},${lineY + 4}`}
          fill="#334155"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: baseDelay + 0.5 }}
        />
        <motion.polygon
          points={`${padding - 14},${lineY} ${padding - 6},${lineY - 4} ${padding - 6},${lineY + 4}`}
          fill="#334155"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: baseDelay + 0.5 }}
        />

        {ticks.map((v, i) => (
          <motion.g
            key={`tick-${v}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: baseDelay + 0.1 + i * 0.03 }}
          >
            <line
              x1={xPos(v)}
              y1={lineY - 6}
              x2={xPos(v)}
              y2={lineY + 6}
              stroke="#475569"
              strokeWidth="1.5"
            />
            <text
              x={xPos(v)}
              y={lineY + 22}
              textAnchor="middle"
              fill="#1e293b"
              fontSize="12"
              fontWeight="600"
              fontFamily="var(--font-caveat), cursive"
            >
              {v}
            </text>
          </motion.g>
        ))}

        {markers.map((m, i) => {
          if (typeof m?.value !== "number" || !Number.isFinite(m.value)) return null;
          return (
            <motion.g
              key={`marker-${i}`}
              data-teacher-target="primary"
              data-teacher-label={`${m.label || m.value}`}
              data-teacher-sequence={i}
              style={
                {
                  transformOrigin: `${xPos(m.value)}px ${lineY}px`,
                  "--teacher-sequence": i,
                } as CSSProperties
              }
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                delay: baseDelay + 0.4 + i * 0.1,
                type: "spring",
                stiffness: 300,
              }}
            >
              <circle
                cx={xPos(m.value)}
                cy={lineY}
                r="7"
                fill={m.style === "filled" ? "#4f46e5" : "#fff"}
                stroke="#4f46e5"
                strokeWidth="2.5"
              />
              {m.label && (
                <text
                  x={xPos(m.value)}
                  y={lineY - 14}
                  textAnchor="middle"
                  fill="#312e81"
                  fontSize="13"
                  fontFamily="var(--font-caveat), cursive"
                  fontWeight="bold"
                >
                  {inlineMathToPlainText(m.label)}
                </text>
              )}
            </motion.g>
          );
        })}
      </svg>
    </div>
  );
}
