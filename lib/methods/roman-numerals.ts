/** Deterministic, child-friendly Roman numeral teaching for KS2. */

import type { TableBlock } from "@/types/whiteboard";
import type { MethodBuildResult, TeachingStep } from "@/lib/methods/types";
import { normalizeMathText } from "@/lib/methods/normalize-math-text";

const ROMAN_VALUES: ReadonlyArray<readonly [number, string]> = [
  [1000, "M"],
  [900, "CM"],
  [500, "D"],
  [400, "CD"],
  [100, "C"],
  [90, "XC"],
  [50, "L"],
  [40, "XL"],
  [10, "X"],
  [9, "IX"],
  [5, "V"],
  [4, "IV"],
  [1, "I"],
];

export function numberToRoman(value: number): string {
  if (!Number.isInteger(value) || value < 1 || value > 3999) {
    throw new RangeError("Roman numeral value must be a whole number from 1 to 3999");
  }
  let remaining = value;
  let result = "";
  for (const [amount, numeral] of ROMAN_VALUES) {
    while (remaining >= amount) {
      result += numeral;
      remaining -= amount;
    }
  }
  return result;
}

export function romanToNumber(numeral: string): number {
  const clean = numeral.toUpperCase().replace(/[^MDCLXVI]/g, "");
  if (!clean) throw new RangeError("Roman numeral is empty");
  const values: Record<string, number> = {
    M: 1000,
    D: 500,
    C: 100,
    L: 50,
    X: 10,
    V: 5,
    I: 1,
  };
  let total = 0;
  for (let index = 0; index < clean.length; index += 1) {
    const current = values[clean[index]];
    const next = values[clean[index + 1]] || 0;
    total += current < next ? -current : current;
  }
  if (total < 1 || total > 3999 || numberToRoman(total) !== clean) {
    throw new RangeError("Roman numeral is not in standard form");
  }
  return total;
}

export function parseRomanNumeralQuestion(text: string): number | null {
  const normalised = normalizeMathText(text).replace(/,/g, "");
  if (!/\broman\s+numerals?\b/i.test(normalised)) return null;

  const patterns = [
    /(?:write|show|convert)(?:\s+the\s+number)?\s+(\d+)\s+(?:as|in|into)\s+roman\s+numerals?/i,
    /roman\s+numeral\s+(?:for|of)\s+(\d+)/i,
    /(?:what is|find)\s+(\d+)\s+in\s+roman\s+numerals?/i,
  ];
  for (const pattern of patterns) {
    const match = normalised.match(pattern);
    if (!match) continue;
    const value = Number(match[1]);
    if (Number.isInteger(value) && value >= 1 && value <= 3999) return value;
  }
  return null;
}

export function parseRomanToNumberQuestion(
  text: string,
): { numeral: string; value: number } | null {
  const normalised = normalizeMathText(text);
  if (!/\b(?:roman\s+numeral|number)\b/i.test(normalised)) return null;
  const patterns = [
    /(?:convert|write)\s+\$?([MDCLXVI]+)\$?\s+(?:as|in|into)\s+(?:an?\s+)?(?:ordinary\s+)?number/i,
    /what\s+(?:number|value)\s+is\s+\$?([MDCLXVI]+)\$?/i,
    /(?:value|number)\s+of\s+(?:the\s+roman\s+numeral\s+)?\$?([MDCLXVI]+)\$?/i,
  ];
  for (const pattern of patterns) {
    const match = normalised.match(pattern);
    if (!match) continue;
    try {
      const numeral = match[1].toUpperCase();
      return { numeral, value: romanToNumber(numeral) };
    } catch {
      return null;
    }
  }
  return null;
}

function splitByPlace(value: number): Array<{ name: string; value: number; roman: string }> {
  const places = [
    { name: "Thousands", divisor: 1000 },
    { name: "Hundreds", divisor: 100 },
    { name: "Tens", divisor: 10 },
    { name: "Ones", divisor: 1 },
  ];
  return places.flatMap(({ name, divisor }) => {
    const part = Math.floor(value / divisor) % 10 * divisor;
    return part > 0 ? [{ name, value: part, roman: numberToRoman(part) }] : [];
  });
}

export function buildRomanNumerals(value: number): MethodBuildResult {
  const answer = numberToRoman(value);
  const parts = splitByPlace(value);
  const partFor = (name: string) => parts.find((part) => part.name === name);
  const explainPart = (name: string) => {
    const part = partFor(name);
    return part
      ? `${part.value} is ${part.roman} in Roman numerals.`
      : `There are no ${name.toLowerCase()} to add, so we move on.`;
  };

  const table: TableBlock = {
    type: "table",
    headers: ["Place-value part", "Number", "Roman numeral"],
    rows: parts.map((part) => [part.name, String(part.value), part.roman]),
    caption: `${value} split into place-value parts: ${parts.map((part) => part.value).join(" + ")}`,
    highlightCells: parts.map((_, index) => [index, 2] as [number, number]),
  };

  const emptyKeys = { cellKeys: [], carryKeys: [], noteKeys: [] };
  const teachingSteps: TeachingStep[] = [
    {
      title: "Split the number",
      explanation: `Split ${value} by place value: ${parts.map((part) => part.value).join(" + ")}.`,
      why: "Smaller place-value parts are easier to match to Roman numeral symbols.",
      narration: `First, split ${value} into its place-value parts.`,
      ...emptyKeys,
    },
    {
      title: "Convert the hundreds",
      explanation: explainPart("Hundreds"),
      why: "C means 100 and D means 500. A smaller symbol before a larger one means subtract, so CD is 400.",
      narration: explainPart("Hundreds"),
      ...emptyKeys,
    },
    {
      title: "Convert the tens",
      explanation: explainPart("Tens"),
      why: "X means 10 and L means 50. XL is 40 and XC is 90 because the X comes first and is subtracted.",
      narration: explainPart("Tens"),
      ...emptyKeys,
    },
    {
      title: "Convert the ones",
      explanation: explainPart("Ones"),
      why: "I means 1 and V means 5. IV is 4 and IX is 9 because the I comes first and is subtracted.",
      narration: explainPart("Ones"),
      ...emptyKeys,
    },
    {
      title: "Join the parts",
      explanation: `Keep the parts in order from largest to smallest: ${parts.map((part) => part.roman).join(" + ")} becomes ${answer}.`,
      why: "Roman numerals are read from the largest place-value part on the left to the smallest on the right.",
      narration: `Now join the Roman numeral parts to make ${answer}.`,
      ...emptyKeys,
    },
    {
      title: "Check the value",
      explanation: `${parts.map((part) => `${part.roman} = ${part.value}`).join(", ")}. Together they total ${value}, so the answer is ${answer}.`,
      why: "Changing each Roman part back into a number checks that no value was missed.",
      narration: `Check each part. They total ${value}, so ${value} in Roman numerals is ${answer}.`,
      showAnswer: true,
      ...emptyKeys,
    },
  ];

  return {
    builderId: "roman_numerals",
    block: table,
    teachingSteps,
    captions: teachingSteps.map((step) => `${step.title}: ${step.explanation}`),
    answer,
    intro: `Roman numerals use letters as number symbols. Let's turn ${value} into Roman numerals one place-value part at a time.`,
  };
}

export function buildRomanNumeralToNumber(numeral: string): MethodBuildResult {
  const value = romanToNumber(numeral);
  const canonical = numeral.toUpperCase();
  // Scan in written order so the visual follows the pupil's eyes left to right.
  const ordered: Array<{ symbol: string; amount: number }> = [];
  for (let index = 0; index < canonical.length;) {
    const pair = canonical.slice(index, index + 2);
    const pairValue = ROMAN_VALUES.find(([, symbol]) => symbol === pair);
    if (pairValue) {
      ordered.push({ symbol: pair, amount: pairValue[0] });
      index += 2;
    } else {
      const single = ROMAN_VALUES.find(([, symbol]) => symbol === canonical[index]);
      if (!single) throw new RangeError("Unknown Roman numeral symbol");
      ordered.push({ symbol: canonical[index], amount: single[0] });
      index += 1;
    }
  }
  const table: TableBlock = {
    type: "table",
    headers: ["Roman part", "Value"],
    rows: ordered.map((group) => [group.symbol, String(group.amount)]),
    caption: `Read ${canonical} from left to right`,
    highlightCells: ordered.map((_, index) => [index, 0] as [number, number]),
  };
  const expression = ordered.map((group) => group.amount).join(" + ");
  const subtractive = ordered.filter((group) => group.symbol.length === 2);
  const emptyKeys = { cellKeys: [], carryKeys: [], noteKeys: [] };
  const steps: TeachingStep[] = [
    {
      title: "Read left to right",
      explanation: `Separate ${canonical} into useful parts: ${ordered.map((group) => group.symbol).join(" | ")}.`,
      why: "Reading in order helps us notice any smaller symbol placed before a larger one.",
      narration: `Let's read ${canonical} from left to right.`,
      ...emptyKeys,
    },
    {
      title: "Spot subtraction pairs",
      explanation: subtractive.length
        ? `${subtractive.map((group) => group.symbol).join(" and ")} ${subtractive.length === 1 ? "is a subtraction pair" : "are subtraction pairs"}.`
        : "There are no subtraction pairs in this numeral.",
      why: "A smaller symbol immediately before a larger symbol is subtracted, such as IV = 5 − 1 = 4.",
      narration: "Now look for a smaller symbol immediately before a larger one.",
      ...emptyKeys,
    },
    {
      title: "Find each value",
      explanation: ordered.map((group) => `${group.symbol} = ${group.amount}`).join(", ") + ".",
      why: "Each single symbol or subtraction pair has one number value.",
      narration: "Use the table to find the value of every part.",
      ...emptyKeys,
    },
    {
      title: "Write an addition",
      explanation: `${canonical} becomes ${expression}.`,
      why: "Once subtraction pairs have been valued, the remaining parts are arranged from largest to smallest and can be added.",
      narration: `Write the values as ${expression}.`,
      ...emptyKeys,
    },
    {
      title: "Add the parts",
      explanation: `${expression} = ${value}.`,
      why: "Adding all the place-value parts gives the value of the whole Roman numeral.",
      narration: `Add the parts to get ${value}.`,
      ...emptyKeys,
    },
    {
      title: "Check and answer",
      explanation: `${value} written back in Roman numerals is ${canonical}, so ${canonical} = ${value}.`,
      why: "Converting back checks that the symbols and subtraction pairs were read correctly.",
      narration: `The answer is ${value}.`,
      showAnswer: true,
      ...emptyKeys,
    },
  ];
  return {
    builderId: "roman_numerals",
    block: table,
    teachingSteps: steps,
    captions: steps.map((step) => `${step.title}: ${step.explanation}`),
    answer: String(value),
    intro: `Roman numeral symbols can be changed back into ordinary numbers. Let's decode ${canonical} carefully.`,
  };
}
