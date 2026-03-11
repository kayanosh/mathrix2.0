"use client";

import { motion } from "framer-motion";
import type { TableBlock } from "@/types/whiteboard";
import MathRenderer from "@/components/MathRenderer";

interface Props {
  block: TableBlock;
  baseDelay: number;
}

export default function TableRenderer({ block, baseDelay }: Props) {
  const { headers, rows, mathColumns, caption, highlightCells } = block;
  const mathCols = new Set(mathColumns || []);
  const highlights = new Set(
    (highlightCells || []).map(([r, c]) => `${r}-${c}`)
  );

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      {caption && (
        <div className="px-4 pt-3 pb-1">
          <span className="text-xs text-gray-400 font-[family-name:var(--font-caveat)] text-base">
            {caption}
          </span>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              {headers.map((h, ci) => (
                <motion.th
                  key={ci}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: baseDelay + ci * 0.05 }}
                  className="px-4 py-2.5 text-left text-xs font-semibold text-indigo-300 uppercase tracking-wider"
                  style={{ borderBottom: "1px solid rgba(129,140,248,0.15)" }}
                >
                  {mathCols.has(ci) ? <MathRenderer latex={h} /> : h}
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
                className="hover:bg-white/[0.02] transition-colors"
              >
                {row.map((cell, ci) => {
                  const isHighlighted = highlights.has(`${ri}-${ci}`);
                  return (
                    <td
                      key={ci}
                      className="px-4 py-2 text-gray-300"
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                        background: isHighlighted
                          ? "rgba(129,140,248,0.1)"
                          : undefined,
                      }}
                    >
                      {mathCols.has(ci) ? (
                        <MathRenderer latex={cell} />
                      ) : (
                        cell
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
