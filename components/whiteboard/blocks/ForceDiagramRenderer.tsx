"use client";

import { useId } from "react";
import { motion } from "framer-motion";
import InlineMath from "@/components/InlineMath";
import { inlineMathToPlainText } from "@/lib/inline-math";
import type { ForceDiagramBlock, ForceDiagramForce } from "@/types/whiteboard";

interface Props {
  block: ForceDiagramBlock;
  baseDelay: number;
}

const GEOMETRY = {
  up: { x1: 210, y1: 102, x2: 210, y2: 34, lx: 225, ly: 55, anchor: "start" },
  down: { x1: 210, y1: 178, x2: 210, y2: 248, lx: 225, ly: 225, anchor: "start" },
  left: { x1: 164, y1: 140, x2: 64, y2: 140, lx: 112, ly: 127, anchor: "middle" },
  right: { x1: 256, y1: 140, x2: 356, y2: 140, lx: 308, ly: 127, anchor: "middle" },
} as const;

export default function ForceDiagramRenderer({ block, baseDelay }: Props) {
  const markerId = `force-arrow-${useId().replace(/:/g, "")}`;
  const counts = new Map<ForceDiagramForce["direction"], number>();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: baseDelay }}
      className="space-y-2 rounded-xl border border-sky-200 bg-sky-50/60 p-3"
    >
      {block.caption && (
        <p className="text-sm font-semibold text-slate-800">
          <InlineMath text={block.caption} />
        </p>
      )}
      <svg
        viewBox="0 0 420 290"
        role="img"
        aria-label={`Force diagram for ${inlineMathToPlainText(block.objectLabel)}`}
        className="mx-auto w-full max-w-lg"
      >
        <defs>
          <marker id={markerId} markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto">
            <path d="M 0 0 L 9 4.5 L 0 9 z" fill="#2563eb" />
          </marker>
        </defs>

        <rect x="164" y="102" width="92" height="76" rx="20" fill="#fff" stroke="#38bdf8" strokeWidth="2.5" />
        <text x="210" y="137" textAnchor="middle" fontSize="30" aria-hidden>
          {block.objectEmoji || "●"}
        </text>
        <text x="210" y="162" textAnchor="middle" fontSize="13" fontWeight="700" fill="#0f172a">
          {inlineMathToPlainText(block.objectLabel)}
        </text>

        {block.forces.map((force, index) => {
          const repeated = counts.get(force.direction) || 0;
          counts.set(force.direction, repeated + 1);
          const g = GEOMETRY[force.direction];
          const offset = repeated * 15;
          const horizontal = force.direction === "up" || force.direction === "down";
          const dx = horizontal ? offset : 0;
          const dy = horizontal ? 0 : offset;
          return (
            <motion.g
              key={`${force.direction}-${index}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: baseDelay + 0.15 + index * 0.12 }}
            >
              <line
                x1={g.x1 + dx}
                y1={g.y1 + dy}
                x2={g.x2 + dx}
                y2={g.y2 + dy}
                stroke="#2563eb"
                strokeWidth="4"
                strokeLinecap="round"
                markerEnd={`url(#${markerId})`}
              />
              <text
                x={g.lx + dx}
                y={g.ly + dy}
                textAnchor={g.anchor}
                fontSize="13"
                fontWeight="700"
                fill="#1d4ed8"
              >
                {inlineMathToPlainText(force.label)}
              </text>
              {force.detail && (
                <text
                  x={g.lx + dx}
                  y={g.ly + dy + 15}
                  textAnchor={g.anchor}
                  fontSize="10"
                  fill="#475569"
                >
                  {inlineMathToPlainText(force.detail)}
                </text>
              )}
            </motion.g>
          );
        })}

        {block.groundLabel && (
          <g>
            <path d="M 92 269 Q 210 244 328 269" fill="none" stroke="#22c55e" strokeWidth="3" />
            <text x="210" y="286" textAnchor="middle" fontSize="11" fontWeight="600" fill="#166534">
              {inlineMathToPlainText(block.groundLabel)}
            </text>
          </g>
        )}
      </svg>
    </motion.div>
  );
}
