"use client";

import type { MasteryLevel } from "@/lib/skills";

/** A single SVG radial progress ring (no external chart dependency). */
export function RadialProgress({
  percent,
  size = 92,
  stroke = 9,
  color = "#4f46e5",
  trackColor = "#e5e7eb",
  centerLabel,
  centerSub,
}: {
  percent: number;
  size?: number;
  stroke?: number;
  color?: string;
  trackColor?: string;
  centerLabel?: string;
  centerSub?: string;
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - clamped / 100);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold text-gray-900">{centerLabel ?? `${Math.round(clamped)}%`}</span>
        {centerSub && <span className="text-[10px] text-gray-400 leading-tight">{centerSub}</span>}
      </div>
    </div>
  );
}

const MASTERY_BAR: Record<MasteryLevel, { color: string; label: string }> = {
  unseen: { color: "#e5e7eb", label: "Not started" },
  learning: { color: "#eab308", label: "Learning" },
  practiced: { color: "#3b82f6", label: "Practiced" },
  confident: { color: "#8b5cf6", label: "Confident" },
  mastered: { color: "#10b981", label: "Mastered" },
};

/** Horizontal stacked bar showing the distribution across mastery levels. */
export function MasteryDistribution({
  counts,
}: {
  counts: Record<MasteryLevel, number>;
}) {
  const order: MasteryLevel[] = ["learning", "practiced", "confident", "mastered"];
  const total = order.reduce((sum, k) => sum + counts[k], 0);

  if (total === 0) {
    return <div className="h-2.5 w-full rounded-full bg-gray-100" />;
  }

  return (
    <div className="space-y-2">
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
        {order.map((level) =>
          counts[level] > 0 ? (
            <div
              key={level}
              style={{ width: `${(counts[level] / total) * 100}%`, background: MASTERY_BAR[level].color }}
              title={`${MASTERY_BAR[level].label}: ${counts[level]}`}
            />
          ) : null
        )}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {order.map((level) =>
          counts[level] > 0 ? (
            <span key={level} className="flex items-center gap-1 text-[10px] text-gray-500">
              <span className="h-2 w-2 rounded-full" style={{ background: MASTERY_BAR[level].color }} />
              {MASTERY_BAR[level].label} {counts[level]}
            </span>
          ) : null
        )}
      </div>
    </div>
  );
}
