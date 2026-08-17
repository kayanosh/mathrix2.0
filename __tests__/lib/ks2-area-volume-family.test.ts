/**
 * A topic's name must not hijack its own skills' visual family.
 *
 * `detectSkillVisualFamily` matches against topic and skill merged together, and
 * the Year 6 topic is called "Area, Perimeter & Volume". So that topic dragged
 * its own 2D skills into the `volume` family, whose contract demands a
 * `cuboid_array` — a 3D array of unit cubes — for "Area of triangles".
 *
 * The lesson then failed `visual_mismatch` with a perfectly correct
 * labeled_shape + equation_steps, was discarded, and regenerated on every single
 * request. One affected row had 25 hits.
 *
 * Year 5's "Perimeter & Area" topic classified the same skills correctly, which
 * is what made the inconsistency visible.
 */
import { detectSkillVisualFamily, KS2_SKILL_VISUALS } from "@/lib/ks2-skill-visuals";

describe("2D area/perimeter skills are geometry, not volume", () => {
  it.each([
    ["Area and perimeter", "Area, Perimeter & Volume"],
    ["Area of triangles", "Area, Perimeter & Volume"],
    ["Area of parallelograms", "Area, Perimeter & Volume"],
  ])("%s (in topic %s)", (skill, topic) => {
    expect(detectSkillVisualFamily("", topic, skill)).toBe("geometry");
  });

  it("asks for a labelled shape, which is what these lessons actually contain", () => {
    const contract = KS2_SKILL_VISUALS.geometry;
    expect(contract.requiredAnyOf).toContain("labeled_shape");
    // Crucially NOT a 3D cube array.
    expect(contract.requiredAnyOf).not.toContain("cuboid_array");
  });

  it("still classifies the same skills correctly under the Year 5 topic name", () => {
    for (const skill of [
      "Perimeter of rectangles",
      "Area of rectangles",
      "Area of compound shapes",
      "Estimate area of irregular shapes",
    ]) {
      expect(detectSkillVisualFamily("", "Perimeter & Area", skill)).toBe("geometry");
    }
  });
});

describe("genuine volume skills are untouched", () => {
  it.each([
    ["Volume of cuboids", "Area, Perimeter & Volume"],
    ["Volume of shapes", "Area, Perimeter & Volume"],
    ["What is volume?", "Volume"],
    ["Compare volume", "Volume"],
    ["Estimate volume", "Volume"],
    ["Estimate capacity", "Volume"],
  ])("%s stays volume", (skill, topic) => {
    expect(detectSkillVisualFamily("", topic, skill)).toBe("volume");
  });

  it("keeps volume for a skill that names both area and volume", () => {
    // "Perimeter, area and volume" is genuinely mixed; leaving it as volume is
    // the conservative choice — it changes nothing about today's behaviour.
    expect(
      detectSkillVisualFamily("", "Geometry & Measures", "Perimeter, area and volume"),
    ).toBe("volume");
  });

  it("keeps volume when the question is about filling a cuboid", () => {
    expect(
      detectSkillVisualFamily(
        "How many centimetre cubes fill this cuboid?",
        "Volume",
        "Volume of cuboids",
      ),
    ).toBe("volume");
  });
});
