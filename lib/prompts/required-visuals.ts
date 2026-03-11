/**
 * Required Visuals Mapping
 *
 * Maps maths topics/keywords → visual block types that MUST appear in the
 * GPT-4o response for a complete, student-friendly solution.
 *
 * Used to:
 *   1. Inject "MANDATORY VISUALS" instructions into the system prompt
 *   2. Validate the response contains the required block types
 */

import type { QuestionCategory } from "@/types/whiteboard";

// ── Type for a required visual rule ───────────────────────────────────────────

export interface VisualRequirement {
  /** Human-readable description for the system prompt */
  description: string;
  /** Block types that MUST appear */
  requiredBlocks: string[];
  /** Matched topic keywords (for logging) */
  matchedTopic: string;
}

// ── Rule definitions ──────────────────────────────────────────────────────────

interface VisualRule {
  /** Regex to match against the user's question */
  keywords: RegExp;
  /** Human-readable topic label */
  topic: string;
  /** Block types that MUST be present */
  blocks: string[];
  /** Optional: only apply if the question is in this category */
  categories?: QuestionCategory[];
}

const VISUAL_RULES: VisualRule[] = [
  // ── Geometry ──────────────────────────────────────────────────────────
  {
    keywords:
      /\b(circle theorem|angle in semicircle|tangent.*radius|alternate segment|cyclic quadrilateral|inscribed angle|central angle|chord.*angle)\b/i,
    topic: "Circle Theorems",
    blocks: ["labeled_shape", "equation_steps"],
    categories: ["geometry"],
  },
  {
    keywords:
      /\b(pythagoras|pythagorean|hypotenuse.*find|find.*hypotenuse|right.?angle.*triangle.*side)\b/i,
    topic: "Pythagoras' Theorem",
    blocks: ["labeled_shape", "equation_steps"],
    categories: ["geometry"],
  },
  {
    keywords:
      /\b(area|perimeter|surface area|volume|circumference)\b.*\b(triangle|circle|rectangle|square|parallelogram|trapez|polygon|cube|cuboid|cylinder|cone|sphere|prism|pyramid|sector)\b/i,
    topic: "Area / Volume / Perimeter",
    blocks: ["labeled_shape", "equation_steps"],
    categories: ["geometry"],
  },
  {
    keywords:
      /\b(triangle|circle|rectangle|square|parallelogram|trapez|polygon).*\b(angle|side|length|find)\b/i,
    topic: "Shape Properties",
    blocks: ["labeled_shape"],
    categories: ["geometry"],
  },
  {
    keywords:
      /\b(bearing|compass|three.?figure bearing)\b/i,
    topic: "Bearings",
    blocks: ["labeled_shape", "equation_steps"],
    categories: ["geometry"],
  },
  {
    keywords:
      /\b(congruent|similar|scale factor|enlargement)\b/i,
    topic: "Congruence & Similarity",
    blocks: ["labeled_shape", "equation_steps"],
    categories: ["geometry"],
  },
  {
    keywords:
      /\b(transformation|rotation|reflection|translation|enlarge)\b/i,
    topic: "Transformations",
    blocks: ["labeled_shape", "coordinate_graph"],
    categories: ["geometry"],
  },
  {
    keywords:
      /\b(vector|column\s*vector|magnitude|direction)\b/i,
    topic: "Vectors",
    blocks: ["labeled_shape", "equation_steps"],
    categories: ["geometry"],
  },

  // ── Graphs ────────────────────────────────────────────────────────────
  {
    keywords:
      /\b(equation of (?:a |the )?(?:straight )?line|y\s*=\s*m\s*x\s*\+\s*c|gradient.*intercept|intercept.*gradient)\b/i,
    topic: "Equation of a Line",
    blocks: ["coordinate_graph", "equation_steps"],
    categories: ["graphs", "algebra"],
  },
  {
    keywords:
      /\b(plot|graph|sketch|draw).*\b(y\s*=|line|parabola|curve|quadratic|cubic|reciprocal|exponential)\b/i,
    topic: "Graph Plotting",
    blocks: ["coordinate_graph", "equation_steps"],
    categories: ["graphs"],
  },
  {
    keywords:
      /\b(simultaneous.*graph|graph.*simultaneous|intersect.*line|where.*line.*meet)\b/i,
    topic: "Simultaneous Equations (Graphical)",
    blocks: ["coordinate_graph", "equation_steps"],
    categories: ["graphs", "algebra"],
  },
  {
    keywords:
      /\b(distance.*between.*point|midpoint|perpendicular bisector of.*line)\b/i,
    topic: "Coordinate Geometry",
    blocks: ["coordinate_graph", "equation_steps"],
    categories: ["graphs", "geometry"],
  },
  {
    keywords:
      /\b(equation of (?:a )?circle|x.*\+.*y.*=.*r|circle.*equation|circle.*graph|centre.*radius.*circle)\b/i,
    topic: "Equation of a Circle",
    blocks: ["coordinate_graph", "equation_steps"],
    categories: ["graphs", "geometry"],
  },

  // ── Probability ───────────────────────────────────────────────────────
  {
    keywords:
      /\b(tree diagram|probability tree|first.*second.*event|two.*pick|with(?:out)? replacement|coin.*flip.*twice|dice.*twice|two.*dice|bag.*pick.*two)\b/i,
    topic: "Probability Tree Diagrams",
    blocks: ["probability_tree", "equation_steps"],
    categories: ["probability"],
  },
  {
    keywords:
      /\b(venn diagram|set.*notation|union|intersection|complement|A\s*∩\s*B|A\s*∪\s*B|ξ)\b/i,
    topic: "Venn Diagrams",
    blocks: ["venn_diagram", "equation_steps"],
    categories: ["probability", "statistics"],
  },
  {
    keywords:
      /\b(relative frequency|experimental probability|expected.*number|frequency.*probability)\b/i,
    topic: "Experimental Probability",
    blocks: ["table", "equation_steps"],
    categories: ["probability", "statistics"],
  },

  // ── Statistics ────────────────────────────────────────────────────────
  {
    keywords:
      /\b(frequency table|grouped data|frequency.*distribution|two.?way table)\b/i,
    topic: "Frequency Tables",
    blocks: ["table", "equation_steps"],
    categories: ["statistics"],
  },
  {
    keywords:
      /\b(histogram|frequency density|class interval.*bar)\b/i,
    topic: "Histograms",
    blocks: ["chart", "equation_steps"],
    categories: ["statistics"],
  },
  {
    keywords:
      /\b(box plot|box.?and.?whisker|quartile|iqr|interquartile)\b/i,
    topic: "Box Plots",
    blocks: ["chart", "equation_steps"],
    categories: ["statistics"],
  },
  {
    keywords:
      /\b(cumulative frequency|ogive|median.*cumulative)\b/i,
    topic: "Cumulative Frequency",
    blocks: ["chart", "equation_steps"],
    categories: ["statistics"],
  },
  {
    keywords:
      /\b(pie chart|pie.*diagram)\b/i,
    topic: "Pie Charts",
    blocks: ["chart", "equation_steps"],
    categories: ["statistics"],
  },
  {
    keywords:
      /\b(scatter.*graph|scatter.*diagram|scatter.*plot|correlation|line of best fit)\b/i,
    topic: "Scatter Graphs",
    blocks: ["coordinate_graph", "equation_steps"],
    categories: ["statistics"],
  },
  {
    keywords:
      /\b(stem.?and.?leaf|back.?to.?back)\b/i,
    topic: "Stem-and-Leaf Diagrams",
    blocks: ["table"],
    categories: ["statistics"],
  },

  // ── Trigonometry ──────────────────────────────────────────────────────
  {
    keywords:
      /\b(soh\s*cah\s*toa|sin|cos|tan|trigonometry).*\b(triangle|find|angle|side|missing)\b/i,
    topic: "Trigonometry (Triangle)",
    blocks: ["labeled_shape", "equation_steps"],
    categories: ["trigonometry"],
  },
  {
    keywords:
      /\b(sine?\s*rule|cosine?\s*rule)\b/i,
    topic: "Sine / Cosine Rule",
    blocks: ["labeled_shape", "equation_steps"],
    categories: ["trigonometry"],
  },
  {
    keywords:
      /\b(trig.*graph|graph.*sin|graph.*cos|graph.*tan|sine.*curve|cosine.*curve)\b/i,
    topic: "Trigonometric Graphs",
    blocks: ["coordinate_graph"],
    categories: ["trigonometry", "graphs"],
  },

  // ── Number ────────────────────────────────────────────────────────────
  {
    keywords:
      /\b(number line|inequality.*number.*line|represent.*number.*line)\b/i,
    topic: "Number Line / Inequalities",
    blocks: ["number_line"],
    categories: ["number", "algebra"],
  },
  {
    keywords:
      /\b(long division|column (?:addition|subtraction|multiplication)|bus stop method)\b/i,
    topic: "Column Methods",
    blocks: ["column_method"],
    categories: ["number"],
  },

  // ── Calculus ──────────────────────────────────────────────────────────
  {
    keywords:
      /\b(sketch.*curve|stationary point|turning point|maximum|minimum).*\b(differentiat|calculus|gradient)\b/i,
    topic: "Curve Sketching (Calculus)",
    blocks: ["coordinate_graph", "equation_steps"],
    categories: ["calculus"],
  },
  {
    keywords:
      /\b(area under.*curve|definite integral|integration.*area)\b/i,
    topic: "Area Under a Curve",
    blocks: ["coordinate_graph", "equation_steps"],
    categories: ["calculus"],
  },
];

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Detect which visual block types are required for a given question.
 *
 * Returns an array of VisualRequirement objects (may be empty if no
 * specific visuals are mandated).
 */
export function detectRequiredVisuals(
  question: string,
  category: QuestionCategory
): VisualRequirement[] {
  const requirements: VisualRequirement[] = [];
  const seenTopics = new Set<string>();

  for (const rule of VISUAL_RULES) {
    // Skip if rule is category-specific and doesn't match
    if (rule.categories && !rule.categories.includes(category)) {
      continue;
    }

    if (rule.keywords.test(question) && !seenTopics.has(rule.topic)) {
      seenTopics.add(rule.topic);
      requirements.push({
        description: `Topic "${rule.topic}" requires: ${rule.blocks.join(", ")}`,
        requiredBlocks: rule.blocks,
        matchedTopic: rule.topic,
      });
    }
  }

  return requirements;
}

/**
 * Get a flat, de-duplicated list of required block type strings.
 */
export function getRequiredBlockTypes(
  requirements: VisualRequirement[]
): string[] {
  const set = new Set<string>();
  for (const req of requirements) {
    for (const block of req.requiredBlocks) {
      set.add(block);
    }
  }
  return Array.from(set);
}
