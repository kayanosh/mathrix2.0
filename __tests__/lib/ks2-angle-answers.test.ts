/**
 * DEF-040: angle/protractor practice answers.
 *
 * Every wrong case below is copied verbatim from a lesson that was being served
 * to children from the live cache. Every correct case is copied from the same
 * lessons, so the check cannot "pass" by condemning all angle content.
 */
import {
  checkAngleAnswer,
  classifyAngle,
  statedReading,
} from "@/lib/ks2-angle-answers";

describe("statedReading", () => {
  /**
   * The bug that made the first version of this audit simultaneously report a
   * false positive and miss four real errors: these questions name the
   * protractor baseline (0°) before the measurement.
   */
  it("ignores the protractor baseline and takes the measured reading", () => {
    expect(
      statedReading(
        "A protractor is centred on vertex $R$. Arm $RS$ starts at $0°$, and arm $RT$ crosses the matching scale at $90°$. Measure angle $SRT$.",
      ),
    ).toBe(90);
    expect(statedReading("A measured angle is $45°$. Classify it.")).toBe(45);
    expect(
      statedReading(
        "You align one arm with the $0°$ on the inner scale. The other arm reaches $135°$ on that scale.",
      ),
    ).toBe(135);
  });
});

describe("classifyAngle", () => {
  it("uses the KS2 names at and around each boundary", () => {
    expect(classifyAngle(45)).toBe("acute");
    expect(classifyAngle(89)).toBe("acute");
    expect(classifyAngle(90)).toBe("right angle");
    expect(classifyAngle(91)).toBe("obtuse");
    expect(classifyAngle(179)).toBe("obtuse");
    expect(classifyAngle(180)).toBe("straight");
    expect(classifyAngle(181)).toBe("reflex");
  });
});

describe("checkAngleAnswer", () => {
  it("catches a reading answered with its supplement", () => {
    // Served 23x from v19|y5m-shape|...|measure angles in degrees.
    expect(
      checkAngleAnswer(
        "A protractor is centred on vertex $D$. Arm $DE$ is on $0°$, and arm $DF$ crosses the matching scale at $72°$. Measure angle $EDF$.",
        "108°",
      ),
    ).toEqual({ fault: "SUPPLEMENTED", expected: "72°", valueWrong: true });

    expect(
      checkAngleAnswer(
        "A protractor is centred on vertex $X$. Arm $XY$ starts at $0°$, and arm $XZ$ crosses the matching scale at $145°$. Measure angle $YXZ$.",
        "35°",
      ),
    ).toEqual({ fault: "SUPPLEMENTED", expected: "145°", valueWrong: true });
  });

  it("catches a negative angle", () => {
    // Served 24x: the correct answer is 360 - 245 = 115 degrees.
    expect(
      checkAngleAnswer(
        "The known angles in a quadrilateral total $245°$. What is the missing angle?",
        "-65°",
      ),
    ).toEqual({ fault: "IMPOSSIBLE", expected: "a non-negative angle", valueWrong: true });
  });

  it("catches 'classify it' answered with a bare number", () => {
    // Served 28x from v19|y6m-shape|...|measure and classify angles — every
    // single practice item in that lesson failed this way.
    expect(
      checkAngleAnswer("A measured angle is $45°$. Classify it.", "135°"),
    ).toEqual({ fault: "UNCLASSIFIED", expected: "acute", valueWrong: true });
    expect(
      checkAngleAnswer("A protractor reading is $180°$. Classify the angle.", "0°"),
    ).toEqual({ fault: "UNCLASSIFIED", expected: "straight", valueWrong: true });
    expect(
      checkAngleAnswer(
        "A protractor shows an angle of $65°$. Measure and classify the angle.",
        "65",
      ),
    ).toEqual({ fault: "UNCLASSIFIED", expected: "acute", valueWrong: false });
  });

  it("accepts a correct reading and a correct classification", () => {
    // From the same lessons — the check must not condemn these.
    expect(
      checkAngleAnswer(
        "A protractor is centred on vertex $R$. Arm $RS$ starts at $0°$, and arm $RT$ crosses the matching scale at $90°$. Measure angle $SRT$.",
        "90°",
      ),
    ).toBeNull();
    expect(
      checkAngleAnswer("A measured angle is $150°$. Classify it.", "It is obtuse."),
    ).toBeNull();
    expect(
      checkAngleAnswer("A measured angle is $90°$. Classify it.", "A right angle."),
    ).toBeNull();
  });

  /**
   * Reading the OTHER scale is a legitimate thing to teach, and there 180 - x
   * is the right answer. Flagging it would make the check unusable on exactly
   * the lessons that handle the misconception properly.
   */
  it("does not flag a supplement when the question never pins the scale", () => {
    expect(
      checkAngleAnswer(
        "One arm lies along the outer scale's $0°$. The other arm sits where the inner scale shows $110°$. What is the angle on the outer scale?",
        "70°",
      ),
    ).toBeNull();
  });

  it("ignores items with no angle in them at all", () => {
    expect(
      checkAngleAnswer(
        "Why should you estimate an angle before reading the protractor?",
        "An estimate helps you choose the correct scale.",
      ),
    ).toBeNull();
  });
});
