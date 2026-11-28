/**
 * What a full run of the whiteboard found (64 topics, every lesson read word
 * for word, twelve watched in a browser), and the fix for each.
 */
import { applyMethodBuilderToWhiteboard, METHODS_FOR_TOPIC } from "@/lib/methods/apply-builder";
import { boardReady, withoutMistakeHeadings } from "@/lib/board-ready";
import { buildNarrationPlan, sanitizeForTTS } from "@/lib/narration";
import { buildTutorSteps, isQuestionForPupil } from "@/lib/tutor-steps";
import { buildTeacherSpeechParts, isWorthNaming } from "@/lib/whiteboard-playback";
import { describeShape, shapeName } from "@/lib/shape-geometry";
import { simplifyLanguage } from "@/lib/plain-language";
import { planForQuestion, TOPIC_PLANS } from "@/lib/topic-plans";
import { runToolChecks, repairArithmetic } from "@/lib/verification-tools";
import { buildMethodForQuestion } from "@/lib/methods";
import { worthSaving } from "@/lib/question-cache";
import { settleShapeAnswers } from "@/lib/shape-answers";
import type { EquationStep, WhiteboardResponse } from "@/types/whiteboard";

const step = (n: number, latexAfter: string, more: Partial<EquationStep> = {}): EquationStep => ({
  stepNumber: n,
  operationLabel: `Step ${n}`,
  explanation: "",
  latexBefore: "",
  latexAfter,
  arrowDirection: "down",
  ...more,
});

const modelAnswer = (conclusion: string): WhiteboardResponse => ({
  intro: "Let's go.",
  blocks: [{ type: "equation_steps", steps: [step(1, "1 = 1"), step(2, conclusion)] }],
  conclusion,
  subject: "Maths",
});

describe("a built-in method runs only on its own topic", () => {
  // Each of these replaced a correct answer with the answer to a different
  // question, and each was saved and served again.
  it.each([
    ["Write 60 as a product of its prime factors.", "$60 = 2^2 \\times 3 \\times 5$"],
    ["a = (3, -2) and b = (1, 5) are column vectors. Work out a + 2b.", "$\\begin{pmatrix} 5 \\\\ 8 \\end{pmatrix}$"],
    ["Simplify the ratio 18 : 24", "The ratio is $3 : 4$."],
    ["In a histogram, the class 10 to 30 has a frequency of 40. Work out the frequency density of this class.", "The frequency density is 2."],
    ["From a cumulative frequency graph, the lower quartile is 12 and the upper quartile is 27. Work out the interquartile range.", "The interquartile range is 15."],
    ["A spinner is spun 200 times and lands on red 46 times. Work out the relative frequency of red.", "The relative frequency is 0.23."],
    ["Estimate the value of (4.8 × 31.2) ÷ 0.49", "The estimate is 300."],
    ["A, B and C are points on a circle with centre O. Angle AOB is 110°. Use a circle theorem to work out angle ACB.", "Angle ACB is 55°."],
  ])("%s", (question, conclusion) => {
    const answer = modelAnswer(conclusion);
    const shown = applyMethodBuilderToWhiteboard(answer, question, undefined, undefined, { level: "GCSE" });
    expect(shown.conclusion).toBe(conclusion);
    expect(shown.blocks).toEqual(answer.blocks);
  });

  it("still runs where it belongs", () => {
    const linear = applyMethodBuilderToWhiteboard(modelAnswer("So $x = 6$."), "Solve 3x + 7 = 25", undefined, undefined, { level: "GCSE" });
    expect(linear.teachingSteps?.length).toBeGreaterThan(0);
    const fractions = applyMethodBuilderToWhiteboard(modelAnswer("…"), "Work out 2/3 + 3/4", undefined, undefined, { level: "GCSE" });
    expect(fractions.conclusion).toContain("\\frac{17}{12}");
  });

  it("is not restricted for a primary-school question", () => {
    // The methods were written for these.
    const shown = applyMethodBuilderToWhiteboard(modelAnswer("…"), "Work out 23 × 47", undefined, undefined, { level: "KS2" });
    expect(shown.conclusion).toContain("1081");
  });

  it("only names topics and methods that exist", () => {
    const plans = new Set(TOPIC_PLANS.map((plan) => plan.id));
    for (const topic of Object.keys(METHODS_FOR_TOPIC)) expect(plans.has(topic)).toBe(true);
    expect(planForQuestion("Simplify the ratio 18 : 24")?.id).toBe("simplifying-ratios");
    expect(METHODS_FOR_TOPIC["simplifying-ratios"]).toBeUndefined();
  });
});

describe("what the accuracy paper found", () => {
  it("a surface area is not answered with a volume", () => {
    // "The cuboid holds 144 cm cubes, so its volume is 144 cm³." It is 168 cm².
    const question = "A cuboid is 6 cm long, 4 cm wide and 6 cm high. Work out its total surface area.";
    expect(buildMethodForQuestion(question, null)?.builderId).not.toBe("cuboid_volume");
    const answer = modelAnswer("The total surface area is $168 \\text{ cm}^2$.");
    expect(applyMethodBuilderToWhiteboard(answer, question, undefined, undefined, { level: "GCSE" })).toBe(answer);
    // The volume is still its question.
    expect(buildMethodForQuestion("A cuboid is 6 cm long, 4 cm wide and 6 cm high. Work out its volume.", null)?.builderId).toBe("cuboid_volume");
  });

  it("the number of sides of a polygon is not an angle", () => {
    // "The answer is 162°", from 180 − 18. Each exterior angle is 360 ÷ 18 = 20°.
    const question = "A regular polygon has 18 sides. Work out the size of each exterior angle.";
    expect(buildMethodForQuestion(question, null)?.builderId).not.toBe("angle_diagram");
    const answer = modelAnswer("Each exterior angle is $20^{\\circ}$.");
    expect(applyMethodBuilderToWhiteboard(answer, question, undefined, undefined, { level: "GCSE" })).toBe(answer);
  });

  it("a method that disagrees with the model does not replace its answer", () => {
    // Whatever the reason: the model said 12, the method says 6.
    const answer = modelAnswer("So $x = 12$.");
    const shown = applyMethodBuilderToWhiteboard(answer, "Solve 3x + 7 = 25", undefined, undefined, { level: "GCSE" });
    expect(shown).toBe(answer);
    // …unless the algebra engine has confirmed the method.
    const backed = applyMethodBuilderToWhiteboard(answer, "Solve 3x + 7 = 25", undefined, undefined, {
      level: "GCSE",
      agreesWithGroundTruth: () => true,
    });
    expect(backed.conclusion).toBe("So $x = 6$.");
  });

  it("a calculator answer rounded the wrong way is sent back", () => {
    // 8 × sin 42° = 5.353…, given as 5.3. To 1 decimal place it is 5.4.
    const board = (last: string): WhiteboardResponse => ({
      intro: "",
      blocks: [
        {
          type: "equation_steps",
          steps: [
            step(1, "x = 8 \\cdot \\sin(42^{\\circ})", { latexBefore: "\\sin(42^{\\circ}) = \\frac{x}{8}" }),
            step(2, last, { latexBefore: "x = 8 \\cdot \\sin(42^{\\circ})" }),
          ],
        },
      ],
      conclusion: "",
      subject: "Maths",
    });
    const failed = runToolChecks(board("x \\approx 5.3 \\text{ cm}")).checks.filter((c) => !c.passed);
    expect(failed).toHaveLength(1);
    expect(failed[0].decisive).toBe(true);
    expect(failed[0].detail).toContain("5.4 to 1 decimal place, not 5.3");
    expect(runToolChecks(board("x \\approx 5.4 \\text{ cm}")).checks.filter((c) => !c.passed)).toHaveLength(0);
    // Far out, with both lines saying "x =": also sent back.
    const farOut = runToolChecks(board("x \\approx 7.1 \\text{ cm}")).checks.filter((c) => !c.passed);
    expect(farOut[0].decisive).toBe(true);
  });

  const working = (...lines: Array<[before: string, after: string]>): WhiteboardResponse => ({
    intro: "",
    blocks: [{ type: "equation_steps", steps: lines.map(([b, a], i) => step(i + 1, a, { latexBefore: b })) }],
    conclusion: "",
    subject: "Maths",
  });
  const sentBack = (data: WhiteboardResponse) => runToolChecks(data).checks.filter((c) => !c.passed && c.decisive);

  it("a line that does not follow from the one above it is sent back", () => {
    // 100 + 144 was written as 224, and BC came out as 8.4 cm. It is 9.5.
    const slipped = working([
      "x^2 = 100 + 144 - 240 \\cdot \\cos 50^\\circ",
      "x^2 = 224 - 240 \\times \\cos 50^\\circ",
    ]);
    expect(sentBack(slipped)).toHaveLength(1);
    expect(sentBack(working(["x^2 = 100 + 144 - 240 \\cdot \\cos 50^\\circ", "x^2 = 244 - 240 \\times \\cos 50^\\circ"]))).toHaveLength(0);
  });

  it("a sum that does not come to what its own line says is sent back", () => {
    // "£1500 × 1.02³ = £1591.22". It is £1591.81.
    const interest = sentBack(working(["", "\\text{Final value} = £1500 \\times 1.02^3 = £1591.22"]));
    expect(interest).toHaveLength(1);
    expect(interest[0].detail).toContain("comes to 1591.812");
    expect(sentBack(working(["", "\\text{Final value} = £1500 \\times 1.02^3 = £1591.81"]))).toHaveLength(0);
    // "2(24) + 2(24) + 2(16) = 144". It is 128.
    expect(sentBack(working(["", "\\text{Surface area} = 2(24) + 2(24) + 2(16) = 144 \\text{ cm}^2"]))).toHaveLength(1);
  });

  it("a final answer cut off where it should be rounded is put right", () => {
    // 15 × sin 51° = 11.657…, given as 11.6. Sent back, the model said 11.6 again.
    const given: WhiteboardResponse = {
      ...working(
        ["\\sin 51^{\\circ} = \\frac{x}{15}", "x = \\htmlId{arrow-1-to}{15 \\times \\sin 51^{\\circ}}"],
        ["x = 15 \\times \\sin 51^{\\circ}", "x \\approx 11.6\\ \\text{cm}"],
      ),
      conclusion: "The length of the side opposite the 51° angle is about 11.6 cm.",
    };
    const mended = repairArithmetic(given);
    const lines = mended.blocks[0].type === "equation_steps" ? mended.blocks[0].steps.map((s) => s.latexAfter) : [];
    expect(lines[1]).toBe("x \\approx 11.7\\ \\text{cm}");
    expect(mended.conclusion).toBe("The length of the side opposite the 51° angle is about 11.7 cm.");
    expect(sentBack(mended)).toHaveLength(0);
  });

  it("a right answer is not touched, and one that is far out is worked out again", () => {
    const right = working(["", "x = 8 \\times \\sin 42^{\\circ}"], ["x = 8 \\times \\sin 42^{\\circ}", "x \\approx 5.4 \\text{ cm}"]);
    expect(repairArithmetic(right)).toBe(right);
    const farOut = repairArithmetic(working(["", "x = 8 \\times \\sin 42^{\\circ}"], ["x = 8 \\times \\sin 42^{\\circ}", "x \\approx 7.1 \\text{ cm}"]));
    expect(farOut.blocks[0].type === "equation_steps" && farOut.blocks[0].steps[1].latexAfter).toBe("x \\approx 5.4 \\text{ cm}");
    // A different thing on the last line is not "the same value, rounded".
    const other = working(["", "x = 3 \\times 4.19"], ["x = 3 \\times 4.19", "y \\approx 12.5"]);
    expect(repairArithmetic(other)).toBe(other);
  });

  it("a slip in the middle of the working is corrected through to the answer", () => {
    // c² = 169 + 64 + 71.136 was written as 161.864, and BC came out as 12.7 cm.
    const given: WhiteboardResponse = {
      ...working(
        ["", "c^2 = 169 + 64 - 208 \\times (-0.3420)"],
        ["", "c^2 = 169 + 64 + 71.136"],
        ["", "c^2 = 161.864"],
        ["", "c = 12.7 \\text{ cm}"],
      ),
      conclusion: "The length of $BC$ is 12.7 cm when rounded to 1 decimal place.",
    };
    const mended = repairArithmetic(given, "Use the cosine rule to work out the length of BC. Give your answer to 1 decimal place.");
    const lines = mended.blocks[0].type === "equation_steps" ? mended.blocks[0].steps.map((s) => s.latexAfter) : [];
    expect(lines.slice(2)).toEqual(["c^2 = 304.136", "c = 17.4 \\text{ cm}"]);
    expect(mended.conclusion).toBe("The length of $BC$ is 17.4 cm when rounded to 1 decimal place.");
  });

  it("an inverse tangent is worked out, not remembered", () => {
    // tan⁻¹(1.8) is 60.9°. The answer given was 60.0°.
    const given: WhiteboardResponse = {
      ...working(["", "\\tan x = 1.8"], ["", "x = \\tan^{-1}(1.8)"], ["", "x = \\textcolor{#dc2626}{60.0^{\\circ}}"]),
      conclusion: "So, angle $x$ is $60.0^{\\circ}$ to 1 decimal place. Done!",
    };
    const mended = repairArithmetic(given, "Work out the size of angle x. Give your answer to 1 decimal place.");
    expect(mended.conclusion).toBe("So, angle $x$ is $60.9^{\\circ}$ to 1 decimal place. Done!");
  });

  it("a sum and its total on one line", () => {
    const given: WhiteboardResponse = {
      ...working(["", "\\text{Multiplier} = 1.02"], ["", "\\text{Final value} = £1500 \\times 1.02^3 = £1591.22"]),
      conclusion: "After 3 years, the investment will be worth £1591.22.",
    };
    expect(repairArithmetic(given, "Work out the value after 3 years.").conclusion).toBe("After 3 years, the investment will be worth £1591.81.");
  });

  it("leaves right working, estimates and different things alone", () => {
    const right = working(["", "x^2 = 81 + 144"], ["", "x^2 = 225"], ["", "x = 15 \\text{ cm}"]);
    expect(repairArithmetic(right, "Work out the longest side.")).toBe(right);
    // A rounded answer is right.
    const rounded = working(["", "A = \\pi \\times 7^2"], ["", "A \\approx 153.9 \\text{ cm}^2"]);
    expect(repairArithmetic(rounded, "Work out the area to 1 decimal place.")).toBe(rounded);
    const sigFigs = working(["", "V = 21.5 \\times 440.6"], ["", "V \\approx 9470"]);
    expect(repairArithmetic(sigFigs, "Give your answer to 3 significant figures.")).toBe(sigFigs);
    // In an estimate the numbers are meant to change.
    const estimate = working(["", "E = 4.8 \\times 31.2 \\div 0.49"], ["", "E \\approx 300"]);
    expect(repairArithmetic(estimate, "Estimate the value of (4.8 × 31.2) ÷ 0.49")).toBe(estimate);
    // A percentage, and the same amount in two units: nothing to correct.
    // (The first of these was "corrected" to £100 when the repair was first
    // run over 461 saved answers. That is how it was found.)
    const percent = working(["", "\\text{Original price} = 100\\% = £120"], ["", "\\text{Sale percentage} = 88\\% = 0.88"]);
    expect(repairArithmetic(percent, "Work out the sale price.")).toBe(percent);
    const units = working(["", "\\text{Time} = 30 \\text{ minutes}"], ["", "\\text{Time} = 0.5 \\text{ hours}"]);
    expect(repairArithmetic(units, "Work out the speed.")).toBe(units);
    const density = working(["", "\\text{Density} = \\frac{1780}{200}"], ["", "\\text{Density} = 8.9 \\text{ g/cm}^3"]);
    expect(repairArithmetic(density, "Work out the density.")).toBe(density);
    // Two different things that happen to follow one another.
    const two = working(["", "\\text{Mean} = \\frac{50}{5}"], ["", "\\text{Median} = 9"]);
    expect(repairArithmetic(two, "Work out the mean and the median.")).toBe(two);
  });

  it("a number written inside the words is still read", () => {
    // "Area ≈ \text{30.48 cm}^2" after "Area = ½ × 5 × 12 × sin 110°", which is 28.19.
    const area = working(
      ["", "\\text{Area} = \\frac{1}{2} \\times 5 \\times 12 \\times \\sin 110°"],
      ["\\text{Area} = \\frac{1}{2} \\times 5 \\times 12 \\times \\sin 110°", "\\text{Area} \\approx \\text{30.48 cm}^2"],
    );
    const failed = sentBack(area);
    expect(failed).toHaveLength(1);
    expect(failed[0].detail).toContain("28.1908");
  });

  it("a fraction rewritten as a different fraction is sent back", () => {
    // 3/5 ÷ 3/6: "18/15", then "1/30". It is 6/5.
    expect(sentBack(working(["\\frac{18}{15}", "\\frac{1}{30}"]))).toHaveLength(1);
    expect(sentBack(working(["\\frac{18}{15}", "\\frac{6}{5}"]))).toHaveLength(0);
    // In an estimate the lines are meant to change.
    const estimate = working(["5 \\times 31.2 \\div 0.49", "5 \\times 30 \\div 0.49"]);
    expect(runToolChecks(estimate, "Estimate the value of (4.8 × 31.2) ÷ 0.49").checks.filter((c) => !c.passed && c.decisive)).toHaveLength(0);
  });

  it("but lines the checks cannot be sure of are left alone", () => {
    // Each of these was flagged when the checks were first run over 262 saved
    // answers, and each is right.
    expect(sentBack(working(["", "(248 + 180) \\mod 360 = 68"]))).toHaveLength(0);
    expect(sentBack(working(["", "g(-3) = (-3)^2 - 7"]))).toHaveLength(0);
    expect(sentBack(working(["", "\\text{Area} = 44 \\times 0.9511 = 41.8474 \\text{ cm}^2"]))).toHaveLength(0);
    expect(sentBack(working(["500", "0.6"]))).toHaveLength(0);
    // 5⁻³: the positive power is worked out on the way to 1/125.
    expect(sentBack(working(["5^{-3}", "5^3"]))).toHaveLength(0);
    expect(sentBack(working(["59062", "59000"]))).toHaveLength(0);
    expect(sentBack(working(["", "\\pi \\times 5^2 = 78.5 \\text{ cm}^2"]))).toHaveLength(0);
    expect(sentBack(working(["", "150 \\div 2.5 = 60 \\text{ mph}"]))).toHaveLength(0);
    expect(sentBack(working(["", "9472.6 \\approx 9470"]))).toHaveLength(0);
  });

  it("a drawing beside the working does not replace the answer to a different question", () => {
    // "The area of the shape is 23 cm²", for the surface area of a cuboid.
    const answer: WhiteboardResponse = {
      intro: "We need the total surface area of the cuboid.",
      blocks: [
        { type: "labeled_shape", shape: "rectilinear", rectilinear: { width: 6, height: 4, notchWidth: 1, notchHeight: 1, unit: "cm" } },
        { type: "equation_steps", steps: [step(1, "\\text{Surface area} = 2(16) + 2(24) + 2(24) = 128 \\text{ cm}^2")] },
      ],
      conclusion: "The total surface area is 128 cm².",
      subject: "Maths",
    };
    const shown = settleShapeAnswers(answer, "A cuboid is 4 cm long, 4 cm wide and 6 cm high. Work out its total surface area.");
    expect(shown.conclusion).toBe("The total surface area is 128 cm².");
    // An L-shape that is not the question's own is not used either.
    const other = settleShapeAnswers({ ...answer, conclusion: "The area is 40 cm²." }, "A rectangle is 10 cm by 4 cm. Work out its area.");
    expect(other.conclusion).toBe("The area is 40 cm².");
  });

  it("an L-shape question is still settled from its drawing", () => {
    const answer: WhiteboardResponse = {
      intro: "",
      blocks: [{ type: "labeled_shape", shape: "rectilinear", rectilinear: { width: 8, height: 6, notchWidth: 5, notchHeight: 2, unit: "cm" } }],
      conclusion: "The area is 30 cm².",
      subject: "Maths",
    };
    const shown = settleShapeAnswers(answer, "An L-shape is 8 cm wide and 6 cm tall. A piece 5 cm by 2 cm is cut from one corner. Work out its area.");
    expect(shown.conclusion).toBe("The area of the shape is 38 cm².");
    // And a photo, which has no typed question.
    expect(settleShapeAnswers(answer, "").conclusion).toBe("The area of the shape is 38 cm².");
  });

  it("an answer the checks rated low is not saved for the next pupil", () => {
    expect(worthSaving("agree", "high")).toBe(true);
    expect(worthSaving(null, "medium")).toBe(true);
    expect(worthSaving(null, "low")).toBe(false);
    expect(worthSaving("disagree", "high")).toBe(false);
  });
});

describe("the first line of working keeps its result", () => {
  const board = (steps: EquationStep[]): WhiteboardResponse => ({
    intro: "",
    blocks: [{ type: "equation_steps", steps }],
    conclusion: "",
    subject: "Maths",
  });
  const lines = (data: WhiteboardResponse) =>
    data.blocks.flatMap((b) => (b.type === "equation_steps" ? b.steps.map((s) => s.latexAfter) : []));

  it("gives the starting line a step of its own when step 1 changes it", () => {
    // The board showed "x² + 6x + 2", then "(x + 3)² − 7". The line between
    // them was said aloud and never written.
    const given = board([
      step(1, "(x + 3)^2 - 9 + 2", { latexBefore: "x^2 + 6x + 2", explanation: "Half of 6 is 3, and 3 squared is 9." }),
      step(2, "(x + 3)^2 - 7"),
    ]);
    const ready = boardReady(given);
    expect(lines(ready)).toEqual(["x^2 + 6x + 2", "(x + 3)^2 - 9 + 2", "(x + 3)^2 - 7"]);
    const steps = ready.blocks[0].type === "equation_steps" ? ready.blocks[0].steps : [];
    expect(steps.map((s) => s.stepNumber)).toEqual([1, 2, 3]);
    expect(steps[1].explanation).toBe("Half of 6 is 3, and 3 squared is 9.");
    // The lesson now has a step for each of the three lines.
    const tutor = buildTutorSteps(ready, buildNarrationPlan(ready)).filter((s) => s.kind === "equation_step");
    expect(tutor).toHaveLength(3);
  });

  it("leaves a first step that only states the line", () => {
    const given = board([step(1, "4x + 7 = 2x + 19", { latexBefore: "4x + 7 = 2x + 19" }), step(2, "2x + 7 = 19")]);
    expect(boardReady(given)).toBe(given);
  });

  it("does not add a line for a start that is only a number, or is repeated in the result", () => {
    // "0" then "5" (counting faces), and "36" then "36 = 2 × 2 × 3 × 3".
    expect(lines(boardReady(board([step(1, "\\text{Faces} = 5", { latexBefore: "0" }), step(2, "9")])))).toEqual(["\\text{Faces} = 5", "9"]);
    expect(lines(boardReady(board([step(1, "36 = 2 \\times 2 \\times 3 \\times 3", { latexBefore: "36" })])))).toEqual([
      "36 = 2 \\times 2 \\times 3 \\times 3",
    ]);
  });

  it("is the same when applied twice", () => {
    const given = board([step(1, "k = 2.5", { latexBefore: "k = \\frac{10}{4}" }), step(2, "x = 15")]);
    const once = boardReady(given);
    expect(boardReady(once)).toBe(once);
  });

  it("leaves a built-in method's working alone", () => {
    const given = { ...board([step(1, "x = 3", { latexBefore: "x - 3 = 0" })]), teachingSteps: [{ title: "Add 3", explanation: "x = 3" }] } as WhiteboardResponse;
    expect(boardReady(given)).toBe(given);
  });
});

describe("a tree too big to read", () => {
  const die = (children?: boolean) =>
    [1, 2, 3, 4, 5, 6].map((n) => ({
      event: String(n),
      probability: "\\frac{1}{6}",
      probabilityValue: 1 / 6,
      ...(children ? { children: [1, 2, 3, 4, 5, 6].map((m) => ({ event: String(m), probability: "\\frac{1}{6}", probabilityValue: 1 / 6 })) } : {}),
    }));

  it("two dice become a grid of totals, with the total asked about marked", () => {
    const given: WhiteboardResponse = {
      intro: "Let's find the probability of getting a total of 7 when two dice are rolled.",
      blocks: [{ type: "probability_tree", rootLabel: "First die", branches: die(true) }],
      conclusion: "The probability is $\\frac{1}{6}$.",
      subject: "Maths",
    };
    const ready = boardReady(given);
    const grid = ready.blocks[0];
    expect(grid.type).toBe("table");
    if (grid.type !== "table") return;
    expect(grid.headers).toEqual(["+", "1", "2", "3", "4", "5", "6"]);
    expect(grid.rows).toHaveLength(6);
    expect(grid.rows[2]).toEqual(["3", "4", "5", "6", "7", "8", "9"]);
    // Six ways to make 7, one in each row.
    expect(grid.highlightCells).toHaveLength(6);
    expect(grid.highlightCells).toContainEqual([0, 6]);
  });

  it("an ordinary tree stays a tree", () => {
    const twoByTwo = {
      type: "probability_tree" as const,
      rootLabel: "First counter",
      branches: ["Red", "Blue"].map((event) => ({
        event,
        probability: "\\frac{1}{2}",
        probabilityValue: 0.5,
        children: ["Red", "Blue"].map((e) => ({ event: e, probability: "\\frac{1}{2}", probabilityValue: 0.5 })),
      })),
    };
    const given: WhiteboardResponse = { intro: "", blocks: [twoByTwo], conclusion: "", subject: "Maths" };
    expect(boardReady(given)).toBe(given);
  });
});

describe("the warning about the common mistake", () => {
  it("is said as two sentences, without the plan's headings", () => {
    expect(
      withoutMistakeHeadings("What goes wrong: Writing the upper bound of 3.5 as 3.54. What to do: The upper bound is 3.55."),
    ).toBe("A common mistake is writing the upper bound of 3.5 as 3.54. The upper bound is 3.55.");
    expect(withoutMistakeHeadings("Don't divide by the number of rows.")).toBe("Don't divide by the number of rows.");
  });
});

describe("a question for the pupil", () => {
  it.each([
    ["How many parts are there altogether?", true],
    ["What is one part worth?", true],
    ["Which number is in the middle once they are in order?", true],
    ["Did we multiply or divide by a negative number at any point?", true],
    ["Have you cancelled a common factor from both top and bottom?", false],
    ["All products: $x^2$, $-4x$, $3x$, $-12$ — ready to collect like terms?", false],
    ["5 students remain when you subtract the ones taking languages. Is that correct?", false],
    ["Check: Is 2.65 between the smallest (1) and largest (4)?", false],
    ["Check: $2(3) + 4 = 10$ ✓", false],
    [undefined, false],
  ])("%s", (check, asks) => {
    expect(isQuestionForPupil(check)).toBe(asks);
  });

  it("is given as 'Your turn' only when it is one", () => {
    const base = { cueIndex: 0, kind: "equation_step" as const, title: "", explanation: "Add them.", narration: "", visual: { type: "intro" as const, text: "" } };
    expect(buildTeacherSpeechParts({ ...base, check: "What is one part worth?" })).toMatchObject({ asksPupil: true, check: "Your turn. What is one part worth?" });
    expect(buildTeacherSpeechParts({ ...base, check: "Ready to collect like terms?" })).toMatchObject({ asksPupil: false, check: "Ready to collect like terms?" });
    expect(buildTeacherSpeechParts({ ...base, check: "Check: $24 + 36 = 60$ ✓" })).toMatchObject({ asksPupil: false, check: "Let's check. 24 plus 36, equals 60" });
  });
});

describe("naming a rule", () => {
  it.each([
    ["Pythagoras' theorem", true],
    ["Angle at the centre theorem", true],
    ["Inverse operations", true],
    ["Law of indices: multiplying powers", true],
    ["Division", false],
    ["Adding", false],
    ["Multiplication", false],
    ["Halving", false],
    ["Definition of mean", false],
    ["Fraction calculation", false],
    ["Product", false],
    ["Combining like terms", false],
  ])("%s", (rule, named) => {
    expect(isWorthNaming(rule)).toBe(named);
  });
});

describe("what the voice says", () => {
  it("degrees, however they are written", () => {
    expect(sanitizeForTTS("The bearing of A from B is $250^{\\textdegree}$.")).toBe("The bearing of A from B is 250 degrees.");
    expect(sanitizeForTTS("$070^{\\circ} + 180^\\circ$")).toContain("070 degrees plus 180 degrees");
  });

  it("never a colour", () => {
    expect(sanitizeForTTS("$x = \\textcolor{#dc2626}{\\sqrt{67}} \\approx 8.19$")).toBe("x equals the square root of 67 is about 8.19");
  });

  it("the signs for sets", () => {
    expect(sanitizeForTTS("So the members of $A \\cap B$ are only $\\{6\\}$.")).toBe("So the members of A intersection B are only 6.");
    expect(sanitizeForTTS("$A \\cup B$")).toBe("A union B");
  });

  it("'angle' once", () => {
    expect(sanitizeForTTS("Let's find angle $\\angle ACB$.")).toBe("Let's find angle A C B.");
  });

  it("a half, a third and a quarter as words, other fractions as 'over'", () => {
    expect(sanitizeForTTS("$\\frac{1}{2}$")).toBe("one half");
    expect(sanitizeForTTS("$\\frac{2}{3}$ of the class")).toBe("two thirds of the class");
    expect(sanitizeForTTS("$\\frac{5}{18}$")).toBe("5 over 18");
    expect(sanitizeForTTS("$\\frac{x + 1}{2}$")).toBe("x plus 1, all over 2");
  });
});

describe("what the teacher says about a drawing", () => {
  const cueFor = (block: WhiteboardResponse["blocks"][number]) =>
    buildNarrationPlan({ intro: "", blocks: [block], conclusion: "", subject: "Maths" })[0].text;

  it("a table", () => {
    expect(cueFor({ type: "table", headers: ["n", "term"], rows: [], caption: "List of given numbers" })).toBe("This table shows the given numbers.");
    expect(cueFor({ type: "table", headers: ["pens", "cost"], rows: [], caption: "Proportion table" })).toBe("Here's a table, with columns for pens and cost.");
    expect(cueFor({ type: "table", headers: [], rows: [], caption: "Frequency table with $f \\times x$ column" })).toBe(
      "Here's the frequency table with f times x column.",
    );
  });

  it("a graph with no line on it", () => {
    const text = cueFor({ type: "coordinate_graph", xRange: [0, 6], yRange: [0, 16], plots: [], points: [{ x: 1, y: 2, label: "(1, 2)" }, { x: 5, y: 14, label: "(5, 14)" }] } as never);
    expect(text).not.toContain("the function");
    expect(text).toContain("The points are");
  });

  it("a regular hexagon is a hexagon, and its angles are said once", () => {
    const hexagon = {
      type: "labeled_shape" as const,
      shape: "polygon" as const,
      vertices: ["A", "B", "C", "D", "E", "F"].map((label) => ({ label })),
      angles: ["A", "B", "C", "D", "E", "F"].map((vertex) => ({ vertex, label: "x" })),
    };
    expect(shapeName(hexagon as never)).toBe("hexagon");
    expect(describeShape(hexagon as never)).toBe("Here's the hexagon. Every angle is x.");
    const steps = buildTutorSteps(
      { intro: "", blocks: [hexagon as never], conclusion: "", subject: "Maths" },
      buildNarrationPlan({ intro: "", blocks: [hexagon as never], conclusion: "", subject: "Maths" }),
    );
    expect(steps[0].title).toBe("Draw the hexagon");
  });
});

describe("an estimate is rounded as the question asked", () => {
  const estimate = (first: string): WhiteboardResponse => ({
    intro: "",
    blocks: [
      {
        type: "equation_steps",
        steps: [step(1, first), step(2, "58.9 \\approx 60"), step(3, "4.8 \\approx 5"), step(4, "\\text{Estimate} = \\frac{600}{5} = 120")],
      },
    ],
    conclusion: "The estimated value is 120.",
    subject: "Maths",
  });
  const question = "By rounding each number to 1 significant figure, estimate the value of (9.2 × 58.9) ÷ 4.8";

  it("catches 9.2 rounded to 10", () => {
    // Found by the accuracy paper: the app answered 120. It is 108.
    const report = runToolChecks(estimate("9.2 \\approx 10"), question);
    const failed = report.checks.filter((c) => !c.passed);
    expect(failed).toHaveLength(1);
    expect(failed[0]).toMatchObject({ check: "Rounding to 1 significant figure", decisive: true });
    expect(failed[0].detail).toContain("9.2 to 1 significant figure is 9, not 10");
  });

  it("passes the right rounding, and is silent on other questions", () => {
    expect(runToolChecks(estimate("9.2 \\approx 9"), question).checks.filter((c) => !c.passed)).toHaveLength(0);
    const elsewhere = runToolChecks(estimate("9.2 \\approx 10"), "Round 9.2 to the nearest 10.");
    expect(elsewhere.checks.filter((c) => c.check.startsWith("Rounding"))).toHaveLength(0);
  });
});

describe("plain words", () => {
  it("explains a word once across a step's explanation and its reason", () => {
    const out = simplifyLanguage({
      blocks: [
        {
          type: "equation_steps",
          steps: [{ explanation: "The number 9 appears most often, so it's the mode.", why: "The mode is the number that appears most often." }],
        },
      ],
    });
    const said = `${out.blocks[0].steps[0].explanation} ${out.blocks[0].steps[0].why}`;
    expect(said.match(/the most common value/g)).toHaveLength(1);
  });

  it("does not explain 'circumference' where it means a place on the circle", () => {
    expect(simplifyLanguage({ intro: "The angle at the centre is twice the angle at the circumference." }).intro).toBe(
      "The angle at the centre is twice the angle at the circumference.",
    );
    expect(simplifyLanguage({ intro: "Find the circumference." }).intro).toContain("(the distance around the circle)");
  });

  it("uses British spelling and the plain word", () => {
    expect(simplifyLanguage({ intro: "Probability is the number of favorable outcomes." }).intro).toContain("favourable");
    expect(simplifyLanguage({ intro: "An angle at the center of a circle." }).intro).toContain("centre");
    expect(simplifyLanguage({ intro: "Halving and squaring makes a perfect square trinomial." }).intro).toContain("squared bracket");
  });
});
