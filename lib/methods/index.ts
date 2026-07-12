/**
 * Resolve a KS2 maths question to a deterministic method build when possible.
 * `preferred` is tried first, then every other builder — so combined topics
 * like "Addition & Subtraction" still resolve subtraction examples correctly.
 */

import type { MethodBuildResult, MethodBuilderId } from "@/lib/methods/types";
import {
  buildColumnMultiplication,
  parseMultiplicationOperands,
} from "@/lib/methods/column-multiplication";
import {
  buildColumnAddition,
  buildColumnSubtraction,
  parseAdditionOperands,
  parseSubtractionOperands,
} from "@/lib/methods/column-addition";
import {
  buildLongDivision,
  parseDivisionOperands,
} from "@/lib/methods/long-division";
import {
  buildPlaceValueShift,
  parsePlaceValueShift,
} from "@/lib/methods/place-value-shift";

function tryPlaceValueShift(text: string): MethodBuildResult | null {
  const pv = parsePlaceValueShift(text);
  if (!pv) return null;
  try {
    return buildPlaceValueShift(pv.value, pv.factor, pv.operation);
  } catch {
    return null;
  }
}

function tryColumnMultiplication(text: string): MethodBuildResult | null {
  const mult = parseMultiplicationOperands(text);
  if (!mult) return null;
  if ([10, 100, 1000].includes(mult.b) || [10, 100, 1000].includes(mult.a)) {
    return null;
  }
  try {
    return buildColumnMultiplication(mult.a, mult.b);
  } catch {
    return null;
  }
}

function tryColumnAddition(text: string): MethodBuildResult | null {
  const add = parseAdditionOperands(text);
  if (!add) return null;
  try {
    return buildColumnAddition(add.a, add.b);
  } catch {
    return null;
  }
}

function tryColumnSubtraction(text: string): MethodBuildResult | null {
  const sub = parseSubtractionOperands(text);
  if (!sub) return null;
  try {
    return buildColumnSubtraction(sub.a, sub.b);
  } catch {
    return null;
  }
}

function tryLongDivision(text: string): MethodBuildResult | null {
  const div = parseDivisionOperands(text);
  if (!div || [10, 100, 1000].includes(div.b)) return null;
  try {
    return buildLongDivision(div.a, div.b);
  } catch {
    return null;
  }
}

const BUILDERS: Record<MethodBuilderId, (text: string) => MethodBuildResult | null> = {
  place_value_shift: tryPlaceValueShift,
  column_multiplication: tryColumnMultiplication,
  column_addition: tryColumnAddition,
  column_subtraction: tryColumnSubtraction,
  long_division: tryLongDivision,
};

/** Default try order when no preference (place-value before generic ×÷). */
const DEFAULT_ORDER: MethodBuilderId[] = [
  "place_value_shift",
  "column_multiplication",
  "column_addition",
  "column_subtraction",
  "long_division",
];

export function buildMethodForQuestion(
  question: string,
  preferred?: MethodBuilderId | null,
): MethodBuildResult | null {
  const text = question || "";
  const order = preferred
    ? [preferred, ...DEFAULT_ORDER.filter((id) => id !== preferred)]
    : DEFAULT_ORDER;

  for (const id of order) {
    const built = BUILDERS[id](text);
    if (built) return built;
  }
  return null;
}

export {
  buildColumnMultiplication,
  buildColumnAddition,
  buildColumnSubtraction,
  buildLongDivision,
  buildPlaceValueShift,
};
