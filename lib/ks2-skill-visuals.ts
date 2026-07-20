/**
 * Skill → required visual contract for KS2 maths lessons.
 */

import { normalizeMathText } from "@/lib/methods/normalize-math-text";
import { parseOrderOperationsQuestion } from "@/lib/methods/order-of-operations";

export type KS2SkillVisualFamily =
  | "fraction_simplify"
  | "fraction_compare"
  | "fraction_ops"
  | "multiplication"
  | "division"
  | "decimals"
  | "percentages"
  | "geometry"
  | "measure_angles"
  | "word_problems"
  | "rounding"
  | "place_value"
  | "statistics"
  | "coordinates"
  | "algebra"
  | "ratio"
  | "measures"
  | "multiples"
  | "order_operations"
  | "place_value_shift"
  | "general";

export interface KS2SkillVisualRequirement {
  family: KS2SkillVisualFamily;
  requiredAnyOf: string[];
  requiredAllOf?: string[];
  guidance: string;
}

/** True when the skill is measuring angles with a protractor (not missing-angle rules). */
function isAngleMeasuring(text: string): boolean {
  return /protractor|measur\w*[^.!?]*\bangle|\bangle[^.!?]*measur\w*|classif\w*\s+(?:and\s+\w+\s+)*angles?/i.test(
    text,
  );
}

export function detectSkillVisualFamily(
  question: string,
  topic = "",
  skill = "",
): KS2SkillVisualFamily {
  const q = normalizeMathText(question).toLowerCase();
  const t = `${topic} ${skill}`.toLowerCase();

  // Curriculum skill names are more authoritative than incidental wording in
  // a worked question (for example, "How many...?" on a line graph).
  if (/statistic|line graph|bar chart|chart|pictogram|frequency table/.test(t))
    return "statistics";
  if (/coordinate|quadrant|plot points?|position (?:and|&) direction/.test(t))
    return "coordinates";
  if (/function machine|algebra|expression|formula|equation|number sequence/.test(t))
    return "algebra";
  if (/\bratio\b|proportion|scale factor/.test(t)) return "ratio";
  if (/convert(?:ing)? units?|unit conversion|metric measures?/.test(t))
    return "measures";
  if (/order of operations|bidmas|bodmas/.test(t)) return "order_operations";
  if (
    /(?:multiply|divide)(?:ing)?\s+(?:and\s+)?(?:divide\s+)?by\s+(?:10|100|1000)|[×÷]\s*(?:10|100|1000)\b/.test(
      t,
    )
  ) {
    return "place_value_shift";
  }
  if (/\bmultiples?\b/.test(t)) return "multiples";
  if (
    /(?:multiply|divide)(?:ing)?\s+(?:by\s+)?(?:10|100|1000)|[×÷]\s*(?:10|100|1000)\b/.test(
      q,
    )
  ) {
    return "place_value_shift";
  }
  if (parseOrderOperationsQuestion(q)) return "order_operations";
  if (/\bsimplif(?:y|ying)\b|\blowest terms\b|\bsimplest form\b|\bcancel\b/.test(q)) {
    return "fraction_simplify";
  }
  if (
    /\bcompare\b|\border\b|which.*(greater|bigger|smaller)/.test(q) &&
    /\d+\s*\/\s*\d+/.test(q)
  ) {
    return "fraction_compare";
  }
  if (
    /\bround(?:ing)?\b/.test(q) ||
    /\bto\s+the\s+nearest\b/.test(q) ||
    /\bround\b[\s\S]{0,40}\bto\s+\d+\s*(?:d\.?p\.?|decimal\s*places?)\b/i.test(q)
  ) {
    return "rounding";
  }
  if (/\bpercent|%|hundred square/.test(q)) return "percentages";
  if (
    (/\d+\s*\/\s*\d+|\\+frac\s*\{/i.test(q) || /\bfraction/.test(q)) &&
    /[+\-−×÷]|\b(?:add\w*|subtract\w*|multipl\w*|divid\w*|of)\b/.test(q)
  ) {
    return "fraction_ops";
  }
  if (/\bdivid|÷|bus stop|short division|long division/.test(q) && /\d/.test(q))
    return "division";
  if (/\bmultipl|×|times|area model/.test(q) && /\d/.test(q))
    return "multiplication";
  if (/\bdecimal\b|\d+\.\d+/.test(q)) return "decimals";
  if (/\bfraction\b|\d+\s*\/\s*\d+/.test(q)) return "fraction_ops";
  if (isAngleMeasuring(q) || isAngleMeasuring(t)) return "measure_angles";
  // Geometry must outrank "how many…" word-problem phrasing: "How many
  // lines of symmetry does this square have?" is geometry, not a word
  // problem.
  if (
    /\bangle|perimeter|area|shape|triangle|rectangle|square|circle|pentagon|hexagon|octagon|polygon|quadrilateral|symmetr\w*|cube|cuboid/.test(
      q,
    )
  ) {
    return "geometry";
  }
  if (/\bword problem|how many|altogether|left over/.test(q)) return "word_problems";
  if (/\bplace value\b/.test(q)) return "place_value";

  if (/\bsimplif(?:y|ying)\b|\blowest terms\b|\bsimplest form\b/.test(t)) {
    return "fraction_simplify";
  }
  if (/\bcompare\b|\border\b/.test(t) && /fraction/.test(t)) {
    return "fraction_compare";
  }
  if (/\bround|to the nearest|decimal places/.test(t) && /\bround|nearest/.test(t))
    return "rounding";
  if (/\bpercent/.test(t)) return "percentages";
  if (
    /\bfraction/.test(t) &&
    /\b(?:add\w*|subtract\w*|multipl\w*|divid\w*|of|amount)\b/.test(t)
  ) {
    return "fraction_ops";
  }
  if (/\bdivid/.test(t)) return "division";
  if (/\bmultipl/.test(t)) return "multiplication";
  if (/\bfraction\b/.test(t)) return "fraction_ops";
  if (/\bdecimal/.test(t)) return "decimals";
  if (isAngleMeasuring(t)) return "measure_angles";
  if (/\bangle|perimeter|area|shape/.test(t)) return "geometry";
  if (/\bplace value/.test(t)) return "place_value";
  return "general";
}

export const KS2_SKILL_VISUALS: Record<
  KS2SkillVisualFamily,
  KS2SkillVisualRequirement
> = {
  fraction_simplify: {
    family: "fraction_simplify",
    requiredAnyOf: ["fraction_bar", "fraction_grid"],
    guidance:
      "Show a fraction bar or grid with shaded parts, then group by the HCF to show the equivalent simpler fraction.",
  },
  fraction_compare: {
    family: "fraction_compare",
    requiredAnyOf: ["number_line"],
    requiredAllOf: ["table"],
    guidance:
      "Use a 0–1 number line with labelled markers AND a common-denominator conversion table.",
  },
  fraction_ops: {
    family: "fraction_ops",
    requiredAnyOf: ["equation_steps", "fraction_bar", "table"],
    guidance: "Show clear equivalent-fraction working with a visual or equation steps.",
  },
  multiplication: {
    family: "multiplication",
    requiredAnyOf: ["area_model", "column_method"],
    guidance: "Use an area model or column method with carries.",
  },
  division: {
    family: "division",
    requiredAnyOf: ["bar_model", "column_method"],
    guidance: "Use grouping/bar model or short/long (bus-stop) division.",
  },
  decimals: {
    family: "decimals",
    requiredAnyOf: ["table", "number_line", "column_method"],
    guidance: "Use a place-value chart or decimal number line.",
  },
  percentages: {
    family: "percentages",
    requiredAnyOf: ["hundred_square", "bar_model", "table"],
    guidance: "Use a hundred square or bar model linked to fractions/decimals.",
  },
  geometry: {
    family: "geometry",
    requiredAnyOf: ["labeled_shape"],
    guidance: "Use a labelled diagram with dimensions or angles.",
  },
  measure_angles: {
    family: "measure_angles",
    requiredAnyOf: ["protractor"],
    guidance:
      "Use a protractor block over the angle (vertex at the centre, baseline arm along 0°). First TEACH estimation — classify against a right angle — then reveal the reading (revealReading: false on the estimation step's block, true when measuring).",
  },
  word_problems: {
    family: "word_problems",
    requiredAnyOf: ["key_info", "bar_model", "equation_steps", "table"],
    guidance:
      "Highlight key information or show the ordered calculation steps in a bar, table, or equation flow.",
  },
  rounding: {
    family: "rounding",
    requiredAnyOf: ["table"],
    requiredAllOf: ["table", "number_line"],
    guidance:
      "Show a place-value chart AND a number line; mark the deciding digit and the rounded value.",
  },
  place_value: {
    family: "place_value",
    requiredAnyOf: ["table", "number_line"],
    guidance: "Use a place-value chart or number line.",
  },
  statistics: {
    family: "statistics",
    requiredAnyOf: ["chart", "table"],
    guidance: "Show the graph or chart together with the values being read.",
  },
  coordinates: {
    family: "coordinates",
    requiredAnyOf: ["coordinate_graph"],
    guidance: "Use a coordinate grid with labelled points and axes.",
  },
  algebra: {
    family: "algebra",
    requiredAnyOf: ["table", "equation_steps"],
    guidance: "Show each function-machine or equation step in order.",
  },
  ratio: {
    family: "ratio",
    requiredAnyOf: ["table", "bar_model"],
    guidance: "Use equal ratio parts in a table or bar model.",
  },
  measures: {
    family: "measures",
    requiredAnyOf: ["table", "equation_steps"],
    guidance: "Show the source unit, conversion operation, and target unit.",
  },
  multiples: {
    family: "multiples",
    requiredAnyOf: ["number_line", "table"],
    guidance: "Show equal jumps or an ordered list of multiples.",
  },
  order_operations: {
    family: "order_operations",
    requiredAnyOf: ["equation_steps"],
    guidance:
      "Keep the complete expression visible and rewrite it after each BIDMAS operation.",
  },
  place_value_shift: {
    family: "place_value_shift",
    requiredAnyOf: ["table"],
    requiredAllOf: ["table", "equation_steps"],
    guidance:
      "Use a place-value table and equation steps showing each digit shift.",
  },
  general: {
    family: "general",
    requiredAnyOf: [
      "table",
      "equation_steps",
      "number_line",
      "labeled_shape",
      "key_info",
      "column_method",
      "fraction_bar",
      "fraction_grid",
      "bar_model",
      "area_model",
      "hundred_square",
      "chart",
      "coordinate_graph",
    ],
    guidance: "Include at least one clear visual that matches the skill.",
  },
};

export function skillVisualPrompt(family: KS2SkillVisualFamily): string {
  const req = KS2_SKILL_VISUALS[family];
  const all = req.requiredAllOf?.length
    ? ` AND must also include: ${req.requiredAllOf.join(", ")}`
    : "";
  return `Visual requirement (${family}): one of [${req.requiredAnyOf.join(" | ")}]${all}. ${req.guidance}`;
}

/** True when block types satisfy the skill visual contract. */
export function satisfiesSkillVisuals(
  blockTypes: string[],
  family: KS2SkillVisualFamily,
): boolean {
  const req = KS2_SKILL_VISUALS[family];
  const set = new Set(blockTypes);
  const anyOk = req.requiredAnyOf.some((t) => set.has(t));
  if (!anyOk) return false;
  if (req.requiredAllOf) {
    return req.requiredAllOf.every((t) => set.has(t));
  }
  return true;
}
