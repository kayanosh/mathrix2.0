"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import type { ColumnMethodBlock, ColumnMethodCellNote } from "@/types/whiteboard";
import {
  arrowheadPoints,
  buildArrowPath,
  carrySlotCenter,
  cellCenter,
  DEFAULT_CARRY_H,
  DEFAULT_CELL_H,
  DEFAULT_CELL_W,
  gridHeight,
  gridWidth,
  inferCarryMoves,
  movesWithLanes,
  normalizeColumnDigits,
  ROW_SEPARATOR_H,
} from "@/lib/column-method-layout";

interface Props {
  block: ColumnMethodBlock;
  baseDelay: number;
}

const CARRY_COLOR = "#f59e0b";
const BORROW_COLOR = "#0ea5e9";

function noteKey(n: ColumnMethodCellNote): string {
  return `${n.row}-${n.col}`;
}

export default function ColumnMethodRenderer({ block, baseDelay }: Props) {
  const { rows, carries, moves, cellNotes, separatorAfterRows, question, answer, method } = block;
  const separators = new Set(separatorAfterRows || []);

  const maxCols = Math.max(...rows.map((r) => normalizeColumnDigits(r).length), 1);
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
    const raw = moves?.length ? moves : inferCarryMoves(method, carries, maxCols);
    return movesWithLanes(raw);
  }, [moves, method, carries, maxCols]);

  const svgW = gridWidth(maxCols, cellW);
  const svgH = gridHeight(rows.length, cellH, carryH);

  const operatorRow =
    method === "column_addition" || method === "column_subtraction"
      ? rows.findIndex((r) => /^[+\-]/.test(r.trim()))
      : method === "column_multiplication"
        ? rows.findIndex((r) => /^[×x]/.test(r.trim()))
        : -1;
  const operatorChar =
    method === "column_addition"
      ? "+"
      : method === "column_subtraction"
        ? "−"
        : method === "column_multiplication"
          ? "×"
          : "";

  return (
    <div className="rounded-xl p-5 bg-gray-50/80 border border-gray-200">
      <p className="text-lg text-gray-600 mb-4 text-center font-[family-name:var(--font-caveat)]">
        {question}
      </p>

      <div className="flex justify-center">
        <div
          className="relative inline-block pt-2"
          style={{ width: svgW, minHeight: svgH }}
        >
          {resolvedMoves.length > 0 && (
            <svg
              className="absolute inset-0 pointer-events-none overflow-visible"
              width={svgW}
              height={svgH}
              style={{ zIndex: 2 }}
            >
              {resolvedMoves.map((move, mi) => {
                const kind = move.kind ?? "carry";
                const from = cellCenter(move.fromRow, move.fromCol, maxCols, cellW, cellH, carryH);
                const to =
                  kind === "carry"
                    ? carrySlotCenter(move.toRow, move.toCol, cellW, cellH, carryH)
                    : cellCenter(move.toRow, move.toCol, maxCols, cellW, cellH, carryH);
                const color = kind === "borrow" ? BORROW_COLOR : CARRY_COLOR;
                const pathD = buildArrowPath(from.x, from.y, to.x, to.y, kind, move.laneIndex);
                const headD = arrowheadPoints(from.x, from.y, to.x, to.y);
                const delay = baseDelay + Math.max(move.fromRow, move.toRow) * 0.15 + 0.25 + mi * 0.1;

                return (
                  <g key={mi}>
                    <motion.path
                      d={pathD}
                      stroke={color}
                      strokeWidth={3}
                      strokeLinecap="round"
                      fill="none"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ delay, duration: 0.4, ease: "easeInOut" }}
                    />
                    <motion.path
                      d={headD}
                      stroke={color}
                      strokeWidth={3}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: delay + 0.35, duration: 0.15 }}
                    />
                  </g>
                );
              })}
            </svg>
          )}

          {rows.map((row, ri) => {
            const cleaned = normalizeColumnDigits(row);
            const showOperator = ri === operatorRow && operatorChar;

            return (
              <div key={ri}>
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
                          <span className="text-base font-semibold text-amber-600 font-[family-name:var(--font-caveat)]">
                            {carry}
                          </span>
                        )}
                      </motion.div>
                    );
                  })}
                </div>

                <motion.div
                  className="flex justify-end items-center"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: baseDelay + ri * 0.15 }}
                >
                  {showOperator && (
                    <div
                      className="flex items-center justify-center shrink-0 text-indigo-600 font-bold"
                      style={{
                        width: cellW,
                        height: cellH,
                        fontFamily: "var(--font-caveat), cursive",
                        fontSize: "28px",
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
                        className="relative flex items-center justify-center text-gray-900"
                        style={{
                          width: cellW,
                          height: cellH,
                          fontFamily: "var(--font-caveat), cursive",
                          fontSize: "28px",
                        }}
                      >
                        {note?.rewrite && (
                          <span
                            className="absolute text-sm font-semibold text-sky-600 font-[family-name:var(--font-caveat)]"
                            style={{ top: 4, right: 6 }}
                          >
                            {note.rewrite}
                          </span>
                        )}
                        <span
                          style={{
                            textDecoration: note?.strike ? "line-through" : undefined,
                            textDecorationColor: note?.strike ? "#ef4444" : undefined,
                            opacity: note?.strike ? 0.5 : 1,
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
          className="mt-4 text-center"
        >
          <span className="text-emerald-600 font-bold font-[family-name:var(--font-caveat)] text-2xl">
            = {answer}
          </span>
        </motion.div>
      )}
    </div>
  );
}
