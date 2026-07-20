"use client";

import { motion } from "framer-motion";
import type { AngleScaleBlock } from "@/types/whiteboard";

/**
 * The "angle families" strip: a 0°–180° number line split into coloured
 * zones (acute / right / obtuse / straight), each with a mini example angle.
 * Replaces prose definitions like "an obtuse angle is greater than 90° and
 * less than 180°" with something a child can see at a glance.
 */

interface Zone {
  id: "acute" | "right" | "obtuse" | "straight";
  name: string;
  range: string;
  from: number;
  to: number;
  colour: string;
  soft: string;
  exampleDeg: number;
}

const ZONES: Zone[] = [
  { id: "acute", name: "Acute", range: "less than 90°", from: 0, to: 90, colour: "#059669", soft: "#d1fae5", exampleDeg: 45 },
  { id: "right", name: "Right", range: "exactly 90°", from: 90, to: 90, colour: "#7c3aed", soft: "#ede9fe", exampleDeg: 90 },
  { id: "obtuse", name: "Obtuse", range: "between 90° and 180°", from: 90, to: 180, colour: "#e11d48", soft: "#ffe4e6", exampleDeg: 135 },
  { id: "straight", name: "Straight", range: "exactly 180°", from: 180, to: 180, colour: "#d97706", soft: "#fef3c7", exampleDeg: 180 },
];

const X0 = 40; // strip start x
const X1 = 560; // strip end x
const Y = 60; // strip y (top of bar)
const BAR_H = 26;
const xFor = (deg: number) => X0 + (deg / 180) * (X1 - X0);

function MiniAngle({ deg, colour, x }: { deg: number; colour: string; x: number }) {
  // A small angle glyph: vertex at (x, 150), baseline right, arm at deg.
  const vy = 152;
  const len = 34;
  const rad = (deg * Math.PI) / 180;
  const ax = x + len * Math.cos(rad);
  const ay = vy - len * Math.sin(rad);
  const arcR = 12;
  const arcX = x + arcR * Math.cos(rad);
  const arcY = vy - arcR * Math.sin(rad);
  return (
    <g>
      <line x1={x} y1={vy} x2={x + len} y2={vy} stroke={colour} strokeWidth={3.5} strokeLinecap="round" />
      <line x1={x} y1={vy} x2={ax} y2={ay} stroke={colour} strokeWidth={3.5} strokeLinecap="round" />
      {deg < 180 && deg !== 90 && (
        <path d={`M ${x + arcR} ${vy} A ${arcR} ${arcR} 0 0 0 ${arcX} ${arcY}`} fill="none" stroke={colour} strokeWidth={2.5} />
      )}
      {deg === 90 && (
        <path d={`M ${x + arcR} ${vy} L ${x + arcR} ${vy - arcR} L ${x} ${vy - arcR}`} fill="none" stroke={colour} strokeWidth={2.5} />
      )}
      {deg === 180 && <circle cx={x} cy={vy - 6} r={4} fill={colour} />}
    </g>
  );
}

export default function AngleScaleRenderer({ block }: { block: AngleScaleBlock }) {
  const highlight = block.highlight;
  return (
    <div className="my-3 flex flex-col items-center">
      <svg
        viewBox="0 0 600 210"
        className="w-full max-w-2xl"
        role="img"
        aria-label="Angle families from 0 to 180 degrees: acute, right, obtuse and straight angles"
      >
        {/* Zone bars */}
        {ZONES.map((z, i) => {
          const dim = highlight && highlight !== z.id;
          const zx0 = z.from === z.to ? xFor(z.from) - 7 : xFor(z.from);
          const zx1 = z.from === z.to ? xFor(z.to) + 7 : xFor(z.to);
          return (
            <motion.g
              key={z.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: dim ? 0.3 : 1, y: 0 }}
              transition={{ delay: i * 0.12 }}
            >
              <rect x={zx0} y={Y} width={zx1 - zx0} height={BAR_H} fill={z.soft} stroke={z.colour} strokeWidth={z.from === z.to ? 0 : 1.5} />
              {z.from === z.to && <line x1={xFor(z.from)} y1={Y - 4} x2={xFor(z.to)} y2={Y + BAR_H + 4} stroke={z.colour} strokeWidth={4} />}
              <text x={(zx0 + zx1) / 2} y={Y + BAR_H + 22} textAnchor="middle" fontSize={17} fontWeight={800} fill={z.colour}>
                {z.name}
              </text>
              <text x={(zx0 + zx1) / 2} y={Y + BAR_H + 40} textAnchor="middle" fontSize={12.5} fontWeight={600} fill="#4b5563">
                {z.range}
              </text>
              <MiniAngle deg={z.exampleDeg} colour={z.colour} x={(zx0 + zx1) / 2 - 20} />
            </motion.g>
          );
        })}
        {/* Degree ticks along the top */}
        {[0, 90, 180].map((d) => (
          <g key={d}>
            <line x1={xFor(d)} y1={Y - 8} x2={xFor(d)} y2={Y} stroke="#6b7280" strokeWidth={2} />
            <text x={xFor(d)} y={Y - 14} textAnchor="middle" fontSize={14} fontWeight={800} fill="#374151">
              {d}°
            </text>
          </g>
        ))}
        <line x1={X0} y1={Y} x2={X1} y2={Y} stroke="#6b7280" strokeWidth={2} />
      </svg>
      {block.caption && (
        <p className="mt-1 text-center text-sm font-semibold text-gray-600">{block.caption}</p>
      )}
    </div>
  );
}
