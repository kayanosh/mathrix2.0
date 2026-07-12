/**
 * Wave 3 KS2 builders: angles, coordinates, bar charts, unit conversion, ratio, function machines.
 */

import type {
  ChartBlock,
  CoordinateGraphBlock,
  EquationStepBlock,
  LabeledShapeBlock,
  TableBlock,
} from "@/types/whiteboard";
import type { MethodBuildResult, TeachingStep } from "@/lib/methods/types";
import { normalizeMathText } from "@/lib/methods/normalize-math-text";

/** Straight line / around a point missing angle. */
export function parseAngleProblem(
  text: string,
): { known: number[]; total: 180 | 360 } | null {
  const t = normalizeMathText(text);
  const total: 180 | 360 = /\b(around a point|full turn|360)\b/i.test(t)
    ? 360
    : /\b(straight line|180)\b/i.test(t)
      ? 180
      : /\bangle\b/i.test(t)
        ? 180
        : 180;
  if (!/\bangle\b/i.test(t) && !/\b(straight line|around a point)\b/i.test(t)) {
    return null;
  }
  const known = [...t.matchAll(/(\d+)\s*°/g)].map((m) => parseInt(m[1], 10));
  if (known.length === 0) {
    const plain = [...t.matchAll(/\b(\d{2,3})\b/g)].map((m) => parseInt(m[1], 10));
    const filtered = plain.filter((n) => n > 0 && n < total);
    if (filtered.length === 0) return null;
    return { known: filtered.slice(0, 2), total };
  }
  return { known, total };
}

export function buildAngleDiagram(
  known: number[],
  total: 180 | 360,
): MethodBuildResult {
  const sumKnown = known.reduce((a, b) => a + b, 0);
  const missing = total - sumKnown;
  const shape: LabeledShapeBlock = {
    type: "labeled_shape",
    shape: "triangle",
    vertices: [{ label: "A" }, { label: "B" }, { label: "C" }],
    angles: [
      ...known.map((d, i) => ({
        vertex: ["A", "B", "C"][i] || "A",
        degrees: d,
        label: `${d}°`,
      })),
      {
        vertex: ["A", "B", "C"][known.length] || "C",
        degrees: missing,
        label: `${missing}°`,
      },
    ],
  };
  const steps: EquationStepBlock = {
    type: "equation_steps",
    steps: [
      {
        stepNumber: 1,
        operationLabel: total === 180 ? "Angles on a straight line" : "Angles around a point",
        explanation:
          total === 180
            ? "Angles on a straight line add to 180°."
            : "Angles around a point add to 360°.",
        rule: total === 180 ? "Straight line" : "Around a point",
        latexBefore: known.map((k) => `${k}^{\\circ}`).join(" + ") + ` + x = ${total}^{\\circ}`,
        latexAfter: `x = ${total}^{\\circ} - ${sumKnown}^{\\circ}`,
        arrowDirection: "simplify",
      },
      {
        stepNumber: 2,
        operationLabel: "Find the missing angle",
        explanation: `${total} − ${sumKnown} = ${missing}°.`,
        latexBefore: `${total} - ${sumKnown}`,
        latexAfter: `${missing}^{\\circ}`,
        arrowDirection: "simplify",
      },
    ],
  };
  return {
    builderId: "angle_diagram",
    block: shape,
    extraBlocks: [steps],
    teachingSteps: [
      {
        title: "Missing angle",
        explanation: `${missing}°`,
        why:
          total === 180
            ? "Straight-line angles sum to 180°."
            : "Angles around a point sum to 360°.",
        narration: `The missing angle is ${missing} degrees.`,
        cellKeys: [],
        carryKeys: [],
        noteKeys: [],
        showAnswer: true,
      },
    ],
    captions: [`Missing angle = ${missing}°`],
    answer: `${missing}°`,
    intro: `Find the missing angle (${total === 180 ? "straight line" : "around a point"}).`,
  };
}

export function parseCoordinatePlot(
  text: string,
): { points: { x: number; y: number; label: string }[] } | null {
  const t = normalizeMathText(text);
  if (!/\b(coordinate|plot|grid|quadrant|translate|reflect)\b/i.test(t)) return null;
  const pts: { x: number; y: number; label: string }[] = [];
  const re = /\(?\s*(-?\d+)\s*,\s*(-?\d+)\s*\)?/g;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(t)) !== null) {
    pts.push({
      x: parseInt(m[1], 10),
      y: parseInt(m[2], 10),
      label: String.fromCharCode(65 + i),
    });
    i++;
    if (i >= 6) break;
  }
  if (pts.length === 0) return null;
  return { points: pts };
}

export function buildCoordinatePlot(
  points: { x: number; y: number; label: string }[],
): MethodBuildResult {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const pad = 1;
  const block: CoordinateGraphBlock = {
    type: "coordinate_graph",
    xRange: [Math.min(0, ...xs) - pad, Math.max(0, ...xs) + pad],
    yRange: [Math.min(0, ...ys) - pad, Math.max(0, ...ys) + pad],
    plots: [],
    points: points.map((p) => ({
      point: { x: p.x, y: p.y },
      label: `${p.label}(${p.x},${p.y})`,
    })),
    grid: true,
    xLabel: "x",
    yLabel: "y",
  };
  const teachingSteps: TeachingStep[] = [
    {
      title: "Plot the points",
      explanation: points.map((p) => `${p.label}(${p.x}, ${p.y})`).join("; "),
      why: "x is across, y is up/down — from the origin (0,0).",
      narration: `Plot ${points.map((p) => p.label).join(", ")} on the grid.`,
      cellKeys: [],
      carryKeys: [],
      noteKeys: [],
      showAnswer: true,
    },
  ];
  return {
    builderId: "coordinate_plot",
    block,
    teachingSteps,
    captions: teachingSteps.map((s) => s.explanation),
    answer: points.map((p) => `(${p.x},${p.y})`).join(", "),
    intro: `Let's plot these coordinates on a grid.`,
  };
}

export function parseBarChart(
  text: string,
): { bars: { label: string; value: number }[] } | null {
  const t = normalizeMathText(text);
  if (!/\b(bar chart|bar graph|pictogram|frequency)\b/i.test(t)) return null;
  const bars: { label: string; value: number }[] = [];
  const re = /([A-Za-z][A-Za-z\s]{0,12}?)\s*[:=]\s*(\d+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t)) !== null) {
    bars.push({ label: m[1].trim(), value: parseInt(m[2], 10) });
  }
  if (bars.length < 2) {
    // fallback demo-ish parse of "Red 3, Blue 5"
    const re2 = /([A-Za-z]+)\s+(\d+)/g;
    while ((m = re2.exec(t)) !== null) {
      bars.push({ label: m[1], value: parseInt(m[2], 10) });
    }
  }
  return bars.length >= 2 ? { bars: bars.slice(0, 8) } : null;
}

export function buildBarChart(
  bars: { label: string; value: number }[],
): MethodBuildResult {
  const chart: ChartBlock = {
    type: "chart",
    chartType: "bar",
    title: "Bar chart",
    xLabel: "Category",
    yLabel: "Frequency",
    bars: bars.map((b, i) => ({
      label: b.label,
      value: b.value,
      color: ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"][i % 5],
    })),
  };
  const table: TableBlock = {
    type: "table",
    headers: ["Category", "Frequency"],
    rows: bars.map((b) => [b.label, String(b.value)]),
  };
  const total = bars.reduce((s, b) => s + b.value, 0);
  return {
    builderId: "bar_chart_stats",
    block: chart,
    extraBlocks: [table],
    teachingSteps: [
      {
        title: "Read the chart",
        explanation: `Total frequency = ${total}. Tallest bar is ${
          [...bars].sort((a, b) => b.value - a.value)[0].label
        }.`,
        narration: `Here's the bar chart from the data.`,
        cellKeys: [],
        carryKeys: [],
        noteKeys: [],
        showAnswer: true,
      },
    ],
    captions: [`Total = ${total}`],
    answer: `total ${total}`,
    intro: `Let's show this data on a bar chart.`,
  };
}

export function parseUnitConversion(
  text: string,
): { value: number; from: string; to: string; factor: number } | null {
  const t = normalizeMathText(text);
  const m = t.match(
    /(\d+(?:\.\d+)?)\s*(km|m|cm|mm|kg|g|l|ml)\s*(?:to|into|=|in)\s*(km|m|cm|mm|kg|g|l|ml)/i,
  );
  if (!m) return null;
  const value = parseFloat(m[1]);
  const from = m[2].toLowerCase();
  const to = m[3].toLowerCase();
  const scale: Record<string, number> = {
    km: 1000,
    m: 1,
    cm: 0.01,
    mm: 0.001,
    kg: 1000,
    g: 1,
    l: 1000,
    ml: 1,
  };
  // Convert via base unit within family
  const length = new Set(["km", "m", "cm", "mm"]);
  const mass = new Set(["kg", "g"]);
  const vol = new Set(["l", "ml"]);
  const sameFamily =
    (length.has(from) && length.has(to)) ||
    (mass.has(from) && mass.has(to)) ||
    (vol.has(from) && vol.has(to));
  if (!sameFamily) return null;
  const factor = scale[from] / scale[to];
  return { value, from, to, factor };
}

export function buildUnitConversion(
  value: number,
  from: string,
  to: string,
  factor: number,
): MethodBuildResult {
  const result = value * factor;
  const multiply = factor >= 1;
  const steps: EquationStepBlock = {
    type: "equation_steps",
    steps: [
      {
        stepNumber: 1,
        operationLabel: multiply ? "Multiply" : "Divide",
        explanation: multiply
          ? `Going to a smaller unit: multiply by ${factor}.`
          : `Going to a larger unit: multiply by ${factor} (or divide by ${1 / factor}).`,
        latexBefore: `${value}\\,\\mathrm{${from}}`,
        latexAfter: `${value} \\times ${factor} = ${result}\\,\\mathrm{${to}}`,
        arrowDirection: "simplify",
      },
    ],
  };
  const table: TableBlock = {
    type: "table",
    headers: ["From", "Operation", "To"],
    rows: [[`${value} ${from}`, `× ${factor}`, `${result} ${to}`]],
  };
  return {
    builderId: "unit_conversion",
    block: table,
    extraBlocks: [steps],
    teachingSteps: [
      {
        title: "Convert",
        explanation: `${value} ${from} = ${result} ${to}`,
        why: multiply
          ? "Smaller units need a bigger number."
          : "Larger units need a smaller number.",
        narration: `${value} ${from} equals ${result} ${to}.`,
        cellKeys: [],
        carryKeys: [],
        noteKeys: [],
        showAnswer: true,
      },
    ],
    captions: [`${value} ${from} = ${result} ${to}`],
    answer: `${result} ${to}`,
    intro: `Convert ${value} ${from} into ${to}.`,
  };
}

export function parseRatio(
  text: string,
): { parts: number[]; total?: number } | null {
  const t = normalizeMathText(text);
  if (!/\bratio\b|\bproportion\b|\bshare\b/i.test(t)) return null;
  const m = t.match(/(\d+)\s*:\s*(\d+)(?:\s*:\s*(\d+))?/);
  if (!m) return null;
  const parts = [parseInt(m[1], 10), parseInt(m[2], 10)];
  if (m[3]) parts.push(parseInt(m[3], 10));
  const totalM = t.match(/(?:total|altogether|shared?)\s*(\d+)/i);
  return { parts, total: totalM ? parseInt(totalM[1], 10) : undefined };
}

export function buildRatioTable(
  parts: number[],
  total?: number,
): MethodBuildResult {
  const sum = parts.reduce((a, b) => a + b, 0);
  const rows: string[][] = [
    ["Parts", ...parts.map(String), `Total ${sum}`],
  ];
  let shares: number[] | undefined;
  if (total != null && sum > 0) {
    const unit = total / sum;
    shares = parts.map((p) => p * unit);
    rows.push(["Share", ...shares.map(String), String(total)]);
  }
  const table: TableBlock = {
    type: "table",
    headers: ["", ...parts.map((_, i) => `Part ${i + 1}`), "Total"],
    rows,
    caption: `Ratio ${parts.join(":")}`,
  };
  return {
    builderId: "ratio_table",
    block: table,
    teachingSteps: [
      {
        title: "Ratio parts",
        explanation:
          total != null && shares
            ? `Unit = ${total}/${sum}. Shares: ${shares.join(", ")}.`
            : `The ratio has ${sum} parts altogether.`,
        why: "Each 'part' is the same size.",
        narration: `Let's share in the ratio ${parts.join(" to ")}.`,
        cellKeys: [],
        carryKeys: [],
        noteKeys: [],
        showAnswer: true,
      },
    ],
    captions: [`Ratio ${parts.join(":")}`],
    answer:
      shares != null ? shares.join(", ") : parts.join(":"),
    intro: `Share in the ratio ${parts.join(":")}.`,
  };
}

export function parseFunctionMachine(
  text: string,
): { input: number; ops: { op: string; n: number }[] } | null {
  const t = normalizeMathText(text);
  if (!/\b(function machine|input|output|then)\b/i.test(t)) return null;
  const inputM = t.match(/input\s*(\d+)/i) || t.match(/\b(\d+)\s*(?:→|->|then)/);
  if (!inputM) return null;
  const input = parseInt(inputM[1], 10);
  const ops: { op: string; n: number }[] = [];
  const re = /([++\-−×x*÷/]|plus|minus|times|divide(?:d)?\s+by)\s*(\d+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t)) !== null) {
    const raw = m[1].toLowerCase();
    let op = "+";
    if (raw.includes("minus") || raw === "-" || raw === "−") op = "-";
    else if (raw.includes("times") || raw === "×" || raw === "x" || raw === "*")
      op = "×";
    else if (raw.includes("div") || raw === "÷" || raw === "/") op = "÷";
    else op = "+";
    ops.push({ op, n: parseInt(m[2], 10) });
  }
  if (ops.length === 0) return null;
  return { input, ops };
}

export function buildFunctionMachine(
  input: number,
  ops: { op: string; n: number }[],
): MethodBuildResult {
  let current = input;
  const rows: string[][] = [["Input", String(input)]];
  const steps: EquationStepBlock["steps"] = [];
  ops.forEach((o, i) => {
    const before = current;
    if (o.op === "+") current += o.n;
    else if (o.op === "-") current -= o.n;
    else if (o.op === "×") current *= o.n;
    else if (o.op === "÷") current /= o.n;
    rows.push([`${o.op} ${o.n}`, String(current)]);
    steps.push({
      stepNumber: i + 1,
      operationLabel: `${o.op} ${o.n}`,
      explanation: `${before} ${o.op} ${o.n} = ${current}`,
      latexBefore: String(before),
      latexAfter: String(current),
      arrowDirection: "simplify",
    });
  });
  rows.push(["Output", String(current)]);
  const table: TableBlock = {
    type: "table",
    headers: ["Stage", "Value"],
    rows,
    caption: "Function machine",
  };
  return {
    builderId: "function_machine",
    block: table,
    extraBlocks: [{ type: "equation_steps", steps }],
    teachingSteps: [
      {
        title: "Output",
        explanation: String(current),
        why: "Do each machine step in order.",
        narration: `The output is ${current}.`,
        cellKeys: [],
        carryKeys: [],
        noteKeys: [],
        showAnswer: true,
      },
    ],
    captions: [`Output = ${current}`],
    answer: String(current),
    intro: `Follow the function machine from input ${input}.`,
  };
}

// silence unused import warning if any
void normalizeMathText;
