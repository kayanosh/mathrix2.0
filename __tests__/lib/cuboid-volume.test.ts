import {
  buildCuboidVolume,
  cuboidDimensionsForUnitCubes,
  parseRectMeasure,
} from "@/lib/methods/measurement-builders";
import { applyMethodBuilderToWorkedExample } from "@/lib/methods/apply-builder";
import {
  detectSkillVisualFamily,
  satisfiesSkillVisuals,
} from "@/lib/ks2-skill-visuals";
import { isBlockFit } from "@/lib/ks2-visual-fitness";
import { validateVisualBlock } from "@/lib/ks2-lesson-validator";
import { CuboidArrayBlockSchema } from "@/lib/schemas";

describe("deterministic KS2 cuboid volume teaching", () => {
  it("parses natural-language 'long/wide/high' dimension phrasing (DEF-013 regression)", () => {
    // Without this, a question phrased this way (a common model output) never
    // matched any pattern in parseRectMeasure, so the required equation_steps
    // visual could only appear by LLM luck rather than deterministic repair —
    // reproducibly (~1 in 5 in live testing) producing a 422 for pupils.
    expect(
      parseRectMeasure(
        "A cuboid is $4\\text{ cm}$ long, $3\\text{ cm}$ wide and $2\\text{ cm}$ high. What is its volume?",
      ),
    ).toEqual({ kind: "volume", l: 4, w: 3, h: 2 });
    expect(
      parseRectMeasure("A cuboid is 5m long, 6m wide and 2m tall. Find its volume."),
    ).toEqual({ kind: "volume", l: 5, w: 6, h: 2 });
  });

  it("parses the word-then-number 'length N' phrasing too (DEF-022 regression)", () => {
    // DEF-013 fixed only the number-then-word order ("4cm long"). The mirror
    // phrasing ("length 4 units") stayed unmatched and kept the volume family
    // failing ~1 in 5 live generations: the `volume` contract requires
    // cuboid_array AND equation_steps, and the equation block comes from this
    // builder — no parse, no block, visual_mismatch, 422 for the pupil.
    expect(
      parseRectMeasure(
        "Find the volume of a cuboid with length $4$ units, width $3$ units and height $2$ units.",
      ),
    ).toEqual({ kind: "volume", l: 4, w: 3, h: 2 });
    expect(
      parseRectMeasure("A cuboid has length 5 cm, width 2 cm and height 3 cm. Find its volume."),
    ).toEqual({ kind: "volume", l: 5, w: 2, h: 3 });
    // "a length of 6 cm" — the "of" variant.
    expect(
      parseRectMeasure(
        "The cuboid has a length of 6 cm, a width of 2 cm and a height of 5 cm. Find the volume.",
      ),
    ).toEqual({ kind: "volume", l: 6, w: 2, h: 5 });
  });

  it("reads 'N cubes long' as a dimension, not a total cube count (DEF-023 regression)", () => {
    // Found live while verifying DEF-022: "A cuboid is 4 cubes long, 3 cubes
    // wide and 2 cubes high" was taught with answer 4 (from an invented 2x2x1),
    // because the total-cube-count branch matched "4 cubes" and returned before
    // the dimension parse ran. Correct volume is 4x3x2 = 24. Same wrong-answer
    // class as DEF-008 — the diagram agreed with the wrong answer, so it looked
    // internally consistent while contradicting the question.
    expect(
      parseRectMeasure("A cuboid is 4 cubes long, 3 cubes wide and 2 cubes high. What is its volume?"),
    ).toEqual({ kind: "volume", l: 4, w: 3, h: 2 });
    expect(
      parseRectMeasure("A cuboid is 5 cubes long, 2 cubes wide and 3 cubes high. Find the volume."),
    ).toEqual({ kind: "volume", l: 5, w: 2, h: 3 });
    // Real cached row found live with answer 4 instead of 24 — note the
    // two-word "unit cubes" between the number and the dimension word.
    expect(
      parseRectMeasure(
        "Find the volume of a cuboid that is 4 unit cubes long, 3 unit cubes wide and 2 unit cubes high.",
      ),
    ).toEqual({ kind: "volume", l: 4, w: 3, h: 2 });
    expect(
      parseRectMeasure("A cuboid is 5 small cubes long, 2 small cubes wide and 3 small cubes high. Find the volume."),
    ).toEqual({ kind: "volume", l: 5, w: 2, h: 3 });
  });

  it("still decomposes a genuine TOTAL cube count into dimensions", () => {
    // The DEF-023 lookahead must not break the case it was guarding.
    for (const [q, total] of [
      ["A cuboid is made of 24 unit cubes. What could its dimensions be?", 24],
      ["A cuboid is built from 8 equal cubes. Find its volume.", 8],
    ] as [string, number][]) {
      const parsed = parseRectMeasure(q);
      expect(parsed?.kind).toBe("volume");
      if (parsed?.kind !== "volume") throw new Error("expected a volume parse");
      expect(parsed.l * parsed.w * parsed.h).toBe(total);
    }
  });

  it("does not mistake a 2-dimension rectangle for a cuboid", () => {
    // Guards the broadened matcher against over-reach: only two of the three
    // dimension words are present, so this must not parse as a volume.
    const parsed = parseRectMeasure(
      "A rectangle has length 4 cm and width 3 cm. Find its area.",
    );
    expect(parsed?.kind).not.toBe("volume");
  });

  it("turns a stated number of equal cubes into a compact whole-number cuboid", () => {
    expect(cuboidDimensionsForUnitCubes(12)).toEqual([3, 2, 2]);
    expect(cuboidDimensionsForUnitCubes(24)).toEqual([4, 3, 2]);
    expect(
      parseRectMeasure(
        "A cuboid is made from 12 equal cubes. What is its volume?",
      ),
    ).toEqual({ kind: "volume", l: 3, w: 2, h: 2 });
  });

  it("builds a unit-cube visual and a meaningful four-step guided script", () => {
    const built = buildCuboidVolume(3, 2, 2);

    expect(built.block).toEqual(
      expect.objectContaining({
        type: "cuboid_array",
        length: 3,
        width: 2,
        height: 2,
      }),
    );
    expect(built.teachingSteps).toHaveLength(4);
    expect(built.teachingSteps.map((step) => step.title)).toEqual([
      "Count one row",
      "Count one layer",
      "Count the layers",
      "Find the volume",
    ]);
    expect(built.teachingSteps[1]?.explanation).toContain(
      "2 rows of 3 cubes",
    );
    expect(built.teachingSteps.every((step) => Boolean(step.why))).toBe(true);
    expect(built.conclusion).toContain("12 cubic units");
  });

  it("replaces a misleading cached outline and generic steps", () => {
    const repaired = applyMethodBuilderToWorkedExample(
      {
        question:
          "A cuboid is made from 12 equal cubes. What is its volume?",
        steps: ["Name the measurement"],
        answer: "12 cubic units",
        whiteboard: {
          intro: "Picture the cuboid filled completely with equal cubes.",
          blocks: [
            {
              type: "labeled_shape",
              shape: "rectangle",
              vertices: [
                { label: "A" },
                { label: "B" },
                { label: "C" },
                { label: "D" },
              ],
            },
          ],
          conclusion: "Each small cube has a volume of 1 cubic unit.",
        },
      },
      "Volume",
      ["What is volume?"],
    );

    expect(repaired.whiteboard?.blocks.map((block) => block.type)).toEqual([
      "cuboid_array",
      "equation_steps",
    ]);
    expect(repaired.teachingSteps?.[0].why).not.toContain(
      "focused on What is volume",
    );
    expect(repaired.whiteboard?.conclusion).toContain("12 cubic units");
  });

  it("rejects a unit-cube diagram whose dimensions contradict the question", () => {
    const wrong = {
      type: "cuboid_array" as const,
      length: 3,
      width: 2,
      height: 1,
    };
    const question =
      "A cuboid is made from 12 equal cubes. What is its volume?";

    expect(isBlockFit(wrong, question)).toBe(false);
    expect(validateVisualBlock(wrong, question).map((issue) => issue.code))
      .toContain("cuboid_array_invalid");
  });

  it("uses the strict volume visual family and validates the block schema", () => {
    expect(
      detectSkillVisualFamily("", "Volume", "What is volume?"),
    ).toBe("volume");
    expect(
      satisfiesSkillVisuals(
        ["cuboid_array", "equation_steps"],
        "volume",
      ),
    ).toBe(true);
    expect(satisfiesSkillVisuals(["labeled_shape"], "volume")).toBe(false);
    expect(
      CuboidArrayBlockSchema.safeParse({
        type: "cuboid_array",
        length: 3,
        width: 2,
        height: 2,
      }).success,
    ).toBe(true);
  });
});
