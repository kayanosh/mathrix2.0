/**
 * DEF-041 (FIXED): the angle_diagram builder used to serve negative angles.
 *
 * Written as the acceptance spec before the fix, and kept as the regression
 * guard after it.
 *
 * The defect was live code, not stale cache. buildAngleDiagram() computed
 * `total - sumKnown` where `total` was typed `180 | 360`, and 360 was only ever
 * chosen when the text said "around a point" / "full turn" / "360". No branch
 * recognised a polygon, so a quadrilateral was solved against 180 and "the
 * known angles in a quadrilateral total 245°" produced -65°, which was served
 * as the answer, written into the shape label and the caption, and read aloud
 * by the teaching-step narration. It reproduced on questions that were nowhere
 * in the cache ("a pentagon total 400°" gave -220°), so it would have kept
 * producing wrong answers for every future generation.
 */
import {
  parseAngleProblem,
  buildAngleDiagram,
} from "@/lib/methods/ks2-topic-builders";
import { deterministicMathsAnswer } from "@/lib/ks2-maths-accuracy";

describe("angle_diagram builder — currently correct behaviour", () => {
  it("solves a genuine triangle missing-angle question", () => {
    const parsed = parseAngleProblem(
      "Two angles in a triangle are $60°$ and $70°$. Find the missing angle.",
    );
    expect(parsed).not.toBeNull();
    expect(buildAngleDiagram(parsed!.known, parsed!.total, parsed!.kind).answer).toBe("50°");
  });

  it("declines a protractor measure question so protractor_measure handles it", () => {
    expect(
      parseAngleProblem("Measure angle $CBA$ with a protractor and classify it."),
    ).toBeNull();
  });
});

describe("DEF-041 — angle_diagram must never serve a negative angle", () => {
  it("uses 360° for a quadrilateral, not 180°", () => {
    const parsed = parseAngleProblem(
      "The known angles in a quadrilateral total $245°$. What is the missing angle?",
    );
    expect(parsed?.total).toBe(360);
    expect(buildAngleDiagram(parsed!.known, parsed!.total, parsed!.kind).answer).toBe("115°");
  });

  it("uses (n-2)x180 for a pentagon", () => {
    const parsed = parseAngleProblem(
      "The known angles in a pentagon total $400°$. What is the missing angle?",
    );
    expect(parsed?.total).toBe(540);
    expect(buildAngleDiagram(parsed!.known, parsed!.total, parsed!.kind).answer).toBe("140°");
  });

  /**
   * The backstop that matters most. Whatever the parser decides, a build whose
   * missing angle is not positive is incoherent and must decline rather than
   * teach it — a pupil being told "the missing angle is -20 degrees", out loud,
   * by the narration, is worse than no visual at all.
   */
  it("declines rather than emitting a non-positive missing angle", () => {
    const parsed = parseAngleProblem(
      "An angle is greater than $90°$. Its baseline starts at $0°$, and the other arm crosses that scale at $110°$. What is the angle?",
    );
    if (!parsed) return; // declining at parse time is an acceptable fix too
    const built = buildAngleDiagram(parsed.known, parsed.total, parsed.kind);
    expect(Number(String(built.answer).replace(/[^\d.-]/g, ""))).toBeGreaterThan(0);
  });

  /**
   * The counterpart risk to the fix: angle_diagram now declines more
   * questions, so protractor_measure must still pick them up. Before the fix
   * these 11 were the ones the deterministic layer was already repairing
   * correctly on every request, and losing any of them would turn a working
   * repair into stale wrong content without anything failing loudly.
   */
  it("leaves protractor measure/classify questions to protractor_measure", () => {
    const stillRepaired = [
      ["A measured angle is $45°$. Classify it.", "acute"],
      ["A measured angle is $90°$. Classify it.", "right angle"],
      ["A protractor reading is $180°$. Classify the angle.", "straight"],
      [
        "A protractor is centred on vertex $D$. Arm $DE$ is on $0°$, and arm $DF$ crosses the matching scale at $72°$. Measure angle $EDF$.",
        "72",
      ],
      [
        "A protractor is centred on vertex $X$. Arm $XY$ starts at $0°$, and arm $XZ$ crosses the matching scale at $145°$. Measure angle $YXZ$.",
        "145",
      ],
    ] as const;
    for (const [question, expected] of stillRepaired) {
      const solved = deterministicMathsAnswer(question);
      expect(solved).not.toBeNull();
      expect(solved!.answer.toLowerCase()).toContain(expected);
    }
  });

  /**
   * DEF-042. The cue allowed only the article "the", so "Measure an angle
   * shown as 73°" fell through to place_value_chart, which answered an angle
   * question with a bare number and silently dropped the "and classify it"
   * half. Served from v19|y6m-shape|...|guided|measure and classify angles.
   */
  it("claims 'Measure an angle...' for protractor_measure, not place_value_chart", () => {
    for (const [question, expected] of [
      ["Measure an angle shown as $73°$ and classify it.", "acute"],
      ["Measure an angle shown as $118°$ and classify it.", "obtuse"],
      ["Measure an angle shown as $90°$ and classify it.", "right angle"],
    ] as const) {
      const solved = deterministicMathsAnswer(question);
      expect(solved).not.toBeNull();
      expect(solved!.builderId).toBe("protractor_measure");
      expect(solved!.answer.toLowerCase()).toContain(expected);
    }
  });

  /**
   * A classification can be asked for without the word "classify". The
   * regenerated replacement for the rejected Y6 lesson asked "A measured angle
   * is 110°. Is it acute, right or obtuse?" and was answered "110°" — the
   * measurement restated, the question ignored — and the angle audit reported
   * a clean zero over the whole cache while it did, because the checker had
   * the same blind spot as the builder. Both cues were widened together.
   */
  it("answers an enumerated classification question with the angle's name", () => {
    for (const [question, expected] of [
      ["A measured angle is $110°$. Is it acute, right or obtuse?", "obtuse"],
      ["An angle measures $78°$. Is it acute or obtuse?", "acute"],
    ] as const) {
      const solved = deterministicMathsAnswer(question);
      expect(solved).not.toBeNull();
      expect(solved!.builderId).toBe("protractor_measure");
      expect(solved!.answer.toLowerCase()).toContain(expected);
    }
  });

  it("does not sweep up the protractor baseline 0° as a known angle", () => {
    const parsed = parseAngleProblem(
      "You align one arm with the $0°$ on the inner scale. The other arm reaches $135°$ on that scale. What is the angle and its classification?",
    );
    // Either decline (it is a measure question), or at minimum do not treat the
    // 0° baseline as one of the known angles summing toward 180°.
    if (parsed) expect(parsed.known).not.toContain(0);
  });
});
