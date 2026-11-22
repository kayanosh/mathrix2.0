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
  CuboidArrayBlock,
} from "@/types/whiteboard";
import { buildColumnRevealTimeline } from "@/lib/column-reveal";
import { mathsToSpeech, pauseBeforeEquals, proseToSpeech } from "@/lib/speech-text";

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
    | "teaching_step"
    | "text"
    | "conclusion"
    | "hint";
}

type TeachingStep = NonNullable<WhiteboardResponse["teachingSteps"]>[number];

function findTeachingVisualIndex(
  data: WhiteboardResponse,
  step: TeachingStep,
): number {
  if (
    typeof step.blockIndex === "number" &&
    step.blockIndex >= 0 &&
    step.blockIndex < data.blocks.length
  ) {
    return step.blockIndex;
  }

  const searchable = `${step.title} ${step.explanation} ${step.narration}`.toLowerCase();
  const preferredTypes: Array<WhiteboardResponse["blocks"][number]["type"]> = [];

  if (/carry|borrow|exchange|partial product|bus.?stop|bring down|ones|tens|hundreds/.test(searchable)) {
    preferredTypes.push("column_method");
  }
  if (/number line|halfway|between|multiple|round up|round down|below zero/.test(searchable)) {
    preferredTypes.push("number_line");
  }
  if (/place.?value|chart|table|column/.test(searchable)) {
    preferredTypes.push("table");
  }
  if (/fraction grid|group.*fraction|simplif/.test(searchable)) {
    preferredTypes.push("fraction_grid", "fraction_bar");
  } else if (/fraction bar|equal parts|shaded/.test(searchable)) {
    preferredTypes.push("fraction_bar", "fraction_wall");
  }
  if (/shape|angle|side|perimeter|area of/.test(searchable)) {
    preferredTypes.push("labeled_shape", "area_model");
  }
  if (/volume|cuboid|unit cube|layer/.test(searchable)) {
    preferredTypes.push("cuboid_array");
  }
  if (/equation|calculate|work out|missing number/.test(searchable)) {
    preferredTypes.push("equation_steps");
  }

  for (const type of preferredTypes) {
    const index = data.blocks.findIndex((block) => block.type === type);
    if (index >= 0) return index;
  }

  // Method builders put their primary teaching visual first. Keep using that
  // visual for the whole micro-sequence instead of jumping between blocks.
  return data.blocks.length > 0 ? 0 : -1;
}

function appendTeachingDetail(text: string, detail?: string, prefix = ""): string {
  if (!detail?.trim()) return text;
  const clean = detail.trim();
  const fingerprint = clean.toLowerCase().replace(/[^a-z0-9 ]/g, "").slice(0, 28);
  const haystack = text.toLowerCase().replace(/[^a-z0-9 ]/g, "");
  if (fingerprint && haystack.includes(fingerprint)) return text;
  return `${text.trim()} ${prefix}${clean}`.trim();
}

/** Build a flat narration timeline from a WhiteboardResponse */
export function buildNarrationPlan(data: WhiteboardResponse): NarrationCue[] {
  const cues: NarrationCue[] = [];

  // ── Intro ───────────────────────────────────────────────
  if (data.intro) {
    cues.push({ blockIndex: -1, text: data.intro, kind: "intro" });
  }

  // ── Rich KS2 teaching steps ─────────────────────────────
  if (data.teachingSteps?.length) {
    data.teachingSteps.forEach((step, si) => {
      const visualIndex = findTeachingVisualIndex(data, step);
      let text = step.narration || step.explanation;
      text = appendTeachingDetail(text, step.why, "This works because ");
      text = appendTeachingDetail(text, step.check, "Quick check: ");
      cues.push({
        blockIndex: visualIndex,
        subIndex: step.revealStep ?? si,
        text,
        kind: "teaching_step",
      });
    });
  } else data.blocks.forEach((block, bi) => {
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
      case "fraction_bar":
        cues.push({
          blockIndex: bi,
          text: block.label
            ? `Look at the fraction bar for ${block.label}.`
            : `Look at this fraction bar showing ${block.numerator} out of ${block.denominator}.`,
          kind: "hint",
        });
        break;
      case "fraction_grid":
        cues.push({
          blockIndex: bi,
          text: block.label
            ? `Look at the fraction grid: ${block.label}.`
            : `Look at this fraction grid showing ${block.numerator} out of ${block.denominator}${
                block.groupSize
                  ? `, grouped in ${block.groupSize}s`
                  : ""
              }.`,
          kind: "hint",
        });
        break;
      case "fraction_wall":
        cues.push({
          blockIndex: bi,
          text: block.caption || "Compare the rows on this fraction wall.",
          kind: "hint",
        });
        break;
      case "bar_model":
        cues.push({
          blockIndex: bi,
          text: block.caption || "Use this bar model to see the parts.",
          kind: "hint",
        });
        break;
      case "hundred_square":
        cues.push({
          blockIndex: bi,
          text: block.label || `${block.shaded} out of 100 on the hundred square.`,
          kind: "hint",
        });
        break;
      case "area_model":
        cues.push({
          blockIndex: bi,
          text:
            block.labels?.product ||
            block.caption ||
            `An area model with ${block.rows} by ${block.cols}.`,
          kind: "hint",
        });
        break;
      case "cuboid_array":
        cuesForCuboidArray(cues, block, bi);
        break;
      case "key_info":
        cues.push({
          blockIndex: bi,
          text: block.caption || "Highlight the key information in the question.",
          kind: "hint",
        });
        break;
      case "force_diagram":
        cues.push({
          blockIndex: bi,
          text:
            block.caption ||
            `Follow each arrow to see the forces acting on the ${block.objectLabel}.`,
          kind: "hint",
        });
        break;
      case "angle_scale":
        cues.push({
          blockIndex: bi,
          text:
            block.caption ||
            "Every angle belongs to a family — acute angles are smaller than a right angle, obtuse angles are bigger, and a straight angle is a flat line.",
          kind: "hint",
        });
        break;
      case "protractor":
        cues.push({
          blockIndex: bi,
          text:
            block.caption ||
            (block.revealReading === false
              ? `Look at the angle at ${block.vertex || "the vertex"} — is it bigger or smaller than a right angle? Estimate first.`
              : `Line the protractor centre on ${block.vertex || "the vertex"}, start from zero on the baseline arm, and read the scale to ${block.angle} degrees.`),
          kind: "hint",
        });
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

    text = appendTeachingDetail(text, step.why, "This works because ");

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

function cuesForCuboidArray(
  cues: NarrationCue[],
  block: CuboidArrayBlock,
  bi: number,
) {
  const layerSize = block.length * block.width;
  cues.push({
    blockIndex: bi,
    text: `The cuboid is ${block.length} cubes long and ${block.width} cubes deep, so one layer has ${layerSize} cubes. It is ${block.height} layers high.`,
    kind: "shape",
  });
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
  // One cue per teaching step, computed deterministically from the digits so
  // narration always matches what appears on the board. The tutor overlay
  // builds the SAME timeline and maps cue subIndex → revealed step.
  const steps = buildColumnRevealTimeline(block);
  steps.forEach((step, si) => {
    cues.push({
      blockIndex: bi,
      subIndex: si,
      text: step.narration,
      kind: "column",
    });
  });
}

// ── Utilities ────────────────────────────────────────────────────────────────

/**
 * Make any narration text ready for the voice (and for the caption, which
 * shows the same words):
 *  1. `$...$` maths → spoken words
 *  2. LaTeX commands left outside dollar signs → spoken words
 *  3. maths typed into the sentence as plain text ("3x + 7 = 25", "5cm²")
 *  4. emoji and decoration removed
 *  5. a short pause before "equals" after a sum
 *
 * The rules themselves live in lib/speech-text.ts.
 */
export function sanitizeForTTS(raw: string): string {
  let s = raw.replace(/\$\$?([^$]+)\$\$?/g, (_match, tex: string) => mathsToSpeech(tex));

  if (/\\[a-zA-Z%]/.test(s)) {
    s = mathsToSpeech(s, { prose: true });
  }

  // Emoji (Unicode ranges for the common blocks). The misc-symbols block is
  // removed before the maths symbols are read, none of which are in it.
  s = s.replace(
    /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu,
    "",
  );
  s = s.replace(/[✓✗✘✔️]/g, "");
  s = s.replace(/[│┃━─]+/g, "");

  s = proseToSpeech(s);

  s = s.replace(/\s+/g, " ");
  s = s.replace(/\s+([.,;:!?])/g, "$1");
  s = s.replace(/,(\s*,)+/g, ",");
  s = pauseBeforeEquals(s.trim());

  return s;
}

/** A line of LaTeX as spoken words, for narration built from the board itself. */
function strip(latex: string): string {
  return mathsToSpeech(latex);
}
