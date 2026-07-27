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
