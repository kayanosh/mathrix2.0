import {
  isBlockFit,
  normalizeShapeDialect,
} from "@/lib/ks2-visual-fitness";
import { buildCuboidVolume } from "@/lib/methods/measurement-builders";
import type { VisualBlock } from "@/types/whiteboard";

const dialect = (obj: Record<string, unknown>) => obj as unknown as VisualBlock;

describe("normalizeShapeDialect", () => {
  it("maps 'L-shaped rectilinear polygon' with valid params to rectilinear", () => {
    const [out] = normalizeShapeDialect([
      dialect({
        type: "labeled_shape",
        shape: "L-shaped rectilinear polygon",
        vertices: [
          { label: "A", x: 0, y: 8 },
          { label: "B", x: 10, y: 8 },
        ],
        sideLabels: [{ from: "A", to: "B", label: "$10\\text{ cm}$" }],
        rectilinear: { width: 10, height: 8, notchWidth: 6, notchHeight: 5 },
      }),
    ]);
    expect(out.type).toBe("labeled_shape");
    if (out.type !== "labeled_shape") throw new Error("expected labeled_shape");
    expect(out.shape).toBe("rectilinear");
    // x/y coords stripped so the renderer's own layout is used
    expect(out.vertices?.every((v) => !("x" in v) && !("y" in v))).toBe(true);
    // sideLabels renamed to sides
    expect(out.sides).toHaveLength(1);
    expect(isBlockFit(out, "perimeter")).toBe(true);
  });

  it("maps cuboid/cube/box names to cuboid", () => {
    for (const name of ["cuboid", "Cube", "a 3D box"]) {
      const [out] = normalizeShapeDialect([
        dialect({ type: "labeled_shape", shape: name }),
      ]);
      if (out.type !== "labeled_shape") throw new Error("expected labeled_shape");
      expect(out.shape).toBe("cuboid");
      expect(isBlockFit(out, "volume")).toBe(true);
    }
  });

  it("maps 'net of a cube' to net", () => {
    const [out] = normalizeShapeDialect([
      dialect({ type: "labeled_shape", shape: "net of a cube" }),
    ]);
    if (out.type !== "labeled_shape") throw new Error("expected labeled_shape");
    expect(out.shape).toBe("net");
    expect(isBlockFit(out, "nets")).toBe(true);
  });

  it("maps pentagon/hexagon to polygon with that many vertex labels", () => {
    const [out] = normalizeShapeDialect([
      dialect({ type: "labeled_shape", shape: "regular hexagon" }),
    ]);
    if (out.type !== "labeled_shape") throw new Error("expected labeled_shape");
    expect(out.shape).toBe("polygon");
    expect(out.vertices).toHaveLength(6);
  });

  it("leaves supported shapes untouched", () => {
    const triangle: VisualBlock = { type: "labeled_shape", shape: "triangle" };
    expect(normalizeShapeDialect([triangle])[0]).toBe(triangle);
  });

  it("leaves truly unknown names for the fitness guard to drop", () => {
    const [out] = normalizeShapeDialect([
      dialect({ type: "labeled_shape", shape: "rhombicosidodecahedron" }),
    ]);
    expect(isBlockFit(out, "shapes")).toBe(false);
  });

  it("does not touch non-shape blocks", () => {
    const table: VisualBlock = {
      type: "table",
      headers: ["a"],
      rows: [["1"]],
    };
    expect(normalizeShapeDialect([table])[0]).toBe(table);
  });
});

describe("buildCuboidVolume visual", () => {
  it("emits a 3D cuboid with dimension labels", () => {
    const built = buildCuboidVolume(5, 3, 2);
    expect(built.block.type).toBe("labeled_shape");
    if (built.block.type !== "labeled_shape") throw new Error("expected labeled_shape");
    expect(built.block.shape).toBe("cuboid");
    expect(built.block.dimensions).toEqual([5, 3, 2]);
    expect(isBlockFit(built.block, "Find the volume of the cuboid.")).toBe(true);
    expect(built.answer).toBe("30");
  });
});
