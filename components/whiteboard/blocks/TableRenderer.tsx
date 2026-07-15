"use client";

import { motion } from "framer-motion";
import type { CSSProperties } from "react";
import type { TableBlock } from "@/types/whiteboard";
import MathRenderer from "@/components/MathRenderer";
import InlineMath from "@/components/InlineMath";

interface Props {
  block: TableBlock;
  baseDelay: number;
}

function normalizeHighlightCells(raw: unknown): Set<string> {
  const set = new Set<string>();
  if (!Array.isArray(raw)) return set;
  for (const entry of raw) {
    if (Array.isArray(entry) && entry.length >= 2) {
      set.add(`${Number(entry[0])}-${Number(entry[1])}`);
    } else if (entry && typeof entry === "object") {
      const obj = entry as { row?: unknown; col?: unknown };
      if (obj.row != null && obj.col != null) {
        set.add(`${Number(obj.row)}-${Number(obj.col)}`);
      }
    }
  }
  return set;
}

/**
 * Light-theme table for the whiteboard / KS2 lesson surface.
 * (Previously used dark-mode greys that were nearly invisible on white.)
 */
export default function TableRenderer({ block, baseDelay }: Props) {
  const headers = Array.isArray(block.headers) ? block.headers.map(String) : [];
  const rows = Array.isArray(block.rows)
    ? block.rows.map((row) => (Array.isArray(row) ? row.map(String) : []))
    : [];
  const mathCols = new Set(Array.isArray(block.mathColumns) ? block.mathColumns : []);
  const highlights = normalizeHighlightCells(block.highlightCells);
  const { caption } = block;

  if (headers.length === 0 && rows.length === 0) {
    return (
      <div className="rounded-xl p-4 bg-white border border-amber-100 text-sm text-amber-800">
        Table could not be drawn (missing rows).
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden bg-white border border-indigo-100 shadow-sm">
      {caption && (
        <div className="px-4 pt-3 pb-1">
          <span className="text-sm font-semibold text-indigo-700 font-[family-name:var(--font-caveat)]">
            <InlineMath text={caption} />
          </span>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-indigo-50/80">
              {headers.map((h, ci) => (
                <motion.th
                  key={ci}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: baseDelay + ci * 0.05 }}
                  className="px-4 py-2.5 text-left text-xs font-bold text-indigo-800 uppercase tracking-wider border-b border-indigo-200"
                >
                  {mathCols.has(ci) ? <MathRenderer latex={h} /> : <InlineMath text={h} />}
                </motion.th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <motion.tr
                key={ri}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: baseDelay + 0.15 + ri * 0.06 }}
                className="hover:bg-indigo-50/40 transition-colors"
              >
                {row.map((cell, ci) => {
                  const isHighlighted = highlights.has(`${ri}-${ci}`);
                  return (
                    <td
                      key={ci}
                      data-teacher-target={isHighlighted ? "primary" : undefined}
                      style={
                        {
                          "--teacher-sequence": ri * Math.max(1, row.length) + ci,
                        } as CSSProperties
                      }
                      className={`px-4 py-2.5 text-base font-medium border-b border-gray-100 ${
                        isHighlighted
                          ? "bg-amber-100 text-amber-900 ring-1 ring-inset ring-amber-300"
                          : "text-gray-900"
                      }`}
                    >
                      {mathCols.has(ci) ? (
                        <MathRenderer latex={cell} />
                      ) : (
                        <InlineMath text={cell} />
                      )}
                    </td>
                  );
                })}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
