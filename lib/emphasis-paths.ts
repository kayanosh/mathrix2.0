/**
 * Teacher pen-mark geometry — pure SVG path builders for the hand-drawn
 * circle / underline / box emphasis marks the AI can place on key terms.
 *
 * Everything here is deterministic: wobble comes from a seeded PRNG keyed on
 * the mark's target id, so the same mark always draws the same squiggle (no
 * hydration or replay jitter). Kept dependency-free so it's unit-testable.
 */

export interface MarkRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MarkPath {
  /** SVG path data. */
  d: string;
  /** Approximate stroke length, for dash-offset draw-on animation. */
  length: number;
}

export type MarkStyle = "circle" | "underline" | "box";

// ── Seeded PRNG (mulberry32) ─────────────────────────────────────────────────

export function hashSeed(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed || 1;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round = (n: number) => Math.round(n * 100) / 100;

// ── Circle ───────────────────────────────────────────────────────────────────

/**
 * A hand-drawn ellipse around `rect`: starts at the upper-left, loops all the
 * way round and overshoots slightly past the start — the way a person circles
 * a number without lifting the pen.
 */
export function sketchyCirclePath(rect: MarkRect, seedKey: string): MarkPath {
  const rand = mulberry32(hashSeed(seedKey));
  const pad = Math.max(6, rect.height * 0.22);
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const rx = rect.width / 2 + pad;
  const ry = rect.height / 2 + pad * 0.8;

  // Sample points around the ellipse with per-point wobble, overshooting by
  // ~40° past a full turn.
  const startAngle = -Math.PI * 0.75;
  const sweep = Math.PI * 2 + Math.PI * 0.22;
  const segments = 12;
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= segments; i++) {
    const angle = startAngle + (sweep * i) / segments;
    const wobble = 1 + (rand() - 0.5) * 0.08;
    // Drift outward slightly on the overshoot so the tail doesn't overlap.
    const drift = i / segments > 1 ? 1.06 : 1;
    pts.push({
      x: cx + Math.cos(angle) * rx * wobble * drift,
      y: cy + Math.sin(angle) * ry * wobble * drift,
    });
  }

  const d = catmullRomToBezier(pts);
  // Ramanujan ellipse perimeter approximation, plus the overshoot.
  const h = (rx - ry) ** 2 / (rx + ry) ** 2;
  const perimeter =
    Math.PI * (rx + ry) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));
  return { d, length: perimeter * 1.15 };
}

// ── Underline ────────────────────────────────────────────────────────────────

/**
 * A slightly bowed underline just below `rect`, with a faster second stroke
 * underneath for that "this matters" double-line teachers draw.
 */
export function sketchyUnderlinePath(
  rect: MarkRect,
  seedKey: string,
): MarkPath {
  const rand = mulberry32(hashSeed(seedKey));
  const y = rect.y + rect.height + 4;
  const x1 = rect.x - 3;
  const x2 = rect.x + rect.width + 3;
  const bow = 1.5 + rand() * 2;

  const mid1 = (x1 + x2) / 2 + (rand() - 0.5) * 8;
  const first = `M ${round(x1)},${round(y)} Q ${round(mid1)},${round(y + bow)} ${round(x2)},${round(y + (rand() - 0.5) * 2)}`;

  // Second stroke: right-to-left, shorter, a touch lower.
  const y2 = y + 4 + rand();
  const xa = x2 - rect.width * 0.12;
  const xb = x1 + rect.width * 0.08;
  const mid2 = (xa + xb) / 2 + (rand() - 0.5) * 8;
  const second = `M ${round(xa)},${round(y2)} Q ${round(mid2)},${round(y2 + bow)} ${round(xb)},${round(y2 + (rand() - 0.5) * 2)}`;

  const len = (x2 - x1) + (xa - xb);
  return { d: `${first} ${second}`, length: len * 1.05 };
}

// ── Box ──────────────────────────────────────────────────────────────────────

/**
 * A wobbly rectangle around `rect` — the mark teachers use to frame a formula
 * before substituting into it.
 */
export function sketchyBoxPath(rect: MarkRect, seedKey: string): MarkPath {
  const rand = mulberry32(hashSeed(seedKey));
  const pad = Math.max(5, rect.height * 0.18);
  const x1 = rect.x - pad;
  const y1 = rect.y - pad * 0.7;
  const x2 = rect.x + rect.width + pad;
  const y2 = rect.y + rect.height + pad * 0.7;

  const w = (v: number) => round(v + (rand() - 0.5) * 3);

  // Four strokes drawn corner to corner, each slightly missing the corner.
  const d = [
    `M ${w(x1)},${w(y1)} L ${w(x2)},${w(y1)}`,
    `L ${w(x2)},${w(y2)}`,
    `L ${w(x1)},${w(y2)}`,
    `L ${w(x1)},${w(y1 + 1)}`,
  ].join(" ");

  const perimeter = 2 * (x2 - x1) + 2 * (y2 - y1);
  return { d, length: perimeter * 1.05 };
}

// ── Dispatcher ───────────────────────────────────────────────────────────────

export function buildMarkPath(
  style: MarkStyle,
  rect: MarkRect,
  seedKey: string,
): MarkPath {
  switch (style) {
    case "circle":
      return sketchyCirclePath(rect, seedKey);
    case "underline":
      return sketchyUnderlinePath(rect, seedKey);
    case "box":
      return sketchyBoxPath(rect, seedKey);
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Smooth open Catmull-Rom spline through `pts`, emitted as cubic Béziers. */
function catmullRomToBezier(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  let d = `M ${round(pts[0].x)},${round(pts[0].y)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${round(c1x)},${round(c1y)} ${round(c2x)},${round(c2y)} ${round(p2.x)},${round(p2.y)}`;
  }
  return d;
}
