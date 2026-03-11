"use client";

import { motion } from "framer-motion";
import type { ChartBlock } from "@/types/whiteboard";

interface Props {
  block: ChartBlock;
  baseDelay: number;
}

const BAR_COLORS = ["#818cf8", "#22d3ee", "#fbbf24", "#f472b6", "#a78bfa", "#34d399"];
const PIE_COLORS = ["#818cf8", "#22d3ee", "#fbbf24", "#f472b6", "#a78bfa", "#34d399"];

export default function ChartRenderer({ block, baseDelay }: Props) {
  switch (block.chartType) {
    case "bar":
    case "histogram":
      return <BarChartRenderer block={block} baseDelay={baseDelay} />;
    case "pie":
      return <PieChartRenderer block={block} baseDelay={baseDelay} />;
    case "box_plot":
      return <BoxPlotRenderer block={block} baseDelay={baseDelay} />;
    case "cumulative_frequency":
      return <CumulativeFreqRenderer block={block} baseDelay={baseDelay} />;
    default:
      return (
        <div className="text-gray-500 text-xs italic p-3">
          Unsupported chart type
        </div>
      );
  }
}

/* ── Bar Chart ────────────────────────────────────────── */
function BarChartRenderer({
  block,
  baseDelay,
}: {
  block: ChartBlock;
  baseDelay: number;
}) {
  const bars = block.bars || [];
  if (bars.length === 0) return null;

  const maxVal = Math.max(...bars.map((b) => b.value), 1);
  const width = 400;
  const height = 260;
  const padding = { top: 30, right: 20, bottom: 50, left: 50 };
  const barAreaW = width - padding.left - padding.right;
  const barAreaH = height - padding.top - padding.bottom;
  const barWidth = Math.min(40, (barAreaW / bars.length) * 0.7);
  const gap = (barAreaW - barWidth * bars.length) / (bars.length + 1);

  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      {block.title && (
        <p className="text-xs text-gray-400 mb-2 text-center font-[family-name:var(--font-caveat)] text-base">
          {block.title}
        </p>
      )}
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-md mx-auto">
        {/* Y axis */}
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={height - padding.bottom}
          stroke="#6b7280"
          strokeWidth="1.5"
        />
        {/* X axis */}
        <line
          x1={padding.left}
          y1={height - padding.bottom}
          x2={width - padding.right}
          y2={height - padding.bottom}
          stroke="#6b7280"
          strokeWidth="1.5"
        />

        {/* Bars */}
        {bars.map((bar, i) => {
          const bx = padding.left + gap + i * (barWidth + gap);
          const bh = (bar.value / maxVal) * barAreaH;
          const by = height - padding.bottom - bh;
          const color = bar.color || BAR_COLORS[i % BAR_COLORS.length];

          return (
            <motion.g key={i}>
              <motion.rect
                x={bx}
                y={height - padding.bottom}
                width={barWidth}
                height={0}
                rx={3}
                fill={color}
                opacity={0.8}
                animate={{ y: by, height: bh }}
                transition={{
                  delay: baseDelay + 0.2 + i * 0.1,
                  duration: 0.5,
                  ease: "easeOut",
                }}
              />
              {/* Value label */}
              <motion.text
                x={bx + barWidth / 2}
                y={by - 6}
                textAnchor="middle"
                fill={color}
                fontSize="10"
                fontFamily="var(--font-caveat), cursive"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: baseDelay + 0.5 + i * 0.1 }}
              >
                {bar.value}
              </motion.text>
              {/* Category label */}
              <text
                x={bx + barWidth / 2}
                y={height - padding.bottom + 16}
                textAnchor="middle"
                fill="#9ca3af"
                fontSize="9"
                fontFamily="var(--font-caveat), cursive"
              >
                {bar.label}
              </text>
            </motion.g>
          );
        })}

        {/* Y label */}
        {block.yLabel && (
          <text
            x={12}
            y={height / 2}
            textAnchor="middle"
            fill="#9ca3af"
            fontSize="10"
            fontFamily="var(--font-caveat), cursive"
            transform={`rotate(-90, 12, ${height / 2})`}
          >
            {block.yLabel}
          </text>
        )}
      </svg>
    </div>
  );
}

/* ── Pie Chart ────────────────────────────────────────── */
function PieChartRenderer({
  block,
  baseDelay,
}: {
  block: ChartBlock;
  baseDelay: number;
}) {
  const slices = block.slices || [];
  if (slices.length === 0) return null;

  const total = slices.reduce((s, sl) => s + sl.value, 0) || 1;
  const cx = 160;
  const cy = 140;
  const r = 100;

  let currentAngle = -Math.PI / 2;

  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      {block.title && (
        <p className="text-xs text-gray-400 mb-2 text-center font-[family-name:var(--font-caveat)] text-base">
          {block.title}
        </p>
      )}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <svg viewBox="0 0 320 280" className="w-64 flex-shrink-0">
          {slices.map((slice, i) => {
            const angle = (slice.value / total) * 2 * Math.PI;
            const startAngle = currentAngle;
            const endAngle = currentAngle + angle;
            currentAngle = endAngle;

            const x1 = cx + r * Math.cos(startAngle);
            const y1 = cy + r * Math.sin(startAngle);
            const x2 = cx + r * Math.cos(endAngle);
            const y2 = cy + r * Math.sin(endAngle);
            const largeArc = angle > Math.PI ? 1 : 0;

            const midAngle = startAngle + angle / 2;
            const labelX = cx + (r * 0.65) * Math.cos(midAngle);
            const labelY = cy + (r * 0.65) * Math.sin(midAngle);

            const color = slice.color || PIE_COLORS[i % PIE_COLORS.length];

            const d = `M ${cx},${cy} L ${x1},${y1} A ${r},${r} 0 ${largeArc} 1 ${x2},${y2} Z`;

            return (
              <motion.g key={i}>
                <motion.path
                  d={d}
                  fill={color}
                  opacity={0.75}
                  stroke="#07070e"
                  strokeWidth="2"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 0.75 }}
                  transition={{
                    delay: baseDelay + 0.2 + i * 0.12,
                    type: "spring",
                    stiffness: 200,
                  }}
                  style={{ transformOrigin: `${cx}px ${cy}px` }}
                />
                <motion.text
                  x={labelX}
                  y={labelY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#fff"
                  fontSize="10"
                  fontWeight="bold"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: baseDelay + 0.6 + i * 0.1 }}
                >
                  {Math.round((slice.value / total) * 100)}%
                </motion.text>
              </motion.g>
            );
          })}
        </svg>

        {/* Legend */}
        <div className="flex flex-col gap-1.5">
          {slices.map((slice, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-sm flex-shrink-0"
                style={{
                  backgroundColor: slice.color || PIE_COLORS[i % PIE_COLORS.length],
                }}
              />
              <span className="text-xs text-gray-300">
                {slice.label} ({slice.value})
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Box Plot ────────────────────────────────────────── */
function BoxPlotRenderer({
  block,
  baseDelay,
}: {
  block: ChartBlock;
  baseDelay: number;
}) {
  const bp = block.boxPlot;
  if (!bp) return null;

  const width = 400;
  const height = 120;
  const padding = { left: 50, right: 30 };
  const innerW = width - padding.left - padding.right;

  const dataMin = bp.min - (bp.max - bp.min) * 0.1;
  const dataMax = bp.max + (bp.max - bp.min) * 0.1;

  function xPos(v: number): number {
    return padding.left + ((v - dataMin) / (dataMax - dataMin)) * innerW;
  }

  const boxY = 35;
  const boxH = 40;

  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      {block.title && (
        <p className="text-xs text-gray-400 mb-2 text-center font-[family-name:var(--font-caveat)] text-base">
          {block.title}
        </p>
      )}
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-md mx-auto">
        {/* Axis */}
        <line
          x1={padding.left}
          y1={boxY + boxH + 15}
          x2={width - padding.right}
          y2={boxY + boxH + 15}
          stroke="#6b7280"
          strokeWidth="1"
        />

        {/* Whisker: min to Q1 */}
        <motion.line
          x1={xPos(bp.min)} y1={boxY + boxH / 2}
          x2={xPos(bp.q1)} y2={boxY + boxH / 2}
          stroke="#818cf8" strokeWidth="2"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: baseDelay + 0.2, duration: 0.3 }}
        />
        {/* Min cap */}
        <line x1={xPos(bp.min)} y1={boxY + 8} x2={xPos(bp.min)} y2={boxY + boxH - 8} stroke="#818cf8" strokeWidth="2" />

        {/* Box: Q1 to Q3 */}
        <motion.rect
          x={xPos(bp.q1)}
          y={boxY}
          width={xPos(bp.q3) - xPos(bp.q1)}
          height={boxH}
          rx={4}
          fill="rgba(129,140,248,0.15)"
          stroke="#818cf8"
          strokeWidth="2"
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ delay: baseDelay + 0.3, duration: 0.4 }}
          style={{ transformOrigin: `${xPos(bp.q1)}px ${boxY}px` }}
        />

        {/* Median line */}
        <motion.line
          x1={xPos(bp.median)} y1={boxY}
          x2={xPos(bp.median)} y2={boxY + boxH}
          stroke="#fbbf24" strokeWidth="2.5"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: baseDelay + 0.5, duration: 0.2 }}
        />

        {/* Whisker: Q3 to max */}
        <motion.line
          x1={xPos(bp.q3)} y1={boxY + boxH / 2}
          x2={xPos(bp.max)} y2={boxY + boxH / 2}
          stroke="#818cf8" strokeWidth="2"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: baseDelay + 0.6, duration: 0.3 }}
        />
        {/* Max cap */}
        <line x1={xPos(bp.max)} y1={boxY + 8} x2={xPos(bp.max)} y2={boxY + boxH - 8} stroke="#818cf8" strokeWidth="2" />

        {/* Value labels */}
        {[
          { v: bp.min, label: `${bp.min}` },
          { v: bp.q1, label: `Q1=${bp.q1}` },
          { v: bp.median, label: `Med=${bp.median}` },
          { v: bp.q3, label: `Q3=${bp.q3}` },
          { v: bp.max, label: `${bp.max}` },
        ].map(({ v, label }, i) => (
          <motion.text
            key={i}
            x={xPos(v)}
            y={boxY + boxH + 30}
            textAnchor="middle"
            fill="#9ca3af"
            fontSize="9"
            fontFamily="var(--font-caveat), cursive"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: baseDelay + 0.7 + i * 0.05 }}
          >
            {label}
          </motion.text>
        ))}
      </svg>
    </div>
  );
}

/* ── Cumulative Frequency ────────────────────────────── */
function CumulativeFreqRenderer({
  block,
  baseDelay,
}: {
  block: ChartBlock;
  baseDelay: number;
}) {
  const points = block.cumulativePoints || [];
  if (points.length === 0) return null;

  const width = 400;
  const height = 280;
  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const xMin = block.xRange?.[0] ?? 0;
  const xMax = block.xRange?.[1] ?? Math.max(...points.map((p) => p.upperBound));
  const yMax = block.yRange?.[1] ?? Math.max(...points.map((p) => p.cumulativeFrequency));

  function xPos(v: number): number {
    return padding.left + ((v - xMin) / (xMax - xMin)) * innerW;
  }
  function yPos(v: number): number {
    return padding.top + ((yMax - v) / yMax) * innerH;
  }

  const pathD = points
    .map((p, i) =>
      `${i === 0 ? "M" : "L"} ${xPos(p.upperBound)},${yPos(p.cumulativeFrequency)}`
    )
    .join(" ");

  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      {block.title && (
        <p className="text-xs text-gray-400 mb-2 text-center font-[family-name:var(--font-caveat)] text-base">
          {block.title}
        </p>
      )}
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-md mx-auto">
        {/* Axes */}
        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} stroke="#6b7280" strokeWidth="1.5" />
        <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="#6b7280" strokeWidth="1.5" />

        {/* Curve */}
        <motion.path
          d={pathD}
          fill="none"
          stroke="#818cf8"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: baseDelay + 0.3, duration: 1 }}
        />

        {/* Points */}
        {points.map((p, i) => (
          <motion.circle
            key={i}
            cx={xPos(p.upperBound)}
            cy={yPos(p.cumulativeFrequency)}
            r="3"
            fill="#818cf8"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: baseDelay + 0.5 + i * 0.08, type: "spring" }}
          />
        ))}

        {/* Labels */}
        {block.xLabel && (
          <text x={width / 2} y={height - 5} textAnchor="middle" fill="#9ca3af" fontSize="11" fontFamily="var(--font-caveat), cursive">
            {block.xLabel}
          </text>
        )}
        {block.yLabel && (
          <text x={12} y={height / 2} textAnchor="middle" fill="#9ca3af" fontSize="11" fontFamily="var(--font-caveat), cursive" transform={`rotate(-90, 12, ${height / 2})`}>
            {block.yLabel}
          </text>
        )}
      </svg>
    </div>
  );
}
