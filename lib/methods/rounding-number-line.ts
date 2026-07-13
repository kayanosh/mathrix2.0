/**
 * Deterministic rounding builder (whole numbers + decimals).
 * Always emits a place-value table AND a number line (≥6 teaching steps).
 */

import type { NumberLineBlock, TableBlock } from "@/types/whiteboard";
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

/** Parse "Round 3.456 to 2 decimal places" / "nearest hundredth". */
export function parseDecimalRoundingQuestion(
  text: string,
): { value: number; decimalPlaces: number } | null {
  const t = normalizeMathText(text);
  const dp = t.match(
    /round\s+(\d+\.\d+)\s+to\s+(\d+)\s*decimal\s*places?/i,
  );
  if (dp) {
    return {
      value: parseFloat(dp[1]),
      decimalPlaces: parseInt(dp[2], 10),
    };
  }
  const short = t.match(/round\s+(\d+\.\d+)\s+to\s+(\d+)\s*d\.?p\.?/i);
  if (short) {
    return {
      value: parseFloat(short[1]),
      decimalPlaces: parseInt(short[2], 10),
    };
  }
  const named = t.match(
    /round\s+(\d+\.\d+)\s+to\s+the\s+nearest\s+(tenth|hundredth|thousandth)s?/i,
  );
  if (named) {
    const map: Record<string, number> = {
      tenth: 1,
      hundredth: 2,
      thousandth: 3,
    };
    const key = named[2].toLowerCase().replace(/s$/, "");
    return { value: parseFloat(named[1]), decimalPlaces: map[key] };
  }
  return null;
}

function integerPlaceValueTable(
  value: number,
  place: number,
  decideDigit: number,
): TableBlock {
  const allHeaders = [
    "Millions",
    "Hundred Thousands",
    "Ten Thousands",
    "Thousands",
    "Hundreds",
    "Tens",
    "Ones",
  ];
  const minimumColumns = Math.log10(place) + 1;
  const columnCount = Math.max(String(Math.abs(value)).length, minimumColumns);
  const headers = allHeaders.slice(-columnCount);
  const digits = String(Math.abs(value)).padStart(columnCount, "0").split("");
  const targetIndex = columnCount - 1 - Math.log10(place);
  const decidingIndex = Math.min(columnCount - 1, targetIndex + 1);
  return {
    type: "table",
    headers,
    rows: [digits],
    caption: `Place-value chart — deciding digit ${decideDigit}`,
    highlightCells: [[0, decidingIndex]],
  };
}

function decimalPlaceValueTable(
  value: number,
  decimalPlaces: number,
  decideDigit: number,
): TableBlock {
  const fixed = value.toFixed(Math.max(decimalPlaces + 1, 3));
  const [whole, frac = ""] = fixed.split(".");
  const headers = ["Ones", "Tenths", "Hundredths", "Thousandths"];
  const row = [
    whole.slice(-1),
    frac[0] || "0",
    frac[1] || "0",
    frac[2] || "0",
  ];
  const highlightCol = Math.min(decimalPlaces + 1, 3);
  return {
    type: "table",
    headers,
    rows: [row],
    caption: `Place-value chart — deciding digit is ${decideDigit}`,
    highlightCells: [[0, highlightCol]],
  };
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
  const rounded = value >= midpoint ? upper : lower;
  const roundUp = rounded === upper;
  const placeLabel = formatInt(place);
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

  const table = integerPlaceValueTable(value, place, decideDigit);

  const teachingSteps: TeachingStep[] = [
    {
      title: "Read the question",
      explanation: `We are rounding ${formatInt(value)} to the nearest ${placeLabel}.`,
      why: "Naming the target place tells us which digit we are rounding to.",
      narration: `We are rounding ${formatInt(value)} to the nearest ${placeLabel}.`,
      cellKeys: [],
      carryKeys: [],
      noteKeys: [],
    },
    {
      title: "Show the place-value chart",
      explanation: `Write ${formatInt(value)} in the place-value chart so each digit has a column.`,
      narration: `Here is ${formatInt(value)} on the place-value chart.`,
      cellKeys: [],
      carryKeys: [],
      noteKeys: [],
    },
    {
      title: "Find the multiples either side",
      explanation: `${formatInt(value)} sits between ${formatInt(lower)} and ${formatInt(upper)} on the number line.`,
      why: `These are the multiples of ${placeLabel} just below and above our number.`,
      narration: `On the number line, ${formatInt(value)} sits between ${formatInt(lower)} and ${formatInt(upper)}.`,
      cellKeys: [],
      carryKeys: [],
      noteKeys: [],
    },
    {
      title: `Look at the deciding digit`,
      explanation: `The deciding digit is the ${decidePlaceName} digit: ${decideDigit}. Halfway is ${formatInt(midpoint)}.`,
      why: `We look one place to the right of the ${placeLabel}s to decide whether to round up or down.`,
      narration: `The deciding digit is ${decideDigit}.`,
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
    },
    {
      title: "Check the answer",
      explanation: `So ${formatInt(value)} rounded to the nearest ${placeLabel} is ${formatInt(rounded)}.`,
      why: "The answer matches the multiple we chose on the number line.",
      narration: `The rounded answer is ${formatInt(rounded)}.`,
      cellKeys: [],
      carryKeys: [],
      noteKeys: [],
      showAnswer: true,
    },
  ];

  return {
    builderId: "rounding_number_line",
    block,
    extraBlocks: [table],
    teachingSteps,
    captions: teachingSteps.map((s) => s.explanation),
    answer: String(rounded),
    intro: `Round ${formatInt(value)} to the nearest ${placeLabel} using a place-value chart and number line.`,
  };
}

export function buildDecimalRounding(
  value: number,
  decimalPlaces: number,
): MethodBuildResult {
  if (!(decimalPlaces >= 0 && decimalPlaces <= 3)) {
    throw new Error("unsupported decimal places");
  }
  const factor = 10 ** decimalPlaces;
  const scaled = value * factor;
  const lower = Math.floor(scaled) / factor;
  const upper = (Math.floor(scaled) + 1) / factor;
  const midpoint = (lower + upper) / 2;
  const decideDigit = Math.floor(value * 10 ** (decimalPlaces + 1)) % 10;
  const roundUp = decideDigit >= 5;
  const rounded = roundUp ? upper : lower;
  const roundedStr = rounded.toFixed(decimalPlaces);
  const placeName =
    decimalPlaces === 0
      ? "ones"
      : decimalPlaces === 1
        ? "tenths"
        : decimalPlaces === 2
          ? "hundredths"
          : "thousandths";

  const block: NumberLineBlock = {
    type: "number_line",
    range: [lower, upper],
    tickInterval: (upper - lower) / 2,
    markers: [
      { value: lower, label: lower.toFixed(decimalPlaces + 1), style: "open" },
      { value: midpoint, label: "halfway", style: "open" },
      { value, label: String(value), style: "filled" },
      { value: rounded, label: roundedStr, style: "filled" },
    ],
    shading: [
      roundUp
        ? { from: midpoint, to: upper, color: "#34d399" }
        : { from: lower, to: midpoint, color: "#93c5fd" },
    ],
  };

  const table = decimalPlaceValueTable(value, decimalPlaces, decideDigit);

  const teachingSteps: TeachingStep[] = [
    {
      title: "Read the question",
      explanation: `We are rounding ${value} to ${decimalPlaces} decimal place${decimalPlaces === 1 ? "" : "s"} (the ${placeName}).`,
      why: "The target place value tells us how many digits stay after the decimal point.",
      narration: `Round ${value} to ${decimalPlaces} decimal place${decimalPlaces === 1 ? "" : "s"}.`,
      cellKeys: [],
      carryKeys: [],
      noteKeys: [],
    },
    {
      title: "Show the place-value chart",
      explanation: `Write ${value} in the place-value chart: ones, tenths, hundredths, thousandths.`,
      narration: `Here is ${value} on the place-value chart.`,
      cellKeys: [],
      carryKeys: [],
      noteKeys: [],
    },
    {
      title: "Find the neighbours on the number line",
      explanation: `${value} sits between ${lower.toFixed(decimalPlaces + 1)} and ${upper.toFixed(decimalPlaces + 1)}.`,
      why: "These are the two possible rounded values at this place.",
      narration: `On the number line, ${value} is between ${lower.toFixed(decimalPlaces + 1)} and ${upper.toFixed(decimalPlaces + 1)}.`,
      cellKeys: [],
      carryKeys: [],
      noteKeys: [],
    },
    {
      title: "Find the deciding digit",
      explanation: `Look one place to the right of the ${placeName}. The deciding digit is ${decideDigit}.`,
      why: "The digit immediately after the target place decides whether we round up or down.",
      narration: `The deciding digit is ${decideDigit}.`,
      cellKeys: [],
      carryKeys: [],
      noteKeys: [],
    },
    {
      title: roundUp ? "Round up" : "Round down",
      explanation: roundUp
        ? `${decideDigit} is 5 or more, so we round up to ${roundedStr}.`
        : `${decideDigit} is less than 5, so we round down to ${roundedStr}.`,
      why: "5 or more → round up; 4 or less → round down.",
      narration: roundUp
        ? `${decideDigit} is 5 or more, so round up to ${roundedStr}.`
        : `${decideDigit} is less than 5, so round down to ${roundedStr}.`,
      cellKeys: [],
      carryKeys: [],
      noteKeys: [],
    },
    {
      title: "Check decimal places",
      explanation: `The answer ${roundedStr} has exactly ${decimalPlaces} decimal place${decimalPlaces === 1 ? "" : "s"}, matching the question.`,
      why: "Rounding to n decimal places means the answer must show n digits after the point. Do not truncate — use the deciding digit.",
      narration: `Check: ${roundedStr} has ${decimalPlaces} decimal place${decimalPlaces === 1 ? "" : "s"}.`,
      cellKeys: [],
      carryKeys: [],
      noteKeys: [],
      showAnswer: true,
    },
  ];

  return {
    builderId: "rounding_number_line",
    block,
    extraBlocks: [table],
    teachingSteps,
    captions: teachingSteps.map((s) => s.explanation),
    answer: roundedStr,
    intro: `Round ${value} to ${decimalPlaces} decimal place${decimalPlaces === 1 ? "" : "s"} using a place-value chart and number line.`,
  };
}
