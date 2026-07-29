/**
 * Regression: a coordinate_graph block whose axis ranges the model omitted
 * must have them derived from its own points/segments rather than the whole
 * block being dropped.
 *
 * Measured live before this fix: the model emitted a correct coordinate_graph
 * on 8/8 generations of "Coordinates in four quadrants" but omitted
 * xRange/yRange on 6 of them, and the parser discarded the block each time —
 * surfacing to the pupil as a "lesson couldn't load" 422 (missing_visual).
 * finish_reason was "stop" on every call, so this was never truncation.
 */
import { parseWorkedExampleWhiteboard } from "@/app/api/ks2-lesson/route";

const QUESTION = "What are the coordinates of point $P$?";

function wb(block: Record<string, unknown>) {
  return {
    intro: "Read the coordinates.",
    blocks: [block],
    conclusion: "Done.",
  };
}

describe("coordinate_graph axis-range derivation", () => {
  it("derives missing ranges from the points, keeping every point in view", () => {
    const out = parseWorkedExampleWhiteboard(
      wb({
        type: "coordinate_graph",
        points: [{ point: { x: -3, y: 2 }, label: "P" }],
        // xRange / yRange deliberately absent — the observed model behaviour.
      }),
      QUESTION,
    );

    const graph = out?.blocks.find((b) => b.type === "coordinate_graph");
    expect(graph).toBeDefined();
    if (graph?.type !== "coordinate_graph") throw new Error("expected a coordinate_graph");
    expect(graph.xRange).toEqual([-4, 1]);
    expect(graph.yRange).toEqual([-1, 3]);
    // The plotted point must be inside the derived window.
    expect(graph.xRange[0]).toBeLessThanOrEqual(-3);
    expect(graph.xRange[1]).toBeGreaterThanOrEqual(-3);
    expect(graph.yRange[0]).toBeLessThanOrEqual(2);
    expect(graph.yRange[1]).toBeGreaterThanOrEqual(2);
  });

  it("always keeps the origin visible, so all four quadrants read correctly", () => {
    const out = parseWorkedExampleWhiteboard(
      wb({
        type: "coordinate_graph",
        // Every point far from the origin in the same quadrant.
        points: [
          { point: { x: 7, y: 8 }, label: "A" },
          { point: { x: 9, y: 6 }, label: "B" },
        ],
      }),
      QUESTION,
    );

    const graph = out?.blocks.find((b) => b.type === "coordinate_graph");
    if (graph?.type !== "coordinate_graph") throw new Error("expected a coordinate_graph");
    expect(graph.xRange[0]).toBeLessThanOrEqual(0);
    expect(graph.yRange[0]).toBeLessThanOrEqual(0);
  });

  it("derives ranges from segment endpoints when there are no points", () => {
    const out = parseWorkedExampleWhiteboard(
      wb({
        type: "coordinate_graph",
        points: [],
        segments: [{ from: { x: 1, y: 1 }, to: { x: 4, y: 5 } }],
      }),
      QUESTION,
    );

    const graph = out?.blocks.find((b) => b.type === "coordinate_graph");
    if (graph?.type !== "coordinate_graph") throw new Error("expected a coordinate_graph");
    expect(graph.xRange[1]).toBeGreaterThanOrEqual(4);
    expect(graph.yRange[1]).toBeGreaterThanOrEqual(5);
  });

  it("does NOT override axis ranges the model did supply", () => {
    const out = parseWorkedExampleWhiteboard(
      wb({
        type: "coordinate_graph",
        points: [{ point: { x: -3, y: 2 }, label: "P" }],
        xRange: [-10, 10],
        yRange: [-10, 10],
      }),
      QUESTION,
    );

    const graph = out?.blocks.find((b) => b.type === "coordinate_graph");
    if (graph?.type !== "coordinate_graph") throw new Error("expected a coordinate_graph");
    expect(graph.xRange).toEqual([-10, 10]);
    expect(graph.yRange).toEqual([-10, 10]);
  });

  it("repairs a partially-specified pair (only one axis given)", () => {
    const out = parseWorkedExampleWhiteboard(
      wb({
        type: "coordinate_graph",
        points: [{ point: { x: -3, y: 2 }, label: "P" }],
        xRange: [-6, 6],
        // yRange missing
      }),
      QUESTION,
    );

    const graph = out?.blocks.find((b) => b.type === "coordinate_graph");
    if (graph?.type !== "coordinate_graph") throw new Error("expected a coordinate_graph");
    expect(graph.xRange).toEqual([-6, 6]);
    expect(graph.yRange).toEqual([-1, 3]);
  });

  it("still drops a graph with no geometry at all rather than inventing a window", () => {
    const out = parseWorkedExampleWhiteboard(
      wb({ type: "coordinate_graph", points: [], segments: [], plots: [] }),
      QUESTION,
    );
    expect(out).toBeUndefined();
  });

  it("tolerates flat {x,y} points as well as nested {point:{x,y}}", () => {
    const out = parseWorkedExampleWhiteboard(
      wb({
        type: "coordinate_graph",
        points: [{ x: -3, y: 2, label: "$P$" }],
      }),
      QUESTION,
    );

    const graph = out?.blocks.find((b) => b.type === "coordinate_graph");
    if (graph?.type !== "coordinate_graph") throw new Error("expected a coordinate_graph");
    expect(graph.points?.[0].point).toEqual({ x: -3, y: 2 });
    expect(graph.xRange).toEqual([-4, 1]);
  });
});
