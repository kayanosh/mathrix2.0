import {
  arrowheadPoints,
  arrowLabelPosition,
  buildArrowPath,
  cellCenter,
  inferCarryMoves,
} from "@/lib/column-method-layout";

describe("cellCenter", () => {
  it("returns centre of a cell in the grid", () => {
    const c = cellCenter(0, 2, 3);
    expect(c.x).toBe(80);
    expect(c.y).toBe(34);
  });

  it("offsets y by row index", () => {
    const row0 = cellCenter(0, 0, 3);
    const row1 = cellCenter(1, 0, 3);
    expect(row1.y).toBeGreaterThan(row0.y);
  });
});

describe("inferCarryMoves", () => {
  it("returns empty for non-addition methods", () => {
    expect(inferCarryMoves("long_division", [{ row: 0, col: 1, digit: "1" }], 3)).toEqual([]);
  });

  it("infers carry arrows from column to the right", () => {
    const moves = inferCarryMoves(
      "column_addition",
      [{ row: 0, col: 1, digit: "1" }],
      3
    );
    expect(moves).toHaveLength(1);
    expect(moves[0]).toMatchObject({
      fromRow: 0,
      fromCol: 2,
      toRow: 0,
      toCol: 1,
      kind: "carry",
      label: "carry 1",
    });
  });
});

describe("buildArrowPath", () => {
  it("returns a valid SVG path string", () => {
    const d = buildArrowPath(10, 20, 50, 10, "carry");
    expect(d).toMatch(/^M /);
    expect(d).toContain("Q");
  });

  it("uses different curve for borrow", () => {
    const carry = buildArrowPath(10, 20, 50, 20, "carry");
    const borrow = buildArrowPath(10, 20, 50, 20, "borrow");
    expect(carry).not.toEqual(borrow);
  });
});

describe("arrowheadPoints", () => {
  it("returns a triangle path at the endpoint", () => {
    const d = arrowheadPoints(0, 0, 100, 0);
    expect(d).toMatch(/^M .+ L 100,0 L .+$/);
  });
});

describe("arrowLabelPosition", () => {
  it("places label above the arrow midpoint", () => {
    const pos = arrowLabelPosition(0, 40, 60, 20, "carry");
    expect(pos.x).toBe(30);
    expect(pos.y).toBeLessThan(20);
  });
});
