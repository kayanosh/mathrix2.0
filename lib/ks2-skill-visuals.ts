/**
 * Skill → required visual contract for KS2 maths lessons.
 */

import { normalizeMathText } from "@/lib/methods/normalize-math-text";
import { parseOrderOperationsQuestion } from "@/lib/methods/order-of-operations";
import type { TeachingStep } from "@/lib/methods/types";
import type { LabeledShapeBlock, VisualBlock } from "@/types/whiteboard";

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
  // Strip LaTeX commands before keyword matching: "\square" contains the
  // literal word "square" and was hijacking sequence questions into the
  // geometry family.
  const q = normalizeMathText(question)
    .replace(/\\[a-zA-Z]+/g, " ")
    .replace(/\$+/g, " ")
    .toLowerCase();
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
  // "Estimate the area of the irregular shape on a 1 cm × 1 cm square grid"
  // is geometry — the × belongs to the grid pitch, not a multiplication.
  if (/irregular\s+shape|square\s+grid|estimate\s+the\s+area/i.test(q)) {
    return "geometry";
  }
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
  // Factor skills belong to the multiples/factors family (number line or
  // table), not multiplication — "Find the common factors of 18 and 24" is
  // not an area-model lesson. Simplify lessons mention the HCF, so exclude
  // them explicitly.
  if (/\bfactor/.test(`${q} ${t}`) && !/\bsimplif/.test(t)) return "multiples";
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

/**
 * Deterministic repair for word-problem lessons whose only visual is a
 * written calculation method (for example column_method). The strict
 * word_problems contract requires a structure visual (key_info, bar_model,
 * equation_steps or table); a bare algorithm misses the "find the key
 * information" teaching moment and the validator rejects the whole lesson
 * (visual_mismatch → 422 in class). The model gets the contract prompt but
 * does not always comply, so we repair rather than reject: prepend a
 * key_info block built from the question's own numbers, then keep the
 * model's calculation visual after it. Returns the blocks unchanged when no
 * repair is needed or no numbers exist to highlight.
 */
export function repairWordProblemVisuals(
  blocks: VisualBlock[],
  question: string,
  topic = "",
  skill = "",
): VisualBlock[] {
  if (!question || blocks.length === 0) return blocks;
  const family = detectSkillVisualFamily(question, topic, skill);
  if (family !== "word_problems") return blocks;
  if (satisfiesSkillVisuals(blocks.map((b) => b.type), family)) return blocks;
  const highlights = Array.from(question.matchAll(/\d+(?:\.\d+)?/g), (m) => ({
    text: m[0],
    kind: "number" as const,
  }));
  if (highlights.length === 0) return blocks;
  return [
    {
      type: "key_info",
      stem: question,
      highlights,
      caption: "Find the key information",
    },
    ...blocks,
  ];
}

/** Rounding precision named in the question, else inferred from the number. */
function roundingPrecision(question: string, n: number): number {
  if (/nearest\s+(?:thousand|1,?000)\b/i.test(question)) return 1000;
  if (/nearest\s+(?:hundred|100)\b/i.test(question)) return 100;
  if (/nearest\s+(?:ten|10)\b/i.test(question)) return 10;
  if (/nearest\s+(?:whole|unit)s?\b/i.test(question)) return 1;
  const dp = /(\d+)\s*(?:d\.?p\.?|decimal\s*places?)/i.exec(question);
  if (dp) return Math.pow(10, -Number(dp[1]));
  if (Number.isInteger(n)) return n >= 1000 ? 1000 : n >= 100 ? 100 : 10;
  return 1;
}

function roundTo(n: number, p: number): number {
  return Math.round(n / p) * p;
}

/** Format without floating-point noise (0.30000000000000004 → "0.3"). */
function fmt(n: number): string {
  return String(Number(n.toFixed(6)));
}

/**
 * Deterministic repair for rounding lessons that fail the strict rounding
 * contract (requiredAllOf: table + number_line). Estimation-style skills
 * such as "Round to check answers" reliably make the model emit a
 * column_method check instead — repair rather than reject, because a
 * teacher cannot retry mid-lesson. Builds the missing pieces from the
 * question's own numbers: a number line anchoring the first number between
 * its rounding neighbours, and a number → rounded table for all of them.
 */
export function repairRoundingVisuals(
  blocks: VisualBlock[],
  question: string,
  topic = "",
  skill = "",
): VisualBlock[] {
  if (!question || blocks.length === 0) return blocks;
  const family = detectSkillVisualFamily(question, topic, skill);
  if (family !== "rounding") return blocks;
  const types = blocks.map((b) => b.type);
  if (satisfiesSkillVisuals(types, family)) return blocks;

  // Strip precision phrases first — "to the nearest 100" and "2 decimal
  // places" are instructions, not values to round.
  const stripped = question
    .replace(/nearest\s+(?:ten|hundred|thousand|whole|unit)s?(?:\s+number)?\b/gi, " ")
    .replace(/nearest\s+(?:1,?000|100|10)\b/gi, " ")
    .replace(/\b\d+\s*(?:d\.?p\.?|decimal\s*places?)/gi, " ");
  const numbers = Array.from(
    stripped.matchAll(/\d+(?:\.\d+)?/g),
    (m) => Number(m[0]),
  ).filter((n) => Number.isFinite(n) && n > 0);
  const unique = [...new Set(numbers)].slice(0, 4);
  if (unique.length === 0) return blocks;

  const p = roundingPrecision(question, unique[0]);
  const repaired: VisualBlock[] = [];

  if (!types.includes("number_line")) {
    const n = unique[0];
    const lo = Math.floor(n / p) * p;
    const hi = lo + p;
    const rounded = roundTo(n, p);
    repaired.push({
      type: "number_line",
      range: [lo - p, hi + p],
      tickInterval: p / 2,
      markers: [
        { value: n, label: fmt(n), style: "filled" },
        { value: rounded, label: `rounds to ${fmt(rounded)}`, style: "filled" },
      ],
    });
  }
  if (!types.includes("table")) {
    repaired.push({
      type: "table",
      caption: `Round to the nearest ${fmt(p)}`,
      headers: ["Number", `Rounded to the nearest ${fmt(p)}`],
      rows: unique.map((n) => [fmt(n), fmt(roundTo(n, p))]),
      highlightCells: unique.map((_, i) => [i, 1] as [number, number]),
    });
  }
  return [...repaired, ...blocks];
}

/**
 * Deterministic repair for rounding lessons whose teaching steps never
 * explain the deciding-digit rule (the validator's rounding_not_explained
 * check). Prepends the rule step only when the existing steps do not already
 * cover it, so well-formed lessons are untouched.
 */
/**
 * Deterministic repair for geometry lessons that arrive with NO usable
 * shape visual (missing_visual → 422 in class). Two question types the
 * model reliably leaves bare:
 *
 * 1. "How many lines of symmetry does a square/rectangle have?" → a
 *    labeled_shape with the correct dashed symmetry lines. Only square (4)
 *    and rectangle (2) are repaired: the renderer's mirror lines are only
 *    mathematically true for those — a diagonal across an oblong or a line
 *    through a scalene triangle would LIE, and a lying diagram is worse
 *    than a 422.
 * 2. "Is this pentagon regular or irregular?" → a lettered polygon whose
 *    side labels carry the maths (all equal = regular; all different =
 *    irregular, captioned "not drawn to scale"). The labels are matched to
 *    the lesson's own answer so the diagram cannot disagree with it.
 *
 * Repair rather than reject — a teacher cannot retry mid-lesson.
 */
export function repairGeometryVisuals(
  blocks: VisualBlock[],
  question: string,
  topic = "",
  skill = "",
  answer = "",
): VisualBlock[] {
  if (!question) return blocks;
  if (detectSkillVisualFamily(question, topic, skill) !== "geometry") {
    return blocks;
  }
  const q = question.toLowerCase();

  // Symmetry questions must SHOW the mirror lines. A cached/model shape
  // without symmetryLines gets patched in place when the count is
  // knowable (square → 4, rectangle → 2); anything else is left alone —
  // fake lines are worse than none.
  if (/lines? of symmetry|symmetr(?:y|ic)/.test(q)) {
    const count = /\bsquare\b/.test(q)
      ? 4
      : /\brectangle|oblong\b/.test(q)
        ? 2
        : 0;
    if (count > 0) {
      const idx = blocks.findIndex((b) => b.type === "labeled_shape");
      if (idx >= 0) {
        const shape = blocks[idx] as LabeledShapeBlock;
        if (shape.symmetryLines) return blocks; // already honest
        if (["square", "rectangle", "polygon"].includes(String(shape.shape))) {
          const patched = {
            ...shape,
            // 4 lines are only true on a true square — upgrade the drawing.
            shape: (count === 4 ? "square" : shape.shape === "square" ? "square" : "rectangle") as LabeledShapeBlock["shape"],
            symmetryLines: count,
            caption:
              shape.caption ||
              (count === 4
                ? "Count the mirror lines: each dashed line folds the square onto itself."
                : "A rectangle has 2 mirror lines — its diagonals are NOT lines of symmetry."),
          };
          const next = [...blocks];
          next[idx] = patched;
          return next;
        }
        return blocks;
      }
    }
  }

  if (satisfiesSkillVisuals(blocks.map((b) => b.type), "geometry")) {
    return blocks;
  }

  if (/lines? of symmetry|symmetr(?:y|ic)/.test(q)) {
    if (/\bsquare\b/.test(q)) {
      return [
        {
          type: "labeled_shape",
          shape: "square",
          symmetryLines: 4,
          caption: "Count the mirror lines: each dashed line folds the square onto itself.",
        } as VisualBlock,
        ...blocks,
      ];
    }
    if (/\brectangle|oblong\b/.test(q)) {
      return [
        {
          type: "labeled_shape",
          shape: "rectangle",
          vertices: [{ label: "A" }, { label: "B" }, { label: "C" }, { label: "D" }],
          symmetryLines: 2,
          caption: "A rectangle has 2 mirror lines — its diagonals are NOT lines of symmetry.",
        } as VisualBlock,
        ...blocks,
      ];
    }
    return blocks; // other shapes: no honest repair exists
  }

  const polyCount = /pentagon/.test(q)
    ? 5
    : /hexagon/.test(q)
      ? 6
      : /heptagon/.test(q)
        ? 7
        : /octagon/.test(q)
          ? 8
          : 0;
  if (polyCount > 0 && /regular|irregular/.test(q)) {
    const a = answer.toLowerCase();
    const irregular =
      /\birregular\b/.test(a) &&
      !/\bregular\b/.test(a.replace(/\birregular\b/g, ""));
    const vertices = Array.from({ length: polyCount }, (_, i) => ({
      label: String.fromCharCode(65 + i),
    }));
    // Equal lengths for regular; a distinct length per side for irregular.
    const lengths = Array.from({ length: polyCount }, (_, i) =>
      irregular ? 4 + ((i * 2) % polyCount) : 5,
    );
    const sides = vertices.map((v, i) => ({
      from: v.label,
      to: vertices[(i + 1) % polyCount].label,
      label: `${lengths[i]} cm`,
    }));
    return [
      {
        type: "labeled_shape",
        shape: "polygon",
        vertices,
        sides,
        caption: irregular
          ? "Not drawn to scale — the side lengths are all different, so this is an irregular polygon."
          : `Every side is the same length — a regular ${q.includes("hexagon") ? "hexagon" : q.includes("heptagon") ? "heptagon" : q.includes("octagon") ? "octagon" : "pentagon"}.`,
      } as VisualBlock,
      ...blocks,
    ];
  }
  return blocks;
}

export function repairRoundingExplanation(
  teachingSteps: TeachingStep[] | undefined,
  question: string,
  topic = "",
  skill = "",
): TeachingStep[] | undefined {
  if (!teachingSteps?.length || !question) return teachingSteps;
  if (detectSkillVisualFamily(question, topic, skill) !== "rounding") {
    return teachingSteps;
  }
  const blob = teachingSteps
    .map((s) => `${s.title} ${s.explanation} ${s.why || ""}`)
    .join("\n")
    .toLowerCase();
  const deciding =
    /decid(?:e|ing)\s+digit|look(?:s|ing)?\s+(?:at\s+)?(?:the\s+)?(?:next|digit)|digit\s+(?:to\s+the\s+)?right|one place to the right/.test(
      blob,
    );
  const fiveRule = /5\s+or\s+more|five\s+or\s+more|≥\s*5|>=\s*5/.test(blob);
  if (deciding && fiveRule) return teachingSteps;
  const ruleSentence =
    "Look at the digit to the right of the place you are rounding to — that is the deciding digit. If it is 5 or more, round up. If it is 4 or less, round down.";
  // Worked examples are capped at 6 micro-steps — at the cap, fold the rule
  // into the first step rather than adding a seventh.
  if (teachingSteps.length >= 6) {
    const [first, ...rest] = teachingSteps;
    return [
      {
        ...first,
        explanation: `${ruleSentence} ${first.explanation}`,
        narration: `${ruleSentence} ${first.narration}`,
      },
      ...rest,
    ];
  }
  const rule: TeachingStep = {
    title: "Find the deciding digit",
    explanation: ruleSentence,
    why: "The deciding digit tells you which side of the halfway point the number sits on, so the rounded answer stays as close as possible.",
    narration:
      "Find the deciding digit: the digit to the right of your rounding place. Five or more, round up. Four or less, round down.",
    cellKeys: [],
    carryKeys: [],
    noteKeys: [],
  };
  return [rule, ...teachingSteps];
}
