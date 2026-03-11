"use client";

import { useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import type { LabeledShapeBlock } from "@/types/whiteboard";
import MathRenderer from "@/components/MathRenderer";

interface Props {
  block: LabeledShapeBlock;
  baseDelay: number;
}

// Compute default vertex positions for common shapes
function computeVertices(
  shape: LabeledShapeBlock["shape"],
  numVertices: number,
  cx: number,
  cy: number,
  r: number
): { x: number; y: number }[] {
  switch (shape) {
    case "triangle":
      // Equilateral triangle, flat bottom
      return [
        { x: cx, y: cy - r * 0.9 },
        { x: cx - r, y: cy + r * 0.6 },
        { x: cx + r, y: cy + r * 0.6 },
      ];
    case "rectangle":
      return [
        { x: cx - r, y: cy - r * 0.6 },
        { x: cx + r, y: cy - r * 0.6 },
        { x: cx + r, y: cy + r * 0.6 },
        { x: cx - r, y: cy + r * 0.6 },
      ];
    case "parallelogram":
      return [
        { x: cx - r * 0.7, y: cy - r * 0.5 },
        { x: cx + r, y: cy - r * 0.5 },
        { x: cx + r * 0.7, y: cy + r * 0.5 },
        { x: cx - r, y: cy + r * 0.5 },
      ];
    case "trapezium":
      return [
        { x: cx - r * 0.5, y: cy - r * 0.5 },
        { x: cx + r * 0.5, y: cy - r * 0.5 },
        { x: cx + r, y: cy + r * 0.5 },
        { x: cx - r, y: cy + r * 0.5 },
      ];
    case "polygon":
    default: {
      // Regular polygon
      const n = numVertices || 5;
      return Array.from({ length: n }, (_, i) => {
        const angle = (2 * Math.PI * i) / n - Math.PI / 2;
        return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
      });
    }
  }
}

const COLORS = {
  stroke: "#818cf8",
  fill: "rgba(129,140,248,0.06)",
  label: "#e8e8f0",
  side: "#22d3ee",
  angle: "#fbbf24",
};

export default function LabeledShapeRenderer({ block, baseDelay }: Props) {
  const { shape, vertices: vertexDefs, sides, angles, circle, arrows } = block;

  const width = 400;
  const height = 300;
  const cx = width / 2;
  const cy = height / 2;
  const r = 100;

  // Handle circle separately
  if (shape === "circle") {
    return (
      <CircleRenderer
        block={block}
        baseDelay={baseDelay}
        width={width}
        height={height}
      />
    );
  }

  // Compute vertices
  const numV = vertexDefs?.length || (shape === "triangle" ? 3 : shape === "rectangle" ? 4 : 5);
  const defaultPositions = useMemo(
    () => computeVertices(shape, numV, cx, cy, r),
    [shape, numV, cx, cy, r]
  );

  const points = vertexDefs
    ? vertexDefs.map((v, i) =>
        v.position
          ? { x: v.position.x, y: v.position.y }
          : defaultPositions[i] || { x: cx, y: cy }
      )
    : defaultPositions;

  const vertexLabels = vertexDefs?.map((v) => v.label) || points.map((_, i) => String.fromCharCode(65 + i));

  // Build polygon path
  const pathD =
    points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x},${p.y}`).join(" ") +
    " Z";

  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full max-w-sm mx-auto"
        overflow="visible"
      >
        {/* Shape outline */}
        <motion.path
          d={pathD}
          fill={COLORS.fill}
          stroke={COLORS.stroke}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          initial={{ pathLength: 0, fillOpacity: 0 }}
          animate={{ pathLength: 1, fillOpacity: 1 }}
          transition={{ delay: baseDelay, duration: 0.8 }}
        />

        {/* Vertex labels */}
        {vertexLabels.map((label, i) => {
          const p = points[i];
          // Offset label away from center
          const dx = p.x - cx;
          const dy = p.y - cy;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const offsetX = (dx / dist) * 18;
          const offsetY = (dy / dist) * 18;

          return (
            <motion.text
              key={`v-${i}`}
              x={p.x + offsetX}
              y={p.y + offsetY}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={COLORS.label}
              fontSize="14"
              fontFamily="var(--font-caveat), cursive"
              fontWeight="bold"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: baseDelay + 0.5 + i * 0.08 }}
            >
              {label}
            </motion.text>
          );
        })}

        {/* Side labels */}
        {sides?.map((side, i) => {
          const fromIdx = vertexLabels.indexOf(side.from);
          const toIdx = vertexLabels.indexOf(side.to);
          if (fromIdx < 0 || toIdx < 0) return null;

          const p1 = points[fromIdx];
          const p2 = points[toIdx];
          const mx = (p1.x + p2.x) / 2;
          const my = (p1.y + p2.y) / 2;

          // Offset perpendicular to the side
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          const nx = -dy / len;
          const ny = dx / len;
          // Push label outward from the shape center
          const toCenter = (mx + nx * 16 - cx) ** 2 + (my + ny * 16 - cy) ** 2;
          const awayCenter = (mx - nx * 16 - cx) ** 2 + (my - ny * 16 - cy) ** 2;
          const sign = awayCenter > toCenter ? -1 : 1;

          return (
            <motion.g
              key={`side-${i}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: baseDelay + 0.7 + i * 0.1 }}
            >
              <foreignObject
                x={mx + nx * 16 * sign - 30}
                y={my + ny * 16 * sign - 12}
                width={60}
                height={24}
              >
                <div className="flex items-center justify-center">
                  <span
                    className="text-xs px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: "rgba(7,7,14,0.8)", color: COLORS.side }}
                  >
                    {side.label}
                  </span>
                </div>
              </foreignObject>

              {/* Parallel marks */}
              {side.parallelMarks && side.parallelMarks > 0 && (
                <>
                  {Array.from({ length: side.parallelMarks }, (_, j) => {
                    const offset = (j - (side.parallelMarks! - 1) / 2) * 6;
                    const tick = {
                      x1: mx + offset * (dx / len) - 4 * nx,
                      y1: my + offset * (dy / len) - 4 * ny,
                      x2: mx + offset * (dx / len) + 4 * nx,
                      y2: my + offset * (dy / len) + 4 * ny,
                    };
                    return (
                      <line
                        key={`pm-${j}`}
                        x1={tick.x1}
                        y1={tick.y1}
                        x2={tick.x2}
                        y2={tick.y2}
                        stroke={COLORS.stroke}
                        strokeWidth="1.5"
                      />
                    );
                  })}
                </>
              )}
            </motion.g>
          );
        })}

        {/* Angle arcs */}
        {angles?.map((angle, i) => {
          const vIdx = vertexLabels.indexOf(angle.vertex);
          if (vIdx < 0) return null;

          const v = points[vIdx];
          const prev = points[(vIdx - 1 + points.length) % points.length];
          const next = points[(vIdx + 1) % points.length];

          // Angles from vertex to neighbors
          const a1 = Math.atan2(prev.y - v.y, prev.x - v.x);
          const a2 = Math.atan2(next.y - v.y, next.x - v.x);

          const arcR = 22;

          if (angle.isRightAngle) {
            // Right angle square
            const d1x = Math.cos(a1) * 12;
            const d1y = Math.sin(a1) * 12;
            const d2x = Math.cos(a2) * 12;
            const d2y = Math.sin(a2) * 12;
            const sqPath = `M ${v.x + d1x},${v.y + d1y} L ${v.x + d1x + d2x},${v.y + d1y + d2y} L ${v.x + d2x},${v.y + d2y}`;
            return (
              <motion.path
                key={`angle-${i}`}
                d={sqPath}
                fill="none"
                stroke={COLORS.angle}
                strokeWidth="1.5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: baseDelay + 0.9 + i * 0.1 }}
              />
            );
          }

          // Arc
          const startAngle = a1;
          const endAngle = a2;
          const sa = Math.min(startAngle, endAngle);
          const ea = Math.max(startAngle, endAngle);
          const sweepAngle = ea - sa > Math.PI ? -(2 * Math.PI - (ea - sa)) : ea - sa;
          const largeArc = Math.abs(sweepAngle) > Math.PI ? 1 : 0;
          const sweep = sweepAngle > 0 ? 1 : 0;

          const arcPath = `M ${v.x + arcR * Math.cos(sa)},${v.y + arcR * Math.sin(sa)} A ${arcR},${arcR} 0 ${largeArc} ${sweep} ${v.x + arcR * Math.cos(ea)},${v.y + arcR * Math.sin(ea)}`;

          const midAngle = (sa + ea) / 2;
          const labelX = v.x + (arcR + 14) * Math.cos(midAngle);
          const labelY = v.y + (arcR + 14) * Math.sin(midAngle);

          return (
            <motion.g
              key={`angle-${i}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: baseDelay + 0.9 + i * 0.1 }}
            >
              <path
                d={arcPath}
                fill="none"
                stroke={COLORS.angle}
                strokeWidth="1.5"
              />
              <text
                x={labelX}
                y={labelY}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={COLORS.angle}
                fontSize="11"
                fontFamily="var(--font-caveat), cursive"
              >
                {angle.label}
              </text>
            </motion.g>
          );
        })}
      </svg>
    </div>
  );
}

/* ── Circle-specific renderer ─────────────────────────── */
function CircleRenderer({
  block,
  baseDelay,
  width,
  height,
}: {
  block: LabeledShapeBlock;
  baseDelay: number;
  width: number;
  height: number;
}) {
  const cx = width / 2;
  const cy = height / 2;
  const r = 90;
  const circleData = block.circle;

  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full max-w-sm mx-auto"
        overflow="visible"
      >
        {/* Circle */}
        <motion.circle
          cx={cx}
          cy={cy}
          r={r}
          fill="rgba(129,140,248,0.06)"
          stroke="#818cf8"
          strokeWidth="2"
          initial={{ pathLength: 0, fillOpacity: 0 }}
          animate={{ pathLength: 1, fillOpacity: 1 }}
          transition={{ delay: baseDelay, duration: 0.8 }}
        />

        {/* Center dot */}
        <motion.circle
          cx={cx}
          cy={cy}
          r={3}
          fill="#818cf8"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: baseDelay + 0.4, type: "spring" }}
        />

        {/* Center label */}
        {circleData?.center && (
          <motion.text
            x={cx + 8}
            y={cy - 8}
            fill="#e8e8f0"
            fontSize="13"
            fontFamily="var(--font-caveat), cursive"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: baseDelay + 0.5 }}
          >
            {circleData.center}
          </motion.text>
        )}

        {/* Radius line */}
        {circleData?.showRadius && (
          <motion.line
            x1={cx}
            y1={cy}
            x2={cx + r}
            y2={cy}
            stroke="#22d3ee"
            strokeWidth="2"
            strokeDasharray="4 3"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: baseDelay + 0.6, duration: 0.4 }}
          />
        )}

        {/* Radius label */}
        {circleData?.radius && circleData.showRadius && (
          <motion.text
            x={cx + r / 2}
            y={cy - 10}
            textAnchor="middle"
            fill="#22d3ee"
            fontSize="13"
            fontFamily="var(--font-caveat), cursive"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: baseDelay + 0.8 }}
          >
            {circleData.radius}
          </motion.text>
        )}

        {/* Diameter line */}
        {circleData?.showDiameter && (
          <motion.line
            x1={cx - r}
            y1={cy}
            x2={cx + r}
            y2={cy}
            stroke="#fbbf24"
            strokeWidth="2"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: baseDelay + 0.6, duration: 0.5 }}
          />
        )}
      </svg>
    </div>
  );
}
