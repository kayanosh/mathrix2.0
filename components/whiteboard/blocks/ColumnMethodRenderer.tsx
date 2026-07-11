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
import {
  buildColumnRevealTimeline,
  cellKey,
  revealStateAt,
  withResultRow,
} from "@/lib/column-reveal";
import { CELL_WRITE_MS } from "@/lib/handwriting";

interface Props {
  block: ColumnMethodBlock;
  baseDelay: number;
  /**
   * Index of the last revealed teaching step (from buildColumnRevealTimeline).
   * undefined = show the whole working at once (chat/card mode).
   */
  revealStep?: number;
}

const CARRY_COLOR = "#f59e0b";
const BORROW_COLOR = "#0ea5e9";

function noteKey(n: ColumnMethodCellNote): string {
  return `${n.row}-${n.col}`;
}

export default function ColumnMethodRenderer({ block: rawBlock, baseDelay, revealStep }: Props) {
  // Synthesize the result row for add/sub so answer digits are written into
  // the grid column by column, like a teacher would.
  const block = useMemo(() => withResultRow(rawBlock), [rawBlock]);
  const { rows, carries, moves, cellNotes, separatorAfterRows, question, answer, method } = block;
  const separators = new Set(separatorAfterRows || []);

  const maxCols = Math.max(...rows.map((r) => normalizeColumnDigits(r).length), 1);
  const cellW = DEFAULT_CELL_W;
  const cellH = DEFAULT_CELL_H;
  const carryH = DEFAULT_CARRY_H;

  const stepMode = revealStep !== undefined;
  const timeline = useMemo(
    () => (stepMode ? buildColumnRevealTimeline(rawBlock) : []),
    [stepMode, rawBlock],
  );
  const reveal = useMemo(
    () => (stepMode ? revealStateAt(timeline, revealStep ?? 0) : null),
    [stepMode, timeline, revealStep],
  );

  // Pen order within the active step — each newly written element waits for
  // the previous one, so digits appear one at a time like real handwriting.
  const writeOrder = useMemo(() => {
    const map = new Map<string, number>();
    if (!stepMode || timeline.length === 0) return map;
    const step = timeline[Math.min(revealStep ?? 0, timeline.length - 1)];
    let i = 0;
    // Borrow strikes/rewrites happen first, then digits, then carries.
    step.noteKeys.forEach((k) => { if (!map.has(k)) map.set(k, i++); });
    step.cellKeys.forEach((k) => { if (!map.has(k)) map.set(k, i++); });
    step.carryKeys.forEach((k) => { if (!map.has(k)) map.set(k, i++); });
    return map;
  }, [stepMode, timeline, revealStep]);

  /** Seconds to wait before drawing a just-written element (pen order). */
  const writeDelay = (ri: number, ci: number) =>
    (writeOrder.get(cellKey(ri, ci)) ?? 0) * (CELL_WRITE_MS / 1000);

  const cellVisible = (ri: number, ci: number) =>
    !reveal || reveal.cells.has(cellKey(ri, ci));
  const cellActive = (ri: number, ci: number) =>
    !!reveal && reveal.active.has(cellKey(ri, ci));
  const carryVisible = (ri: number, ci: number) =>
    !reveal || reveal.carries.has(cellKey(ri, ci));
  const noteApplied = (ri: number, ci: number) =>
    !reveal || reveal.notes.has(cellKey(ri, ci));
  const answerVisible = !reveal || reveal.showAnswer;

  /** A separator is drawn once every digit of the row above it is written. */
  const separatorVisible = (ri: number) => {
    if (!reveal) return true;
    const cleaned = normalizeColumnDigits(rows[ri] || "");
    if (!cleaned) return true;
    for (let ci = 0; ci < maxCols; ci++) {
      const idx = ci - (maxCols - cleaned.length);
      if (idx >= 0 && idx < cleaned.length && !reveal.cells.has(cellKey(ri, ci))) {
        return false;
      }
    }
    return true;
  };

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

  const highlightSet = useMemo(() => {
    const set = new Set<string>();
    block.highlightCells?.forEach((h) => set.add(`${h.row}-${h.col}`));
    return set;
  }, [block.highlightCells]);

  const resolvedMoves = useMemo(() => {
    const raw = moves?.length ? moves : inferCarryMoves(method, carries, maxCols);
    return movesWithLanes(raw);
  }, [moves, method, carries, maxCols]);

  /** An arrow appears once its destination (carry slot or borrow note) is written. */
  const moveVisible = (move: { toRow: number; toCol: number; kind?: string }) => {
    if (!reveal) return true;
    const key = cellKey(move.toRow, move.toCol);
    return (move.kind ?? "carry") === "carry"
      ? reveal.carries.has(key)
      : reveal.notes.has(key) || reveal.cells.has(key);
  };

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
                if (!moveVisible(move)) return null;
                const kind = move.kind ?? "carry";
                const from = cellCenter(move.fromRow, move.fromCol, maxCols, cellW, cellH, carryH);
                const to =
                  kind === "carry"
                    ? carrySlotCenter(move.toRow, move.toCol, cellW, cellH, carryH)
                    : cellCenter(move.toRow, move.toCol, maxCols, cellW, cellH, carryH);
                const color = kind === "borrow" ? BORROW_COLOR : CARRY_COLOR;
                const pathD = buildArrowPath(from.x, from.y, to.x, to.y, kind, move.laneIndex);
                const headD = arrowheadPoints(from.x, from.y, to.x, to.y);
                // In step mode the arrow follows the pen: it draws right after
                // its destination digit/carry is written.
                const delay = stepMode
                  ? reveal?.active.has(cellKey(move.toRow, move.toCol))
                    ? writeDelay(move.toRow, move.toCol) + 0.15
                    : 0.1
                  : baseDelay + Math.max(move.fromRow, move.toRow) * 0.15 + 0.25 + mi * 0.1;

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
            const operatorVisible = !reveal || cellVisible(ri, maxCols - cleaned.length);

            return (
              <div key={ri}>
                <div className="flex justify-end items-end" style={{ height: carryH, marginRight: 2 }}>
                  {Array.from({ length: maxCols }, (_, ci) => {
                    const carry = carryMap.get(`${ri}-${ci}`);
                    const visible = !!carry && carryVisible(ri, ci);
                    const active = visible && cellActive(ri, ci);
                    return (
                      <motion.div
                        key={`carry-${ri}-${ci}`}
                        className="flex items-center justify-center"
                        style={{ width: cellW }}
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: visible ? 1 : 0, y: 0 }}
                        transition={{
                          delay: stepMode
                            ? active
                              ? writeDelay(ri, ci)
                              : 0
                            : baseDelay + ri * 0.15 + 0.1,
                        }}
                      >
                        {carry && (
                          <motion.span
                            className="text-base font-semibold text-amber-600 font-[family-name:var(--font-caveat)] rounded px-0.5"
                            animate={{
                              backgroundColor: active ? "rgba(251, 191, 36, 0.35)" : "rgba(251, 191, 36, 0)",
                            }}
                            transition={{ duration: 0.3 }}
                          >
                            {carry}
                          </motion.span>
                        )}
                      </motion.div>
                    );
                  })}
                </div>

                <motion.div
                  className="flex justify-end items-center"
                  initial={{ opacity: 0, x: stepMode ? 0 : -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: stepMode ? 0 : baseDelay + ri * 0.15 }}
                >
                  {showOperator && (
                    <motion.div
                      className="flex items-center justify-center shrink-0 text-indigo-600 font-bold"
                      style={{
                        width: cellW,
                        height: cellH,
                        fontFamily: "var(--font-caveat), cursive",
                        fontSize: "28px",
                      }}
                      animate={{ opacity: operatorVisible ? 1 : 0 }}
                    >
                      {operatorChar}
                    </motion.div>
                  )}

                  {Array.from({ length: maxCols }, (_, ci) => {
                    const charIdx = ci - (maxCols - cleaned.length);
                    const char = charIdx >= 0 ? cleaned[charIdx] : "";
                    const note = noteMap.get(`${ri}-${ci}`);
                    const applyNote = !!note && noteApplied(ri, ci);
                    const visible = char === "" || cellVisible(ri, ci);
                    const active = char !== "" && cellActive(ri, ci);
                    const highlighted = highlightSet.has(`${ri}-${ci}`);

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
                        {highlighted && (
                          <motion.span
                            className="absolute inset-0.5 rounded-md border-2 border-amber-400 bg-amber-100/40"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: visible ? 1 : 0, scale: 1 }}
                            transition={{ delay: 0.2 }}
                          />
                        )}
                        {applyNote && note?.rewrite && (
                          <motion.span
                            className="absolute text-sm font-semibold text-sky-600 font-[family-name:var(--font-caveat)]"
                            style={{ top: 4, right: 6 }}
                            initial={{ opacity: 0, scale: 0.6 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{
                              duration: 0.25,
                              delay: active ? writeDelay(ri, ci) : 0,
                            }}
                          >
                            {note.rewrite}
                          </motion.span>
                        )}
                        <motion.span
                          className="relative rounded px-0.5"
                          initial={stepMode ? { opacity: 0, scale: 0.6 } : false}
                          animate={{
                            opacity: !visible ? 0 : applyNote && note?.strike ? 0.5 : 1,
                            scale: 1,
                            backgroundColor: active
                              ? "rgba(251, 191, 36, 0.35)"
                              : "rgba(251, 191, 36, 0)",
                          }}
                          transition={{
                            duration: 0.3,
                            delay: active ? writeDelay(ri, ci) : 0,
                          }}
                          style={{
                            textDecoration: applyNote && note?.strike ? "line-through" : undefined,
                            textDecorationColor: applyNote && note?.strike ? "#ef4444" : undefined,
                          }}
                        >
                          {char}
                        </motion.span>
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
                    animate={{ scaleX: separatorVisible(ri) ? 1 : 0 }}
                    transition={{
                      delay: stepMode ? 0.1 : baseDelay + ri * 0.15 + 0.1,
                      duration: 0.3,
                    }}
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
          animate={{ opacity: answerVisible ? 1 : 0, y: answerVisible ? 0 : 4 }}
          transition={{
            delay: stepMode ? 0.15 : baseDelay + rows.length * 0.15 + 0.2,
          }}
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
