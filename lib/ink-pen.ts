/**
 * Where the teacher's pen tip is while it is writing.
 *
 * The components that put ink on the board (maths, handwritten text) know
 * exactly which glyph is appearing at any instant; the pen is drawn by the
 * tutor, far above them in the tree. This is the wire between the two. It is a
 * plain subscription rather than React state because the tip moves every frame
 * and re-rendering the tutor sixty times a second to move one element would be
 * absurd.
 *
 * One pen, many writers: a sentence with maths in it is written by several
 * components in turn. Each holds a token, and only the writer that currently
 * has the pen can lift it — so a component finishing late cannot snatch the pen
 * away from the one that took over.
 */

export interface PenPoint {
  x: number;
  y: number;
}

type Listener = (point: PenPoint | null) => void;

const listeners = new Set<Listener>();
let holder: symbol | null = null;

export const inkPen = {
  /** The pen is writing, with its tip at `point` (viewport coordinates). */
  write(token: symbol, point: PenPoint): void {
    holder = token;
    listeners.forEach((listener) => listener(point));
  },

  /** `token` has finished writing. Lifts the pen only if it still holds it. */
  lift(token: symbol): void {
    if (holder !== token) return;
    holder = null;
    listeners.forEach((listener) => listener(null));
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

/** One thing the pen draws: an element, when it starts, and how long it takes. */
export interface PenStroke {
  element: Element;
  /** ms after the trace starts. */
  at: number;
  /** ms the pen spends on this element. */
  duration: number;
}

/**
 * Where the tip is `progress` (0–1) of the way through drawing a glyph of this
 * size: moving left to right, and up and down within it the way a hand does —
 * a pen that glides along a ruler-straight line does not look like writing.
 */
export function penPointOnGlyph(
  rect: { left: number; top: number; width: number; height: number },
  progress: number,
): PenPoint {
  const p = Math.min(1, Math.max(0, progress));
  return {
    x: rect.left + rect.width * p,
    y: rect.top + rect.height * (0.55 + 0.28 * Math.sin(p * Math.PI * 2)),
  };
}

/** Which stroke is being drawn at `elapsed` ms, or -1 before the first / after the last. */
export function strokeAt(strokes: PenStroke[], elapsed: number): number {
  if (strokes.length === 0 || elapsed < strokes[0].at) return -1;
  for (let index = strokes.length - 1; index >= 0; index -= 1) {
    if (elapsed >= strokes[index].at) {
      const last = index === strokes.length - 1;
      // Between strokes the pen stays on the one it just finished; after the
      // final stroke is done it is lifted.
      if (last && elapsed > strokes[index].at + strokes[index].duration) return -1;
      return index;
    }
  }
  return -1;
}

/**
 * Move the pen along `strokes` in real time. Returns a function that stops the
 * trace and lifts the pen. Positions are read from the live layout each frame,
 * so the pen stays on the ink while the board scrolls.
 */
export function tracePen(strokes: PenStroke[]): () => void {
  if (
    strokes.length === 0 ||
    typeof requestAnimationFrame !== "function" ||
    typeof performance === "undefined"
  ) {
    return () => undefined;
  }

  const token = Symbol("pen-trace");
  const startedAt = performance.now();
  const endsAt = strokes[strokes.length - 1].at + strokes[strokes.length - 1].duration;
  let frame = 0;
  let stopped = false;

  const tick = () => {
    if (stopped) return;
    const elapsed = performance.now() - startedAt;
    if (elapsed > endsAt) {
      inkPen.lift(token);
      return;
    }
    const index = strokeAt(strokes, elapsed);
    if (index >= 0) {
      const stroke = strokes[index];
      const rect = stroke.element.getBoundingClientRect();
      if (rect.width > 0 || rect.height > 0) {
        const progress = stroke.duration > 0 ? (elapsed - stroke.at) / stroke.duration : 1;
        inkPen.write(token, penPointOnGlyph(rect, progress));
      }
    }
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);

  return () => {
    stopped = true;
    cancelAnimationFrame(frame);
    inkPen.lift(token);
  };
}
