import {
  hashSeed,
  sketchyCirclePath,
  sketchyUnderlinePath,
  sketchyBoxPath,
  buildMarkPath,
  type MarkRect,
} from "@/lib/emphasis-paths";

const rect: MarkRect = { x: 100, y: 50, width: 40, height: 24 };

describe("hashSeed", () => {
  it("is deterministic", () => {
    expect(hashSeed("mark-1")).toBe(hashSeed("mark-1"));
  });

  it("differs across keys", () => {
    expect(hashSeed("mark-1")).not.toBe(hashSeed("mark-2"));
  });
});

describe("sketchyCirclePath", () => {
  it("produces a valid path with smooth curve segments", () => {
    const { d } = sketchyCirclePath(rect, "mark-1");
    expect(d.startsWith("M ")).toBe(true);
    expect(d).toContain(" C ");
  });

  it("is deterministic for the same seed and varies across seeds", () => {
    expect(sketchyCirclePath(rect, "a").d).toBe(sketchyCirclePath(rect, "a").d);
    expect(sketchyCirclePath(rect, "a").d).not.toBe(
      sketchyCirclePath(rect, "b").d,
    );
  });

  it("estimates a stroke length at least the ellipse perimeter", () => {
    const { length } = sketchyCirclePath(rect, "mark-1");
    // Loose lower bound: the loop must be longer than the rect perimeter.
    expect(length).toBeGreaterThan(2 * (rect.width + rect.height));
  });
});

describe("sketchyUnderlinePath", () => {
  it("draws two strokes (double underline)", () => {
    const { d } = sketchyUnderlinePath(rect, "mark-1");
    expect(d.match(/M /g)).toHaveLength(2);
  });

  it("sits below the target rect", () => {
    const { d } = sketchyUnderlinePath(rect, "mark-1");
    const ys = [...d.matchAll(/,\s*(-?\d+(?:\.\d+)?)/g)].map((m) =>
      parseFloat(m[1]),
    );
    const bottom = rect.y + rect.height;
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(bottom);
  });

  it("spans at least the rect width", () => {
    const { length } = sketchyUnderlinePath(rect, "mark-1");
    expect(length).toBeGreaterThan(rect.width);
  });
});

describe("sketchyBoxPath", () => {
  it("draws four sides", () => {
    const { d } = sketchyBoxPath(rect, "mark-1");
    expect(d.match(/L /g)).toHaveLength(4);
  });

  it("estimates roughly the box perimeter", () => {
    const { length } = sketchyBoxPath(rect, "mark-1");
    expect(length).toBeGreaterThan(2 * (rect.width + rect.height));
  });
});

describe("buildMarkPath", () => {
  it("dispatches by style", () => {
    expect(buildMarkPath("circle", rect, "s").d).toBe(
      sketchyCirclePath(rect, "s").d,
    );
    expect(buildMarkPath("underline", rect, "s").d).toBe(
      sketchyUnderlinePath(rect, "s").d,
    );
    expect(buildMarkPath("box", rect, "s").d).toBe(
      sketchyBoxPath(rect, "s").d,
    );
  });
});
