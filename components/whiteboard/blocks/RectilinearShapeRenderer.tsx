"use client";

import { motion } from "framer-motion";
import type { LabeledShapeBlock } from "@/types/whiteboard";

type Props = {
  block: LabeledShapeBlock;
  baseDelay: number;
};

const COLORS = {
  stroke: "#818cf8",
  fill: "rgba(129,140,248,0.15)",
  label: "#c7d2fe",
  missing: "#f59e0b",
};

/**
 * Deterministic L-shaped rectilinear polygon. The geometry comes from four
 * numbers (bounding width/height + notch width/height), so the rendered
 * image can never disagree with the working — the two "missing" sides are
 * derived, not drawn by the model.
 *
 * Layout (screen coords, notch cut from the bottom-right):
 *   P1(0,0) P2(W,0) P3(W,H-nh) P4(W-nw,H-nh) P5(W-nw,H) P6(0,H)
 */
export default function RectilinearShapeRenderer({ block, baseDelay }: Props) {
  const r = block.rectilinear;
  const width = 400;
  const height = 300;

  if (!r) return null;
  const { width: W, height: H, notchWidth: nw, notchHeight: nh } = r;
  if (!(W > nw && H > nh && nw > 0 && nh > 0)) return null;

  const unit = r.unit ? ` ${r.unit}` : "";
  const margin = 64;
  const s = Math.min((width - margin * 2) / W, (height - margin * 2) / H);
  const ox = (width - W * s) / 2;
  const oy = (height - H * s) / 2;
  const P = (x: number, y: number) => ({ x: ox + x * s, y: oy + y * s });

  const pts = [P(0, 0), P(W, 0), P(W, H - nh), P(W - nw, H - nh), P(W - nw, H), P(0, H)];
  const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x},${p.y}`).join(" ") + " Z";

  const missingV = H - nh; // right side
  const missingH = W - nw; // bottom side
  const showMissing = r.showMissing !== false;

  type Side = {
    from: number;
    to: number;
    label: string;
    missing?: boolean;
    dx: number; // label offset direction (outward)
    dy: number;
  };
  const sides: Side[] = [
    { from: 0, to: 1, label: `${W}${unit}`, dx: 0, dy: -1 },
    { from: 1, to: 2, label: showMissing ? "?" : `${missingV}${unit}`, missing: showMissing, dx: 1, dy: 0 },
    { from: 2, to: 3, label: `${nw}${unit}`, dx: 0, dy: -1 },
    { from: 3, to: 4, label: `${nh}${unit}`, dx: 1, dy: 0 },
    { from: 4, to: 5, label: showMissing ? "?" : `${missingH}${unit}`, missing: showMissing, dx: 0, dy: 1 },
    { from: 5, to: 0, label: `${H}${unit}`, dx: -1, dy: 0 },
  ];

  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-sm mx-auto" overflow="visible">
        <motion.path
          d={pathD}
          fill={COLORS.fill}
          stroke={COLORS.stroke}
          strokeWidth="2"
          strokeLinejoin="round"
          initial={{ pathLength: 0, fillOpacity: 0 }}
          animate={{ pathLength: 1, fillOpacity: 1 }}
          transition={{ delay: baseDelay, duration: 0.8 }}
        />

        {/* Missing sides (dashed amber overlays) */}
        {sides
          .filter((side) => side.missing)
          .map((side, i) => {
            const a = pts[side.from];
            const b = pts[side.to];
            return (
              <motion.line
                key={`missing-${i}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={COLORS.missing}
                strokeWidth={3}
                strokeDasharray="8 6"
                strokeLinecap="round"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: baseDelay + 0.9 + i * 0.2 }}
              />
            );
          })}

        {/* Side labels */}
        {sides.map((side, i) => {
          const a = pts[side.from];
          const b = pts[side.to];
          const mx = (a.x + b.x) / 2 + side.dx * 22;
          const my = (a.y + b.y) / 2 + side.dy * 22;
          return (
            <motion.text
              key={`side-${i}`}
              x={mx}
              y={my}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={side.missing ? COLORS.missing : COLORS.label}
              fontSize={side.missing ? 20 : 15}
              fontWeight="bold"
              fontFamily="var(--font-caveat), cursive"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: baseDelay + 0.6 + i * 0.12 }}
            >
              {side.label}
            </motion.text>
          );
        })}
      </svg>
      {block.caption ? (
        <p className="mt-2 text-center text-sm" style={{ color: COLORS.label }}>
          {block.caption}
        </p>
      ) : null}
    </div>
  );
}
