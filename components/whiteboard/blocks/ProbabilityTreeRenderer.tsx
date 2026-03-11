"use client";

import { motion } from "framer-motion";
import type { ProbabilityTreeBlock, TreeBranch } from "@/types/whiteboard";

interface Props {
  block: ProbabilityTreeBlock;
  baseDelay: number;
}

const LEVEL_COLORS = ["#818cf8", "#22d3ee", "#fbbf24", "#f472b6"];

/**
 * Parse a LaTeX fraction string like "\\frac{x}{4+x}" into { num, den }.
 * Returns null if the string isn't a simple fraction.
 */
function parseFraction(latex: string): { num: string; den: string } | null {
  // Match \frac{...}{...} allowing nested braces one level deep
  const m = latex.match(
    /^\\frac\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}$/
  );
  if (m) return { num: cleanLatex(m[1]), den: cleanLatex(m[2]) };

  // Also handle plain a/b
  const parts = latex.split("/");
  if (parts.length === 2 && parts[0].trim() && parts[1].trim()) {
    return { num: cleanLatex(parts[0].trim()), den: cleanLatex(parts[1].trim()) };
  }

  return null;
}

/** Strip common LaTeX commands for plain-text display */
function cleanLatex(s: string): string {
  return s
    .replace(/\\text\{([^}]*)\}/g, "$1")
    .replace(/\\(?:left|right)[()[\]|.]/g, "")
    .replace(/\\(?:cdot|times)/g, "·")
    .replace(/\\(?:div)/g, "÷")
    .replace(/[{}]/g, "")
    .trim();
}

/**
 * Renders a probability label as pure SVG.
 * If it's a \frac{}{}, draws numerator / line / denominator.
 * Otherwise renders as plain text.
 */
function SVGProbLabel({
  latex,
  cx,
  cy,
  color,
  fontSize,
  delay,
}: {
  latex: string;
  cx: number;
  cy: number;
  color: string;
  fontSize: number;
  delay: number;
}) {
  const frac = parseFraction(latex);

  if (frac) {
    const lineW = Math.max(frac.num.length, frac.den.length) * (fontSize * 0.52) + 10;
    return (
      <motion.g
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay, type: "spring", stiffness: 300 }}
      >
        {/* Numerator */}
        <text
          x={cx}
          y={cy - fontSize * 0.5}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={color}
          fontSize={fontSize}
          fontFamily="'Caveat', cursive"
          fontWeight={500}
        >
          {frac.num}
        </text>
        {/* Fraction line */}
        <line
          x1={cx - lineW / 2}
          y1={cy}
          x2={cx + lineW / 2}
          y2={cy}
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          opacity={0.7}
        />
        {/* Denominator */}
        <text
          x={cx}
          y={cy + fontSize * 0.55}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={color}
          fontSize={fontSize}
          fontFamily="'Caveat', cursive"
          fontWeight={500}
        >
          {frac.den}
        </text>
      </motion.g>
    );
  }

  // Non-fraction: just render as text
  return (
    <motion.text
      x={cx}
      y={cy}
      textAnchor="middle"
      dominantBaseline="middle"
      fill={color}
      fontSize={fontSize}
      fontFamily="'Caveat', cursive"
      fontWeight={500}
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, type: "spring", stiffness: 300 }}
    >
      {cleanLatex(latex)}
    </motion.text>
  );
}

export default function ProbabilityTreeRenderer({ block, baseDelay }: Props) {
  const { rootLabel, branches, highlightPaths, showOutcomeProbabilities } = block;
  const maxDepth = getMaxDepth(branches);
  const totalLeaves = countLeaves(branches);

  // Canvas dimensions — more generous spacing
  const width = 200 + maxDepth * 260;
  const height = Math.max(280, totalLeaves * 80 + 60);
  const startX = 90;
  const startY = height / 2;

  // Flatten all paths for highlighting
  const highlightSet = new Set(
    (highlightPaths || []).map((p) => p.join("-"))
  );

  return (
    <div
      className="rounded-xl p-5 overflow-x-auto"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ minWidth: 500, maxHeight: 600 }}
        overflow="visible"
      >
        {/* Root label */}
        <motion.text
          x={startX - 14}
          y={startY}
          textAnchor="end"
          fill="#f3f4f6"
          fontSize="18"
          fontFamily="var(--font-caveat), cursive"
          dominantBaseline="middle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: baseDelay }}
        >
          {rootLabel}
        </motion.text>

        {/* Root dot */}
        <motion.circle
          cx={startX}
          cy={startY}
          r={6}
          fill="#818cf8"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: baseDelay, type: "spring" }}
        />

        {/* Branches */}
        <BranchGroup
          branches={branches}
          x={startX}
          y={startY}
          level={0}
          ySpan={height - 60}
          baseDelay={baseDelay + 0.2}
          path={[]}
          highlightSet={highlightSet}
          showOutcomeProbs={showOutcomeProbabilities}
          pathProbability={1}
        />
      </svg>
    </div>
  );
}

/* ── Recursive branch renderer ─────────────────────────── */
function BranchGroup({
  branches,
  x,
  y,
  level,
  ySpan,
  baseDelay,
  path,
  highlightSet,
  showOutcomeProbs,
  pathProbability,
}: {
  branches: TreeBranch[];
  x: number;
  y: number;
  level: number;
  ySpan: number;
  baseDelay: number;
  path: number[];
  highlightSet: Set<string>;
  showOutcomeProbs?: boolean;
  pathProbability: number;
}) {
  const color = LEVEL_COLORS[level % LEVEL_COLORS.length];
  const xStep = 220;
  const nextX = x + xStep;
  const branchHeight = ySpan / branches.length;

  return (
    <>
      {branches.map((branch, i) => {
        const branchY = y - ySpan / 2 + branchHeight * (i + 0.5);
        const currentPath = [...path, i];
        const pathKey = currentPath.join("-");
        const isHighlighted = highlightSet.has(pathKey);
        const delay = baseDelay + i * 0.15;
        const branchProb = pathProbability * branch.probabilityValue;

        // Position the probability label at ~40% along the branch,
        // offset perpendicular so it sits clearly beside the line
        const labelT = 0.38; // position along the line (0 = start, 1 = end)
        const labelCx = x + (nextX - x) * labelT;
        const labelCy = y + (branchY - y) * labelT;

        // Perpendicular offset: push label away from the line centre
        const dx = nextX - x;
        const dy = branchY - y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        // Offset to the left of the direction of travel (above for downward branches, below for upward)
        const perpX = (-dy / len) * 18;
        const perpY = (dx / len) * 18;

        const fracX = labelCx + perpX;
        const fracY = labelCy + perpY;

        return (
          <g key={i}>
            {/* Line from parent to child */}
            <motion.line
              x1={x}
              y1={y}
              x2={nextX}
              y2={branchY}
              stroke={isHighlighted ? "#fbbf24" : color}
              strokeWidth={isHighlighted ? 3 : 2}
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ delay, duration: 0.4 }}
            />

            {/* Probability label — positioned along the branch */}
            <SVGProbLabel
              latex={branch.probability}
              cx={fracX}
              cy={fracY}
              color={isHighlighted ? "#fbbf24" : color}
              fontSize={15}
              delay={delay + 0.2}
            />

            {/* Node dot */}
            <motion.circle
              cx={nextX}
              cy={branchY}
              r={5}
              fill={isHighlighted ? "#fbbf24" : color}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: delay + 0.3, type: "spring" }}
            />

            {/* Event label */}
            <motion.text
              x={nextX + 12}
              y={branchY}
              fill={isHighlighted ? "#fbbf24" : "#ffffff"}
              fontSize="17"
              fontWeight={isHighlighted ? 700 : 500}
              fontFamily="var(--font-caveat), cursive"
              dominantBaseline="middle"
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: delay + 0.35 }}
            >
              {branch.event}
            </motion.text>

            {/* Outcome probability at leaves */}
            {showOutcomeProbs &&
              (!branch.children || branch.children.length === 0) && (
                <motion.text
                  x={nextX + 16 + branch.event.length * 10 + 10}
                  y={branchY}
                  fill={isHighlighted ? "#fbbf24" : "#d1d5db"}
                  fontSize="15"
                  fontWeight={isHighlighted ? 600 : 500}
                  dominantBaseline="middle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: delay + 0.5 }}
                >
                  = {branchProb.toFixed(4).replace(/0+$/, "").replace(/\.$/, "")}
                </motion.text>
              )}

            {/* Recurse into children */}
            {branch.children && branch.children.length > 0 && (
              <BranchGroup
                branches={branch.children}
                x={nextX}
                y={branchY}
                level={level + 1}
                ySpan={branchHeight * 0.9}
                baseDelay={delay + 0.3}
                path={currentPath}
                highlightSet={highlightSet}
                showOutcomeProbs={showOutcomeProbs}
                pathProbability={branchProb}
              />
            )}
          </g>
        );
      })}
    </>
  );
}

/* ── Helpers ──────────────────────────────────────────── */
function getMaxDepth(branches: TreeBranch[]): number {
  if (branches.length === 0) return 0;
  return (
    1 +
    Math.max(
      ...branches.map((b) =>
        b.children ? getMaxDepth(b.children) : 0
      )
    )
  );
}

function countLeaves(branches: TreeBranch[]): number {
  return branches.reduce((sum, b) => {
    if (!b.children || b.children.length === 0) return sum + 1;
    return sum + countLeaves(b.children);
  }, 0);
}
