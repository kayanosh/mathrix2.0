/**
 * Deterministic long-division (bus-stop) builder — simplified for KS2.
 */

import type { ColumnMethodBlock } from "@/types/whiteboard";
import type { MethodBuildResult, TeachingStep } from "@/lib/methods/types";
import { normalizeMathText } from "@/lib/methods/normalize-math-text";

export function buildLongDivision(
  dividend: number,
  divisor: number,
): MethodBuildResult {
  if (
    !Number.isInteger(dividend) ||
    !Number.isInteger(divisor) ||
    dividend < 0 ||
    divisor <= 0
  ) {
    throw new Error("long division requires non-negative dividend and positive divisor");
  }

  const quotient = Math.floor(dividend / divisor);
  const remainder = dividend % divisor;
  const dStr = String(dividend);
  const qStr = String(quotient);

  // Build classic layout rows similar to prompt examples
  const pad = Math.max(dStr.length + String(divisor).length + 1, qStr.length + 2);
  const rows: string[] = [
    qStr.padStart(pad, " "),
    `${divisor})${dStr}`,
  ];

  const teachingSteps: TeachingStep[] = [];
  teachingSteps.push({
    title: "Set up the bus stop",
    explanation: `Write ${dividend} inside the bracket and ${divisor} outside.`,
    why: "The bus-stop layout keeps the quotient on top as we work left to right.",
    narration: `Let's divide ${dividend} ÷ ${divisor} using long division. ${dividend} goes inside; ${divisor} sits outside.`,
    cellKeys: [], // revealed via row timeline for complex layout
    carryKeys: [],
    noteKeys: [],
  });

  // Simple step-through for short dividends
  let remaining = dividend;
  let brought = "";
  const digits = dStr.split("");
  let qBuilt = "";

  for (let i = 0; i < digits.length; i++) {
    brought += digits[i];
    const current = parseInt(brought, 10);
    if (current < divisor && i < digits.length - 1 && qBuilt === "") {
      continue; // take another digit
    }
    const times = Math.floor(current / divisor);
    const take = times * divisor;
    const left = current - take;
    qBuilt += String(times);
    teachingSteps.push({
      title: `Divide ${current}`,
      explanation: `${divisor} goes into ${current} exactly ${times} time${times === 1 ? "" : "s"}. ${times} × ${divisor} = ${take}. Subtract to leave ${left}.`,
      why: "We find how many groups of the divisor fit, write that digit on top, then subtract.",
      narration: `How many times does ${divisor} go into ${current}? ${times}. Write ${times} on top. ${times} times ${divisor} is ${take}. Subtract: ${left} left.`,
      cellKeys: [],
      carryKeys: [],
      noteKeys: [],
    });
    brought = left === 0 ? "" : String(left);
    remaining = left;
  }

  teachingSteps.push({
    title: "Answer",
    explanation:
      remainder === 0
        ? `So ${dividend} ÷ ${divisor} = ${quotient}.`
        : `So ${dividend} ÷ ${divisor} = ${quotient} remainder ${remainder}.`,
    narration:
      remainder === 0
        ? `The digits on top give the answer: ${dividend} ÷ ${divisor} equals ${quotient}.`
        : `The answer is ${quotient} remainder ${remainder}.`,
    cellKeys: [],
    carryKeys: [],
    noteKeys: [],
    showAnswer: true,
  });

  // Minimal working rows for display
  if (quotient > 0) {
    rows.push(String(divisor * Number(qStr[0] || 0)).padStart(pad, " "));
  }

  const block: ColumnMethodBlock = {
    type: "column_method",
    method: "long_division",
    rows,
    separatorAfterRows: [0],
    question: `${dividend} ÷ ${divisor}`,
    answer: remainder === 0 ? String(quotient) : `${quotient} r ${remainder}`,
  };

  return {
    builderId: "long_division",
    block,
    teachingSteps,
    captions: teachingSteps.map((s) => s.explanation),
  };
}

export function parseDivisionOperands(
  text: string,
): { a: number; b: number } | null {
  const m = normalizeMathText(text).match(
    /(\d{1,6})\s*(?:[÷/]|divided\s+by\b)\s*(\d{1,6})/i,
  );
  if (!m) return null;
  const a = parseInt(m[1], 10);
  const b = parseInt(m[2], 10);
  if (b === 0) return null;
  return { a, b };
}
