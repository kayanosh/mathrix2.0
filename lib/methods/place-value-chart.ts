/**
 * Place-value digit chart for "what is the value of the digit…" /
 * "show N in a place-value grid" questions.
 */

import type { TableBlock } from "@/types/whiteboard";
import type { MethodBuildResult, TeachingStep } from "@/lib/methods/types";
import { normalizeMathText } from "@/lib/methods/normalize-math-text";
import { formatInt } from "@/lib/methods/rounding-number-line";

const HEADERS = [
  "Hundred Thousands",
  "Ten Thousands",
  "Thousands",
  "Hundreds",
  "Tens",
  "Ones",
] as const;

const PLACE_VALUES = [100000, 10000, 1000, 100, 10, 1] as const;
const PLACE_NAMES = [
  "hundred thousands",
  "ten thousands",
  "thousands",
  "hundreds",
  "tens",
  "ones",
] as const;

function digitsInPlaces(n: number, width = 6): string[] {
  const s = String(Math.abs(n)).padStart(width, " ").slice(-width);
  return s.split("").map((ch) => (ch === " " ? "" : ch));
}

export function parsePlaceValueChart(
  text: string,
): { value: number; digit?: number } | null {
  const normalized = normalizeMathText(text);

  const valueOf = normalized.match(
    /(?:what\s+is\s+)?(?:the\s+)?value\s+of\s+(?:the\s+)?(\d)\s+in\s+([\d,]+)/i,
  );
  if (valueOf) {
    return {
      digit: parseInt(valueOf[1], 10),
      value: parseInt(valueOf[2].replace(/,/g, ""), 10),
    };
  }

  const chart = normalized.match(
    /(?:place[- ]value\s+chart|place[- ]value\s+grid|write|show|represent).*?([\d,]{2,})|([\d,]{2,}).*?(?:place[- ]value\s+chart|place[- ]value\s+grid)/i,
  );
  if (chart) {
    const raw = chart[1] || chart[2];
    const value = parseInt(raw.replace(/,/g, ""), 10);
    if (Number.isFinite(value) && value >= 0 && value <= 999999) {
      return { value };
    }
  }

  // Topic-only prompts with a lone large number + "place value of each digit"
  const lone = normalized.match(
    /\bplace value of each digit\b.*?([\d,]{3,})|\b([\d,]{3,})\b.*?\bplace value of each digit\b/i,
  );
  if (lone) {
    const raw = lone[1] || lone[2];
    const value = parseInt(raw.replace(/,/g, ""), 10);
    if (Number.isFinite(value) && value >= 0 && value <= 999999) {
      return { value };
    }
  }

  return null;
}

export function buildPlaceValueChart(
  value: number,
  digit?: number,
): MethodBuildResult {
  if (!Number.isInteger(value) || value < 0 || value > 999999) {
    throw new Error("place-value chart supports 0…999,999");
  }

  const row = digitsInPlaces(value);
  const highlightCells: [number, number][] = [];
  let focusCol = -1;
  let placeValue = 0;
  let placeName = "";

  if (digit != null) {
    // Prefer the leftmost matching digit when the digit repeats.
    for (let ci = 0; ci < row.length; ci++) {
      if (row[ci] === String(digit)) {
        focusCol = ci;
        break;
      }
    }
    if (focusCol < 0) {
      throw new Error(`digit ${digit} not found in ${value}`);
    }
    placeValue = digit * PLACE_VALUES[focusCol];
    placeName = PLACE_NAMES[focusCol];
    highlightCells.push([0, focusCol]);
  } else {
    row.forEach((d, ci) => {
      if (d) highlightCells.push([0, ci]);
    });
  }

  const block: TableBlock = {
    type: "table",
    headers: [...HEADERS],
    rows: [row],
    caption:
      digit != null
        ? `The ${digit} in ${formatInt(value)} is in the ${placeName}`
        : `Place-value chart for ${formatInt(value)}`,
    highlightCells,
  };

  const teachingSteps: TeachingStep[] =
    digit != null
      ? [
          {
            title: "Place the digits",
            explanation: `Write ${formatInt(value)} into the place-value columns.`,
            why: "Each column is worth ten times the column on its right.",
            narration: `Let's put ${formatInt(value)} into a place-value chart.`,
            cellKeys: [],
            carryKeys: [],
            noteKeys: [],
          },
          {
            title: `Find the ${digit}`,
            explanation: `The digit ${digit} is in the ${placeName} column.`,
            why: `That column is worth ${formatInt(PLACE_VALUES[focusCol])} each.`,
            narration: `The ${digit} sits in the ${placeName}.`,
            cellKeys: [],
            carryKeys: [],
            noteKeys: [],
          },
          {
            title: "State its value",
            explanation: `So the ${digit} is worth ${formatInt(placeValue)}.`,
            why: `${digit} × ${formatInt(PLACE_VALUES[focusCol])} = ${formatInt(placeValue)}.`,
            narration: `Its value is ${formatInt(placeValue)}.`,
            cellKeys: [],
            carryKeys: [],
            noteKeys: [],
            showAnswer: true,
          },
        ]
      : [
          {
            title: "Place the digits",
            explanation: `Write each digit of ${formatInt(value)} in its column.`,
            why: "Reading the columns left to right rebuilds the number.",
            narration: `Here is ${formatInt(value)} in a place-value chart.`,
            cellKeys: [],
            carryKeys: [],
            noteKeys: [],
            showAnswer: true,
          },
        ];

  return {
    builderId: "place_value_chart",
    block,
    teachingSteps,
    captions: teachingSteps.map((s) => s.explanation),
    answer: digit != null ? String(placeValue) : formatInt(value),
    intro:
      digit != null
        ? `What is the value of the ${digit} in ${formatInt(value)}?`
        : `Let's show ${formatInt(value)} in a place-value chart.`,
  };
}
