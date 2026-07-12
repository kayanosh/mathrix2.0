/**
 * KS2 Visual Rules Engine — which diagram families to prefer per strand/skill.
 * Feeds lesson prompts and the teaching-lesson validator.
 */

export type KS2VisualRuleId =
  | "fractions"
  | "decimals"
  | "multiplication"
  | "division"
  | "percentages"
  | "ratio"
  | "geometry"
  | "statistics"
  | "word_problems"
  | "place_value"
  | "negatives"
  | "algebra"
  | "measurement";

export interface KS2VisualRule {
  id: KS2VisualRuleId;
  label: string;
  preferredBlocks: string[];
  guidance: string;
}

export const KS2_VISUAL_RULES: Record<KS2VisualRuleId, KS2VisualRule> = {
  fractions: {
    id: "fractions",
    label: "Fractions",
    preferredBlocks: [
      "fraction_bar",
      "fraction_wall",
      "number_line",
      "table",
      "equation_steps",
    ],
    guidance:
      "Use fraction bars, fraction walls, number lines, and common-denominator tables.",
  },
  decimals: {
    id: "decimals",
    label: "Decimals",
    preferredBlocks: ["table", "number_line", "column_method", "equation_steps"],
    guidance:
      "Use place-value charts, decimal number lines, and money models where helpful.",
  },
  multiplication: {
    id: "multiplication",
    label: "Multiplication",
    preferredBlocks: ["area_model", "column_method", "table", "equation_steps"],
    guidance:
      "Use area models, partitioning, place-value grids, and column method.",
  },
  division: {
    id: "division",
    label: "Division",
    preferredBlocks: ["bar_model", "column_method", "equation_steps"],
    guidance:
      "Use grouping, bar models, short/long division, and remainders in context.",
  },
  percentages: {
    id: "percentages",
    label: "Percentages",
    preferredBlocks: ["hundred_square", "bar_model", "table", "number_line"],
    guidance:
      "Use hundred squares, bar models, and fraction–decimal–percentage links.",
  },
  ratio: {
    id: "ratio",
    label: "Ratio",
    preferredBlocks: ["ratio_table", "table", "bar_model", "equation_steps"],
    guidance: "Use ratio tables, bar models, and scaling tables.",
  },
  geometry: {
    id: "geometry",
    label: "Geometry",
    preferredBlocks: [
      "labeled_shape",
      "coordinate_graph",
      "area_model",
      "equation_steps",
    ],
    guidance:
      "Use labelled shape diagrams, angle diagrams, grids, perimeter paths, and area grids.",
  },
  statistics: {
    id: "statistics",
    label: "Statistics",
    preferredBlocks: ["chart", "table"],
    guidance: "Use tables, bar charts, line graphs, and pictograms.",
  },
  word_problems: {
    id: "word_problems",
    label: "Word problems",
    preferredBlocks: ["key_info", "bar_model", "equation_steps"],
    guidance:
      "Highlight key information, choose the operation, bar model, solve, then check.",
  },
  place_value: {
    id: "place_value",
    label: "Place value",
    preferredBlocks: ["table", "number_line", "equation_steps"],
    guidance: "Use place-value charts, digit tables, and rounding number lines.",
  },
  negatives: {
    id: "negatives",
    label: "Negative numbers",
    preferredBlocks: ["number_line", "equation_steps"],
    guidance: "Use a number line through zero with both values marked.",
  },
  algebra: {
    id: "algebra",
    label: "Algebra",
    preferredBlocks: ["table", "equation_steps"],
    guidance: "Use function machines and clear equation steps.",
  },
  measurement: {
    id: "measurement",
    label: "Measurement",
    preferredBlocks: ["labeled_shape", "table", "equation_steps"],
    guidance: "Use labelled shapes for perimeter/area/volume and conversion tables.",
  },
};

export function getVisualRule(id: KS2VisualRuleId): KS2VisualRule {
  return KS2_VISUAL_RULES[id];
}

export function visualRulePrompt(id: KS2VisualRuleId): string {
  const rule = KS2_VISUAL_RULES[id];
  return `Visual rule (${rule.label}): ${rule.guidance} Prefer blocks: ${rule.preferredBlocks.join(", ")}.`;
}
