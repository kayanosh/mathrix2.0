"use client";

import { motion } from "framer-motion";
import type {
  AreaModelBlock,
  BarModelBlock,
  FractionBarBlock,
  FractionWallBlock,
  HundredSquareBlock,
  KeyInfoBlock,
} from "@/types/whiteboard";

export function FractionBarRenderer({
  block,
  baseDelay,
}: {
  block: FractionBarBlock;
  baseDelay: number;
}) {
  const d = Math.max(1, Math.floor(block.denominator));
  const shaded = Math.min(d, Math.max(0, block.shaded ?? block.numerator));
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: baseDelay }}
      className="space-y-2"
    >
      {block.label && (
        <p className="text-sm font-semibold text-gray-800">{block.label}</p>
      )}
      <div className="flex h-10 w-full overflow-hidden rounded-lg border-2 border-indigo-300">
        {Array.from({ length: d }, (_, i) => (
          <div
            key={i}
            className={`flex-1 border-r border-indigo-200 last:border-r-0 ${
              i < shaded ? "bg-indigo-400" : "bg-white"
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-gray-500">
        {shaded}/{d} shaded
      </p>
    </motion.div>
  );
}

export function FractionWallRenderer({
  block,
  baseDelay,
}: {
  block: FractionWallBlock;
  baseDelay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: baseDelay }}
      className="space-y-2"
    >
      {block.caption && (
        <p className="text-sm font-semibold text-gray-800">{block.caption}</p>
      )}
      {(block.rows || []).map((row, ri) => {
        const d = Math.max(1, row.denominator);
        return (
          <div key={ri} className="space-y-0.5">
            {row.label && (
              <p className="text-[11px] font-medium text-gray-500">{row.label}</p>
            )}
            <div className="flex h-7 w-full overflow-hidden rounded border border-violet-300">
              {Array.from({ length: d }, (_, i) => (
                <div
                  key={i}
                  className={`flex-1 border-r border-violet-200 last:border-r-0 text-[10px] flex items-center justify-center ${
                    row.highlightIndex === i
                      ? "bg-violet-400 text-white font-bold"
                      : "bg-violet-50 text-violet-700"
                  }`}
                >
                  1/{d}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </motion.div>
  );
}

export function BarModelRenderer({
  block,
  baseDelay,
}: {
  block: BarModelBlock;
  baseDelay: number;
}) {
  const parts = block.parts || [];
  const totalWeight = parts.reduce((s, p) => s + (p.weight ?? 1), 0) || 1;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: baseDelay }}
      className="space-y-2"
    >
      {block.caption && (
        <p className="text-sm font-semibold text-gray-800">{block.caption}</p>
      )}
      <div className="flex h-12 w-full overflow-hidden rounded-lg border-2 border-emerald-400">
        {parts.map((p, i) => (
          <div
            key={i}
            style={{ flex: p.weight ?? 1 }}
            className={`flex items-center justify-center border-r border-emerald-300 last:border-r-0 text-xs font-semibold ${
              p.shaded !== false ? "bg-emerald-300/80 text-emerald-950" : "bg-white text-gray-700"
            }`}
          >
            {p.label}
            {p.value != null ? ` (${p.value})` : ""}
          </div>
        ))}
      </div>
      {block.totalLabel && (
        <p className="text-xs text-gray-600">Total: {block.totalLabel} · parts {totalWeight}</p>
      )}
    </motion.div>
  );
}

export function HundredSquareRenderer({
  block,
  baseDelay,
}: {
  block: HundredSquareBlock;
  baseDelay: number;
}) {
  const shaded = Math.min(100, Math.max(0, Math.round(block.shaded)));
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: baseDelay }}
      className="space-y-2"
    >
      {block.label && (
        <p className="text-sm font-semibold text-gray-800">{block.label}</p>
      )}
      <div
        className="grid gap-px bg-amber-200 border border-amber-300 rounded overflow-hidden"
        style={{ gridTemplateColumns: "repeat(10, minmax(0, 1fr))", width: "100%", maxWidth: 280 }}
      >
        {Array.from({ length: 100 }, (_, i) => (
          <div
            key={i}
            className={`aspect-square ${i < shaded ? "bg-amber-500" : "bg-white"}`}
          />
        ))}
      </div>
      <p className="text-xs text-gray-500">{shaded}% shaded</p>
    </motion.div>
  );
}

export function AreaModelRenderer({
  block,
  baseDelay,
}: {
  block: AreaModelBlock;
  baseDelay: number;
}) {
  const r = Math.max(1, Math.min(20, Math.floor(block.rows)));
  const c = Math.max(1, Math.min(20, Math.floor(block.cols)));
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: baseDelay }}
      className="space-y-2"
    >
      {block.caption && (
        <p className="text-sm font-semibold text-gray-800">{block.caption}</p>
      )}
      {block.labels?.top && (
        <p className="text-xs text-center text-gray-600">{block.labels.top}</p>
      )}
      <div className="flex gap-2 items-center">
        {block.labels?.side && (
          <p className="text-xs text-gray-600 writing-mode-vertical">{block.labels.side}</p>
        )}
        <div
          className="grid gap-px bg-sky-300 border-2 border-sky-500 rounded overflow-hidden flex-1"
          style={{ gridTemplateColumns: `repeat(${c}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: r * c }, (_, i) => (
            <div key={i} className="aspect-square bg-sky-100" />
          ))}
        </div>
      </div>
      {block.labels?.product && (
        <p className="text-sm font-medium text-sky-800">{block.labels.product}</p>
      )}
    </motion.div>
  );
}

export function KeyInfoRenderer({
  block,
  baseDelay,
}: {
  block: KeyInfoBlock;
  baseDelay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: baseDelay }}
      className="space-y-2 rounded-xl border border-rose-200 bg-rose-50/60 p-3"
    >
      {block.caption && (
        <p className="text-[11px] font-bold uppercase tracking-wide text-rose-600">
          {block.caption}
        </p>
      )}
      <p className="text-sm text-gray-800 leading-relaxed">{block.stem}</p>
      <ul className="flex flex-wrap gap-2">
        {(block.highlights || []).map((h, i) => (
          <li
            key={i}
            className="rounded-lg bg-rose-200/80 px-2 py-1 text-xs font-semibold text-rose-900"
          >
            {h.text}
          </li>
        ))}
      </ul>
    </motion.div>
  );
}
