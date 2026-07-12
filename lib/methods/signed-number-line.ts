/**
 * Signed number line for negative-number questions (difference / order).
 */

import type { NumberLineBlock } from "@/types/whiteboard";
import type { MethodBuildResult, TeachingStep } from "@/lib/methods/types";
import { normalizeMathText } from "@/lib/methods/normalize-math-text";

export function parseSignedNumberLine(
  text: string,
): { a: number; b: number } | null {
  const t = normalizeMathText(text);
  // Coordinates own plot prompts — don't steal negatives from (x,y) pairs.
  if (/\b(coordinate|plot|grid|quadrant|translate|reflect)\b/i.test(t)) {
    return null;
  }
  // Plain column subtraction / arithmetic — leave for column builders.
  if (
    /\d+\s*[−\-]\s*\d+/.test(t) &&
    !/\b(negative|below zero|temperature|count through zero)\b/i.test(t) &&
    !/(?:^|[^\d])-\d+/.test(t)
  ) {
    return null;
  }
  if (
    !/\b(negative|below zero|temperature|difference|count through zero|which is (?:greater|smaller))\b/i.test(
      t,
    ) &&
    !/(?:^|[^\d])-\d+/.test(t)
  ) {
    return null;
  }
  const nums = [...t.matchAll(/(?:^|[^\d])(-?\d+)/g)].map((m) =>
    parseInt(m[1], 10),
  );
  // Also catch leading negative
  const nums2 = [...t.matchAll(/-?\d+/g)].map((m) => parseInt(m[0], 10));
  const values = nums.length >= 2 ? nums : nums2;
  if (values.length < 2) return null;
  // Prefer cases that involve a signed/negative value or explicit negatives topic
  const a = values[0];
  const b = values[1];
  if (a >= 0 && b >= 0 && !/\b(negative|below zero|temperature)\b/i.test(t)) {
    return null;
  }
  return { a, b };
}

export function buildSignedNumberLine(a: number, b: number): MethodBuildResult {
  const lo = Math.min(a, b, 0) - 1;
  const hi = Math.max(a, b, 0) + 1;
  const line: NumberLineBlock = {
    type: "number_line",
    range: [lo, hi],
    tickInterval: 1,
    markers: [
      { value: a, label: String(a), style: "filled" },
      { value: b, label: String(b), style: "filled" },
      { value: 0, label: "0", style: "open" },
    ],
  };
  const diff = Math.abs(a - b);
  const greater = a > b ? a : b;
  const teachingSteps: TeachingStep[] = [
    {
      title: "Mark both numbers",
      explanation: `Place ${a} and ${b} on the number line (0 is the middle reference).`,
      why: "Further right is always greater on a number line.",
      narration: `Let's mark ${a} and ${b} on a number line through zero.`,
      cellKeys: [],
      carryKeys: [],
      noteKeys: [],
    },
    {
      title: "Compare / difference",
      explanation: `${greater} is greater. The difference is ${diff}.`,
      why: "Count the jumps between the two markers.",
      narration: `The difference between ${a} and ${b} is ${diff}.`,
      cellKeys: [],
      carryKeys: [],
      noteKeys: [],
      showAnswer: true,
    },
  ];
  return {
    builderId: "signed_number_line",
    block: line,
    teachingSteps,
    captions: teachingSteps.map((s) => `${s.title}: ${s.explanation}`),
    answer: `difference ${diff}; greater ${greater}`,
    intro: `Use a number line through zero to compare ${a} and ${b}.`,
  };
}
