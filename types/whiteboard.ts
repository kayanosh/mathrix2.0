/**
 * Whiteboard Visual Primitives — Type System
 *
 * Claude outputs semantic math data (these types).
 * The client renders them deterministically — Claude never specifies layout coordinates.
 */

// ── Shared primitives ─────────────────────────────────────────────────────────

export interface CurlyArrow {
  /** Unique ID for this arrow (used by renderer to create SVG element IDs) */
  id: string;
  /** What this arrow shows — rendered as a label along the curve */
  label: string;
  /** LaTeX of the term at the start of the arrow (e.g. "+4") */
  fromTerm: string;
  /** LaTeX of the term at the end of the arrow (e.g. "−4") */
  toTerm: string;
  /** Visual style */
  style: "curly" | "straight" | "loop-over";
  /** Plain-English rule (e.g. "adding becomes subtracting") */
  signRule?: string;
  /** Colour override — defaults to the step palette colour */
  color?: string;
}

export interface Point2D {
  x: number;
  y: number;
}

export interface LabeledPoint {
  point: Point2D;
  label: string;
  /** KaTeX string if the label is mathematical */
  latex?: string;
}

// ── Block: Equation Steps (algebra) ───────────────────────────────────────────

export interface EquationStep {
  stepNumber: number;
  /** Short description shown on the arrow connector (≤60 chars) */
  operationLabel: string;
  /** One sentence: WHY we do this (for a 15-year-old) */
  explanation: string;
  /** LaTeX of expression BEFORE this step (populated on step 1) */
  latexBefore: string;
  /** LaTeX of expression AFTER this step */
  latexAfter: string;
  /** How this step relates to the next visually */
  arrowDirection: "down" | "both_sides" | "simplify";
  /** Curly arrows showing terms moving across the = sign */
  arrows?: CurlyArrow[];
  /** LaTeX for the | notation on both sides, e.g. "-4" or "\\div 2" */
  balanceNotation?: string;
}

export interface EquationStepBlock {
  type: "equation_steps";
  steps: EquationStep[];
}

// ── Block: Coordinate Graph ───────────────────────────────────────────────────

export interface PlotLine {
  /** LaTeX of the equation, e.g. "y = 2x + 1" */
  equation: string;
  /** JavaScript expression for y as a function of x, e.g. "2*x + 1" */
  fn: string;
  color?: string;
  style?: "solid" | "dashed" | "dotted";
  label?: string;
}

export interface CoordinateGraphBlock {
  type: "coordinate_graph";
  xRange: [number, number];
  yRange: [number, number];
  plots: PlotLine[];
  points?: LabeledPoint[];
  /** Show grid lines */
  grid?: boolean;
  /** Axis labels */
  xLabel?: string;
  yLabel?: string;
  /** Lines or segments to draw (e.g. tangent lines, asymptotes) */
  segments?: { from: Point2D; to: Point2D; color?: string; style?: "solid" | "dashed"; label?: string }[];
}

// ── Block: Labeled Shape (geometry) ───────────────────────────────────────────

export interface AngleArc {
  /** Which vertex the angle is at */
  vertex: string;
  /** Degrees (number) */
  degrees: number;
  /** Label to show (e.g. "90°", "θ", "x") */
  label: string;
  /** Whether to show the right-angle square marker */
  isRightAngle?: boolean;
}

export interface SideLabel {
  /** Vertex labels for the endpoints, e.g. "A" and "B" */
  from: string;
  to: string;
  /** Display label (e.g. "5 cm", "x", "hyp") */
  label: string;
  /** Whether to show parallel tick marks */
  parallelMarks?: number;
}

export interface LabeledShapeBlock {
  type: "labeled_shape";
  shape: "triangle" | "circle" | "rectangle" | "parallelogram" | "trapezium" | "polygon";
  /** Vertex labels and optional explicit coordinates (usually omitted — renderer computes layout) */
  vertices?: { label: string; position?: Point2D }[];
  sides?: SideLabel[];
  angles?: AngleArc[];
  /** For circles */
  circle?: {
    center?: string;
    radius?: string;
    showRadius?: boolean;
    showDiameter?: boolean;
    chords?: { from: string; to: string; label?: string }[];
    tangentPoints?: string[];
    sectors?: { from: string; to: string; shaded?: boolean }[];
  };
  /** Construction marks (arcs, bisectors) */
  constructions?: { type: "angle_bisector" | "perpendicular_bisector" | "arc"; description: string }[];
  /** Annotations — curly arrows showing relationships */
  arrows?: CurlyArrow[];
}

// ── Block: Probability Tree ───────────────────────────────────────────────────

export interface TreeBranch {
  /** Event name (e.g. "Heads", "Red") */
  event: string;
  /** Probability as a LaTeX string (e.g. "\\frac{1}{2}") */
  probability: string;
  /** Decimal value for validation (must sum to 1 across siblings) */
  probabilityValue: number;
  /** Sub-branches (next level) */
  children?: TreeBranch[];
}

export interface ProbabilityTreeBlock {
  type: "probability_tree";
  /** Root event description (e.g. "First coin", "Bag A") */
  rootLabel: string;
  branches: TreeBranch[];
  /** Outcomes to highlight — indices path (e.g. [0, 1] for first branch → second child) */
  highlightPaths?: number[][];
  /** Whether to show P(outcome) calculations at leaf nodes */
  showOutcomeProbabilities?: boolean;
}

// ── Block: Venn Diagram ───────────────────────────────────────────────────────

export interface VennSet {
  label: string;
  elements?: string[];
}

export interface VennRegion {
  /** Which region: "A_only", "B_only", "A_and_B", "neither", "A_or_B", etc. */
  region: string;
  /** Value or elements to display */
  value: string;
  /** Whether this region is shaded/highlighted */
  highlighted?: boolean;
}

export interface VennDiagramBlock {
  type: "venn_diagram";
  sets: VennSet[];
  regions: VennRegion[];
  /** Universal set label (default: "ξ") */
  universalLabel?: string;
  /** Total in universal set */
  universalTotal?: number;
}

// ── Block: Number Line ────────────────────────────────────────────────────────

export interface NumberLineMarker {
  value: number;
  label?: string;
  /** Open circle (strict inequality) or filled (inclusive) */
  style: "open" | "filled";
}

export interface NumberLineShading {
  from: number;
  to: number;
  /** Shade extends to infinity in that direction */
  fromInfinity?: boolean;
  toInfinity?: boolean;
  color?: string;
}

export interface NumberLineBlock {
  type: "number_line";
  range: [number, number];
  tickInterval: number;
  markers: NumberLineMarker[];
  shading?: NumberLineShading[];
  /** Inequality expression to label (e.g. "x > 3") */
  inequalityLabel?: string;
}

// ── Block: Table ──────────────────────────────────────────────────────────────

export interface TableBlock {
  type: "table";
  headers: string[];
  rows: string[][];
  /** Column that should be rendered as KaTeX */
  mathColumns?: number[];
  /** Caption / title */
  caption?: string;
  /** Cells to highlight: [row, col] pairs */
  highlightCells?: [number, number][];
}

// ── Block: Chart (bar, histogram, box plot, cumulative frequency, pie) ────────

export interface BarData {
  label: string;
  value: number;
  color?: string;
}

export interface BoxPlotData {
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  outliers?: number[];
}

export interface CumulativeFrequencyPoint {
  upperBound: number;
  cumulativeFrequency: number;
}

export interface PieSlice {
  label: string;
  value: number;
  angle?: number;
  color?: string;
}

export interface ChartBlock {
  type: "chart";
  chartType: "bar" | "histogram" | "box_plot" | "cumulative_frequency" | "pie";
  title?: string;
  xLabel?: string;
  yLabel?: string;
  /** For bar chart / histogram */
  bars?: BarData[];
  /** For histogram: class intervals */
  classIntervals?: { from: number; to: number; frequency: number }[];
  /** For box plot */
  boxPlot?: BoxPlotData;
  /** For cumulative frequency */
  cumulativePoints?: CumulativeFrequencyPoint[];
  /** For pie chart */
  slices?: PieSlice[];
  /** Axis ranges if not auto-computed */
  xRange?: [number, number];
  yRange?: [number, number];
}

// ── Block: Column Method (long division, column addition/multiplication) ──────

export interface ColumnMethodBlock {
  type: "column_method";
  method: "long_division" | "column_addition" | "column_subtraction" | "column_multiplication";
  /** The digits/rows as strings — one string per row of the working */
  rows: string[];
  /** Carry digits: { row, col, digit } */
  carries?: { row: number; col: number; digit: string }[];
  /** Horizontal separator lines after certain rows (0-indexed) */
  separatorAfterRows?: number[];
  /** The original question (e.g. "384 ÷ 12") */
  question: string;
  /** Final answer */
  answer: string;
}

// ── Block: Text Explanation (fallback) ────────────────────────────────────────

export interface TextBlock {
  type: "text";
  content: string;
  /** Optional LaTeX expressions inline */
  latex?: string;
}

// ── Discriminated Union ───────────────────────────────────────────────────────

export type VisualBlock =
  | EquationStepBlock
  | CoordinateGraphBlock
  | LabeledShapeBlock
  | ProbabilityTreeBlock
  | VennDiagramBlock
  | NumberLineBlock
  | TableBlock
  | ChartBlock
  | ColumnMethodBlock
  | TextBlock;

// ── Top-level Response ────────────────────────────────────────────────────────

export interface VerificationStatus {
  /** Pre-solve CAS verification (nerdamer solved before LLM) */
  preCasVerified: boolean;
  /** Post-solve CAS verification (nerdamer checked LLM answer) */
  postCasVerified: boolean;
  /** Critic model independently verified the solution */
  criticVerified: boolean;
  /** Deterministic tool checks passed */
  toolChecksPassed: boolean;
  /** Overall confidence */
  confidence: "high" | "medium" | "low";
  /** Any warnings from the verification pipeline */
  warnings: string[];
}

export interface WhiteboardResponse {
  /** Friendly opening sentence */
  intro: string;
  /** Visual blocks rendered in order on the whiteboard */
  blocks: VisualBlock[];
  /** Final answer clearly stated */
  conclusion: string;
  /** Common mistake to avoid */
  hint?: string;
  /** Detected subject */
  subject?: string;
  /** Detected topic */
  topic?: string;
  /** Whether the final answer was verified by a CAS (Computer Algebra System) */
  casVerified?: boolean;
  /** Detailed verification metadata from the two-pass pipeline */
  verification?: VerificationStatus;
}

// ── Question Classification ───────────────────────────────────────────────────

export type QuestionCategory =
  | "algebra"
  | "number"
  | "geometry"
  | "trigonometry"
  | "statistics"
  | "probability"
  | "graphs"
  | "calculus";

// ── Re-exports from legacy types for backward compat ──────────────────────────

export type { ExamLevel, ExamBoard, Subject, Topic } from "./index";
