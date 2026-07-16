"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import type { LabeledShapeBlock } from "@/types/whiteboard";
import InlineMath from "@/components/InlineMath";
import { inlineMathToPlainText } from "@/lib/inline-math";

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

// ── Helpers: scale raw pts into the SVG viewport ───────────────────────────

function scaleAndCenter(
  pts: { x: number; y: number }[],
  cx: number,
  cy: number,
  r: number,
): { x: number; y: number }[] {
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const w = maxX - minX || 1;
  const h = maxY - minY || 1;
  const scale = Math.min((r * 2) / w, (r * 1.6) / h);
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;
  return pts.map((p) => ({
    x: cx + (p.x - midX) * scale,
    y: cy + (p.y - midY) * scale,
  }));
}

function parseSideLength(label: string): number | null {
  const m = label.match(/([\d.]+)/);
  return m ? parseFloat(m[1]) : null;
}

/** Build a triangle from 3 known angles (degrees) using the sine rule. */
function buildTriangleFromAngles(
  labels: string[],
  angleMap: Record<string, number>,
  cx: number, cy: number, r: number,
): { x: number; y: number }[] {
  const [A, B] = labels;
  const bRad = (angleMap[B] * Math.PI) / 180;
  const aRad = (angleMap[A] * Math.PI) / 180;
  const cRad = (angleMap[labels[2]] * Math.PI) / 180;
  const sideBC = 1; // normalised base
  const sideAB = Math.sin(cRad) > 0.001 ? (sideBC * Math.sin(cRad)) / Math.sin(aRad) : 1;
  const bPos = { x: 0, y: 0 };
  const cPos = { x: sideBC, y: 0 };
  const aPos = { x: sideAB * Math.cos(bRad), y: -sideAB * Math.sin(bRad) };
  return scaleAndCenter([aPos, bPos, cPos], cx, cy, r);
}

/** Build a right-angled triangle: right angle vertex gets the 90° corner. */
function buildRightTriangle(
  labels: string[],
  rightVertex: string,
  others: string[],
  len0: number,
  len1: number,
  cx: number, cy: number, r: number,
): { x: number; y: number }[] {
  const rvPos = { x: 0, y: 0 };
  const v0Pos = { x: len0, y: 0 };       // horizontal leg
  const v1Pos = { x: 0, y: -len1 };      // vertical leg
  const posMap: Record<string, { x: number; y: number }> = {};
  posMap[rightVertex] = rvPos;
  posMap[others[0]] = v0Pos;
  posMap[others[1]] = v1Pos;
  return scaleAndCenter(labels.map((l) => posMap[l]), cx, cy, r);
}

/**
 * Compute geometrically accurate triangle vertices from angle / side data.
 * Returns null when there's not enough info (caller falls back to equilateral).
 */
function computeTriangleFromData(
  angleDefs: LabeledShapeBlock["angles"],
  sideDefs: LabeledShapeBlock["sides"],
  vertexLabels: string[],
  cx: number, cy: number, r: number,
): { x: number; y: number }[] | null {
  if (vertexLabels.length !== 3) return null;
  const labels = vertexLabels;

  // Collect known angles
  const angleMap: Record<string, number> = {};
  if (angleDefs) {
    for (const a of angleDefs) {
      if (a.degrees > 0 && labels.includes(a.vertex)) angleMap[a.vertex] = a.degrees;
    }
  }

  // Parse numeric side lengths
  const sideMap: Record<string, number> = {};
  if (sideDefs) {
    for (const s of sideDefs) {
      const val = parseSideLength(s.label);
      if (val !== null) {
        sideMap[`${s.from}-${s.to}`] = val;
        sideMap[`${s.to}-${s.from}`] = val;
      }
    }
  }

  // Infer third angle from two known
  const knownVerts = labels.filter((l) => l in angleMap);
  if (knownVerts.length === 2) {
    const sum = knownVerts.reduce((s, l) => s + angleMap[l], 0);
    const missing = labels.find((l) => !(l in angleMap));
    if (missing && sum < 180) angleMap[missing] = 180 - sum;
  }

  // Strategy 1: all 3 angles known → sine-rule triangle
  if (labels.every((l) => l in angleMap)) {
    return buildTriangleFromAngles(labels, angleMap, cx, cy, r);
  }

  // Strategy 2: right-angle marker (even with only 1 angle given)
  const rightDef = angleDefs?.find((a) => a.isRightAngle);
  if (rightDef && labels.includes(rightDef.vertex)) {
    const rv = rightDef.vertex;
    const others = labels.filter((l) => l !== rv);
    const l0 = sideMap[`${rv}-${others[0]}`] ?? sideMap[`${others[0]}-${rv}`] ?? 3;
    const l1 = sideMap[`${rv}-${others[1]}`] ?? sideMap[`${others[1]}-${rv}`] ?? 4;
    return buildRightTriangle(labels, rv, others, l0, l1, cx, cy, r);
  }

  // Strategy 3: 3 numeric sides → cosine rule to get angles
  const [A, B, C] = labels;
  const sAB = sideMap[`${A}-${B}`];
  const sBC = sideMap[`${B}-${C}`];
  const sAC = sideMap[`${A}-${C}`];
  if (sAB && sBC && sAC) {
    const cosB = (sAB * sAB + sBC * sBC - sAC * sAC) / (2 * sAB * sBC);
    const cosA = (sAB * sAB + sAC * sAC - sBC * sBC) / (2 * sAB * sAC);
    angleMap[B] = (Math.acos(Math.max(-1, Math.min(1, cosB))) * 180) / Math.PI;
    angleMap[A] = (Math.acos(Math.max(-1, Math.min(1, cosA))) * 180) / Math.PI;
    angleMap[C] = 180 - angleMap[A] - angleMap[B];
    return buildTriangleFromAngles(labels, angleMap, cx, cy, r);
  }

  return null; // fall back to equilateral
}

const COLORS = {
  stroke: "#818cf8",
  fill: "rgba(129,140,248,0.06)",
  label: "#e8e8f0",
  side: "#22d3ee",
  angle: "#fbbf24",
};

export default function LabeledShapeRenderer({ block, baseDelay }: Props) {
  const { shape, vertices: vertexDefs, sides, angles } = block;

  const width = 400;
  const height = 300;
  const cx = width / 2;
  const cy = height / 2;
  const r = 100;

  // Compute vertices
  const numV = vertexDefs?.length || (shape === "triangle" ? 3 : shape === "rectangle" ? 4 : 5);
  const defaultPositions = useMemo(() => {
    // For triangles, try angle/side-aware computation first
    if (shape === "triangle") {
      const labels = vertexDefs?.map((v) => v.label) ||
        Array.from({ length: numV }, (_, i) => String.fromCharCode(65 + i));
      const accurate = computeTriangleFromData(angles, sides, labels, cx, cy, r);
      if (accurate) return accurate;
    }
    return computeVertices(shape, numV, cx, cy, r);
  }, [shape, numV, cx, cy, r, vertexDefs, angles, sides]);

  // Handle circle separately, after hooks have been called consistently.
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
  if (shape === "straight_line") {
    return (
      <StraightLineAngleRenderer
        block={block}
        baseDelay={baseDelay}
        width={width}
        height={height}
      />
    );
  }
  if (shape === "around_point") {
    return (
      <AroundPointAngleRenderer
        block={block}
        baseDelay={baseDelay}
        width={width}
        height={height}
      />
    );
  }

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
              {inlineMathToPlainText(label)}
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
                    <InlineMath text={side.label} />
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
                {inlineMathToPlainText(angle.label)}
              </text>
            </motion.g>
          );
        })}
      </svg>
    </div>
  );
}

function DiagramFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      {children}
    </div>
  );
}

function StraightLineAngleRenderer({
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
  const labels = block.angles?.map((angle) => angle.label) ?? [];
  const cx = width / 2;
  const cy = height * 0.64;

  return (
    <DiagramFrame>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full max-w-sm mx-auto"
        role="img"
        aria-label={`Straight-line angle diagram: ${labels.join(" and ")}`}
      >
        <motion.path
          d={`M 45 ${cy} L ${width - 45} ${cy} M ${cx} ${cy} L ${cx + 58} 55`}
          fill="none"
          stroke={COLORS.stroke}
          strokeWidth="3"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: baseDelay, duration: 0.8 }}
        />
        <circle cx={cx} cy={cy} r="4" fill={COLORS.stroke} />
        <path
          d={`M ${cx - 42} ${cy} A 42 42 0 0 1 ${cx + 24} ${cy - 34}`}
          fill="none"
          stroke={COLORS.angle}
          strokeWidth="2"
        />
        <path
          d={`M ${cx + 24} ${cy - 34} A 42 42 0 0 1 ${cx + 42} ${cy}`}
          fill="none"
          stroke={COLORS.angle}
          strokeWidth="2"
        />
        <text x="45" y={cy + 24} fill={COLORS.label} fontSize="14">A</text>
        <text x={width - 55} y={cy + 24} fill={COLORS.label} fontSize="14">B</text>
        <text x={cx - 7} y={cy + 24} fill={COLORS.label} fontSize="14">O</text>
        <text x={cx + 66} y="54" fill={COLORS.label} fontSize="14">C</text>
        <text x={cx - 58} y={cy - 42} fill={COLORS.angle} fontSize="16" textAnchor="middle">
          {labels[0] ?? ""}
        </text>
        <text x={cx + 60} y={cy - 38} fill={COLORS.angle} fontSize="16" textAnchor="middle">
          {labels[1] ?? ""}
        </text>
      </svg>
    </DiagramFrame>
  );
}

function AroundPointAngleRenderer({
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
  const labels = block.angles?.map((angle) => angle.label) ?? [];
  const count = Math.max(labels.length, 2);
  const cx = width / 2;
  const cy = height / 2;
  const radius = 105;

  return (
    <DiagramFrame>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full max-w-sm mx-auto"
        role="img"
        aria-label={`Angles around a point: ${labels.join(", ")}`}
      >
        {Array.from({ length: count }, (_, i) => {
          const angle = -Math.PI / 2 + (i * 2 * Math.PI) / count;
          return (
            <motion.line
              key={`ray-${i}`}
              x1={cx}
              y1={cy}
              x2={cx + radius * Math.cos(angle)}
              y2={cy + radius * Math.sin(angle)}
              stroke={COLORS.stroke}
              strokeWidth="3"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: baseDelay + i * 0.08, duration: 0.45 }}
            />
          );
        })}
        <circle cx={cx} cy={cy} r="5" fill={COLORS.stroke} />
        <text x={cx + 10} y={cy + 20} fill={COLORS.label} fontSize="14">O</text>
        {labels.map((label, i) => {
          const mid = -Math.PI / 2 + ((i + 0.5) * 2 * Math.PI) / count;
          return (
            <text
              key={`angle-label-${i}`}
              x={cx + 58 * Math.cos(mid)}
              y={cy + 58 * Math.sin(mid)}
              fill={COLORS.angle}
              fontSize="15"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {label}
            </text>
          );
        })}
      </svg>
    </DiagramFrame>
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
            {inlineMathToPlainText(circleData.center)}
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
            {inlineMathToPlainText(circleData.radius)}
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
