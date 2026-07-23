import {
  buildIrregularArea,
  parseIrregularArea,
} from "@/lib/methods/irregular-area";
import { isBlockFit } from "@/lib/ks2-visual-fitness";

const Q =
  "Estimate the area of the irregular shape on a $1\\text{ cm} \\times 1\\text{ cm}$ square grid.";

describe("parseIrregularArea", () => {
  it("triggers on estimate-area-of-irregular-shape questions", () => {
    expect(parseIrregularArea(Q)).not.toBeNull();
  });

  it("ignores the 1 cm × 1 cm grid pitch and uses the canonical L", () => {
    const p = parseIrregularArea(Q)!;
    expect([p.width, p.height, p.notchWidth, p.notchHeight]).toEqual([9, 7, 4, 3]);
  });

  it("rejects perimeter and non-irregular area questions", () => {
    expect(parseIrregularArea("Find the perimeter of the irregular shape")).toBeNull();
    expect(parseIrregularArea("Find the area of a rectangle 5 cm by 3 cm")).toBeNull();
    expect(parseIrregularArea("What is 6 × 7?")).toBeNull();
  });
});

describe("buildIrregularArea", () => {
  const p = parseIrregularArea(Q)!;
  const r = buildIrregularArea(p);

  it("decomposes the L into two rectangles whose areas sum to the answer", () => {
    // Top strip 9 × 4 = 36, bottom-left strip 5 × 3 = 15, total 51.
    expect(r.answer).toBe("51 cm²");
    const blob = r.teachingSteps.map((s) => s.explanation).join(" ");
    expect(blob).toContain("9 × 4 = 36");
    expect(blob).toContain("5 × 3 = 15");
    expect(blob).toContain("36 + 15 = 51");
  });

  it("teaches the split-first method", () => {
    expect(r.teachingSteps[0].title).toMatch(/split/i);
    expect(r.teachingSteps[0].why).toMatch(/rectangle/i);
  });

  it("draws the same L-shape the working uses", () => {
    expect(r.block.type).toBe("labeled_shape");
    const b = r.block as { shape: string; rectilinear: { width: number; height: number; notchWidth: number; notchHeight: number } };
    expect(b.shape).toBe("rectilinear");
    expect(b.rectilinear).toMatchObject({ width: 9, height: 7, notchWidth: 4, notchHeight: 3 });
  });

  it("block passes the fitness guard", () => {
    expect(isBlockFit(r.block, Q)).toBe(true);
  });
});
