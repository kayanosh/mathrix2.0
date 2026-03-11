"use client";

import { motion } from "framer-motion";
import type { ColumnMethodBlock } from "@/types/whiteboard";

interface Props {
  block: ColumnMethodBlock;
  baseDelay: number;
}

export default function ColumnMethodRenderer({ block, baseDelay }: Props) {
  const { rows, carries, separatorAfterRows, question, answer } = block;
  const separators = new Set(separatorAfterRows || []);

  // Find max columns across all rows
  const maxCols = Math.max(...rows.map((r) => r.length));

  // Build carry lookup: "row-col" → digit
  const carryMap = new Map<string, string>();
  carries?.forEach((c) => carryMap.set(`${c.row}-${c.col}`, c.digit));

  const cellW = 32;
  const cellH = 36;
  const carryH = 16;

  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      {/* Question label */}
      <p className="text-xs text-gray-400 mb-3 text-center font-[family-name:var(--font-caveat)] text-base">
        {question}
      </p>

      <div className="flex justify-center">
        <div className="relative inline-block">
          {rows.map((row, ri) => (
            <div key={ri}>
              {/* Carry digits above this row */}
              <div className="flex justify-end" style={{ height: carryH, marginRight: 2 }}>
                {Array.from({ length: maxCols }, (_, ci) => {
                  const carry = carryMap.get(`${ri}-${ci}`);
                  return (
                    <motion.div
                      key={`carry-${ri}-${ci}`}
                      className="flex items-center justify-center"
                      style={{ width: cellW }}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: carry ? 1 : 0, y: 0 }}
                      transition={{ delay: baseDelay + ri * 0.15 + 0.1 }}
                    >
                      {carry && (
                        <span className="text-[10px] text-amber-400 font-[family-name:var(--font-caveat)]">
                          {carry}
                        </span>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {/* Row digits */}
              <motion.div
                className="flex justify-end"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: baseDelay + ri * 0.15 }}
              >
                {/* Pad row to maxCols from the left */}
                {Array.from({ length: maxCols }, (_, ci) => {
                  const charIdx = ci - (maxCols - row.length);
                  const char = charIdx >= 0 ? row[charIdx] : "";
                  return (
                    <div
                      key={`cell-${ri}-${ci}`}
                      className="flex items-center justify-center"
                      style={{
                        width: cellW,
                        height: cellH,
                        fontFamily: "var(--font-caveat), cursive",
                        fontSize: "18px",
                        color: "#e8e8f0",
                      }}
                    >
                      {char}
                    </div>
                  );
                })}
              </motion.div>

              {/* Separator line */}
              {separators.has(ri) && (
                <motion.div
                  className="mx-1"
                  style={{
                    height: 2,
                    background: "linear-gradient(90deg, transparent 0%, #818cf8 20%, #818cf8 80%, transparent 100%)",
                  }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: baseDelay + ri * 0.15 + 0.1, duration: 0.3 }}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Answer */}
      {answer && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: baseDelay + rows.length * 0.15 + 0.2 }}
          className="mt-3 text-center"
        >
          <span className="text-emerald-400 font-bold font-[family-name:var(--font-caveat)] text-xl">
            = {answer}
          </span>
        </motion.div>
      )}
    </div>
  );
}
