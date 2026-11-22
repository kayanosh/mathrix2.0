/**
 * Getting a shape onto the board the way the question describes it.
 *
 * A model describes a shape as a name, some corner letters and some labelled
 * sides. The board then has to draw it. Three things went wrong with real
 * answers, all found by asking the running app shape questions and looking:
 *
 *   - An L-shaped floor came back as a "polygon" with six corners, and the
 *     board draws a polygon as a REGULAR one. The pupil was shown a hexagon.
 *   - A trapezium with parallel sides 10 cm and 6 cm was drawn from a fixed
 *     outline, short side on top, so the side labelled 10 cm was the shorter
 *     one on the board.
 *   - The height of that trapezium was given as a "side" from A to C. It was
 *     written across the diagonal, and sides with nothing to say were drawn as
 *     empty labels and read out as "AD equals".
 *
 * Everything here is plain geometry on the block, with no drawing code, so it
 * can be tested and the narration can use the same tidied block as the board.
 */
import type { CrossingCorner, LabeledShapeBlock, ParallelLines, SideLabel } from "@/types/whiteboard";

export interface Point {
  x: number;
  y: number;
}

/** The first number in a label: "10 cm" → 10, "x" → null. */
export function labelLength(label: string | undefined | null): number | null {
  const found = String(label ?? "")
    .replace(/,/g, "")
    .match(/\d+(?:\.\d+)?/);
  if (!found) return null;
  const n = Number(found[0]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

const hasText = (label: string | undefined | null) => String(label ?? "").trim().length > 0;

/** "m", "cm" … from the first labelled length that has one. */
function unitOf(sides: SideLabel[]): string | undefined {
  for (const side of sides) {
    const unit = side.label.match(/\d\s*(mm|cm|km|m|in|ft)\b/i)?.[1];
    if (unit) return unit.toLowerCase();
  }
  return undefined;
}

/**
 * An L-shape described as a six-cornered polygon, as the four numbers the
 * L-shape drawing needs.
 *
 * The two longest labelled lengths are the full width and height, the two
 * shortest are the piece cut out. Which of the cut-out's two numbers runs
 * across cannot always be told from the labels; the area is the same either
 * way, and the picture is an L with the right numbers on it, which a regular
 * hexagon never is.
 */
function asRectilinear(block: LabeledShapeBlock): LabeledShapeBlock | null {
  const sides = (block.sides ?? []).filter((s) => labelLength(s.label) !== null);
  if ((block.vertices?.length ?? 0) !== 6 || sides.length < 4) return null;

  const exact = lShapeFromSixSides(block);
  if (exact) {
    return {
      type: "labeled_shape",
      shape: "rectilinear",
      rectilinear: { ...exact, unit: unitOf(sides) },
      caption: block.caption,
    };
  }

  const lengths = sides.map((s) => labelLength(s.label) as number);
  const sorted = [...lengths].sort((a, b) => b - a);
  // In label order, so "8 m by 6 m" stays 8 across and 6 down.
  const outer = lengths.filter((n) => n === sorted[0] || n === sorted[1]).slice(0, 2);
  const inner = lengths.filter((n) => n === sorted[sorted.length - 1] || n === sorted[sorted.length - 2]).slice(-2);
  if (outer.length < 2 || inner.length < 2) return null;

  const [width, height] = outer;
  let [notchWidth, notchHeight] = inner;
  if (!(notchWidth < width && notchHeight < height)) [notchWidth, notchHeight] = [notchHeight, notchWidth];
  if (!(notchWidth < width && notchHeight < height && notchWidth > 0 && notchHeight > 0)) return null;

  return {
    type: "labeled_shape",
    shape: "rectilinear",
    rectilinear: { width, height, notchWidth, notchHeight, unit: unitOf(sides) },
    caption: block.caption,
  };
}

/**
 * An L-shape with all six sides labelled, read exactly.
 *
 * Going round, the sides alternate across and down. The longest across is the
 * full width and the longest down is the full height; they meet at the corner
 * opposite the cut-out, so the cut-out's two sides are the ones three places
 * round from each. Returns null unless the six lengths really do fit an
 * L-shape (the longest each way equals the other two that way added together).
 */
export function lShapeFromSixSides(
  block: LabeledShapeBlock,
): { width: number; height: number; notchWidth: number; notchHeight: number } | null {
  const order = (block.vertices ?? []).map((v) => v.label);
  if (order.length !== 6) return null;
  const lengths: number[] = [];
  for (let i = 0; i < 6; i++) {
    const a = order[i];
    const b = order[(i + 1) % 6];
    const side = (block.sides ?? []).find((s) => (s.from === a && s.to === b) || (s.from === b && s.to === a));
    const length = labelLength(side?.label);
    if (length === null) return null;
    lengths.push(length);
  }
  const widest = (indexes: number[]) => indexes.reduce((best, i) => (lengths[i] > lengths[best] ? i : best), indexes[0]);
  const fits = (indexes: number[], big: number) =>
    Math.abs(lengths[big] - indexes.filter((i) => i !== big).reduce((sum, i) => sum + lengths[i], 0)) < 1e-9;

  for (const [across, down] of [
    [[0, 2, 4], [1, 3, 5]],
    [[1, 3, 5], [0, 2, 4]],
  ]) {
    const w = widest(across);
    const h = widest(down);
    if (!fits(across, w) || !fits(down, h)) continue;
    // The full width and full height share a corner.
    if ((w + 1) % 6 !== h && (h + 1) % 6 !== w) continue;
    return {
      width: lengths[w],
      height: lengths[h],
      notchWidth: lengths[(h + 3) % 6],
      notchHeight: lengths[(w + 3) % 6],
    };
  }
  return null;
}

/**
 * Angles that were written as side labels.
 *
 * Reading a photo of a triangle marked 70°, 45° and x, a model listed them as
 * three "sides". The board drew an equal-sided triangle with "70°" written
 * along an edge. They are the angles at the corners, in corner order.
 */
function anglesFromSideLabels(block: LabeledShapeBlock): LabeledShapeBlock {
  const corners = (block.vertices ?? []).map((v) => v.label);
  const sides = block.sides ?? [];
  if (block.shape !== "triangle" || corners.length !== 3 || (block.angles?.length ?? 0) > 0) return block;
  const inDegrees = sides.filter((s) => /\d\s*(?:°|\^\s*\{?\\circ|deg)/i.test(s.label));
  if (inDegrees.length < 2 || sides.length > 3) return block;

  return {
    ...block,
    sides: [],
    angles: sides.map((side, i) => ({
      vertex: corners[i],
      degrees: inDegrees.includes(side) ? (labelLength(side.label) ?? 0) : 0,
      label: side.label,
    })),
  };
}

/** A "side" that is really the height: it says so, or it joins opposite corners. */
export function isHeightMark(side: SideLabel, vertexLabels: string[]): boolean {
  if (/\b(?:height|perpendicular|distance between)\b/i.test(side.label)) return true;
  if (vertexLabels.length !== 4) return false;
  const from = vertexLabels.indexOf(side.from);
  const to = vertexLabels.indexOf(side.to);
  return from >= 0 && to >= 0 && Math.abs(from - to) === 2;
}

/** "4 cm (height)" → "4 cm". The dashed line already says it is the height. */
export function heightText(label: string): string {
  return label
    .replace(/\(\s*(?:the\s+)?(?:perpendicular\s+)?height\s*\)/gi, "")
    .replace(/\b(?:perpendicular\s+)?height\s*[:=]?\s*/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The block as the board should draw it: sides with nothing written on them
 * dropped, and a six-cornered "polygon" with L-shape numbers turned into an
 * L-shape. Safe to call more than once.
 */
export function tidyShapeBlock(block: LabeledShapeBlock): LabeledShapeBlock {
  const sides = block.sides?.filter((s) => hasText(s.label));
  const withSides: LabeledShapeBlock = sides && sides.length !== block.sides?.length ? { ...block, sides } : block;
  const tidied = anglesFromSideLabels(withSides);

  // Six corners is never a rectangle, whatever it was called.
  const sixCorners = (tidied.vertices?.length ?? 0) === 6;
  if (
    tidied.shape === "polygon" ||
    (sixCorners && (tidied.shape === "rectangle" || tidied.shape === "square")) ||
    (tidied.shape === "rectilinear" && !tidied.rectilinear)
  ) {
    const lShape = asRectilinear(tidied);
    if (lShape) return lShape;
  }
  return tidied;
}

/** The height of a four-sided shape, if the block gives one. */
export function shapeHeight(block: LabeledShapeBlock): { length: number | null; label: string } | null {
  const labels = (block.vertices ?? []).map((v) => v.label);
  const mark = (block.sides ?? []).find((s) => isHeightMark(s, labels));
  return mark ? { length: labelLength(mark.label), label: heightText(mark.label) } : null;
}

/** The labelled length of the side between two corners, in either direction. */
function sideLength(block: LabeledShapeBlock, a: string, b: string): number | null {
  const labels = (block.vertices ?? []).map((v) => v.label);
  const side = (block.sides ?? []).find(
    (s) => ((s.from === a && s.to === b) || (s.from === b && s.to === a)) && !isHeightMark(s, labels),
  );
  return side ? labelLength(side.label) : null;
}

/** Keep a very long thin shape readable: no side drawn under a quarter of the other. */
const readable = (ratio: number) => Math.min(4, Math.max(0.25, ratio));

/**
 * Corner positions for a four-sided shape, drawn to its labelled lengths.
 *
 * Corners are in the order the board uses: top-left, top-right, bottom-right,
 * bottom-left. Units are arbitrary (the caller scales to fit); y grows
 * downwards. Returns null when the labels do not give enough to go on, and the
 * caller keeps its fixed outline.
 */
export function quadrilateralPoints(block: LabeledShapeBlock): Point[] | null {
  const labels = (block.vertices ?? []).map((v) => v.label);
  if (labels.length !== 4) return null;
  const [A, B, C, D] = labels;

  const top = sideLength(block, A, B);
  const bottom = sideLength(block, C, D);
  const right = sideLength(block, B, C);
  const left = sideLength(block, D, A);
  const height = shapeHeight(block)?.length ?? null;

  if (block.shape === "trapezium") {
    if (!top || !bottom) return null;
    const widest = Math.max(top, bottom);
    const h = widest * readable((height ?? widest * 0.5) / widest);
    return [
      { x: -top / 2, y: 0 },
      { x: top / 2, y: 0 },
      { x: bottom / 2, y: h },
      { x: -bottom / 2, y: h },
    ];
  }

  if (block.shape === "rectangle") {
    const w = top ?? bottom;
    const h = right ?? left;
    if (!w || !h) return null;
    const drawnH = w * readable(h / w);
    return [
      { x: 0, y: 0 },
      { x: w, y: 0 },
      { x: w, y: drawnH },
      { x: 0, y: drawnH },
    ];
  }

  if (block.shape === "parallelogram") {
    const base = top ?? bottom;
    const slant = right ?? left;
    if (!base || !slant) return null;
    // The slant side leans at 60° unless the height says otherwise.
    const rise = height && height <= slant ? height : slant * Math.sin(Math.PI / 3);
    const lean = Math.sqrt(Math.max(0, slant * slant - rise * rise));
    const h = base * readable(rise / base);
    const shift = lean * (h / rise);
    return [
      { x: shift, y: 0 },
      { x: shift + base, y: 0 },
      { x: base, y: h },
      { x: 0, y: h },
    ];
  }

  return null;
}

/** What the tutor calls each shape out loud. */
const SPOKEN_SHAPE: Partial<Record<LabeledShapeBlock["shape"], string>> = {
  rectilinear: "L-shape",
  polygon: "shape",
  straight_line: "angles on a straight line",
  around_point: "angles around a point",
};

/**
 * The sentence the tutor says while the shape is drawn.
 *
 * It used to be a list: "Sides: AB equals x, BC equals 12 centimetres, AC
 * equals. Angles: 90 degrees at A". Each fact is now a short sentence, a side
 * with nothing written on it is not mentioned, and a height is called a height.
 */
export function describeShape(raw: LabeledShapeBlock): string {
  const block = tidyShapeBlock(raw);
  const parts = [`Here's the ${SPOKEN_SHAPE[block.shape] ?? block.shape}.`];
  const labels = (block.vertices ?? []).map((v) => v.label);

  if (block.shape === "rectilinear" && block.rectilinear) {
    const r = block.rectilinear;
    const unit = r.unit ? ` ${r.unit}` : "";
    parts.push(`It is ${r.width}${unit} across and ${r.height}${unit} down.`);
    parts.push(`A piece ${r.notchWidth}${unit} by ${r.notchHeight}${unit} is cut out of one corner.`);
    return parts.join(" ");
  }

  if (block.shape === "parallel_lines" && block.parallel) {
    const names = block.parallel.lines;
    const said = [
      names
        ? `Here are two parallel lines, ${names[0]} and ${names[1]}, with a line crossing them.`
        : "Here are two parallel lines with a line crossing them.",
    ];
    for (const angle of block.parallel.angles) {
      said.push(`At the ${angle.at} crossing, one angle is ${angle.label}.`);
    }
    return said.join(" ");
  }

  if (block.shape === "circle" && block.circle?.radius) {
    parts.push(`The radius is ${block.circle.radius}.`);
    return parts.join(" ");
  }

  for (const side of block.sides ?? []) {
    if (isHeightMark(side, labels)) parts.push(`The height is ${heightText(side.label)}.`);
    else parts.push(`${side.from}${side.to} is ${side.label}.`);
  }
  for (const angle of block.angles ?? []) {
    if (angle.isRightAngle) parts.push(`There is a right angle at ${angle.vertex}.`);
    else if (hasText(angle.label)) parts.push(`The angle at ${angle.vertex} is ${angle.label}.`);
  }
  return parts.join(" ");
}

// ── Parallel lines with a line crossing them ────────────────────────────────


export interface CrossingArc {
  at: "top" | "bottom";
  corner: CrossingCorner;
  label: string;
  /** SVG path for the arc. */
  path: string;
  labelAt: Point;
}

export interface ParallelLinesLayout {
  /** The two parallel lines, top then bottom. */
  lines: Array<{ x1: number; x2: number; y: number; name?: string }>;
  crossing: { x1: number; y1: number; x2: number; y2: number };
  top: Point;
  bottom: Point;
  /** The angle the crossing line makes with the parallel lines, in degrees. */
  lean: number;
  arcs: CrossingArc[];
}

/**
 * Each corner at a crossing as a range of directions, in degrees measured
 * anticlockwise from "along the line to the right". `lean` is the direction
 * the crossing line heads upwards.
 */
function cornerRange(corner: CrossingCorner, lean: number): [number, number] {
  switch (corner) {
    case "above-right":
      return [0, lean];
    case "above-left":
      return [lean, 180];
    case "below-left":
      return [180, 180 + lean];
    case "below-right":
      return [180 + lean, 360];
  }
}

/**
 * Where everything goes for two parallel lines and a line across them.
 *
 * The crossing line is leant to match the first angle that has a size, so an
 * angle marked 65° is drawn as 65° and the angle beside it as 115°. A picture
 * in which the angle labelled 65° is plainly the bigger of the two teaches the
 * wrong thing about which angles are equal.
 */
export function parallelLinesLayout(parallel: ParallelLines, width = 400, height = 300): ParallelLinesLayout {
  let lean = 60;
  for (const angle of parallel.angles) {
    const size = labelLength(angle.label);
    if (size === null || size >= 180) continue;
    const acuteSide = angle.corner === "above-right" || angle.corner === "below-left";
    lean = acuteSide ? size : 180 - size;
    break;
  }
  // Too flat and the crossing runs off the page; this keeps it on the board.
  lean = Math.min(150, Math.max(30, lean));

  const rad = (deg: number) => (deg * Math.PI) / 180;
  const centre = { x: width / 2, y: height / 2 };
  const gap = height * 0.37;
  const yTop = centre.y - gap / 2;
  const yBottom = centre.y + gap / 2;
  const reach = gap / 2 / Math.sin(rad(lean));
  const top = { x: centre.x + reach * Math.cos(rad(lean)), y: yTop };
  const bottom = { x: centre.x - reach * Math.cos(rad(lean)), y: yBottom };
  const extra = 46;
  const crossing = {
    x1: bottom.x - extra * Math.cos(rad(lean)),
    y1: bottom.y + extra * Math.sin(rad(lean)),
    x2: top.x + extra * Math.cos(rad(lean)),
    y2: top.y - extra * Math.sin(rad(lean)),
  };

  const radius = 26;
  const arcs = parallel.angles.map((angle) => {
    const at = angle.at === "top" ? top : bottom;
    const [from, to] = cornerRange(angle.corner, lean);
    const point = (deg: number, r: number) => ({ x: at.x + r * Math.cos(rad(deg)), y: at.y - r * Math.sin(rad(deg)) });
    const start = point(from, radius);
    const end = point(to, radius);
    return {
      at: angle.at,
      corner: angle.corner,
      label: angle.label,
      // Anticlockwise on the page, which is sweep-flag 0 with y pointing down.
      path: `M ${start.x.toFixed(1)},${start.y.toFixed(1)} A ${radius},${radius} 0 0 0 ${end.x.toFixed(1)},${end.y.toFixed(1)}`,
      labelAt: point((from + to) / 2, radius + 20),
    };
  });

  const margin = width * 0.09;
  return {
    lines: [
      { x1: margin, x2: width - margin, y: yTop, name: parallel.lines?.[0] },
      { x1: margin, x2: width - margin, y: yBottom, name: parallel.lines?.[1] },
    ],
    crossing,
    top,
    bottom,
    lean,
    arcs,
  };
}

/**
 * The foot of the height of a triangle: the point on the side opposite `apex`
 * that is straight below it. Dropped onto the line through that side, so it is
 * still right for a triangle that leans past its base.
 */
export function altitudeFoot(points: Point[], apex: number): Point {
  const a = points[(apex + 1) % 3];
  const b = points[(apex + 2) % 3];
  const p = points[apex];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const along = ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1);
  return { x: a.x + along * dx, y: a.y + along * dy };
}

/**
 * Which corner a triangle's height is drawn from. The height is written as a
 * "side" that says it is one ("8 cm (height)"); it starts at whichever of its
 * ends is a corner, the first if both are.
 */
export function triangleHeight(block: LabeledShapeBlock): { apex: number; label: string } | null {
  const labels = (block.vertices ?? []).map((v) => v.label);
  if (block.shape !== "triangle" || labels.length !== 3) return null;
  const mark = (block.sides ?? []).find((s) => isHeightMark(s, labels));
  if (!mark) return null;
  const apex = labels.indexOf(mark.from) >= 0 ? labels.indexOf(mark.from) : labels.indexOf(mark.to);
  return apex >= 0 ? { apex, label: heightText(mark.label) || "h" } : null;
}
