/**
 * Deterministic number-line builder for "round N to the nearest place".
 * Produces a line spanning the two multiples either side of N, with
 * markers for the number, the halfway point, and the rounded answer.
 */

import type { NumberLineBlock } from "@/types/whiteboard";
import type { MethodBuildResult, TeachingStep } from "@/lib/methods/types";
import { normalizeMathText } from "@/lib/methods/normalize-math-text";

const PLACE_WORDS: Record<string, number> = {
  "10": 10,
  ten: 10,
  tens: 10,
  "100": 100,
  hundred: 100,
  hundreds: 100,
  "1000": 1000,
  thousand: 1000,
  thousands: 1000,
  "10000": 10000,
  "10,000": 10000,
  "10 000": 10000,
  "ten thousand": 10000,
  "ten thousands": 10000,
  "100000": 100000,
  "100,000": 100000,
  "100 000": 100000,
  "hundred thousand": 100000,
  "hundred thousands": 100000,
  "1000000": 1000000,
  "1,000,000": 1000000,
  million: 1000000,
  millions: 1000000,
};

export function formatInt(n: number): string {
  return Math.round(n).toLocaleString("en-GB");
}

function parsePlaceToken(raw: string): number | null {
  const key = raw.trim().toLowerCase().replace(/\s+/g, " ");
  if (PLACE_WORDS[key] != null) return PLACE_WORDS[key];
  const digits = key.replace(/,/g, "");
  if (/^\d+$/.test(digits)) {
    const n = parseInt(digits, 10);
    if ([10, 100, 1000, 10000, 100000, 1000000].includes(n)) return n;
  }
  return null;
}

/** Parse "Round 57,892 to the nearest 10,000" style prompts. */
export function parseRoundingQuestion(
  text: string,
): { value: number; place: number } | null {
  const normalized = normalizeMathText(text);
  const m = normalized.match(
    /round\s+([\d,]+)\s+to\s+the\s+nearest\s+([\d,]+|ten thousands?|hundred thousands?|thousands?|hundreds?|tens?|millions?)/i,
  );
  if (!m) return null;
  const value = parseInt(m[1].replace(/,/g, ""), 10);
  const place = parsePlaceToken(m[2]);
  if (!Number.isFinite(value) || value < 0 || !place) return null;
  return { value, place };
}

function tickIntervalFor(place: number): number {
  const candidates = [place / 5, place / 4, place / 2, place].filter(
    (t) => t >= 1 && Number.isInteger(t),
  );
  for (const t of candidates) {
    const ticks = place / t + 1;
    if (ticks >= 3 && ticks <= 11) return t;
  }
  return Math.max(1, Math.floor(place / 5) || 1);
}

export function buildRoundingNumberLine(
  value: number,
  place: number,
): MethodBuildResult {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error("rounding requires a non-negative integer");
  }
  if (![10, 100, 1000, 10000, 100000, 1000000].includes(place)) {
    throw new Error("unsupported rounding place");
  }

  const lower = Math.floor(value / place) * place;
  const upper = lower + place;
  const midpoint = lower + place / 2;
  // KS2: digit ≥ 5 rounds up (halfway rounds up).
  const rounded = value >= midpoint ? upper : lower;
  const roundUp = rounded === upper;
  const placeLabel = formatInt(place);

  const block: NumberLineBlock = {
    type: "number_line",
    range: [lower, upper],
    tickInterval: tickIntervalFor(place),
    markers: [
      { value: lower, label: formatInt(lower), style: "open" },
      { value: midpoint, label: "halfway", style: "open" },
      { value, label: formatInt(value), style: "filled" },
      { value: rounded, label: formatInt(rounded), style: "filled" },
    ],
    shading: [
      roundUp
        ? { from: midpoint, to: upper, color: "#34d399" }
        : { from: lower, to: midpoint, color: "#93c5fd" },
    ],
  };

  // Which digit decides? Look one place to the right of the rounding place.
  const decideDigit = Math.floor(value / (place / 10)) % 10;
  const decidePlaceName =
    place === 10
      ? "ones"
      : place === 100
        ? "tens"
        : place === 1000
          ? "hundreds"
          : place === 10000
            ? "thousands"
            : place === 100000
              ? "ten thousands"
              : "hundred thousands";

  const teachingSteps: TeachingStep[] = [
    {
      title: "Find the multiples either side",
      explanation: `${formatInt(value)} sits between ${formatInt(lower)} and ${formatInt(upper)} on the ${placeLabel}s.`,
      why: `These are the multiples of ${placeLabel} just below and above our number.`,
      narration: `Let's round ${formatInt(value)} to the nearest ${placeLabel}. On the number line, it sits between ${formatInt(lower)} and ${formatInt(upper)}.`,
      cellKeys: [],
      carryKeys: [],
      noteKeys: [],
    },
    {
      title: `Look at the ${decidePlaceName} digit`,
      explanation: `The ${decidePlaceName} digit is ${decideDigit}. Halfway is ${formatInt(midpoint)}.`,
      why: `We look one place to the right of the ${placeLabel}s to decide whether to round up or down.`,
      narration: `Look at the ${decidePlaceName} digit — it is ${decideDigit}. The halfway mark is ${formatInt(midpoint)}.`,
      cellKeys: [],
      carryKeys: [],
      noteKeys: [],
    },
    {
      title: roundUp ? "Round up" : "Round down",
      explanation: roundUp
        ? `${decideDigit} is 5 or more, so we round up to ${formatInt(rounded)}.`
        : `${decideDigit} is less than 5, so we round down to ${formatInt(rounded)}.`,
      why: "5 or more → round up; 4 or less → round down.",
      narration: roundUp
        ? `Since ${decideDigit} is 5 or more, round up to ${formatInt(rounded)}.`
        : `Since ${decideDigit} is less than 5, round down to ${formatInt(rounded)}.`,
      cellKeys: [],
      carryKeys: [],
      noteKeys: [],
      showAnswer: true,
    },
  ];

  return {
    builderId: "rounding_number_line",
    block,
    teachingSteps,
    captions: teachingSteps.map((s) => s.explanation),
    answer: String(rounded),
    intro: `Find the multiples of ${placeLabel} either side of ${formatInt(value)}.`,
  };
}
