/**
 * Skill → required visual contract for KS2 maths lessons.
 */

export type KS2SkillVisualFamily =
  | "fraction_simplify"
  | "fraction_compare"
  | "fraction_ops"
  | "multiplication"
  | "division"
  | "decimals"
  | "percentages"
  | "geometry"
  | "word_problems"
  | "place_value"
  | "general";

export interface KS2SkillVisualRequirement {
  family: KS2SkillVisualFamily;
  requiredAnyOf: string[];
  requiredAllOf?: string[];
  guidance: string;
}

export function detectSkillVisualFamily(
  question: string,
  topic = "",
  skill = "",
): KS2SkillVisualFamily {
  const t = `${question} ${topic} ${skill}`.toLowerCase();
  if (/\bsimplif(?:y|ying)\b|\blowest terms\b|\bsimplest form\b/.test(t)) {
    return "fraction_simplify";
  }
  if (/\bcompare\b|\border\b|which.*(greater|bigger|smaller)/.test(t) && /\d+\s*\/\s*\d+/.test(t)) {
    return "fraction_compare";
  }
  if (/\bfraction\b|\d+\s*\/\s*\d+/.test(t)) return "fraction_ops";
  if (/\bpercent|%|hundred square/.test(t)) return "percentages";
  if (/\bdecimal\b|\d+\.\d+/.test(t)) return "decimals";
  if (/\bdivid|÷|bus stop|short division|long division/.test(t)) return "division";
  if (/\bmultipl|×|times|area model/.test(t)) return "multiplication";
  if (/\bangle|perimeter|area|shape|triangle|rectangle/.test(t)) return "geometry";
  if (/\bword problem|how many|altogether|left over/.test(t)) return "word_problems";
  if (/\bplace value|round|nearest/.test(t)) return "place_value";
  return "general";
}

export const KS2_SKILL_VISUALS: Record<KS2SkillVisualFamily, KS2SkillVisualRequirement> = {
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
  word_problems: {
    family: "word_problems",
    requiredAnyOf: ["key_info", "bar_model"],
    guidance: "Highlight key information; add a bar model when useful.",
  },
  place_value: {
    family: "place_value",
    requiredAnyOf: ["table", "number_line"],
    guidance: "Use a place-value chart or rounding number line.",
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
