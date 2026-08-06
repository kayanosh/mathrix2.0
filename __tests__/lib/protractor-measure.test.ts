/**
 * DEF-028 regression. The `measure_angles` visual contract requires a
 * `protractor` block, but no deterministic builder ever emitted one:
 * buildAngleDiagram() solves a different problem (a MISSING angle from a known
 * sum) and returns a labeled_shape. So every "measure this angle" question
 * depended on the LLM volunteering a protractor block, and produced
 * visual_mismatch -> 422 when it did not, with no repair path — and
 * angle_diagram additionally computed a nonsense "missing" value of 180 - 65
 * for a question that has no missing angle.
 */
import { buildMethodForQuestion } from "@/lib/methods";
import { parseAngleProblem } from "@/lib/methods/ks2-topic-builders";
import { satisfiesSkillVisuals } from "@/lib/ks2-skill-visuals";

const built = (q: string) => buildMethodForQuestion(q);

describe("protractor measuring (DEF-028)", () => {
  it("emits a protractor block that satisfies the measure_angles contract", () => {
    const b = built("A protractor shows an angle of $65°$. Measure and classify the angle.");
    expect(b?.builderId).toBe("protractor_measure");
    // "classify" is asked, so the answer is the classification, not a bare
    // reading — see the DEF-028 classify test below.
    expect(b?.answer).toContain("acute");
    const types = [b!.block.type, ...(b!.extraBlocks ?? []).map((x) => x.type)];
    expect(types).toContain("protractor");
    expect(satisfiesSkillVisuals(types, "measure_angles")).toBe(true);
  });

  it("answers a CLASSIFY question with the classification, not a bare number", () => {
    // Answering "An angle measures 42°. Classify it." with "42°" would have
    // overwritten correct pupil-facing prose with a number (the DEF-025
    // failure mode). The sentence produced must be at least as informative.
    const b = built("An angle measures $42°$. Classify it.");
    expect(b?.answer).toMatch(/acute/i);
    expect(b?.answer).toMatch(/90/);
    expect(b?.answer).not.toBe("42°");
    expect(built("An angle measures $146°$. Classify it.")?.answer).toMatch(/obtuse/i);
    expect(built("An angle measures $90°$. Classify it.")?.answer).toMatch(/right angle/i);
  });

  it("answers a pure MEASURE question with the reading itself", () => {
    // These four were live with supplementary (180 - x) answers — an artefact
    // of angle_diagram treating them as missing-angle problems.
    const b = built(
      "A protractor is centred on vertex P. Arm PQ starts at $0°$, and arm PR crosses the same scale at $120°$. Measure angle QPR.",
    );
    expect(b?.answer).toBe("120°");
    expect(b?.answer).not.toBe("60°");
  });

  it("reads the arm's reading rather than the 0° baseline", () => {
    const b = built(
      "A protractor is centred on a vertex. One arm starts at $0°$, and the other arm reaches $120°$. Measure angle ABC.",
    );
    expect(b?.answer).toBe("120°");
  });

  it("teaches estimate-before-measure, revealing the reading only at the end", () => {
    const b = built("A protractor shows an angle of $65°$. Measure and classify the angle.");
    const blocks = [b!.block, ...(b!.extraBlocks ?? [])].filter(
      (x): x is Extract<typeof x, { type: "protractor" }> => x.type === "protractor",
    );
    expect(blocks[0].revealReading).toBe(false);
    expect(blocks[blocks.length - 1].revealReading).toBe(true);
    expect(b?.teachingSteps?.[b!.teachingSteps!.length - 1].showAnswer).toBe(true);
    // The classification must be taught, not just the number.
    expect(JSON.stringify(b?.teachingSteps)).toMatch(/acute/i);
  });

  it("does not hijack missing-angle questions", () => {
    for (const q of [
      "Two angles on a straight line are $130°$ and $x$. Find the missing angle.",
      "Angles in a triangle are $60°$, $70°$ and $x$. Find x.",
    ]) {
      expect(built(q)?.builderId).not.toBe("protractor_measure");
    }
  });

  it("angle_diagram declines a protractor measuring question", () => {
    // Otherwise the taxonomy's preferred builder wins and returns a
    // labeled_shape with a fabricated "missing" angle.
    expect(parseAngleProblem("A protractor shows an angle of $65°$. Measure and classify the angle.")).toBeNull();
    // ...but still handles a genuine missing-angle question that mentions one.
    expect(parseAngleProblem("A protractor is used to check: two angles on a straight line are $130°$ and $x$. Find the missing angle.")).not.toBeNull();
  });

  it("does not steal ordinary place-value or rounding questions", () => {
    expect(built("What is the value of the 7 in 4,703?")?.builderId).toBe("place_value_chart");
    expect(built("Round 57,892 to the nearest 10,000")?.builderId).toBe("rounding_number_line");
  });
});
