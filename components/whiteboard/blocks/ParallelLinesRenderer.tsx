"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import type { LabeledShapeBlock } from "@/types/whiteboard";
import { inlineMathToPlainText } from "@/lib/inline-math";
import { parallelLinesLayout } from "@/lib/shape-geometry";

interface Props {
  block: LabeledShapeBlock;
  baseDelay: number;
}

const LINE = "#4f46e5";
const CROSS = "#0e7490";
const ANGLE = "#b45309";
const INK = "#1e293b";

/**
 * Two parallel lines with a line crossing them: the picture behind every
 * "alternate", "corresponding" and "co-interior" angle question.
 *
 * There was no drawing for this. A question about it was drawn as a trapezium
 * with "AB (parallel)" written on two sides, which shows none of the angles
 * the question is about. Here the crossing line is leant to the angle given,
 * so equal angles look equal, and each parallel line carries the arrow that
 * marks it as parallel on an exam paper.
 */
export default function ParallelLinesRenderer({ block, baseDelay }: Props) {
  const width = 400;
  const height = 300;
  const layout = useMemo(
    () => (block.parallel ? parallelLinesLayout(block.parallel, width, height) : null),
    [block.parallel],
  );
  if (!layout) return null;

  return (
    <div className="rounded-xl p-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-sm mx-auto" overflow="visible">
        {layout.lines.map((line, i) => {
          const mid = (line.x1 + line.x2) / 2 - 70;
          return (
            <motion.g
              key={`line-${i}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: baseDelay + i * 0.25, duration: 0.4 }}
            >
              <line x1={line.x1} y1={line.y} x2={line.x2} y2={line.y} stroke={LINE} strokeWidth="2.25" strokeLinecap="round" />
              {/* the arrow that says "parallel" */}
              <path
                d={`M ${mid - 7},${line.y - 6} L ${mid + 3},${line.y} L ${mid - 7},${line.y + 6}`}
                fill="none"
                stroke={LINE}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {line.name && line.name.length >= 2 && (
                <>
                  <text x={line.x1 - 12} y={line.y} textAnchor="middle" dominantBaseline="middle" fill={INK} fontSize="16" fontWeight="bold" fontFamily="var(--font-caveat), cursive">
                    {line.name[0]}
                  </text>
                  <text x={line.x2 + 12} y={line.y} textAnchor="middle" dominantBaseline="middle" fill={INK} fontSize="16" fontWeight="bold" fontFamily="var(--font-caveat), cursive">
                    {line.name[line.name.length - 1]}
                  </text>
                </>
              )}
            </motion.g>
          );
        })}

        <motion.line
          x1={layout.crossing.x1}
          y1={layout.crossing.y1}
          x2={layout.crossing.x2}
          y2={layout.crossing.y2}
          stroke={CROSS}
          strokeWidth="2.25"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ delay: baseDelay + 0.6, duration: 0.5 }}
        />

        {layout.arcs.map((arc, i) => (
          <motion.g
            key={`arc-${i}`}
            data-teacher-target="primary"
            data-teacher-label={`${arc.at} ${inlineMathToPlainText(arc.label)}`}
            data-teacher-sequence={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: baseDelay + 1.1 + i * 0.2 }}
          >
            <path d={arc.path} fill="none" stroke={ANGLE} strokeWidth="2" />
            <text
              x={arc.labelAt.x}
              y={arc.labelAt.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={ANGLE}
              fontSize="17"
              fontWeight="bold"
              fontFamily="var(--font-caveat), cursive"
              stroke="#ffffff"
              strokeWidth={3.5}
              paintOrder="stroke"
            >
              {inlineMathToPlainText(arc.label)}
            </text>
          </motion.g>
        ))}
      </svg>
      {block.caption ? (
        <p className="mt-2 text-center text-sm font-medium text-slate-600">{inlineMathToPlainText(block.caption)}</p>
      ) : null}
    </div>
  );
}
