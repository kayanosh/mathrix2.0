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
  buildRomanNumeralToNumber,
  buildRomanNumerals,
  parseRomanNumeralQuestion,
  parseRomanToNumberQuestion,
} from "@/lib/methods/roman-numerals";
import {
  buildRoundingNumberLine,
  parseRoundingQuestion,
  parseDecimalRoundingQuestion,
  buildDecimalRounding,
} from "@/lib/methods/rounding-number-line";
import {
  buildFractionOps,
  parseFractionOp,
} from "@/lib/methods/fraction-ops";
import {
  buildFractionNumberLine,
  parseFractionCompare,
  parseFractionCompareGoal,
} from "@/lib/methods/fraction-number-line";
import {
  buildFractionSimplify,
  parseFractionSimplify,
} from "@/lib/methods/fraction-simplify";
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
import {
  buildFdpEquivalence,
  parseFdpEquivalence,
} from "@/lib/methods/fdp-equivalence";
import {
  buildMultiplesFactors,
  parseMultiplesQuestion,
} from "@/lib/methods/multiples-factors";
import {
  buildSignedNumberLine,
  parseSignedNumberLine,
} from "@/lib/methods/signed-number-line";
import {
  buildCuboidVolume,
  buildRectPerimeterArea,
  parseRectMeasure,
} from "@/lib/methods/measurement-builders";
import {
  buildAngleDiagram,
  buildBarChart,
  buildCoordinatePlot,
  buildCoordinateProblem,
  buildFunctionMachine,
  buildRatioTable,
  buildUnitConversion,
  parseAngleProblem,
  parseBarChart,
  parseCoordinatePlot,
  parseCoordinateProblem,
  parseFunctionMachine,
  parseRatio,
  parseUnitConversion,
} from "@/lib/methods/ks2-topic-builders";
import {
  buildOrderOperations,
  parseOrderOperationsQuestion,
} from "@/lib/methods/order-of-operations";

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
  if (/\b(coordinate|point|quadrant|translate|translated|translation|reflect|reflection|mirror line)\b/i.test(text)) {
    return null;
  }
  const parsed = parseLinearEquation(text);
  if (!parsed) return null;
  try {
    return buildLinearEquation(parsed);
  } catch {
    return null;
  }
}

function tryRoundingNumberLine(text: string): MethodBuildResult | null {
  const dec = parseDecimalRoundingQuestion(text);
  if (dec) {
    try {
      return buildDecimalRounding(dec.value, dec.decimalPlaces);
    } catch {
      /* fall through */
    }
  }
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

function tryRomanNumerals(text: string): MethodBuildResult | null {
  const value = parseRomanNumeralQuestion(text);
  try {
    if (value != null) return buildRomanNumerals(value);
    const inverse = parseRomanToNumberQuestion(text);
    return inverse ? buildRomanNumeralToNumber(inverse.numeral) : null;
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

function tryFractionSimplify(text: string): MethodBuildResult | null {
  const parsed = parseFractionSimplify(text);
  if (!parsed) return null;
  try {
    return buildFractionSimplify(parsed.n, parsed.d);
  } catch {
    return null;
  }
}

function tryFractionNumberLine(text: string): MethodBuildResult | null {
  const parsed = parseFractionCompare(text);
  if (!parsed) return null;
  try {
    return buildFractionNumberLine(parsed, parseFractionCompareGoal(text));
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

function tryFdpEquivalence(text: string): MethodBuildResult | null {
  const parsed = parseFdpEquivalence(text);
  if (!parsed) return null;
  try {
    return buildFdpEquivalence(parsed);
  } catch {
    return null;
  }
}

function tryMultiplesNumberLine(text: string): MethodBuildResult | null {
  const parsed = parseMultiplesQuestion(text);
  if (!parsed) return null;
  try {
    return buildMultiplesFactors(parsed);
  } catch {
    return null;
  }
}

function trySignedNumberLine(text: string): MethodBuildResult | null {
  const parsed = parseSignedNumberLine(text);
  if (!parsed) return null;
  try {
    return buildSignedNumberLine(parsed.a, parsed.b);
  } catch {
    return null;
  }
}

function tryRectPerimeterArea(text: string): MethodBuildResult | null {
  const parsed = parseRectMeasure(text);
  if (!parsed || parsed.kind === "volume") return null;
  try {
    return buildRectPerimeterArea(parsed.kind, parsed.length, parsed.width);
  } catch {
    return null;
  }
}

function tryCuboidVolume(text: string): MethodBuildResult | null {
  const parsed = parseRectMeasure(text);
  if (!parsed || parsed.kind !== "volume") return null;
  try {
    return buildCuboidVolume(parsed.l, parsed.w, parsed.h);
  } catch {
    return null;
  }
}

function tryAngleDiagram(text: string): MethodBuildResult | null {
  const parsed = parseAngleProblem(text);
  if (!parsed) return null;
  try {
    return buildAngleDiagram(parsed.known, parsed.total, parsed.kind);
  } catch {
    return null;
  }
}

function tryCoordinatePlot(text: string): MethodBuildResult | null {
  const problem = parseCoordinateProblem(text);
  if (problem) {
    try {
      return buildCoordinateProblem(problem);
    } catch {
      return null;
    }
  }
  const parsed = parseCoordinatePlot(text);
  if (!parsed) return null;
  try {
    return buildCoordinatePlot(parsed.points);
  } catch {
    return null;
  }
}

function tryBarChartStats(text: string): MethodBuildResult | null {
  const parsed = parseBarChart(text);
  if (!parsed) return null;
  try {
    return buildBarChart(parsed.bars);
  } catch {
    return null;
  }
}

function tryUnitConversion(text: string): MethodBuildResult | null {
  const parsed = parseUnitConversion(text);
  if (!parsed) return null;
  try {
    return buildUnitConversion(parsed.value, parsed.from, parsed.to, parsed.factor);
  } catch {
    return null;
  }
}

function tryRatioTable(text: string): MethodBuildResult | null {
  const parsed = parseRatio(text);
  if (!parsed) return null;
  try {
    return buildRatioTable(parsed.parts, parsed.total);
  } catch {
    return null;
  }
}

function tryFunctionMachine(text: string): MethodBuildResult | null {
  const parsed = parseFunctionMachine(text);
  if (!parsed) return null;
  try {
    return buildFunctionMachine(parsed.input, parsed.ops);
  } catch {
    return null;
  }
}

function tryOrderOperations(text: string): MethodBuildResult | null {
  const parsed = parseOrderOperationsQuestion(text);
  if (!parsed) return null;
  try {
    return buildOrderOperations(parsed);
  } catch {
    return null;
  }
}

const BUILDERS: Record<MethodBuilderId, (text: string) => MethodBuildResult | null> = {
  order_of_operations: tryOrderOperations,
  quadratic_solve: tryQuadraticSolve,
  linear_equation: tryLinearEquation,
  rounding_number_line: tryRoundingNumberLine,
  roman_numerals: tryRomanNumerals,
  place_value_chart: tryPlaceValueChart,
  place_value_shift: tryPlaceValueShift,
  fraction_simplify: tryFractionSimplify,
  fraction_number_line: tryFractionNumberLine,
  fraction_ops: tryFractionOps,
  decimal_column: tryDecimalColumn,
  fdp_equivalence: tryFdpEquivalence,
  multiples_number_line: tryMultiplesNumberLine,
  signed_number_line: trySignedNumberLine,
  rect_perimeter_area: tryRectPerimeterArea,
  cuboid_volume: tryCuboidVolume,
  angle_diagram: tryAngleDiagram,
  coordinate_plot: tryCoordinatePlot,
  bar_chart_stats: tryBarChartStats,
  unit_conversion: tryUnitConversion,
  ratio_table: tryRatioTable,
  function_machine: tryFunctionMachine,
  column_multiplication: tryColumnMultiplication,
  column_addition: tryColumnAddition,
  column_subtraction: tryColumnSubtraction,
  long_division: tryLongDivision,
};

/** Default try order — algebra, then fraction compare before ops, then KS2 arithmetic. */
const DEFAULT_ORDER: MethodBuilderId[] = [
  "order_of_operations",
  "quadratic_solve",
  "linear_equation",
  "rounding_number_line",
  "roman_numerals",
  "place_value_chart",
  "place_value_shift",
  "fraction_simplify",
  "fraction_number_line",
  "fraction_ops",
  "angle_diagram",
  "coordinate_plot",
  "bar_chart_stats",
  "unit_conversion",
  "ratio_table",
  "function_machine",
  "signed_number_line",
  "rect_perimeter_area",
  "cuboid_volume",
  "multiples_number_line",
  "fdp_equivalence",
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
  buildRomanNumerals,
  buildRomanNumeralToNumber,
  buildRoundingNumberLine,
  buildDecimalRounding,
  buildFractionOps,
  buildFractionNumberLine,
  buildFractionSimplify,
  buildDecimalColumn,
  buildLinearEquation,
  buildQuadraticFactorSolve,
  buildFdpEquivalence,
  buildMultiplesFactors,
  buildSignedNumberLine,
  buildRectPerimeterArea,
  buildCuboidVolume,
  buildAngleDiagram,
  buildCoordinatePlot,
  buildCoordinateProblem,
  buildBarChart,
  buildUnitConversion,
  buildRatioTable,
  buildFunctionMachine,
  buildOrderOperations,
};
