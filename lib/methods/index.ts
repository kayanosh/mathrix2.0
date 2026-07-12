/**
 * Resolve a maths question to a deterministic method build when possible.
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
import {
  buildPlaceValueChart,
  parsePlaceValueChart,
} from "@/lib/methods/place-value-chart";
import {
  buildRoundingNumberLine,
  parseRoundingQuestion,
} from "@/lib/methods/rounding-number-line";
import {
  buildFractionOps,
  parseFractionOp,
} from "@/lib/methods/fraction-ops";
import {
  buildDecimalColumn,
  parseDecimalOp,
} from "@/lib/methods/decimal-column";
import {
  buildLinearEquation,
  parseLinearEquation,
} from "@/lib/methods/linear-equation";
import {
  buildQuadraticFactorSolve,
  parseQuadraticEquation,
} from "@/lib/methods/quadratic-solve";

function tryQuadraticSolve(text: string): MethodBuildResult | null {
  const parsed = parseQuadraticEquation(text);
  if (!parsed) return null;
  try {
    return buildQuadraticFactorSolve(parsed);
  } catch {
    return null;
  }
}

function tryLinearEquation(text: string): MethodBuildResult | null {
  const parsed = parseLinearEquation(text);
  if (!parsed) return null;
  try {
    return buildLinearEquation(parsed);
  } catch {
    return null;
  }
}

function tryRoundingNumberLine(text: string): MethodBuildResult | null {
  const parsed = parseRoundingQuestion(text);
  if (!parsed) return null;
  try {
    return buildRoundingNumberLine(parsed.value, parsed.place);
  } catch {
    return null;
  }
}

function tryPlaceValueChart(text: string): MethodBuildResult | null {
  const parsed = parsePlaceValueChart(text);
  if (!parsed) return null;
  try {
    return buildPlaceValueChart(parsed.value, parsed.digit);
  } catch {
    return null;
  }
}

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

function tryFractionOps(text: string): MethodBuildResult | null {
  const parsed = parseFractionOp(text);
  if (!parsed) return null;
  try {
    return buildFractionOps(parsed);
  } catch {
    return null;
  }
}

function tryDecimalColumn(text: string): MethodBuildResult | null {
  const parsed = parseDecimalOp(text);
  if (!parsed) return null;
  try {
    return buildDecimalColumn(parsed);
  } catch {
    return null;
  }
}

const BUILDERS: Record<MethodBuilderId, (text: string) => MethodBuildResult | null> = {
  quadratic_solve: tryQuadraticSolve,
  linear_equation: tryLinearEquation,
  rounding_number_line: tryRoundingNumberLine,
  place_value_chart: tryPlaceValueChart,
  place_value_shift: tryPlaceValueShift,
  fraction_ops: tryFractionOps,
  decimal_column: tryDecimalColumn,
  column_multiplication: tryColumnMultiplication,
  column_addition: tryColumnAddition,
  column_subtraction: tryColumnSubtraction,
  long_division: tryLongDivision,
};

/** Default try order — algebra before KS2 arithmetic. */
const DEFAULT_ORDER: MethodBuilderId[] = [
  "quadratic_solve",
  "linear_equation",
  "rounding_number_line",
  "place_value_chart",
  "place_value_shift",
  "fraction_ops",
  "decimal_column",
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
  buildPlaceValueChart,
  buildRoundingNumberLine,
  buildFractionOps,
  buildDecimalColumn,
  buildLinearEquation,
  buildQuadraticFactorSolve,
};
