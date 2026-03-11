"use client";

import { motion } from "framer-motion";
import type { VennDiagramBlock } from "@/types/whiteboard";

interface Props {
  block: VennDiagramBlock;
  baseDelay: number;
}

const SET_COLORS = [
  { stroke: "#818cf8", fill: "rgba(129,140,248,0.08)" },
  { stroke: "#22d3ee", fill: "rgba(34,211,238,0.08)" },
  { stroke: "#f472b6", fill: "rgba(244,114,182,0.08)" },
];

export default function VennDiagramRenderer({ block, baseDelay }: Props) {
  const { sets, regions, universalLabel, universalTotal } = block;
  const numSets = sets.length;

  // Dimensions
  const width = 420;
  const height = 300;
  const cx = width / 2;
  const cy = height / 2;
  const r = numSets <= 2 ? 85 : 75;

  // Calculate circle centers based on number of sets
  const centers: { x: number; y: number }[] = [];
  if (numSets === 1) {
    centers.push({ x: cx, y: cy });
  } else if (numSets === 2) {
    centers.push({ x: cx - 50, y: cy });
    centers.push({ x: cx + 50, y: cy });
  } else {
    // 3 sets: equilateral triangle layout
    const offset = 40;
    centers.push({ x: cx, y: cy - offset });
    centers.push({ x: cx - offset * 0.87, y: cy + offset * 0.5 });
    centers.push({ x: cx + offset * 0.87, y: cy + offset * 0.5 });
  }

  // Region positions for text — approximate centers of each region
  function getRegionPosition(region: string): { x: number; y: number } {
    switch (region) {
      case "A_only":
        return numSets >= 2
          ? { x: centers[0].x - 30, y: centers[0].y }
          : { x: centers[0].x, y: centers[0].y };
      case "B_only":
        return numSets >= 2
          ? { x: centers[1].x + 30, y: centers[1].y }
          : { x: cx, y: cy };
      case "C_only":
        return numSets >= 3
          ? { x: centers[2].x, y: centers[2].y + 30 }
          : { x: cx, y: cy };
      case "A_and_B":
        return numSets >= 2
          ? { x: (centers[0].x + centers[1].x) / 2, y: (centers[0].y + centers[1].y) / 2 }
          : { x: cx, y: cy };
      case "A_and_C":
        return numSets >= 3
          ? { x: (centers[0].x + centers[2].x) / 2, y: (centers[0].y + centers[2].y) / 2 }
          : { x: cx, y: cy };
      case "B_and_C":
        return numSets >= 3
          ? { x: (centers[1].x + centers[2].x) / 2, y: (centers[1].y + centers[2].y) / 2 }
          : { x: cx, y: cy };
      case "A_and_B_and_C":
        return { x: cx, y: cy };
      case "neither":
        return { x: 35, y: height - 25 };
      default:
        return { x: cx, y: cy };
    }
  }

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
        className="w-full max-w-md mx-auto"
        overflow="visible"
      >
        {/* Universal set rectangle */}
        <motion.rect
          x={10}
          y={10}
          width={width - 20}
          height={height - 20}
          rx={12}
          fill="none"
          stroke="#4b5563"
          strokeWidth="1.5"
          strokeDasharray="6 4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: baseDelay }}
        />

        {/* Universal set label */}
        <motion.text
          x={24}
          y={30}
          fill="#9ca3af"
          fontSize="14"
          fontFamily="var(--font-caveat), cursive"
          fontWeight="bold"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: baseDelay }}
        >
          {universalLabel || "ξ"}
          {universalTotal != null && ` = ${universalTotal}`}
        </motion.text>

        {/* Set circles */}
        {centers.map((c, i) => (
          <motion.g key={`set-${i}`}>
            <motion.circle
              cx={c.x}
              cy={c.y}
              r={r}
              fill={
                regions.some(
                  (reg) =>
                    reg.highlighted &&
                    reg.region.includes(sets[i]?.label || String.fromCharCode(65 + i))
                )
                  ? SET_COLORS[i].fill.replace("0.08", "0.2")
                  : SET_COLORS[i].fill
              }
              stroke={SET_COLORS[i].stroke}
              strokeWidth="2"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                delay: baseDelay + 0.1 + i * 0.15,
                type: "spring",
                stiffness: 200,
              }}
              style={{ transformOrigin: `${c.x}px ${c.y}px` }}
            />
            {/* Set label */}
            <motion.text
              x={c.x}
              y={c.y - r - 10}
              textAnchor="middle"
              fill={SET_COLORS[i].stroke}
              fontSize="15"
              fontFamily="var(--font-caveat), cursive"
              fontWeight="bold"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: baseDelay + 0.3 + i * 0.1 }}
            >
              {sets[i]?.label || String.fromCharCode(65 + i)}
            </motion.text>
          </motion.g>
        ))}

        {/* Region values */}
        {regions.map((reg, i) => {
          const pos = getRegionPosition(reg.region);
          return (
            <motion.text
              key={`region-${i}`}
              x={pos.x}
              y={pos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={reg.highlighted ? "#fbbf24" : "#e8e8f0"}
              fontSize={reg.highlighted ? "16" : "13"}
              fontFamily="var(--font-caveat), cursive"
              fontWeight={reg.highlighted ? "bold" : "normal"}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                delay: baseDelay + 0.5 + i * 0.1,
                type: "spring",
              }}
              style={{ transformOrigin: `${pos.x}px ${pos.y}px` }}
            >
              {reg.value}
            </motion.text>
          );
        })}
      </svg>
    </div>
  );
}
