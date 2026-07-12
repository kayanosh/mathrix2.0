/**
 * KS2 Year 5/6 pedagogy registry — maps curriculum topics to method builders,
 * required visuals, vocabulary, and common mistakes.
 *
 * Production-ready = every topic has either a builderId or a required visual
 * contract (not a fake column builder for every card).
 */

import type { MethodBuilderId } from "@/lib/methods/types";
import type { VisualRequirement } from "@/lib/prompts/required-visuals";

export type YearGroup = 5 | 6 | "5-6";

export interface PedagogyEntry {
  id: string;
  label: string;
  years: YearGroup;
  /** Prefer this deterministic builder when operands can be parsed */
  builderId: MethodBuilderId | null;
  /** Whiteboard block types the lesson / Ask AI must include */
  requiredBlocks: string[];
  keywords: RegExp;
  vocabulary: string[];
  commonMistakes: string[];
  notes?: string;
}

export const KS2_PEDAGOGY: PedagogyEntry[] = [
  // ── Method families with builders (most specific first) ───────────────────
  {
    id: "place_value_shift",
    label: "Place Value ×÷ 10/100/1000",
    years: "5-6",
    builderId: "place_value_shift",
    requiredBlocks: ["table", "equation_steps"],
    keywords:
      /(?:multiply|divide)\s+(?:by\s+)?(?:10|100|1000)\b|[×x*÷]\s*(?:10|100|1000)\b|(?:10|100|1000)\s*(?:times|[×x])\b|\b(?:digit\s*shift|add(?:ing)?\s*zeros?|move(?:s|ing)?\s+(?:the\s+)?(?:digit|place))\b/i,
    vocabulary: ["place value", "digit", "column", "times ten", "divide by ten"],
    commonMistakes: [
      "Adding zeros instead of shifting digits when multiplying decimals",
      "Shifting the wrong direction for ÷10/100/1000",
    ],
    notes: "Never use column_method for ×÷ powers of ten — use a place-value table.",
  },
  {
    id: "place_value_rounding",
    label: "Rounding on a Number Line",
    years: "5-6",
    builderId: "rounding_number_line",
    requiredBlocks: ["number_line"],
    keywords:
      /\bround(?:ing)?\s+[\d,]+\s+to\s+the\s+nearest\b|\bround(?:ing)?\s+(?:to\s+)?(?:the\s+)?nearest\b|\bnearest\s+(?:10|100|1,?000|10,?000|100,?000)\b/i,
    vocabulary: ["round", "nearest", "halfway", "multiple"],
    commonMistakes: [
      "Looking at the wrong digit to decide",
      "Rounding to the wrong place",
    ],
    notes: "Always show the two multiples either side with a halfway marker — never a generic 0–10 line.",
  },
  {
    id: "place_value_chart",
    label: "Place Value Digit Chart",
    years: "5-6",
    builderId: "place_value_chart",
    requiredBlocks: ["table"],
    keywords:
      /\b(?:value of (?:the )?\d in|place[- ]value (?:chart|grid|of each digit)|what is the value of the)\b/i,
    vocabulary: ["place value", "digit", "column", "thousands", "ones"],
    commonMistakes: [
      "Confusing the digit with its place value",
      "Misreading zeros in large numbers",
    ],
  },
  {
    id: "fraction_simplify",
    label: "Simplify Fractions (HCF)",
    years: "5-6",
    builderId: "fraction_simplify",
    requiredBlocks: ["fraction_bar", "fraction_grid"],
    keywords:
      /\b(simplif(?:y|ying)\s+fractions?|simplif(?:y|ying)\s+\d+\s*\/\s*\d+|lowest terms|simplest form|cancel\s+(?:the\s+)?fractions?|hcf\b|highest common factor)\b/i,
    vocabulary: ["numerator", "denominator", "HCF", "equivalent", "simplest form"],
    commonMistakes: [
      "Dividing only the numerator and not the denominator",
      "Using a common factor that is not the highest one",
    ],
  },
  {
    id: "fractions_compare",
    label: "Compare and Order Fractions",
    years: "5-6",
    builderId: "fraction_number_line",
    requiredBlocks: ["number_line"],
    keywords:
      /\b(compare\s*\/?\s*order|compare\s+fractions?|order\s+fractions?|order\s+\d+\s*\/|compare\s+\d+\s*\/|equivalent fractions?|fraction.*number line|number line.*fraction|fractions?\s+between|fractions?\s+on\s+a\s+number\s+line|which\s+(?:fraction\s+)?is\s+(?:greater|bigger|smaller))\b/i,
    vocabulary: ["numerator", "denominator", "equivalent", "improper", "mixed number"],
    commonMistakes: [
      "Counting tick marks instead of intervals",
      "Comparing numerators without equal denominators",
    ],
  },
  {
    id: "decimals_fdp",
    label: "Decimals, Percentages & Equivalence",
    years: "5-6",
    builderId: "fdp_equivalence",
    requiredBlocks: ["number_line", "table", "equation_steps"],
    keywords:
      /\b(percentages?|decimals?\s*(?:&|and)\s*percentages?|fractions?,?\s*decimals?\s*(?:&|and)\s*percentages?|fdp|equivalent fractions?,?\s*decimals?\s*(?:and|&)\s*percentages?|decimals?\s+as\s+fractions?|thousandths|round\s+decimals?|compare\s+decimals?|order\s+decimals?|percentage\s+of\s+(?:an?\s+)?amount)\b/i,
    vocabulary: ["percent", "equivalent", "tenth", "hundredth", "thousandth"],
    commonMistakes: [
      "Thinking a longer decimal is always larger",
      "Confusing 0.5 and 0.05",
      "Finding 10% then forgetting to scale for other percentages",
    ],
  },
  {
    id: "fraction_ops",
    label: "Fraction Operations",
    years: "5-6",
    builderId: "fraction_ops",
    requiredBlocks: ["equation_steps"],
    keywords:
      /\b(fractions?|add(?:ing|ition)?\s+fractions?|subtract(?:ing|ion)?\s+fractions?|multiply(?:ing)?\s+fractions?|divid(?:e|ing)\s+fractions?|common denominator|fraction\s+of\s+(?:an?\s+)?amount|mixed numbers?|improper fractions?)\b|(?<!\d)\d+\s*\/\s*\d+\s*[+\-−×x*÷]\s*(?:\d+\s*\/\s*\d+|\d+)\b/i,
    vocabulary: [
      "numerator",
      "denominator",
      "equivalent",
      "common denominator",
      "simplify",
      "reciprocal",
    ],
    commonMistakes: [
      "Adding denominators when adding fractions",
      "Forgetting to simplify",
      "Multiplying only the numerators",
    ],
  },
  {
    id: "decimal_column",
    label: "Decimal Column Calculations",
    years: "5-6",
    builderId: "decimal_column",
    requiredBlocks: ["column_method", "equation_steps"],
    keywords:
      /\b(decimals?|add(?:ing|ition)?\s+decimals?|subtract(?:ing|ion)?\s+decimals?|multiply(?:ing)?\s+decimals?|decimal\s+column|column.*decimal)\b|\d+\.\d+\s*[+\-−×x*]\s*\d+\.?\d*/i,
    vocabulary: ["tenths", "hundredths", "thousandths", "decimal point", "place value"],
    commonMistakes: [
      "Misaligning decimal points",
      "Forgetting to bring the decimal point down",
      "Counting decimal places incorrectly when multiplying",
    ],
  },
  {
    id: "column_addition",
    label: "Column Addition",
    years: "5-6",
    builderId: "column_addition",
    requiredBlocks: ["column_method"],
    keywords:
      /\b(column addition|addition\s*(?:&|and)\s*subtraction|add(?:ing|ition)?\b.*\bdigit|addition.*column|more than 4 digits.*add)\b/i,
    vocabulary: ["ones", "tens", "hundreds", "carry", "exchange"],
    commonMistakes: [
      "Forgetting to add the carry",
      "Misaligning place-value columns",
    ],
  },
  {
    id: "column_subtraction",
    label: "Column Subtraction",
    years: "5-6",
    builderId: "column_subtraction",
    requiredBlocks: ["column_method"],
    keywords:
      /\b(column subtraction|subtract(?:ing|ion)?\b.*\bdigit|subtraction.*column|more than 4 digits.*subtract)\b/i,
    vocabulary: ["ones", "tens", "borrow", "exchange", "rename"],
    commonMistakes: [
      "Subtracting the top from the bottom when the top digit is smaller",
      "Forgetting to reduce the lending column after a borrow",
    ],
  },
  {
    id: "column_multiplication",
    label: "Column Multiplication",
    years: "5-6",
    builderId: "column_multiplication",
    requiredBlocks: ["column_method", "equation_steps"],
    keywords:
      /\b(long multiplication|column multiplication|multiply.*digit|2.?digit.*2.?digit|3.?digit.*2.?digit|4.?digit.*\d.?digit|multiplication\s*(?:and|&)\s*division(?:\s*[AB])?|written multiplication|order of operations|bidmas|bodmas)\b|(?<!\d)\d{1,4}\s*[×x*]\s*\d{1,2}(?!\d*0{2,})\b/i,
    vocabulary: [
      "multiplicand",
      "multiplier",
      "partial product",
      "carry",
      "place value",
    ],
    commonMistakes: [
      "Forgetting the place-value zero on the tens line",
      "Adding carries incorrectly",
      "Misaligning partial products",
    ],
    notes:
      "Carries sit above the multiplicand while forming each partial product (UK primary). Teach: write ones in the column, carry tens left as a small digit, add the carry on the next multiply.",
  },
  {
    id: "long_division",
    label: "Long Division",
    years: "5-6",
    builderId: "long_division",
    requiredBlocks: ["column_method", "equation_steps"],
    keywords:
      /\b(long division|bus stop|short division|divide.*digit|division with remainders)\b|(?<!\d)\d{2,6}\s*[÷]\s*\d{1,4}\b|(?<!\d)\d{2,6}\s+divided\s+by\s+\d{1,4}\b/i,
    vocabulary: ["divisor", "dividend", "quotient", "remainder", "bus stop"],
    commonMistakes: [
      "Forgetting to bring down the next digit",
      "Writing the quotient digit in the wrong place",
    ],
    notes: "Prefer ÷ word form; avoid bare '/' so fraction ops keep ownership of a/b.",
  },

  // ── Visual-contract topics (no builder yet) ───────────────────────────────
  {
    id: "multiples_factors",
    label: "Multiples and Factors",
    years: "5-6",
    builderId: "multiples_number_line",
    requiredBlocks: ["number_line", "table"],
    keywords:
      /\b(multiples?|skip.?count|times tables?|factors?|factor pairs?|primes?|square numbers?|cube numbers?|common factors?|common multiples?)\b/i,
    vocabulary: ["multiple", "factor", "prime", "square", "common multiple"],
    commonMistakes: [
      "Confusing factors with multiples",
      "Missing 1 and the number itself as factors",
    ],
  },
  {
    id: "perimeter_area",
    label: "Perimeter & Area",
    years: "5-6",
    builderId: "rect_perimeter_area",
    requiredBlocks: ["labeled_shape", "equation_steps"],
    keywords:
      /\b(perimeter|area|rectilinear|compound shapes?|parallelograms?|estimate area|measurement)\b/i,
    vocabulary: ["perimeter", "area", "length", "width", "compound"],
    commonMistakes: [
      "Mixing up area and perimeter formulae",
      "Forgetting units",
      "Missing external edges on compound shapes",
    ],
    notes: "Prefer labeled_shape with dimensions; LLM frames why, numbers come from the diagram.",
  },
  {
    id: "volume",
    label: "Volume & Capacity",
    years: "5-6",
    builderId: "cuboid_volume",
    requiredBlocks: ["labeled_shape", "equation_steps"],
    keywords:
      /\b(volume|cuboids?|capacity|estimate volume|estimate capacity)\b/i,
    vocabulary: ["volume", "capacity", "cubic", "length", "width", "height"],
    commonMistakes: [
      "Using area formula instead of volume",
      "Mixing cm³ and ml without converting",
    ],
  },
  {
    id: "statistics",
    label: "Statistics",
    years: "5-6",
    builderId: "bar_chart_stats",
    requiredBlocks: ["chart", "table"],
    keywords:
      /\b(statistics|line graphs?|bar charts?|pie charts?|two-?way tables?|timetables?|the mean|average|interpret\s+(?:tables?|graphs?|charts?))\b/i,
    vocabulary: ["axis", "scale", "frequency", "mean", "total"],
    commonMistakes: [
      "Misreading the scale on a graph",
      "Forgetting to divide by the count when finding the mean",
    ],
  },
  {
    id: "shape_angles",
    label: "Shape & Angles",
    years: "5-6",
    builderId: "angle_diagram",
    requiredBlocks: ["labeled_shape"],
    keywords:
      /\b(angles?|degrees|straight line|around a point|vertically opposite|triangles?|quadrilaterals?|polygons?|regular and irregular|3D shapes?|nets?|parts of a circle|symmetry|measure angles?|shapes?)\b/i,
    vocabulary: ["angle", "vertex", "parallel", "perpendicular", "degrees"],
    commonMistakes: [
      "Assuming all triangles have a right angle",
      "Using the exterior angle when the interior is needed",
    ],
  },
  {
    id: "position_direction",
    label: "Position & Direction",
    years: "5-6",
    builderId: "coordinate_plot",
    requiredBlocks: ["coordinate_graph"],
    keywords:
      /\b(coordinates?|translation|reflection|four quadrants?|first quadrant|plot(?:ting)?\s+points?|lines? of symmetry|position\s*(?:&|and)\s*direction)\b/i,
    vocabulary: ["coordinate", "axis", "quadrant", "translate", "reflect"],
    commonMistakes: [
      "Swapping x and y",
      "Reflecting in the wrong mirror line",
    ],
  },
  {
    id: "place_value_general",
    label: "Place Value (Read, Write, Round)",
    years: "5-6",
    builderId: null,
    requiredBlocks: ["table"],
    keywords:
      /\b(place value|numbers to|read,?\s*write|compare and order numbers|roman numerals|powers of 10|more or less)\b/i,
    vocabulary: ["place value", "round", "compare", "digit", "million"],
    commonMistakes: [
      "Rounding to the wrong place",
      "Misreading large numbers with zeros",
    ],
    notes:
      "Catch-all for Place Value prose. Rounding and digit-value questions are handled by place_value_rounding / place_value_chart builders first.",
  },
  {
    id: "negative_numbers",
    label: "Negative Numbers",
    years: "5-6",
    builderId: "signed_number_line",
    requiredBlocks: ["number_line"],
    keywords:
      /\b(negative numbers?|count through zero|below zero|temperature)\b/i,
    vocabulary: ["negative", "positive", "zero", "difference"],
    commonMistakes: [
      "Thinking −3 is greater than −1",
      "Counting the wrong direction on the number line",
    ],
  },
  {
    id: "converting_units",
    label: "Converting Units",
    years: "5-6",
    builderId: "unit_conversion",
    requiredBlocks: ["table", "equation_steps"],
    keywords:
      /\b(convert(?:ing)?\s+(?:metric|units|measures)|converting units|metric units?|imperial|miles and kilometres|units of time|timetables and time)\b/i,
    vocabulary: ["metre", "gram", "litre", "convert", "equivalent"],
    commonMistakes: [
      "Multiplying when they should divide (or vice versa)",
      "Forgetting there are 1000 m in a km",
    ],
  },
  {
    id: "ratio",
    label: "Ratio & Proportion",
    years: 6,
    builderId: "ratio_table",
    requiredBlocks: ["table", "equation_steps"],
    keywords:
      /\b(ratio|proportion|scale factors?|scale drawings?|recipes?)\b/i,
    vocabulary: ["ratio", "part", "whole", "scale factor", "proportion"],
    commonMistakes: [
      "Adding instead of multiplying for scale factors",
      "Sharing in the wrong order of the ratio",
    ],
  },
  {
    id: "algebra",
    label: "Algebra",
    years: 6,
    builderId: "function_machine",
    requiredBlocks: ["equation_steps", "table"],
    keywords:
      /\b(algebra|function machines?|form expressions?|substitution|formulae|form and solve|linear number sequences?|find pairs of values)\b/i,
    vocabulary: ["expression", "equation", "substitute", "sequence", "formula"],
    commonMistakes: [
      "Combining unlike terms",
      "Doing operations in the wrong order in a function machine",
    ],
  },
  {
    id: "problem_solving",
    label: "Problem Solving & Reasoning",
    years: "5-6",
    builderId: null,
    requiredBlocks: ["equation_steps", "table"],
    keywords:
      /\b(multi-?step|problem solving|reasoning|investigations?|themed projects?|consolidation|sats revision|reason from known facts|inverse operations|mental calculations?)\b/i,
    vocabulary: ["reason", "estimate", "check", "inverse"],
    commonMistakes: [
      "Jumping to a calculation without reading the question",
      "Not checking with the inverse",
    ],
  },
  {
    id: "arithmetic_generic",
    label: "Arithmetic",
    years: "5-6",
    builderId: null,
    requiredBlocks: ["column_method", "equation_steps"],
    keywords: /\b(add|subtract|multiply|divide|calculation|arithmetic)\b/i,
    vocabulary: [],
    commonMistakes: [],
  },
];

/** Topics that should stop after the first match (most specific first). */
const STOP_AFTER = new Set([
  "place_value_shift",
  "place_value_rounding",
  "place_value_chart",
  "fractions_compare",
  "fraction_simplify",
  "fraction_ops",
  "decimals_fdp",
  "decimal_column",
  "column_multiplication",
  "column_addition",
  "column_subtraction",
  "long_division",
  "multiples_factors",
  "perimeter_area",
  "volume",
  "statistics",
  "shape_angles",
  "position_direction",
  "place_value_general",
  "negative_numbers",
  "converting_units",
  "ratio",
  "algebra",
  "problem_solving",
]);

function collectSearchText(
  question: string,
  topic?: string,
  subtopics?: string[],
): string {
  const subs = Array.isArray(subtopics) ? subtopics : [];
  return [question, topic, ...subs].filter(Boolean).join(" ");
}

export function lookupPedagogy(
  question: string,
  topic?: string,
  subtopics?: string[],
): PedagogyEntry[] {
  const text = collectSearchText(question, topic, subtopics);
  const matched: PedagogyEntry[] = [];
  for (const entry of KS2_PEDAGOGY) {
    if (entry.keywords.test(text)) {
      matched.push(entry);
      if (STOP_AFTER.has(entry.id)) break;
    }
  }
  return matched;
}

export function preferredBuilderId(
  question: string,
  topic?: string,
  subtopics?: string[],
): MethodBuilderId | null {
  const hits = lookupPedagogy(question, topic, subtopics);
  return hits[0]?.builderId ?? null;
}

export function pedagogyToVisualRequirements(
  entries: PedagogyEntry[],
): VisualRequirement[] {
  return entries.map((e) => ({
    description: `KS2 topic "${e.label}" requires: ${e.requiredBlocks.join(", ")}`,
    requiredBlocks: e.requiredBlocks,
    matchedTopic: e.label,
  }));
}

/** Every Y5/Y6 maths curriculum topic name → expected pedagogy id (for coverage checks). */
export const KS2_MATHS_TOPIC_COVERAGE: Record<string, string> = {
  "Place Value": "place_value_general",
  "Addition & Subtraction": "column_addition",
  "Multiplication & Division A": "column_multiplication",
  "Multiplication & Division B": "column_multiplication",
  "Multiplication & Division": "column_multiplication",
  Fractions: "fraction_ops",
  "Decimals & Percentages": "decimals_fdp",
  Decimals: "decimal_column",
  "Fractions, Decimals & Percentages": "decimals_fdp",
  "Perimeter & Area": "perimeter_area",
  "Area, Perimeter & Volume": "perimeter_area",
  Statistics: "statistics",
  Shape: "shape_angles",
  "Position & Direction": "position_direction",
  "Negative Numbers": "negative_numbers",
  "Converting Units": "converting_units",
  Volume: "volume",
  Ratio: "ratio",
  Algebra: "algebra",
  "Themed Projects, Consolidation & Problem Solving": "problem_solving",
};
