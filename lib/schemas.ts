/**
 * Zod schemas for validating Claude's whiteboard response.
 * Mirrors types/whiteboard.ts exactly.
 */
import { z } from "zod";

// ── Shared ────────────────────────────────────────────────────────────────────

export const CurlyArrowSchema = z.object({
  id: z.string(),
  label: z.string(),
  fromTerm: z.string(),
  toTerm: z.string(),
  style: z.enum(["curly", "straight", "loop-over"]).default("curly"),
  signRule: z.string().optional(),
  color: z.string().optional(),
});

export const Point2DSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const LabeledPointSchema = z.object({
  point: Point2DSchema,
  label: z.string(),
  latex: z.string().optional(),
});

// ── Equation Steps ────────────────────────────────────────────────────────────

export const TeacherMarkSchema = z.object({
  targetId: z.string().min(1),
  style: z.enum(["circle", "underline", "box"]),
  color: z.string().optional(),
  label: z.string().max(30).optional(),
});

export const EquationStepSchema = z.object({
  stepNumber: z.number().int().min(1),
  operationLabel: z.string().max(80),
  explanation: z.string(),
  latexBefore: z.string().default(""),
  latexAfter: z.string(),
  arrowDirection: z.enum(["down", "both_sides", "simplify"]).default("down"),
  arrows: z.array(CurlyArrowSchema).optional(),
  balanceNotation: z.string().optional(),
  // Pedagogical scaffolding fields
  rule: z.string().optional(),
  why: z.string().optional(),
  selfCheck: z.string().optional(),
  // Teacher pen marks — cap at 2 so emphasis stays meaningful
  marks: z.array(TeacherMarkSchema).max(2).optional(),
});

export const EquationStepBlockSchema = z.object({
  type: z.literal("equation_steps"),
  steps: z.array(EquationStepSchema).min(1).max(12),
});

// ── Coordinate Graph ──────────────────────────────────────────────────────────

export const PlotLineSchema = z.object({
  equation: z.string(),
  fn: z.string(),
  color: z.string().optional(),
  style: z.enum(["solid", "dashed", "dotted"]).default("solid"),
  label: z.string().optional(),
});

export const SegmentSchema = z.object({
  from: Point2DSchema,
  to: Point2DSchema,
  color: z.string().optional(),
  style: z.enum(["solid", "dashed"]).default("solid"),
  label: z.string().optional(),
});

export const CoordinateGraphBlockSchema = z.object({
  type: z.literal("coordinate_graph"),
  xRange: z.tuple([z.number(), z.number()]),
  yRange: z.tuple([z.number(), z.number()]),
  plots: z.array(PlotLineSchema).default([]),
  points: z.array(LabeledPointSchema).optional(),
  grid: z.boolean().default(true),
  xLabel: z.string().optional(),
  yLabel: z.string().optional(),
  segments: z.array(SegmentSchema).optional(),
});

// ── Labeled Shape ─────────────────────────────────────────────────────────────

export const AngleArcSchema = z.object({
  vertex: z.string(),
  degrees: z.number().min(0).max(360),
  label: z.string(),
  isRightAngle: z.boolean().optional(),
});

export const SideLabelSchema = z.object({
  from: z.string(),
  to: z.string(),
  label: z.string(),
  parallelMarks: z.number().int().min(0).optional(),
});

export const CircleDataSchema = z.object({
  center: z.string().optional(),
  radius: z.string().optional(),
  showRadius: z.boolean().optional(),
  showDiameter: z.boolean().optional(),
  chords: z.array(z.object({
    from: z.string(), to: z.string(), label: z.string().optional(),
  })).optional(),
  tangentPoints: z.array(z.string()).optional(),
  sectors: z.array(z.object({
    from: z.string(), to: z.string(), shaded: z.boolean().optional(),
  })).optional(),
});

export const LabeledShapeBlockSchema = z.object({
  type: z.literal("labeled_shape"),
  shape: z.enum(["triangle", "circle", "rectangle", "parallelogram", "trapezium", "polygon"]),
  vertices: z.array(z.object({
    label: z.string(),
    position: Point2DSchema.optional(),
  })).optional(),
  sides: z.array(SideLabelSchema).optional(),
  angles: z.array(AngleArcSchema).optional(),
  circle: CircleDataSchema.optional(),
  constructions: z.array(z.object({
    type: z.enum(["angle_bisector", "perpendicular_bisector", "arc"]),
    description: z.string(),
  })).optional(),
  arrows: z.array(CurlyArrowSchema).optional(),
});

// ── Probability Tree ──────────────────────────────────────────────────────────

export const TreeBranchSchema: z.ZodType<{
  event: string;
  probability: string;
  probabilityValue: number;
  children?: unknown[];
}> = z.object({
  event: z.string(),
  probability: z.string(),
  probabilityValue: z.number().min(0).max(1),
  children: z.lazy(() => z.array(TreeBranchSchema)).optional(),
});

export const ProbabilityTreeBlockSchema = z.object({
  type: z.literal("probability_tree"),
  rootLabel: z.string(),
  branches: z.array(TreeBranchSchema).min(1),
  highlightPaths: z.array(z.array(z.number())).optional(),
  showOutcomeProbabilities: z.boolean().optional(),
});

// ── Venn Diagram ──────────────────────────────────────────────────────────────

export const VennSetSchema = z.object({
  label: z.string(),
  elements: z.array(z.string()).optional(),
});

export const VennRegionSchema = z.object({
  region: z.string(),
  value: z.string(),
  highlighted: z.boolean().optional(),
});

export const VennDiagramBlockSchema = z.object({
  type: z.literal("venn_diagram"),
  sets: z.array(VennSetSchema).min(1).max(3),
  regions: z.array(VennRegionSchema),
  universalLabel: z.string().default("ξ"),
  universalTotal: z.number().optional(),
});

// ── Number Line ───────────────────────────────────────────────────────────────

export const NumberLineMarkerSchema = z.object({
  value: z.number(),
  label: z.string().optional(),
  style: z.enum(["open", "filled"]).default("filled"),
});

export const NumberLineShadingSchema = z.object({
  from: z.number(),
  to: z.number(),
  fromInfinity: z.boolean().optional(),
  toInfinity: z.boolean().optional(),
  color: z.string().optional(),
});

export const NumberLineBlockSchema = z.object({
  type: z.literal("number_line"),
  range: z.tuple([z.number(), z.number()]),
  tickInterval: z.number().positive(),
  markers: z.array(NumberLineMarkerSchema),
  shading: z.array(NumberLineShadingSchema).optional(),
  inequalityLabel: z.string().optional(),
});

// ── KS2 Teaching Visuals ─────────────────────────────────────────────────────

export const FractionBarBlockSchema = z.object({
  type: z.literal("fraction_bar"),
  numerator: z.number().int().min(0),
  denominator: z.number().int().positive(),
  label: z.string().optional(),
  shaded: z.number().int().min(0).optional(),
});

export const FractionGridBlockSchema = z.object({
  type: z.literal("fraction_grid"),
  numerator: z.number().int().min(0),
  denominator: z.number().int().positive(),
  shaded: z.number().int().min(0).optional(),
  groupSize: z.number().int().positive().optional(),
  simplifiedNumerator: z.number().int().min(0).optional(),
  simplifiedDenominator: z.number().int().positive().optional(),
  label: z.string().optional(),
});

export const FractionWallBlockSchema = z.object({
  type: z.literal("fraction_wall"),
  rows: z.array(z.object({
    denominator: z.number().int().positive(),
    highlightIndex: z.number().int().min(0).optional(),
    label: z.string().optional(),
  })).min(1),
  caption: z.string().optional(),
});

export const BarModelBlockSchema = z.object({
  type: z.literal("bar_model"),
  parts: z.array(z.object({
    label: z.string(),
    value: z.number().optional(),
    weight: z.number().positive().optional(),
    shaded: z.boolean().optional(),
  })).min(1),
  totalLabel: z.string().optional(),
  caption: z.string().optional(),
});

export const HundredSquareBlockSchema = z.object({
  type: z.literal("hundred_square"),
  shaded: z.number().min(0).max(100),
  label: z.string().optional(),
});

export const AreaModelBlockSchema = z.object({
  type: z.literal("area_model"),
  rows: z.number().int().min(1).max(20),
  cols: z.number().int().min(1).max(20),
  rowSplits: z.array(z.number().int().positive()).optional(),
  colSplits: z.array(z.number().int().positive()).optional(),
  labels: z.object({
    top: z.string().optional(),
    side: z.string().optional(),
    product: z.string().optional(),
  }).optional(),
  caption: z.string().optional(),
});

export const KeyInfoBlockSchema = z.object({
  type: z.literal("key_info"),
  stem: z.string().min(1),
  highlights: z.array(z.object({
    text: z.string().min(1),
    kind: z.enum(["number", "operation", "unit", "other"]).optional(),
  })).min(1),
  caption: z.string().optional(),
});

export const ForceDiagramBlockSchema = z.object({
  type: z.literal("force_diagram"),
  objectLabel: z.string().min(1).max(80),
  objectEmoji: z.string().max(16).optional(),
  forces: z.array(z.object({
    label: z.string().min(1).max(80),
    direction: z.enum(["up", "down", "left", "right"]),
    detail: z.string().max(120).optional(),
  })).min(1).max(6),
  caption: z.string().max(200).optional(),
  groundLabel: z.string().max(80).optional(),
});

// ── Table ─────────────────────────────────────────────────────────────────────

export const TableBlockSchema = z.object({
  type: z.literal("table"),
  headers: z.array(z.string()).min(1),
  rows: z.array(z.array(z.string())).min(1),
  mathColumns: z.array(z.number()).optional(),
  caption: z.string().optional(),
  highlightCells: z.array(z.tuple([z.number(), z.number()])).optional(),
});

// ── Chart ─────────────────────────────────────────────────────────────────────

export const BarDataSchema = z.object({
  label: z.string(),
  value: z.number(),
  color: z.string().optional(),
});

export const BoxPlotDataSchema = z.object({
  min: z.number(),
  q1: z.number(),
  median: z.number(),
  q3: z.number(),
  max: z.number(),
  outliers: z.array(z.number()).optional(),
});

export const CumulativeFrequencyPointSchema = z.object({
  upperBound: z.number(),
  cumulativeFrequency: z.number().min(0),
});

export const PieSliceSchema = z.object({
  label: z.string(),
  value: z.number().min(0),
  angle: z.number().optional(),
  color: z.string().optional(),
});

export const ClassIntervalSchema = z.object({
  from: z.number(),
  to: z.number(),
  frequency: z.number().min(0),
});

export const ChartBlockSchema = z.object({
  type: z.literal("chart"),
  chartType: z.enum(["bar", "histogram", "box_plot", "cumulative_frequency", "pie"]),
  title: z.string().optional(),
  xLabel: z.string().optional(),
  yLabel: z.string().optional(),
  bars: z.array(BarDataSchema).optional(),
  classIntervals: z.array(ClassIntervalSchema).optional(),
  boxPlot: BoxPlotDataSchema.optional(),
  cumulativePoints: z.array(CumulativeFrequencyPointSchema).optional(),
  slices: z.array(PieSliceSchema).optional(),
  xRange: z.tuple([z.number(), z.number()]).optional(),
  yRange: z.tuple([z.number(), z.number()]).optional(),
});

// ── Column Method ─────────────────────────────────────────────────────────────

export const ColumnMethodBlockSchema = z.object({
  type: z.literal("column_method"),
  method: z.enum(["long_division", "column_addition", "column_subtraction", "column_multiplication"]),
  rows: z.array(z.string()).min(1),
  carries: z.array(z.object({
    row: z.number().int().min(0),
    col: z.number().int().min(0),
    digit: z.string(),
  })).optional(),
  moves: z.array(z.object({
    fromRow: z.number().int().min(0),
    fromCol: z.number().int().min(0),
    toRow: z.number().int().min(0),
    toCol: z.number().int().min(0),
    label: z.string().optional(),
    kind: z.enum(["carry", "borrow"]).optional(),
  })).optional(),
  cellNotes: z.array(z.object({
    row: z.number().int().min(0),
    col: z.number().int().min(0),
    strike: z.boolean().optional(),
    rewrite: z.string().optional(),
  })).optional(),
  separatorAfterRows: z.array(z.number().int().min(0)).optional(),
  highlightCells: z.array(z.object({
    row: z.number().int().min(0),
    col: z.number().int().min(0),
  })).optional(),
  placeValueHeaders: z.array(z.string()).optional(),
  rowLabels: z.array(z.string()).optional(),
  question: z.string(),
  answer: z.string(),
});

// ── Text Block ────────────────────────────────────────────────────────────────

export const LessonSectionSchema = z.enum([
  "objective",
  "prerequisites",
  "vocabulary",
  "rule",
  "example",
  "mistakes",
  "recap",
]);

export const TextBlockSchema = z.object({
  type: z.literal("text"),
  content: z.string(),
  latex: z.string().optional(),
  section: LessonSectionSchema.optional(),
  heading: z.string().optional(),
});

// ── Discriminated Union ───────────────────────────────────────────────────────

export const VisualBlockSchema = z.discriminatedUnion("type", [
  EquationStepBlockSchema,
  CoordinateGraphBlockSchema,
  LabeledShapeBlockSchema,
  ProbabilityTreeBlockSchema,
  VennDiagramBlockSchema,
  NumberLineBlockSchema,
  FractionBarBlockSchema,
  FractionGridBlockSchema,
  FractionWallBlockSchema,
  BarModelBlockSchema,
  HundredSquareBlockSchema,
  AreaModelBlockSchema,
  KeyInfoBlockSchema,
  ForceDiagramBlockSchema,
  TableBlockSchema,
  ChartBlockSchema,
  ColumnMethodBlockSchema,
  TextBlockSchema,
]);

// ── Top-level Response ────────────────────────────────────────────────────────

export const WhiteboardResponseSchema = z.object({
  intro: z.string(),
  blocks: z.array(VisualBlockSchema).min(1).max(20),
  conclusion: z.string(),
  hint: z.string().optional().nullable(),
  subject: z.string().optional(),
  topic: z.string().optional(),
  casVerified: z.boolean().optional(),
  // Pedagogical scaffolding fields
  groundTruthSource: z.enum(["sympy", "nerdamer", "both", "none"]).optional(),
  sympyAnswer: z.string().optional(),
  keyTakeaway: z.string().optional(),
  examTip: z.string().optional(),
});

// ── Question classification ───────────────────────────────────────────────────

export const QuestionCategorySchema = z.enum([
  "algebra",
  "number",
  "geometry",
  "trigonometry",
  "statistics",
  "probability",
  "graphs",
  "calculus",
]);

// ── Teacher Mode ──────────────────────────────────────────────────────────────

export const TeacherQuestionDifficultySchema = z.enum([
  "easy",
  "medium",
  "hard",
  "exam",
]);

export const TeacherQuestionSchema = z.object({
  id: z.number().int().min(1),
  questionText: z.string().min(1),
  answer: z.string().min(1),
  answerLatex: z.string().optional(),
  difficulty: TeacherQuestionDifficultySchema,
  marks: z.number().int().min(1).optional(),
});

export const TeacherQuestionsResponseSchema = z.object({
  questions: z.array(TeacherQuestionSchema).min(1).max(25),
});
