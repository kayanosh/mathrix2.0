"use client";

import { motion } from "framer-motion";
import type { ProtractorBlock } from "@/types/whiteboard";

/**
 * Deterministic SVG protractor for "measure the angle" lessons.
 * The angle's vertex sits at the protractor centre, the baseline arm runs
 * along 0°, and the rotating arm is drawn at `angle` degrees. Tick marks and
 * both scales are rendered so pupils learn to read the correct one.
 *
 * revealReading=false hides the arc and degree label — the estimate-first
 * step shows the angle and asks "acute or obtuse?" before revealing.
 */

const CX = 200; // protractor centre (vertex) x
const CY = 220; // protractor centre (vertex) y
const R = 150; // outer radius
const R_INNER = 108; // inner scale number radius

function polar(deg: number, radius: number): { x: number; y: number } {
  const rad = (deg * Math.PI) / 180;
  return { x: CX + radius * Math.cos(rad), y: CY - radius * Math.sin(rad) };
}

function ticks(): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  for (let d = 0; d <= 180; d += 1) {
    const major = d % 10 === 0;
    const mid = !major && d % 5 === 0;
    const len = major ? 14 : mid ? 9 : 5;
    const p1 = polar(d, R);
    const p2 = polar(d, R - len);
    out.push(
      <line
        key={d}
        x1={p1.x}
        y1={p1.y}
        x2={p2.x}
        y2={p2.y}
        stroke={major ? "#6366f1" : "#a5b4fc"}
        strokeWidth={major ? 1.6 : 1}
      />,
    );
    if (major) {
      const outer = polar(d, R - 26);
      const inner = polar(d, R_INNER - 22);
      out.push(
        <text
          key={`o${d}`}
          x={outer.x}
          y={outer.y}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={11}
          fontWeight={700}
          fill="#4338ca"
        >
          {d}
        </text>,
        <text
          key={`i${d}`}
          x={inner.x}
          y={inner.y}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={10}
          fontWeight={600}
          fill="#94a3b8"
        >
          {180 - d}
        </text>,
      );
    }
  }
  return out;
}

export default function ProtractorRenderer({ block }: { block: ProtractorBlock }) {
  const angle = Math.min(180, Math.max(1, Math.round(block.angle)));
  const reveal = block.revealReading !== false;
  const [armA, armB] = block.armLabels ?? [];
  const armEnd = polar(angle, R + 26);
  const baseEnd = polar(0, R + 26);
  const arcR = 52;
  const arcEnd = polar(angle, arcR);
  const largeArc = angle > 180 ? 1 : 0;
  const readingPos = polar(angle / 2, arcR + 26);

  return (
    <div className="my-3 flex flex-col items-center">
      <svg
        viewBox="0 0 400 260"
        className="w-full max-w-md"
        role="img"
        aria-label={`Protractor measuring an angle of ${reveal ? `${angle} degrees` : "unknown size"}`}
      >
        {/* Protractor body */}
        <path
          d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY} Z`}
          fill="#eef2ff"
          stroke="#6366f1"
          strokeWidth={2}
        />
        {ticks()}
        <line x1={CX - R} y1={CY} x2={CX + R} y2={CY} stroke="#6366f1" strokeWidth={2} />
        {/* Centre marker */}
        <circle cx={CX} cy={CY} r={5} fill="#4338ca" />
        <circle cx={CX} cy={CY} r={10} fill="none" stroke="#4338ca" strokeWidth={1.5} />

        {/* Baseline arm (along 0°) */}
        <motion.line
          x1={CX}
          y1={CY}
          x2={baseEnd.x}
          y2={baseEnd.y}
          stroke="#059669"
          strokeWidth={5}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
        />
        {/* Rotating arm */}
        <motion.line
          x1={CX}
          y1={CY}
          x2={armEnd.x}
          y2={armEnd.y}
          stroke="#e11d48"
          strokeWidth={5}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 0.3 }}
        />

        {/* Angle arc + reading (hidden during estimate-first) */}
        {reveal && (
          <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
            <path
              d={`M ${CX + arcR} ${CY} A ${arcR} ${arcR} 0 ${largeArc} 1 ${arcEnd.x} ${arcEnd.y}`}
              fill="none"
              stroke="#f59e0b"
              strokeWidth={4}
            />
            <text
              x={readingPos.x}
              y={readingPos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={22}
              fontWeight={800}
              fill="#b45309"
            >
              {angle}°
            </text>
          </motion.g>
        )}

        {/* Big bold high-contrast labels */}
        {block.vertex && (
          <text x={CX} y={CY + 26} textAnchor="middle" fontSize={20} fontWeight={800} fill="#111827">
            {block.vertex}
          </text>
        )}
        {armA && (
          <text
            x={baseEnd.x + 6}
            y={baseEnd.y + 6}
            fontSize={20}
            fontWeight={800}
            fill="#047857"
          >
            {armA}
          </text>
        )}
        {armB && (
          <text
            x={armEnd.x + (angle > 90 ? -18 : 8)}
            y={armEnd.y + 4}
            fontSize={20}
            fontWeight={800}
            fill="#be123c"
          >
            {armB}
          </text>
        )}
      </svg>
      {block.caption && (
        <p className="mt-1 text-center text-sm font-semibold text-gray-600">{block.caption}</p>
      )}
    </div>
  );
}
