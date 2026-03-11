"use client";

import { motion } from "framer-motion";
import type { CoordinateGraphBlock } from "@/types/whiteboard";
import MathRenderer from "@/components/MathRenderer";

interface Props {
  block: CoordinateGraphBlock;
  baseDelay: number;
}

const LINE_COLORS = ["#818cf8", "#22d3ee", "#fbbf24", "#f472b6", "#34d399"];

export default function CoordinateGraphRenderer({ block, baseDelay }: Props) {
  const {
    xRange,
    yRange,
    plots,
    points,
    grid = true,
    xLabel,
    yLabel,
    segments,
  } = block;

  const width = 480;
  const height = 380;
  const padding = { top: 35, right: 35, bottom: 50, left: 55 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const [xMin, xMax] = xRange;
  const [yMin, yMax] = yRange;

  function xPos(v: number): number {
    return padding.left + ((v - xMin) / (xMax - xMin)) * innerW;
  }
  function yPos(v: number): number {
    return padding.top + ((yMax - v) / (yMax - yMin)) * innerH;
  }

  // Grid lines
  const xStep = niceStep(xMax - xMin, 8);
  const yStep = niceStep(yMax - yMin, 6);

  const xTicks: number[] = [];
  for (let v = Math.ceil(xMin / xStep) * xStep; v <= xMax; v += xStep) {
    xTicks.push(Math.round(v * 100) / 100);
  }
  const yTicks: number[] = [];
  for (let v = Math.ceil(yMin / yStep) * yStep; v <= yMax; v += yStep) {
    yTicks.push(Math.round(v * 100) / 100);
  }

  // Generate plot paths using sampled points
  const plotPaths = plots.map((plot) => {
    const samples = 200;
    const pts: string[] = [];
    for (let i = 0; i <= samples; i++) {
      const x = xMin + (i / samples) * (xMax - xMin);
      try {
        // Safely evaluate the function
        const y = evaluateFn(plot.fn, x);
        if (isFinite(y) && y >= yMin - 10 && y <= yMax + 10) {
          pts.push(`${xPos(x)},${yPos(y)}`);
        }
      } catch {
        // Skip invalid points
      }
    }
    return pts.length > 1 ? `M ${pts[0]} ${pts.slice(1).map((p) => `L ${p}`).join(" ")}` : "";
  });

  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: "rgba(241,245,249,0.5)",
        border: "1px solid rgba(148,163,184,0.2)",
      }}
    >
      {/* Legend */}
      {plots.length > 1 && (
        <div className="flex flex-wrap gap-4 mb-3 px-2">
          {plots.map((plot, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className="w-5 h-[3px] rounded"
                style={{ backgroundColor: plot.color || LINE_COLORS[i % LINE_COLORS.length] }}
              />
              <span className="text-sm text-gray-600 font-medium">
                <MathRenderer latex={plot.equation} />
              </span>
            </div>
          ))}
        </div>
      )}

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full max-w-md mx-auto"
        overflow="visible"
      >
        {/* Grid */}
        {grid && (
          <g>
            {xTicks.map((v) => (
              <line
                key={`xg-${v}`}
                x1={xPos(v)}
                y1={padding.top}
                x2={xPos(v)}
                y2={height - padding.bottom}
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="1"
              />
            ))}
            {yTicks.map((v) => (
              <line
                key={`yg-${v}`}
                x1={padding.left}
                y1={yPos(v)}
                x2={width - padding.right}
                y2={yPos(v)}
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="1"
              />
            ))}
          </g>
        )}

        {/* X axis */}
        {yMin <= 0 && yMax >= 0 && (
          <motion.line
            x1={padding.left}
            y1={yPos(0)}
            x2={width - padding.right}
            y2={yPos(0)}
            stroke="#9ca3af"
            strokeWidth="2"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: baseDelay, duration: 0.4 }}
          />
        )}

        {/* Y axis */}
        {xMin <= 0 && xMax >= 0 && (
          <motion.line
            x1={xPos(0)}
            y1={padding.top}
            x2={xPos(0)}
            y2={height - padding.bottom}
            stroke="#9ca3af"
            strokeWidth="2"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: baseDelay, duration: 0.4 }}
          />
        )}

        {/* X tick labels */}
        {xTicks.map((v) => (
          <text
            key={`xt-${v}`}
            x={xPos(v)}
            y={height - padding.bottom + 20}
            textAnchor="middle"
            fill="#4b5563"
            fontSize="13"
            fontWeight="500"
            fontFamily="var(--font-caveat), cursive"
          >
            {v}
          </text>
        ))}

        {/* Y tick labels */}
        {yTicks.map((v) => (
          <text
            key={`yt-${v}`}
            x={padding.left - 12}
            y={yPos(v)}
            textAnchor="end"
            dominantBaseline="middle"
            fill="#4b5563"
            fontSize="13"
            fontWeight="500"
            fontFamily="var(--font-caveat), cursive"
          >
            {v}
          </text>
        ))}

        {/* Axis labels */}
        {xLabel && (
          <text
            x={width / 2}
            y={height - 5}
            textAnchor="middle"
            fill="#6b7280"
            fontSize="14"
            fontWeight="500"
            fontFamily="var(--font-caveat), cursive"
          >
            {xLabel}
          </text>
        )}
        {yLabel && (
          <text
            x={14}
            y={height / 2}
            textAnchor="middle"
            fill="#6b7280"
            fontSize="14"
            fontWeight="500"
            fontFamily="var(--font-caveat), cursive"
            transform={`rotate(-90, 14, ${height / 2})`}
          >
            {yLabel}
          </text>
        )}

        {/* Plot lines */}
        {plotPaths.map((d, i) =>
          d ? (
            <motion.path
              key={`plot-${i}`}
              d={d}
              fill="none"
              stroke={plots[i].color || LINE_COLORS[i % LINE_COLORS.length]}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={
                plots[i].style === "dashed"
                  ? "8 4"
                  : plots[i].style === "dotted"
                    ? "2 3"
                    : undefined
              }
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{
                delay: baseDelay + 0.3 + i * 0.2,
                duration: 1,
                ease: "easeInOut",
              }}
            />
          ) : null
        )}

        {/* Segments */}
        {segments?.map((seg, i) => (
          <motion.line
            key={`seg-${i}`}
            x1={xPos(seg.from.x)}
            y1={yPos(seg.from.y)}
            x2={xPos(seg.to.x)}
            y2={yPos(seg.to.y)}
            stroke={seg.color || "#fbbf24"}
            strokeWidth="1.5"
            strokeDasharray={seg.style === "dashed" ? "6 3" : undefined}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: baseDelay + 1 + i * 0.15, duration: 0.4 }}
          />
        ))}

        {/* Points */}
        {points?.map((p, i) => (
          <motion.g
            key={`pt-${i}`}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              delay: baseDelay + 0.8 + i * 0.1,
              type: "spring",
              stiffness: 300,
            }}
            style={{
              transformOrigin: `${xPos(p.point.x)}px ${yPos(p.point.y)}px`,
            }}
          >
            <circle
              cx={xPos(p.point.x)}
              cy={yPos(p.point.y)}
              r="5.5"
              fill="#818cf8"
              stroke="#07070e"
              strokeWidth="2"
            />
            <text
              x={xPos(p.point.x) + 10}
              y={yPos(p.point.y) - 10}
              fill="#c7d2fe"
              fontSize="14"
              fontWeight="600"
              fontFamily="var(--font-caveat), cursive"
            >
              {p.label}
            </text>
          </motion.g>
        ))}
      </svg>
    </div>
  );
}

/* ── Helpers ──────────────────────────────────────────── */

/** Safe function evaluator — uses a restricted set of math operations */
function evaluateFn(fn: string, x: number): number {
  // Replace common math functions
  const expr = fn
    .replace(/\bx\b/g, `(${x})`)
    .replace(/\bpi\b/gi, String(Math.PI))
    .replace(/\be\b/g, String(Math.E))
    .replace(/\bsin\b/g, "Math.sin")
    .replace(/\bcos\b/g, "Math.cos")
    .replace(/\btan\b/g, "Math.tan")
    .replace(/\bsqrt\b/g, "Math.sqrt")
    .replace(/\babs\b/g, "Math.abs")
    .replace(/\blog\b/g, "Math.log")
    .replace(/\bexp\b/g, "Math.exp")
    .replace(/\bpow\b/g, "Math.pow")
    .replace(/\^/g, "**");

  // eslint-disable-next-line no-new-func
  return new Function("Math", `return ${expr}`)(Math);
}

/** Compute a nice step size for axis ticks */
function niceStep(range: number, targetTicks: number): number {
  const rough = range / targetTicks;
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const frac = rough / pow;
  let nice: number;
  if (frac <= 1.5) nice = 1;
  else if (frac <= 3) nice = 2;
  else if (frac <= 7) nice = 5;
  else nice = 10;
  return nice * pow;
}
