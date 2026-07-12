/**
 * Resolve a KS2 maths question to a deterministic method build when possible.
 */

import type { MethodBuildResult } from "@/lib/methods/types";
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
import type { MethodBuilderId } from "@/lib/methods/types";

export function buildMethodForQuestion(
  question: string,
  preferred?: MethodBuilderId | null,
): MethodBuildResult | null {
  const text = question || "";

  // Place-value ×÷10/100/1000 before generic multiply/divide
  const pv = parsePlaceValueShift(text);
  if (pv && (!preferred || preferred === "place_value_shift")) {
    try {
      return buildPlaceValueShift(pv.value, pv.factor, pv.operation);
    } catch {
      /* fall through */
    }
  }

  if (!preferred || preferred === "column_multiplication") {
    const mult = parseMultiplicationOperands(text);
    if (mult) {
      // Skip if it's ×10/100/1000 (handled above)
      if (![10, 100, 1000].includes(mult.b) && ![10, 100, 1000].includes(mult.a)) {
        try {
          return buildColumnMultiplication(mult.a, mult.b);
        } catch {
          /* fall through */
        }
      }
    }
  }

  if (!preferred || preferred === "column_addition") {
    const add = parseAdditionOperands(text);
    if (add) {
      try {
        return buildColumnAddition(add.a, add.b);
      } catch {
        /* fall through */
      }
    }
  }

  if (!preferred || preferred === "column_subtraction") {
    const sub = parseSubtractionOperands(text);
    if (sub) {
      try {
        return buildColumnSubtraction(sub.a, sub.b);
      } catch {
        /* fall through */
      }
    }
  }

  if (!preferred || preferred === "long_division") {
    const div = parseDivisionOperands(text);
    if (div && ![10, 100, 1000].includes(div.b)) {
      try {
        return buildLongDivision(div.a, div.b);
      } catch {
        /* fall through */
      }
    }
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
