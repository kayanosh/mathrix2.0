import type { ExamBoard, SyllabusTopic } from "@/types";

/**
 * GCSE Maths syllabus data for AQA (8300), Edexcel (1MA1), and OCR (J560).
 *
 * Each board maps to an array of topics. Every topic lists all subtopics and
 * marks which ones are **Higher-only**. Foundation = all subtopics minus higherOnly.
 * Higher = all subtopics including higherOnly.
 *
 * Sources: official specification documents from each exam board.
 */

/* ── AQA 8300 ──────────────────────────────────────────────────────────────── */

const AQA_TOPICS: SyllabusTopic[] = [
  {
    id: "number",
    name: "Number",
    subtopics: [
      "Integers and place value",
      "Fractions, decimals and percentages",
      "Ratio and proportion",
      "Standard form",
      "Indices and powers",
      "Surds",
      "HCF and LCM",
      "Prime factorisation",
      "Rounding and estimation",
      "Bounds and error intervals",
    ],
    higherOnly: ["Surds", "Bounds and error intervals"],
  },
  {
    id: "algebra",
    name: "Algebra",
    subtopics: [
      "Simplifying expressions",
      "Expanding brackets",
      "Factorising",
      "Solving linear equations",
      "Solving quadratic equations",
      "Simultaneous equations",
      "Inequalities on a number line",
      "Sequences (nth term)",
      "Algebraic fractions",
      "Completing the square",
      "The quadratic formula",
      "Rearranging formulae",
      "Functions and function notation",
      "Iteration",
      "Algebraic proof",
      "Inverse and composite functions",
    ],
    higherOnly: [
      "Algebraic fractions",
      "Completing the square",
      "The quadratic formula",
      "Functions and function notation",
      "Iteration",
      "Algebraic proof",
      "Inverse and composite functions",
    ],
  },
  {
    id: "ratio",
    name: "Ratio, Proportion and Rates of Change",
    subtopics: [
      "Simplifying ratios",
      "Sharing in a ratio",
      "Speed, distance, time",
      "Direct and inverse proportion",
      "Percentage change",
      "Compound interest and depreciation",
      "Growth and decay",
      "Gradients and rates of change",
    ],
    higherOnly: ["Growth and decay", "Gradients and rates of change"],
  },
  {
    id: "geometry",
    name: "Geometry and Measures",
    subtopics: [
      "Properties of 2D shapes",
      "Properties of 3D shapes",
      "Angles (parallel lines, polygons)",
      "Area and perimeter",
      "Volume and surface area",
      "Circles — area and circumference",
      "Circle theorems",
      "Pythagoras' theorem",
      "Trigonometry (SOH CAH TOA)",
      "Sine and cosine rules",
      "Vectors",
      "Transformations",
      "Congruence and similarity",
      "Bearings",
      "Constructions and loci",
      "Arc length and sector area",
    ],
    higherOnly: [
      "Circle theorems",
      "Sine and cosine rules",
      "Vectors",
      "Arc length and sector area",
    ],
  },
  {
    id: "statistics",
    name: "Statistics",
    subtopics: [
      "Mean, median, mode, range",
      "Frequency tables and grouped data",
      "Charts and diagrams (bar, pie, pictogram)",
      "Scatter graphs and correlation",
      "Cumulative frequency and box plots",
      "Histograms",
      "Sampling methods",
    ],
    higherOnly: ["Histograms"],
  },
  {
    id: "probability",
    name: "Probability",
    subtopics: [
      "Basic probability",
      "Combined events (two-way tables)",
      "Probability trees",
      "Venn diagrams",
      "Relative frequency",
      "Conditional probability",
      "Set notation for probability",
    ],
    higherOnly: ["Conditional probability", "Set notation for probability"],
  },
];

/* ── Edexcel 1MA1 ──────────────────────────────────────────────────────────── */

const EDEXCEL_TOPICS: SyllabusTopic[] = [
  {
    id: "number",
    name: "Number",
    subtopics: [
      "Integers and place value",
      "Fractions, decimals and percentages",
      "Ratio and proportion",
      "Standard form",
      "Indices and powers of 10",
      "Surds and irrational numbers",
      "HCF and LCM",
      "Prime factorisation",
      "Rounding, truncation and estimation",
      "Upper and lower bounds",
    ],
    higherOnly: ["Surds and irrational numbers", "Upper and lower bounds"],
  },
  {
    id: "algebra",
    name: "Algebra",
    subtopics: [
      "Simplifying and substituting",
      "Expanding and factorising",
      "Solving linear equations",
      "Solving quadratic equations",
      "Simultaneous equations (linear)",
      "Simultaneous equations (one linear, one quadratic)",
      "Inequalities",
      "Sequences and nth term",
      "Algebraic fractions",
      "Completing the square",
      "The quadratic formula",
      "Rearranging formulae",
      "Function notation",
      "Iteration",
      "Proof",
      "Inverse and composite functions",
    ],
    higherOnly: [
      "Simultaneous equations (one linear, one quadratic)",
      "Algebraic fractions",
      "Completing the square",
      "The quadratic formula",
      "Function notation",
      "Iteration",
      "Proof",
      "Inverse and composite functions",
    ],
  },
  {
    id: "ratio",
    name: "Ratio, Proportion and Rates of Change",
    subtopics: [
      "Simplifying and using ratios",
      "Dividing in a ratio",
      "Speed, distance, time",
      "Direct and inverse proportion",
      "Percentage change and reverse percentages",
      "Compound interest and depreciation",
      "Exponential growth and decay",
      "Rates of change and area under curves",
    ],
    higherOnly: [
      "Exponential growth and decay",
      "Rates of change and area under curves",
    ],
  },
  {
    id: "geometry",
    name: "Geometry and Measures",
    subtopics: [
      "Properties of 2D and 3D shapes",
      "Angle facts (lines, triangles, polygons)",
      "Area and perimeter",
      "Volume and surface area",
      "Circles — area and circumference",
      "Circle theorems",
      "Pythagoras' theorem",
      "Trigonometry (SOH CAH TOA)",
      "Sine rule, cosine rule, area of triangle",
      "Vectors",
      "Transformations (rotation, reflection, translation, enlargement)",
      "Congruence and similarity",
      "Bearings",
      "Constructions and loci",
      "Arc length and sector area",
    ],
    higherOnly: [
      "Circle theorems",
      "Sine rule, cosine rule, area of triangle",
      "Vectors",
      "Arc length and sector area",
    ],
  },
  {
    id: "statistics",
    name: "Statistics",
    subtopics: [
      "Averages and range",
      "Frequency tables and grouped data",
      "Charts and graphs (bar, pie, line)",
      "Scatter graphs and lines of best fit",
      "Cumulative frequency and box plots",
      "Histograms (frequency density)",
      "Sampling methods",
    ],
    higherOnly: ["Histograms (frequency density)"],
  },
  {
    id: "probability",
    name: "Probability",
    subtopics: [
      "Basic probability and sample spaces",
      "Combined events and two-way tables",
      "Probability trees",
      "Venn diagrams and set notation",
      "Relative frequency and expected outcomes",
      "Conditional probability",
    ],
    higherOnly: ["Conditional probability"],
  },
];

/* ── OCR J560 ──────────────────────────────────────────────────────────────── */

const OCR_TOPICS: SyllabusTopic[] = [
  {
    id: "number",
    name: "Number",
    subtopics: [
      "Integers and place value",
      "Fractions, decimals and percentages",
      "Ratio and proportion",
      "Standard form",
      "Indices",
      "Surds",
      "HCF, LCM, primes",
      "Rounding, estimation and accuracy",
      "Error intervals and bounds",
    ],
    higherOnly: ["Surds", "Error intervals and bounds"],
  },
  {
    id: "algebra",
    name: "Algebra",
    subtopics: [
      "Expressions, equations and formulae",
      "Expanding and factorising",
      "Solving equations (linear)",
      "Solving quadratics",
      "Simultaneous equations",
      "Inequalities",
      "Sequences",
      "Algebraic fractions",
      "Completing the square",
      "The quadratic formula",
      "Rearranging formulae",
      "Functions",
      "Iteration",
      "Algebraic proof",
      "Inverse and composite functions",
    ],
    higherOnly: [
      "Algebraic fractions",
      "Completing the square",
      "The quadratic formula",
      "Functions",
      "Iteration",
      "Algebraic proof",
      "Inverse and composite functions",
    ],
  },
  {
    id: "ratio",
    name: "Ratio, Proportion and Rates of Change",
    subtopics: [
      "Ratio (simplify, share, combine)",
      "Speed, distance, time",
      "Direct and inverse proportion",
      "Percentage change",
      "Compound interest and depreciation",
      "Growth and decay",
      "Rates of change",
    ],
    higherOnly: ["Growth and decay", "Rates of change"],
  },
  {
    id: "geometry",
    name: "Geometry and Measures",
    subtopics: [
      "2D and 3D shapes — properties",
      "Angles (parallel lines, polygons)",
      "Area and perimeter",
      "Volume and surface area",
      "Circles",
      "Circle theorems",
      "Pythagoras' theorem",
      "Trigonometry (SOH CAH TOA)",
      "Sine and cosine rules",
      "Vectors",
      "Transformations",
      "Congruence and similarity",
      "Bearings",
      "Constructions and loci",
      "Sectors and arcs",
    ],
    higherOnly: [
      "Circle theorems",
      "Sine and cosine rules",
      "Vectors",
      "Sectors and arcs",
    ],
  },
  {
    id: "statistics",
    name: "Statistics",
    subtopics: [
      "Averages and measures of spread",
      "Frequency tables and grouped data",
      "Charts and diagrams",
      "Scatter graphs and correlation",
      "Cumulative frequency and box plots",
      "Histograms",
      "Sampling",
    ],
    higherOnly: ["Histograms"],
  },
  {
    id: "probability",
    name: "Probability",
    subtopics: [
      "Basic probability",
      "Combined events",
      "Tree diagrams",
      "Venn diagrams",
      "Relative frequency",
      "Conditional probability",
    ],
    higherOnly: ["Conditional probability"],
  },
];

/* ── Exported syllabus map ─────────────────────────────────────────────────── */

export type GCSESyllabusMap = Record<
  Extract<ExamBoard, "AQA" | "Edexcel" | "OCR">,
  SyllabusTopic[]
>;

export const GCSE_SYLLABUS: GCSESyllabusMap = {
  AQA: AQA_TOPICS,
  Edexcel: EDEXCEL_TOPICS,
  OCR: OCR_TOPICS,
};

/* ── Helpers ───────────────────────────────────────────────────────────────── */

/** Returns only Foundation-tier subtopics (excludes higherOnly) */
export function getFoundationSubtopics(topic: SyllabusTopic): string[] {
  const higherSet = new Set(topic.higherOnly);
  return topic.subtopics.filter((s) => !higherSet.has(s));
}

/** Returns all subtopics (Foundation + Higher) */
export function getHigherSubtopics(topic: SyllabusTopic): string[] {
  return topic.subtopics;
}

/** Returns subtopics for a given tier */
export function getSubtopicsForTier(
  topic: SyllabusTopic,
  tier: "foundation" | "higher"
): string[] {
  return tier === "higher"
    ? getHigherSubtopics(topic)
    : getFoundationSubtopics(topic);
}

/** Check if a subtopic is Higher-only */
export function isHigherOnly(topic: SyllabusTopic, subtopic: string): boolean {
  return topic.higherOnly.includes(subtopic);
}
