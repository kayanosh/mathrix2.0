/**
 * Narration Plan — converts a WhiteboardResponse into a flat list of
 * narration cues that the overlay player steps through one at a time.
 *
 * Each cue carries:
 *  - `blockIndex`   which block to highlight (-1 = intro / conclusion)
 *  - `subIndex`     for equation_steps: which step within the block
 *  - `text`         the sentences the TTS should speak
 *  - `kind`         used by the pointer to decide where to point
 */

import type {
  WhiteboardResponse,
  VisualBlock,
  EquationStepBlock,
  TextBlock,
  CoordinateGraphBlock,
  LabeledShapeBlock,
  ProbabilityTreeBlock,
  VennDiagramBlock,
  NumberLineBlock,
  TableBlock,
  ChartBlock,
  ColumnMethodBlock,
} from "@/types/whiteboard";

export interface NarrationCue {
  /** Index into WhiteboardResponse.blocks (-1 for intro / conclusion) */
  blockIndex: number;
  /** For equation_steps: which step inside the block (0-based). undefined otherwise. */
  subIndex?: number;
  /** The text to narrate with TTS */
  text: string;
  /** Semantic kind — the overlay uses this to decide rendering behaviour */
  kind:
    | "intro"
    | "equation_step"
    | "graph"
    | "shape"
    | "tree"
    | "venn"
    | "number_line"
    | "table"
    | "chart"
    | "column"
    | "text"
    | "conclusion"
    | "hint";
}

/** Build a flat narration timeline from a WhiteboardResponse */
export function buildNarrationPlan(data: WhiteboardResponse): NarrationCue[] {
  const cues: NarrationCue[] = [];

  // ── Intro ───────────────────────────────────────────────
  if (data.intro) {
    cues.push({ blockIndex: -1, text: data.intro, kind: "intro" });
  }

  // ── Blocks ──────────────────────────────────────────────
  data.blocks.forEach((block, bi) => {
    switch (block.type) {
      case "equation_steps":
        cuesForEquationSteps(cues, block, bi);
        break;
      case "text":
        cuesForText(cues, block, bi);
        break;
      case "coordinate_graph":
        cuesForGraph(cues, block, bi);
        break;
      case "labeled_shape":
        cuesForShape(cues, block, bi);
        break;
      case "probability_tree":
        cuesForTree(cues, block, bi);
        break;
      case "venn_diagram":
        cuesForVenn(cues, block, bi);
        break;
      case "number_line":
        cuesForNumberLine(cues, block, bi);
        break;
      case "table":
        cuesForTable(cues, block, bi);
        break;
      case "chart":
        cuesForChart(cues, block, bi);
        break;
      case "column_method":
        cuesForColumn(cues, block, bi);
        break;
      default: {
        const _: never = block;
        void _;
      }
    }
  });

  // ── Conclusion ──────────────────────────────────────────
  if (data.conclusion) {
    cues.push({ blockIndex: -2, text: data.conclusion, kind: "conclusion" });
  }

  // ── Key takeaway ────────────────────────────────────────
  if (data.keyTakeaway) {
    cues.push({ blockIndex: -3, text: `Key idea: ${data.keyTakeaway}`, kind: "hint" });
  }

  // ── Hint ────────────────────────────────────────────────
  if (data.hint) {
    cues.push({ blockIndex: -4, text: data.hint, kind: "hint" });
  }

  // ── Sanitise all text for TTS ──────────────────────────
  for (const cue of cues) {
    cue.text = sanitizeForTTS(cue.text);
  }

  return cues;
}

// ── Per-block helpers ────────────────────────────────────────────────────────

function cuesForEquationSteps(
  cues: NarrationCue[],
  block: EquationStepBlock,
  bi: number,
) {
  block.steps.forEach((step, si) => {
    let text =
      si === 0
        ? step.explanation || `Start with: ${strip(step.latexBefore || step.latexAfter)}`
        : step.explanation || step.operationLabel || `Step ${step.stepNumber}`;

    // Append rule name for TTS awareness (e.g. "This uses the inverse operations rule.")
    if (step.rule && si > 0) {
      text += ` This uses the ${step.rule} rule.`;
    }

    // Append self-check on the final step
    const isFinalStep = si === block.steps.length - 1;
    if (step.selfCheck && isFinalStep) {
      text += ` ${step.selfCheck}`;
    }

    cues.push({ blockIndex: bi, subIndex: si, text, kind: "equation_step" });
  });
}

function cuesForText(cues: NarrationCue[], block: TextBlock, bi: number) {
  cues.push({ blockIndex: bi, text: block.content, kind: "text" });
}

function cuesForGraph(
  cues: NarrationCue[],
  block: CoordinateGraphBlock,
  bi: number,
) {
  const lines = block.plots.map((p) => p.label || p.equation).join(", ");
  const pts = block.points?.map((p) => p.label).join(", ");
  let text = `Here's the graph showing ${lines || "the function"}.`;
  if (pts) text += ` Key points: ${pts}.`;
  cues.push({ blockIndex: bi, text, kind: "graph" });
}

function cuesForShape(
  cues: NarrationCue[],
  block: LabeledShapeBlock,
  bi: number,
) {
  const sides = block.sides?.map((s) => `${s.from}${s.to} = ${s.label}`).join(", ");
  const angles = block.angles?.map((a) => `${a.label} at ${a.vertex}`).join(", ");
  let text = `Here's the ${block.shape}.`;
  if (sides) text += ` Sides: ${sides}.`;
  if (angles) text += ` Angles: ${angles}.`;
  cues.push({ blockIndex: bi, text, kind: "shape" });
}

function cuesForTree(
  cues: NarrationCue[],
  block: ProbabilityTreeBlock,
  bi: number,
) {
  const branches = block.branches.map((b) => b.event).join(", ");
  cues.push({
    blockIndex: bi,
    text: `Here's the probability tree for ${block.rootLabel}. First branches: ${branches}.`,
    kind: "tree",
  });
}

function cuesForVenn(
  cues: NarrationCue[],
  block: VennDiagramBlock,
  bi: number,
) {
  const sets = block.sets.map((s) => s.label).join(" and ");
  cues.push({
    blockIndex: bi,
    text: `Here's the Venn diagram for ${sets}.`,
    kind: "venn",
  });
}

function cuesForNumberLine(
  cues: NarrationCue[],
  block: NumberLineBlock,
  bi: number,
) {
  const label = block.inequalityLabel || `range ${block.range[0]} to ${block.range[1]}`;
  cues.push({
    blockIndex: bi,
    text: `Here's the number line showing ${label}.`,
    kind: "number_line",
  });
}

function cuesForTable(cues: NarrationCue[], block: TableBlock, bi: number) {
  const caption = block.caption || "the data";
  cues.push({
    blockIndex: bi,
    text: `Here's a table showing ${caption}.`,
    kind: "table",
  });
}

function cuesForChart(cues: NarrationCue[], block: ChartBlock, bi: number) {
  const title = block.title || block.chartType.replace(/_/g, " ");
  cues.push({
    blockIndex: bi,
    text: `Here's the ${title} chart.`,
    kind: "chart",
  });
}

function cuesForColumn(
  cues: NarrationCue[],
  block: ColumnMethodBlock,
  bi: number,
) {
  cues.push({
    blockIndex: bi,
    text: `Let's work through ${block.question} using the ${block.method.replace(/_/g, " ")} method. The answer is ${block.answer}.`,
    kind: "column",
  });
}

// ── Utilities ────────────────────────────────────────────────────────────────

/**
 * Convert a LaTeX expression into natural spoken English.
 * Handles fractions, square roots, powers, trig, Greek letters, operators, etc.
 */
function latexToSpeech(latex: string): string {
  let s = latex;

  // Remove \htmlId{...}{content} → keep content
  s = s.replace(/\\htmlId\{[^}]*\}\{([^}]*)\}/g, "$1");

  // \text{...} → literal content
  s = s.replace(/\\text\{([^}]*)\}/g, "$1");

  // Fractions: \frac{a}{b} → "a over b"
  // Handle nested braces by doing multiple passes
  for (let i = 0; i < 4; i++) {
    s = s.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "$1 over $2");
  }

  // Square roots: \sqrt{...} → "the square root of ..."
  s = s.replace(/\\sqrt\{([^}]+)\}/g, "the square root of $1");

  // Powers: x^2, x^3, x^{n}
  s = s.replace(/\^{?\s*2\s*}?/g, " squared");
  s = s.replace(/\^{?\s*3\s*}?/g, " cubed");
  s = s.replace(/\^\{([^}]+)\}/g, " to the power of $1");
  s = s.replace(/\^(\d)/g, " to the power of $1");

  // Subscripts: x_{n} or x_n → "x sub n"
  s = s.replace(/_\{([^}]+)\}/g, " sub $1");
  s = s.replace(/_(\w)/g, " sub $1");

  // Greek letters
  const greekMap: Record<string, string> = {
    alpha: "alpha", beta: "beta", gamma: "gamma", delta: "delta",
    theta: "theta", pi: "pi", sigma: "sigma", lambda: "lambda",
    mu: "mu", epsilon: "epsilon", omega: "omega", phi: "phi",
    rho: "rho", tau: "tau",
  };
  for (const [cmd, spoken] of Object.entries(greekMap)) {
    s = s.replace(new RegExp(`\\\\${cmd}\\b`, "g"), spoken);
  }

  // Trig / log functions
  s = s.replace(/\\sin/g, "sin");
  s = s.replace(/\\cos/g, "cos");
  s = s.replace(/\\tan/g, "tan");
  s = s.replace(/\\log/g, "log");
  s = s.replace(/\\ln/g, "natural log of");

  // Calculus
  s = s.replace(/\\frac\{d(y?)\}\{d(x?)\}/g, "d$1 by d$2");
  s = s.replace(/\\int/g, "the integral of");
  s = s.replace(/\\sum/g, "the sum of");
  s = s.replace(/\\infty/g, "infinity");

  // Common operators & symbols
  s = s.replace(/\\times/g, " times ");
  s = s.replace(/\\cdot/g, " times ");
  s = s.replace(/\\div/g, " divided by ");
  s = s.replace(/\\pm/g, " plus or minus ");
  s = s.replace(/\\mp/g, " minus or plus ");
  s = s.replace(/\\leq/g, " is less than or equal to ");
  s = s.replace(/\\geq/g, " is greater than or equal to ");
  s = s.replace(/\\neq/g, " is not equal to ");
  s = s.replace(/\\approx/g, " is approximately ");
  s = s.replace(/\\lt/g, " is less than ");
  s = s.replace(/\\gt/g, " is greater than ");
  s = s.replace(/\\ldots/g, " and so on");
  s = s.replace(/\\dots/g, " and so on");
  s = s.replace(/\\rightarrow/g, " gives ");
  s = s.replace(/\\Rightarrow/g, " therefore ");
  s = s.replace(/\\therefore/g, " therefore ");
  s = s.replace(/\\phantom\{[^}]*\}/g, "");

  // Degree symbol
  s = s.replace(/°/g, " degrees");

  // Equals sign in speech
  s = s.replace(/=/g, " equals ");

  // Plus and minus — make spoken-friendly
  s = s.replace(/\+/g, " plus ");
  s = s.replace(/-/g, " minus ");

  // Clean up remaining LaTeX commands (\anything)
  s = s.replace(/\\[a-zA-Z]+/g, " ");
  // Remove braces
  s = s.replace(/[{}]/g, "");
  // Collapse whitespace
  s = s.replace(/\s+/g, " ");

  return s.trim();
}

/**
 * Sanitise any narration text for TTS:
 *  1. Strip $...$ delimiters and convert contained LaTeX to speech
 *  2. Convert standalone LaTeX fragments too
 *  3. Remove emoji characters
 *  4. Tidy up punctuation and whitespace
 */
export function sanitizeForTTS(raw: string): string {
  // 1. Handle $...$ inline LaTeX — convert contents to speech
  let s = raw.replace(/\$([^$]+)\$/g, (_match, tex: string) => latexToSpeech(tex));

  // 2. Also convert any remaining LaTeX-like fragments (e.g. \frac not in $...$)
  if (/\\[a-zA-Z]/.test(s)) {
    s = latexToSpeech(s);
  }

  // 3. Remove emoji (Unicode ranges for common emoji blocks)
  s = s.replace(
    /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu,
    "",
  );

  // 4. Remove stray symbols that don't help speech
  s = s.replace(/[✓✗✘✔️]/g, "");
  s = s.replace(/[│┃━─]+/g, "");

  // 5. Clean up punctuation and whitespace
  s = s.replace(/\s+/g, " ");
  s = s.replace(/\s+([.,;:!?])/g, "$1");
  s = s.trim();

  return s;
}

/** Strip LaTeX commands for TTS readability (legacy, used in fallback) */
function strip(latex: string): string {
  return latexToSpeech(latex);
}
