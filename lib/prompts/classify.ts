/**
 * Question classifier — determines which GCSE category a question falls into.
 * Uses keyword heuristics first (fast), falls back to the default "algebra" category.
 */
import type { QuestionCategory } from "@/types/whiteboard";

// Re-export required visuals detection for convenience
export { detectRequiredVisuals, getRequiredBlockTypes } from "./required-visuals";
export type { VisualRequirement } from "./required-visuals";

interface CategoryRule {
  category: QuestionCategory;
  keywords: RegExp;
}

const RULES: CategoryRule[] = [
  {
    category: "probability",
    keywords:
      /\b(probability|prob|tree diagram|venn|independent|mutually exclusive|conditional|coin|dice|die|cards?|bag|marble|ball|spinner|random|fair|biased|event|outcome|sample space|expected|relative frequency)\b/i,
  },
  {
    category: "statistics",
    keywords:
      /\b(mean|median|mode|range|histogram|box plot|box-and-whisker|cumulative frequency|frequency table|two.?way table|scatter|correlation|quartile|iqr|interquartile|bar chart|pie chart|stem.?and.?leaf|grouped data|class interval|frequency density|standard deviation)\b/i,
  },
  {
    category: "geometry",
    keywords:
      /\b(triangle|circle|rectangle|square|parallelogram|trapez|polygon|angle|pythagoras|perimeter|area|volume|surface area|congruent|similar|scale factor|bearing|construction|bisect|locus|loci|sector|arc\s|segment|tangent|chord|diameter|radius|circumference|theorem|shape|cube|cuboid|cylinder|cone|sphere|prism|pyramid|cross.?section|plan|elevation|net\b|enlargement|rotation|reflection|translation|transformation|vector|column\s*vector)\b/i,
  },
  {
    category: "trigonometry",
    keywords:
      /\b(sin|cos|tan|trigonometry|trig|soh\s*cah\s*toa|sine|cosine|tangent|hypotenuse|opposite|adjacent|sin\s*rule|cosine\s*rule|sine\s*rule|unit\s*circle|radian)\b/i,
  },
  {
    category: "graphs",
    keywords:
      /\b(plot|graph|gradient|intercept|y\s*=\s*m\s*x|equation of a line|straight line|parabola|turning point|vertex|asymptote|sketch|curve|coordinates?|midpoint|distance between|perpendicular|parallel\slines?|reciprocal|exponential|real.?life graph|velocity.?time|distance.?time|conversion graph|simultaneous.*graph|intersect|root of)\b/i,
  },
  {
    category: "calculus",
    keywords:
      /\b(differentiat|integrat|derivative|d\/dx|dy\/dx|gradient function|stationary|turning point.*calculus|tangent.*curve|normal.*curve|chain rule|product rule|quotient rule|first principles|rate of change|area under|definite integral|indefinite)\b/i,
  },
  {
    category: "number",
    keywords:
      /\b(fraction|decimal|percentage|ratio|proportion|hcf|lcm|prime factor|standard form|index|indices|surd|reciprocal\b|bounds|error interval|upper bound|lower bound|significant figure|decimal place|round|estimate|long division|column|place value|negative number|order of operations|bidmas|bodmas)\b/i,
  },
  {
    category: "algebra",
    keywords:
      /\b(solve|equation|expand|factoris|simplif|expression|inequalit|simultaneous|quadratic|formula|completing the square|algebraic|rearrang|substitut|nth term|sequence|arithmetic|geometric|linear|collect.*terms|like terms|bracket|coefficient|variable|unknown)\b/i,
  },
];

export function classifyQuestion(question: string): QuestionCategory {
  for (const rule of RULES) {
    if (rule.keywords.test(question)) {
      return rule.category;
    }
  }
  return "algebra"; // default fallback
}
