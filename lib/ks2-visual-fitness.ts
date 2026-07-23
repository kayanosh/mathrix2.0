/**
 * Drop whiteboard blocks that cannot teach the question (wrong scale,
 * empty grids, etc.). Prefer omission over a lying diagram.
 */

import type { LabeledShapeBlock, VisualBlock } from "@/types/whiteboard";

/** Extract integers from question text (commas allowed). */
export function extractQuestionNumbers(question: string): number[] {
  const matches = question.replace(/,/g, "").match(/\d+/g) || [];
  return matches
    .map((m) => parseInt(m, 10))
    .filter((n) => Number.isFinite(n));
}

/** Extract decimal / float tokens (e.g. 3.456) from question text. */
export function extractQuestionDecimals(question: string): number[] {
  const matches = question.replace(/,/g, "").match(/\d+\.\d+/g) || [];
  return matches
    .map((m) => parseFloat(m))
    .filter((n) => Number.isFinite(n));
}

/** Extract a/b fraction tokens from question text. */
export function extractQuestionFractions(
  question: string,
): { n: number; d: number; value: number }[] {
  const out: { n: number; d: number; value: number }[] = [];
  const re = /(\d+)\s*\/\s*(\d+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(question)) !== null) {
    const n = parseInt(m[1], 10);
    const d = parseInt(m[2], 10);
    if (d > 0) out.push({ n, d, value: n / d });
  }
  return out;
}

function markersCoverFractions(
  markers: { value?: number }[] | undefined,
  fractions: { value: number }[],
): boolean {
  if (!Array.isArray(markers) || markers.length === 0) return false;
  const tol = 0.02;
  return fractions.every((f) =>
    markers.some(
      (mk) =>
        typeof mk.value === "number" &&
        Number.isFinite(mk.value) &&
        Math.abs(mk.value - f.value) <= tol,
    ),
  );
}

function numberLineFit(block: VisualBlock, question: string): boolean {
  if (block.type !== "number_line") return false;
  const range = block.range;
  if (!Array.isArray(range) || range.length < 2) return false;
  const min = Number(range[0]);
  const max = Number(range[1]);
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return false;

  const fractions = extractQuestionFractions(question);
  const tick = Number(block.tickInterval);
  const markers = Array.isArray(block.markers) ? block.markers : [];
  const interiorMarkers = markers.filter((mk) => {
    const v = Number(mk.value);
    return Number.isFinite(v) && v > min && v < max;
  });

  // Blank unit line: [0,1] with tick ≥ 1 and no interior markers — never ship.
  if (
    Math.abs(min) < 1e-9 &&
    Math.abs(max - 1) < 1e-9 &&
    (!Number.isFinite(tick) || tick >= 1) &&
    interiorMarkers.length === 0
  ) {
    return false;
  }

  // Fraction questions need markers at (approx) each fraction value.
  if (fractions.length >= 1) {
    if (!markersCoverFractions(markers, fractions)) return false;
    return true;
  }

  const decimals = extractQuestionDecimals(question);
  if (decimals.length >= 1) {
    const tol = Math.max(0.0005, (max - min) * 0.05);
    const covers = decimals.some((d) =>
      markers.some(
        (mk) =>
          typeof mk.value === "number" &&
          Number.isFinite(mk.value) &&
          Math.abs(mk.value - d) <= tol,
      ),
    );
    // Decimal rounding lines: accept if the value sits in the range
    const inRange = decimals.some((d) => d >= min && d <= max);
    return covers || inRange;
  }

  const nums = extractQuestionNumbers(question);
  // Prefer a number from the question that sits in the interior or on an endpoint.
  if (nums.length === 0) return true;
  const inRange = nums.some((n) => n >= min && n <= max);
  if (inRange) return true;

  // Rounding bracket: range width is a standard place and endpoints are multiples.
  const span = max - min;
  if ([10, 100, 1000, 10000, 100000, 1000000].includes(span)) {
    return nums.some((n) => n >= min && n <= max);
  }
  return false;
}

function tableFit(block: VisualBlock): boolean {
  if (block.type !== "table") return false;
  const headers = Array.isArray(block.headers) ? block.headers : [];
  const rows = Array.isArray(block.rows) ? block.rows : [];
  if (headers.length === 0 && rows.length === 0) return false;
  if (rows.some((r) => !Array.isArray(r))) return false;
  // Rectangular when headers exist
  if (headers.length > 0 && rows.some((r) => r.length > 0 && r.length !== headers.length)) {
    // Allow shorter rows (leading empty place-value cells often omitted) if ≤ headers
    if (rows.some((r) => r.length > headers.length)) return false;
  }
  return true;
}

function columnMethodFit(block: VisualBlock): boolean {
  if (block.type !== "column_method") return false;
  return Array.isArray(block.rows) && block.rows.length > 0;
}

function equationStepsFit(block: VisualBlock): boolean {
  if (block.type !== "equation_steps") return false;
  return Array.isArray(block.steps) && block.steps.length > 0;
}

function fractionBarFit(block: VisualBlock): boolean {
  if (block.type !== "fraction_bar") return false;
  return (
    Number.isFinite(block.numerator) &&
    Number.isFinite(block.denominator) &&
    block.denominator > 0
  );
}

function fractionGridFit(block: VisualBlock): boolean {
  if (block.type !== "fraction_grid") return false;
  return (
    Number.isFinite(block.numerator) &&
    Number.isFinite(block.denominator) &&
    block.denominator > 0
  );
}

function fractionWallFit(block: VisualBlock): boolean {
  if (block.type !== "fraction_wall") return false;
  return Array.isArray(block.rows) && block.rows.length > 0;
}

function barModelFit(block: VisualBlock): boolean {
  if (block.type !== "bar_model") return false;
  return Array.isArray(block.parts) && block.parts.length > 0;
}

function hundredSquareFit(block: VisualBlock): boolean {
  if (block.type !== "hundred_square") return false;
  return Number.isFinite(block.shaded) && block.shaded >= 0 && block.shaded <= 100;
}

function areaModelFit(block: VisualBlock): boolean {
  if (block.type !== "area_model") return false;
  return Number.isFinite(block.rows) && Number.isFinite(block.cols) && block.rows > 0 && block.cols > 0;
}

function keyInfoFit(block: VisualBlock): boolean {
  if (block.type !== "key_info") return false;
  return (
    typeof block.stem === "string" &&
    block.stem.trim().length > 0 &&
    Array.isArray(block.highlights) &&
    block.highlights.length > 0
  );
}

function forceDiagramFit(block: VisualBlock): boolean {
  if (block.type !== "force_diagram") return false;
  const directions = new Set(["up", "down", "left", "right"]);
  return (
    typeof block.objectLabel === "string" &&
    block.objectLabel.trim().length > 0 &&
    Array.isArray(block.forces) &&
    block.forces.length > 0 &&
    block.forces.every(
      (force) =>
        typeof force.label === "string" &&
        force.label.trim().length > 0 &&
        directions.has(force.direction),
    )
  );
}

function coordinateGraphFit(block: VisualBlock): boolean {
  if (block.type !== "coordinate_graph") return false;
  const validRange = (range: unknown) =>
    Array.isArray(range) &&
    range.length >= 2 &&
    Number.isFinite(Number(range[0])) &&
    Number.isFinite(Number(range[1])) &&
    Number(range[1]) > Number(range[0]);
  const plots = Array.isArray(block.plots) ? block.plots : [];
  const points = Array.isArray(block.points) ? block.points : [];
  const segments = Array.isArray(block.segments) ? block.segments : [];
  const validPoints = points.every(
    (point) =>
      Number.isFinite(Number(point?.point?.x)) &&
      Number.isFinite(Number(point?.point?.y)),
  );
  return (
    validRange(block.xRange) &&
    validRange(block.yRange) &&
    validPoints &&
    plots.length + points.length + segments.length > 0
  );
}

/** True when the block is safe to show for this question. */
export function isBlockFit(block: VisualBlock, question: string): boolean {
  switch (block.type) {
    case "number_line":
      return numberLineFit(block, question);
    case "table":
      return tableFit(block);
    case "column_method":
      return columnMethodFit(block);
    case "equation_steps":
      return equationStepsFit(block);
    case "fraction_bar":
      return fractionBarFit(block);
    case "fraction_grid":
      return fractionGridFit(block);
    case "fraction_wall":
      return fractionWallFit(block);
    case "bar_model":
      return barModelFit(block);
    case "hundred_square":
      return hundredSquareFit(block);
    case "area_model":
      return areaModelFit(block);
    case "key_info":
      return keyInfoFit(block);
    case "force_diagram":
      return forceDiagramFit(block);
    case "coordinate_graph":
      return coordinateGraphFit(block);
    case "protractor":
      return (
        Number.isFinite(Number(block.angle)) &&
        Number(block.angle) > 0 &&
        Number(block.angle) <= 180
      );
    case "angle_scale":
      return (
        block.highlight === undefined ||
        ["acute", "right", "obtuse", "straight"].includes(String(block.highlight))
      );
    case "text":
      return typeof block.content === "string" && block.content.trim().length > 0;
    case "labeled_shape":
      return labeledShapeFit(block);
    default:
      // Other visuals (graphs…) — keep if structurally present
      return true;
  }
}

export const KNOWN_SHAPES = new Set([
  "triangle",
  "circle",
  "rectangle",
  "parallelogram",
  "trapezium",
  "polygon",
  "rectilinear",
  "cuboid",
  "net",
  "straight_line",
  "around_point",
]);

/**
 * The model writes labeled_shape in dialects — unknown shape names ("L-shaped
 * rectilinear polygon", "cuboid", "net of a cube"), vertices with x/y coords
 * the renderer ignores, and "sideLabels" instead of "sides". Normalize the
 * dialect onto supported shapes so lessons keep a CORRECT visual instead of
 * dropping every block to a 422. Anything unrecognisable is left for the
 * fitness guard to drop.
 */
export function normalizeShapeDialect(blocks: VisualBlock[]): VisualBlock[] {
  return blocks.map((b) => {
    if (b.type !== "labeled_shape") return b;
    const raw = b as unknown as Record<string, unknown>;
    let next = b;

    // Rename sideLabels → sides; strip x/y coords from vertices.
    const patch: Record<string, unknown> = {};
    if (Array.isArray(raw.sideLabels) && !next.sides) {
      patch.sides = raw.sideLabels;
    }
    if (
      Array.isArray(next.vertices) &&
      next.vertices.some(
        (v) =>
          v &&
          typeof v === "object" &&
          ("x" in (v as object) || "y" in (v as object)) &&
          !("position" in (v as object)),
      )
    ) {
      patch.vertices = (next.vertices as unknown[])
        .map((v) => ({
          label: String((v as { label?: unknown })?.label ?? ""),
        }))
        .filter((v) => v.label);
    }
    if (Object.keys(patch).length > 0) {
      next = { ...next, ...patch } as LabeledShapeBlock;
    }

    const name = String(next.shape || "").toLowerCase();
    if (KNOWN_SHAPES.has(name)) return next;
    const as2 = (shape: string): LabeledShapeBlock =>
      ({ ...next, shape }) as LabeledShapeBlock;
    if (/\bnet/.test(name)) return as2("net");
    if (/cuboid|cube|box/.test(name)) return as2("cuboid");
    if (/around.*point|point.*angle/.test(name)) return as2("around_point");
    if (/straight.*line|line.*angle/.test(name)) return as2("straight_line");
    if (/l-?shaped|rectilinear|compound/.test(name)) {
      const r = next.rectilinear;
      if (
        r &&
        Number(r.width) > Number(r.notchWidth) &&
        Number(r.height) > Number(r.notchHeight)
      ) {
        return as2("rectilinear");
      }
      return next; // fitness drops it; the deterministic builder supplies one
    }
    const polyCount = /pentagon/.test(name)
      ? 5
      : /hexagon/.test(name)
        ? 6
        : /heptagon/.test(name)
          ? 7
          : /octagon/.test(name)
            ? 8
            : /nonagon/.test(name)
              ? 9
              : /decagon/.test(name)
                ? 10
                : 0;
    if (polyCount > 0) {
      const vertices =
        next.vertices && next.vertices.length > 0
          ? next.vertices
          : Array.from({ length: polyCount }, (_, i) => ({
              label: String.fromCharCode(65 + i),
            }));
      return { ...next, shape: "polygon", vertices } as LabeledShapeBlock;
    }
    if (/polygon|shape/.test(name)) return as2("polygon");
    if (/triangle/.test(name)) return as2("triangle");
    if (/circle|sphere/.test(name)) return as2("circle");
    if (/trapezi/.test(name)) return as2("trapezium");
    if (/parallelogram/.test(name)) return as2("parallelogram");
    if (/rectangle|oblong/.test(name)) return as2("rectangle");
    return next;
  });
}

/**
 * Shape blocks must name a shape the renderer actually supports — the model
 * has emitted dialect like "L-shaped rectilinear polygon" with x/y vertices
 * and "sideLabels", which the renderer silently drew as a bare regular
 * polygon with no labels (the perimeter-lesson bug). Rectilinear shapes
 * additionally need sane dimensions.
 */
function labeledShapeFit(block: VisualBlock): boolean {
  if (block.type !== "labeled_shape") return true;
  if (!KNOWN_SHAPES.has(String(block.shape))) return false;
  if (block.shape === "rectilinear") {
    const r = block.rectilinear;
    if (!r) return false;
    const dims = [r.width, r.height, r.notchWidth, r.notchHeight];
    return (
      dims.every((n) => Number.isFinite(Number(n)) && Number(n) > 0) &&
      Number(r.width) > Number(r.notchWidth) &&
      Number(r.height) > Number(r.notchHeight)
    );
  }
  return true;
}

/** Filter out unfit blocks. Never invent a placeholder scale. */
export function filterFitBlocks(
  blocks: VisualBlock[],
  question: string,
): VisualBlock[] {
  if (!Array.isArray(blocks)) return [];
  return blocks.filter((b) => isBlockFit(b, question));
}
