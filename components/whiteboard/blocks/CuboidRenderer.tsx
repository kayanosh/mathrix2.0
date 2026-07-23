"use client";

import { motion } from "framer-motion";
import type { LabeledShapeBlock } from "@/types/whiteboard";

type Props = {
  block: LabeledShapeBlock;
  baseDelay: number;
};

const COLORS = {
  stroke: "#818cf8",
  hidden: "rgba(129,140,248,0.4)",
  fill: "rgba(129,140,248,0.10)",
  label: "#c7d2fe",
};

/**
 * 3D wireframe cuboid with optional [length, width, height] edge labels.
 * Deterministic geometry: front face + depth offset, hidden edges dashed.
 */
export default function CuboidRenderer({ block, baseDelay }: Props) {
  const width = 400;
  const height = 300;
  const dims = block.dimensions;
  const l = dims?.[0] ?? 4;
  const w = dims?.[1] ?? 3;
  const h = dims?.[2] ?? 2;

  const depthX = w * 0.55;
  const depthY = w * 0.38;
  const k = Math.min(
    (width - 130) / (l + depthX),
    (height - 130) / (h + depthY),
  );
  const fw = l * k;
  const fh = h * k;
  const dx = depthX * k;
  const dy = depthY * k;
  const ox = (width - fw - dx) / 2;
  const oy = (height - fh + dy) / 2;

  // Front face corners (A bottom-left, B bottom-right, C top-right, D top-left)
  const A = { x: ox, y: oy };
  const B = { x: ox + fw, y: oy };
  const C = { x: ox + fw, y: oy - fh };
  const D = { x: ox, y: oy - fh };
  // Back face (shifted up-right)
  const A2 = { x: A.x + dx, y: A.y - dy };
  const B2 = { x: B.x + dx, y: B.y - dy };
  const C2 = { x: C.x + dx, y: C.y - dy };
  const D2 = { x: D.x + dx, y: D.y - dy };

  // Classic cuboid: the three edges meeting at the hidden back-bottom-left
  // vertex (A2) are dashed; the other nine are solid.
  const solidEdges: [typeof A, typeof A][] = [
    [A, B],
    [B, C],
    [C, D],
    [D, A],
    [B2, C2],
    [C2, D2],
    [B, B2],
    [C, C2],
    [D, D2],
  ];
  const hiddenEdges: [typeof A, typeof A][] = [
    [A, A2],
    [A2, B2],
    [A2, D2],
  ];
  const solidFiltered = solidEdges;

  const label = (x: number, y: number, text: string, i: number) => (
    <motion.text
      key={text + i}
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="middle"
      fill={COLORS.label}
      fontSize={16}
      fontWeight="bold"
      fontFamily="var(--font-caveat), cursive"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: baseDelay + 0.7 + i * 0.15 }}
    >
      {text}
    </motion.text>
  );

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
          d={`M ${A.x},${A.y} L ${B.x},${B.y} L ${C.x},${C.y} L ${D.x},${D.y} Z`}
          fill={COLORS.fill}
          stroke="none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: baseDelay + 0.5 }}
        />
        {solidFiltered.map(([p, q], i) => (
          <motion.line
            key={`e${i}`}
            x1={p.x}
            y1={p.y}
            x2={q.x}
            y2={q.y}
            stroke={COLORS.stroke}
            strokeWidth={2}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: baseDelay + i * 0.06 }}
          />
        ))}
        {hiddenEdges.map(([p, q], i) => (
          <motion.line
            key={`h${i}`}
            x1={p.x}
            y1={p.y}
            x2={q.x}
            y2={q.y}
            stroke={COLORS.hidden}
            strokeWidth={1.5}
            strokeDasharray="6 5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: baseDelay + 0.6 + i * 0.08 }}
          />
        ))}
        {dims
          ? [
              label((A.x + B.x) / 2, A.y + 22, `${l}`, 0),
              label(A.x - 22, (A.y + D.y) / 2, `${h}`, 1),
              label((B.x + B2.x) / 2 + 16, (B.y + B2.y) / 2 + 10, `${w}`, 2),
            ]
          : null}
      </svg>
      {block.caption ? (
        <p className="mt-2 text-center text-sm" style={{ color: COLORS.label }}>
          {block.caption}
        </p>
      ) : null}
    </div>
  );
}
