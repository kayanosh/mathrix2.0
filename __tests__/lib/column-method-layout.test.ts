import {
  arrowheadPoints,
  arrowLabelPosition,
  buildArrowPath,
  carryControlY,
  carrySlotCenter,
  cellCenter,
  inferCarryMoves,
  insetEndpoint,
  movesWithLanes,
} from "@/lib/column-method-layout";

describe("cellCenter", () => {
  it("returns centre of a cell in the grid", () => {
    const c = cellCenter(0, 2, 3);
    expect(c.x).toBe(90);
    expect(c.y).toBe(50);
  });

  it("offsets y by row index", () => {
    const row0 = cellCenter(0, 0, 3);
    const row1 = cellCenter(1, 0, 3);
    expect(row1.y).toBeGreaterThan(row0.y);
  });
});

describe("carrySlotCenter", () => {
  it("places y in the carry band above a row", () => {
    const cell = cellCenter(0, 1, 3);
    const carry = carrySlotCenter(0, 1);
    expect(carry.x).toBe(cell.x);
    expect(carry.y).toBeLessThan(cell.y);
    expect(carry.y).toBe(14);
  });
});

describe("inferCarryMoves", () => {
  it("returns empty for long division", () => {
    expect(inferCarryMoves("long_division", [{ row: 0, col: 1, digit: "1" }], 3)).toEqual([]);
  });

  it("infers carry arrows for column addition", () => {
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

  it("infers carry arrows for column multiplication", () => {
    const moves = inferCarryMoves(
      "column_multiplication",
      [{ row: 2, col: 1, digit: "3" }],
      3
    );
    expect(moves).toHaveLength(1);
    expect(moves[0]).toMatchObject({
      fromRow: 2,
      fromCol: 2,
      toRow: 2,
      toCol: 1,
      kind: "carry",
    });
  });
});

describe("movesWithLanes", () => {
  it("sorts moves right-to-left and assigns lane indices within a row", () => {
    const lanes = movesWithLanes([
      { fromRow: 0, fromCol: 0, toRow: 0, toCol: 0, kind: "carry" },
      { fromRow: 0, fromCol: 2, toRow: 0, toCol: 1, kind: "carry" },
      { fromRow: 0, fromCol: 1, toRow: 0, toCol: 0, kind: "carry" },
    ]);
    expect(lanes.map((m) => m.fromCol)).toEqual([2, 1, 0]);
    expect(lanes.map((m) => m.laneIndex)).toEqual([0, 1, 2]);
  });

  it("resets lane indices per destination row band", () => {
    const lanes = movesWithLanes([
      { fromRow: 0, fromCol: 3, toRow: 0, toCol: 2, kind: "carry" },
      { fromRow: 0, fromCol: 2, toRow: 0, toCol: 1, kind: "carry" },
      { fromRow: 4, fromCol: 1, toRow: 4, toCol: 0, kind: "carry" },
    ]);
    const row0 = lanes.filter((m) => m.toRow === 0);
    const row4 = lanes.filter((m) => m.toRow === 4);
    expect(row0.map((m) => m.laneIndex)).toEqual([0, 1]);
    expect(row4.map((m) => m.laneIndex)).toEqual([0]);
  });
});

describe("carryControlY", () => {
  it("never returns a negative loft (avoids painting over headers)", () => {
    // Previously lane 1 with y2=14 produced cy ≈ -12
    expect(carryControlY(50, 14, 0)).toBeGreaterThanOrEqual(2);
    expect(carryControlY(50, 14, 1)).toBeGreaterThanOrEqual(2);
    expect(carryControlY(50, 14, 2)).toBeGreaterThanOrEqual(2);
  });

  it("keeps a shallow stagger between lanes", () => {
    const a = carryControlY(50, 20, 0);
    const b = carryControlY(50, 20, 1);
    expect(b).toBeLessThan(a);
    expect(b).toBeGreaterThanOrEqual(2);
  });
});

describe("insetEndpoint", () => {
  it("pulls the tip back along the vector", () => {
    const from = { x: 100, y: 50 };
    const to = { x: 40, y: 14 };
    const inset = insetEndpoint(from, to, 9);
    const full = Math.hypot(to.x - from.x, to.y - from.y);
    const shortened = Math.hypot(inset.x - from.x, inset.y - from.y);
    expect(shortened).toBeLessThan(full);
    expect(shortened).toBeCloseTo(full - 9, 5);
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

  it("staggers carry arcs by lane index", () => {
    const lane0 = buildArrowPath(100, 80, 50, 20, "carry", 0);
    const lane1 = buildArrowPath(100, 80, 50, 20, "carry", 1);
    expect(lane0).not.toEqual(lane1);
  });

  it("keeps carry control points at non-negative y", () => {
    const d = buildArrowPath(126, 50, 90, 14, "carry", 1);
    const m = d.match(/Q [\d.-]+,([\d.-]+)/);
    expect(m).toBeTruthy();
    expect(Number(m![1])).toBeGreaterThanOrEqual(2);
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

  it("staggers label height by lane", () => {
    const lane0 = arrowLabelPosition(0, 40, 60, 20, "carry", 0);
    const lane1 = arrowLabelPosition(0, 40, 60, 20, "carry", 1);
    expect(lane1.y).toBeLessThan(lane0.y);
  });
});
