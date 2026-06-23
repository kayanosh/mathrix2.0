"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import type { ColumnMethodBlock, ColumnMethodCellNote } from "@/types/whiteboard";
import {
  arrowheadPoints,
  arrowLabelPosition,
  buildArrowPath,
  cellCenter,
  DEFAULT_CARRY_H,
  DEFAULT_CELL_H,
  DEFAULT_CELL_W,
  gridHeight,
  gridWidth,
  inferCarryMoves,
  ROW_SEPARATOR_H,
} from "@/lib/column-method-layout";

interface Props {
  block: ColumnMethodBlock;
  baseDelay: number;
}

const CARRY_COLOR = "#fbbf24";
const BORROW_COLOR = "#38bdf8";

function noteKey(n: ColumnMethodCellNote): string {
  return `${n.row}-${n.col}`;
}

export default function ColumnMethodRenderer({ block, baseDelay }: Props) {
  const { rows, carries, moves, cellNotes, separatorAfterRows, question, answer, method } = block;
  const separators = new Set(separatorAfterRows || []);

  const maxCols = Math.max(...rows.map((r) => r.replace(/^[+\-]\s*/, "").trim().length), 1);
  const cellW = DEFAULT_CELL_W;
  const cellH = DEFAULT_CELL_H;
  const carryH = DEFAULT_CARRY_H;

  const carryMap = useMemo(() => {
    const map = new Map<string, string>();
    carries?.forEach((c) => map.set(`${c.row}-${c.col}`, c.digit));
    return map;
  }, [carries]);

  const noteMap = useMemo(() => {
    const map = new Map<string, ColumnMethodCellNote>();
    cellNotes?.forEach((n) => map.set(noteKey(n), n));
    return map;
  }, [cellNotes]);

  const resolvedMoves = useMemo(() => {
    if (moves?.length) return moves;
    return inferCarryMoves(method, carries, maxCols);
  }, [moves, method, carries, maxCols]);

  const svgW = gridWidth(maxCols, cellW);
  const svgH = gridHeight(rows.length, cellH, carryH);

  const operatorRow =
    method === "column_addition" || method === "column_subtraction"
      ? rows.findIndex((r) => /^[+\-]/.test(r.trim()))
      : -1;
  const operatorChar =
    method === "column_addition" ? "+" : method === "column_subtraction" ? "−" : "";

  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <p className="text-xs text-gray-400 mb-3 text-center font-[family-name:var(--font-caveat)] text-base">
        {question}
      </p>

      <div className="flex justify-center">
        <div className="relative inline-block" style={{ width: svgW, minHeight: svgH }}>
          {/* Arrow overlay */}
          {resolvedMoves.length > 0 && (
            <svg
              className="absolute inset-0 pointer-events-none overflow-visible"
              width={svgW}
              height={svgH}
              style={{ zIndex: 2 }}
            >
              {resolvedMoves.map((move, mi) => {
                const from = cellCenter(move.fromRow, move.fromCol, maxCols, cellW, cellH, carryH);
                const to = cellCenter(move.toRow, move.toCol, maxCols, cellW, cellH, carryH);
                const kind = move.kind ?? "carry";
                const color = kind === "borrow" ? BORROW_COLOR : CARRY_COLOR;
                const pathD = buildArrowPath(from.x, from.y, to.x, to.y, kind);
                const headD = arrowheadPoints(from.x, from.y, to.x, to.y);
                const labelPos = arrowLabelPosition(from.x, from.y, to.x, to.y, kind);
                const delay = baseDelay + Math.max(move.fromRow, move.toRow) * 0.15 + 0.25 + mi * 0.1;

                return (
                  <g key={mi}>
                    <motion.path
                      d={pathD}
                      stroke={color}
                      strokeWidth={2}
                      strokeLinecap="round"
                      fill="none"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ delay, duration: 0.4, ease: "easeInOut" }}
                    />
                    <motion.path
                      d={headD}
                      stroke={color}
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: delay + 0.35, duration: 0.15 }}
                    />
                    {move.label && (
                      <motion.text
                        x={labelPos.x}
                        y={labelPos.y}
                        textAnchor="middle"
                        fill={color}
                        fontSize={9}
                        fontFamily="var(--font-caveat), cursive"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: delay + 0.2, duration: 0.2 }}
                      >
                        {move.label}
                      </motion.text>
                    )}
                  </g>
                );
              })}
            </svg>
          )}

          {/* Digit grid */}
          {rows.map((row, ri) => {
            const cleaned = row.replace(/^[+\-]\s*/, "").trim();
            const showOperator = ri === operatorRow && operatorChar;

            return (
              <div key={ri}>
                {/* Carry digits above this row */}
                <div className="flex justify-end items-end" style={{ height: carryH, marginRight: 2 }}>
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
                  className="flex justify-end items-center"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: baseDelay + ri * 0.15 }}
                >
                  {showOperator && (
                    <div
                      className="flex items-center justify-center shrink-0 text-indigo-400 font-bold"
                      style={{
                        width: cellW,
                        height: cellH,
                        fontFamily: "var(--font-caveat), cursive",
                        fontSize: "20px",
                      }}
                    >
                      {operatorChar}
                    </div>
                  )}

                  {Array.from({ length: maxCols }, (_, ci) => {
                    const charIdx = ci - (maxCols - cleaned.length);
                    const char = charIdx >= 0 ? cleaned[charIdx] : "";
                    const note = noteMap.get(`${ri}-${ci}`);

                    return (
                      <div
                        key={`cell-${ri}-${ci}`}
                        className="relative flex items-center justify-center"
                        style={{
                          width: cellW,
                          height: cellH,
                          fontFamily: "var(--font-caveat), cursive",
                          fontSize: "18px",
                          color: "#e8e8f0",
                        }}
                      >
                        {note?.rewrite && (
                          <span
                            className="absolute text-[10px] text-sky-300 font-[family-name:var(--font-caveat)]"
                            style={{ top: 2, right: 4 }}
                          >
                            {note.rewrite}
                          </span>
                        )}
                        <span
                          style={{
                            textDecoration: note?.strike ? "line-through" : undefined,
                            textDecorationColor: note?.strike ? "#f87171" : undefined,
                            opacity: note?.strike ? 0.55 : 1,
                          }}
                        >
                          {char}
                        </span>
                      </div>
                    );
                  })}
                </motion.div>

                {separators.has(ri) && (
                  <motion.div
                    className="mx-1"
                    style={{
                      height: ROW_SEPARATOR_H,
                      background:
                        "linear-gradient(90deg, transparent 0%, #818cf8 20%, #818cf8 80%, transparent 100%)",
                    }}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: baseDelay + ri * 0.15 + 0.1, duration: 0.3 }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

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
