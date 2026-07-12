/**
 * KS2 Year 5/6 pedagogy registry — maps curriculum topics to method builders,
 * required visuals, vocabulary, and common mistakes.
 *
 * Adding a new topic = register here + ensure a builder exists. Do not grow
 * fragile prompt paragraphs per subtopic.
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
  {
    id: "place_value_shift",
    label: "Place Value ×÷ 10/100/1000",
    years: "5-6",
    builderId: "place_value_shift",
    requiredBlocks: ["table", "equation_steps"],
    keywords:
      /(?:multiply|divide)\s+(?:by\s+)?(?:10|100|1000)\b|[×x*÷]\s*(?:10|100|1000)\b|(?:10|100|1000)\s*(?:times|[×x])\b|\b(?:place value|digit\s*shift|add(?:ing)?\s*zeros?|move(?:s|ing)?\s+(?:the\s+)?(?:digit|place))\b/i,
    vocabulary: ["place value", "digit", "column", "times ten", "divide by ten"],
    commonMistakes: [
      "Adding zeros instead of shifting digits when multiplying decimals",
      "Shifting the wrong direction for ÷10/100/1000",
    ],
    notes: "Never use column_method for ×÷ powers of ten — use a place-value table.",
  },
  {
    id: "column_addition",
    label: "Column Addition",
    years: "5-6",
    builderId: "column_addition",
    requiredBlocks: ["column_method"],
    keywords:
      /\b(column addition|add.*digit|addition.*column|more than 4 digits.*add)\b/i,
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
      /\b(column subtraction|subtract.*digit|subtraction.*column|more than 4 digits.*subtract)\b/i,
    vocabulary: ["ones", "tens", "borrow", "exchange", "rename"],
    commonMistakes: [
      "Subtracting the top from the bottom when the top digit is smaller",
      "Forgetting to reduce the lending column after a borrow",
    ],
  },
  {
    id: "column_multiplication",
    label: "Column Multiplication",
    years: 5,
    builderId: "column_multiplication",
    requiredBlocks: ["column_method", "equation_steps"],
    keywords:
      /\b(long multiplication|column multiplication|multiply.*digit|2.?digit.*2.?digit|3.?digit.*2.?digit|4.?digit.*\d.?digit)\b|(?<!\d)\d{1,4}\s*[×x*]\s*\d{1,2}(?!\d*0{2,})\b/i,
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
      "Carries sit above the multiplicand while forming each partial product (UK primary).",
  },
  {
    id: "long_division",
    label: "Long Division",
    years: "5-6",
    builderId: "long_division",
    requiredBlocks: ["column_method", "equation_steps"],
    keywords: /\b(long division|bus stop|divide.*digit|short division|÷)\b/i,
    vocabulary: ["divisor", "dividend", "quotient", "remainder", "bus stop"],
    commonMistakes: [
      "Forgetting to bring down the next digit",
      "Writing the quotient digit in the wrong place",
    ],
  },
  {
    id: "multiples_factors",
    label: "Multiples and Factors",
    years: "5-6",
    builderId: null,
    requiredBlocks: ["number_line", "table"],
    keywords:
      /\b(multiples?|skip.?count|times tables?|factors?|primes?|square numbers?|cube numbers?)\b/i,
    vocabulary: ["multiple", "factor", "prime", "square", "common multiple"],
    commonMistakes: [
      "Confusing factors with multiples",
      "Missing 1 and the number itself as factors",
    ],
  },
  {
    id: "fractions_number_line",
    label: "Fractions on a Number Line",
    years: "5-6",
    builderId: null,
    requiredBlocks: ["number_line"],
    keywords:
      /\b(fraction.*number line|number line.*fraction|compare fraction|equivalent fraction|fraction.*between)\b/i,
    vocabulary: ["numerator", "denominator", "equivalent", "improper", "mixed number"],
    commonMistakes: [
      "Counting tick marks instead of intervals",
      "Comparing numerators without equal denominators",
    ],
  },
  {
    id: "shapes_measures",
    label: "Shapes and Measures",
    years: "5-6",
    builderId: null,
    requiredBlocks: ["labeled_shape"],
    keywords:
      /\b(area|perimeter|shape|angle|triangle|rectangle|polygon|symmetry|coordinates)\b/i,
    vocabulary: ["perimeter", "area", "angle", "vertex", "parallel"],
    commonMistakes: [
      "Mixing up area and perimeter formulae",
      "Forgetting units",
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

/** Topics that should stop after the first match (most specific arithmetic). */
const STOP_AFTER = new Set([
  "place_value_shift",
  "column_multiplication",
  "column_addition",
  "column_subtraction",
  "long_division",
  "multiples_factors",
]);

function collectSearchText(
  question: string,
  topic?: string,
  subtopics?: string[],
): string {
  return [question, topic, ...(subtopics || [])].filter(Boolean).join(" ");
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
