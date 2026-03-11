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

export const EquationStepSchema = z.object({
  stepNumber: z.number().int().min(1),
  operationLabel: z.string().max(80),
  explanation: z.string(),
  latexBefore: z.string().default(""),
  latexAfter: z.string(),
  arrowDirection: z.enum(["down", "both_sides", "simplify"]).default("down"),
  arrows: z.array(CurlyArrowSchema).optional(),
  balanceNotation: z.string().optional(),
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
  separatorAfterRows: z.array(z.number().int().min(0)).optional(),
  question: z.string(),
  answer: z.string(),
});

// ── Text Block ────────────────────────────────────────────────────────────────

export const TextBlockSchema = z.object({
  type: z.literal("text"),
  content: z.string(),
  latex: z.string().optional(),
});

// ── Discriminated Union ───────────────────────────────────────────────────────

export const VisualBlockSchema = z.discriminatedUnion("type", [
  EquationStepBlockSchema,
  CoordinateGraphBlockSchema,
  LabeledShapeBlockSchema,
  ProbabilityTreeBlockSchema,
  VennDiagramBlockSchema,
  NumberLineBlockSchema,
  TableBlockSchema,
  ChartBlockSchema,
  ColumnMethodBlockSchema,
  TextBlockSchema,
]);

// ── Top-level Response ────────────────────────────────────────────────────────

export const WhiteboardResponseSchema = z.object({
  intro: z.string(),
  blocks: z.array(VisualBlockSchema).min(1).max(15),
  conclusion: z.string(),
  hint: z.string().optional().nullable(),
  subject: z.string().optional(),
  topic: z.string().optional(),
  casVerified: z.boolean().optional(),
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
