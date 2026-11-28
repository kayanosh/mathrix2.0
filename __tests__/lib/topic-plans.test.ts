/**
 * Topic teaching plans (pilot: one topic in each strand).
 *
 * Each plan was tried on a real question through the running app, before and
 * after. The parts of the plans visible in the six answers went from 20 of 42
 * to between 34 and 38 over three runs. These tests pin the parts that are code:
 * which questions get which plan, what the model is told, how an answer is
 * scored, and the faults the pilot runs exposed.
 */
import { GCSE_SYLLABUS, getSubtopicsForTier } from "@/lib/syllabus";
import { hashLessonKey } from "@/lib/lesson-cache-key";
import { drawBareMaths, mathsInDollars } from "@/lib/maths-text";
import { applyMethodBuilderToWhiteboard } from "@/lib/methods/apply-builder";
import { buildNarrationPlan } from "@/lib/narration";
import { buildSystemPrompt } from "@/lib/prompts/system";
import { buildLessonPrompt } from "@/lib/prompts/teacher";
import {
  TOPIC_PLANS,
  planCoverage,
  planForLesson,
  planForQuestion,
  planForSolving,
  planForTopic,
  planVersionFor,
} from "@/lib/topic-plans";
import { buildTutorSteps } from "@/lib/tutor-steps";
import type { EquationStepBlock, WhiteboardResponse } from "@/types/whiteboard";

/** The six questions the pilot was run on. */
const PILOT: Array<[string, string]> = [
  ["standard-form", "Work out (3 × 10^4) × (2 × 10^5). Give your answer in standard form."],
  ["linear-equations", "Solve 4x + 7 = 2x + 19"],
  ["sharing-in-a-ratio", "Share £60 between Amy and Ben in the ratio 2 : 3."],
  ["pythagoras", "A right-angled triangle has shorter sides of 9 cm and 12 cm. Work out the length of the longest side."],
  ["averages", "Work out the mean, median, mode and range of 4, 9, 9, 11, 17."],
  [
    "probability-trees",
    "A bag has 4 red counters and 6 blue counters. One counter is taken out, put back, and then another is taken out. Work out the probability of getting one of each colour.",
  ],
];

describe("which plan a question gets", () => {
  it.each(PILOT)("%s", (id, question) => {
    expect(planForQuestion(question)?.id).toBe(id);
  });

  it("the six pilot plans are still there, each for a real syllabus subtopic", () => {
    const pilot = PILOT.map(([id]) => TOPIC_PLANS.find((p) => p.id === id)!);
    expect(pilot.map((p) => p.strand).sort()).toEqual(
      ["algebra", "geometry", "number", "probability", "ratio", "statistics"],
    );
    const known = new Set(GCSE_SYLLABUS.AQA.flatMap((topic) => getSubtopicsForTier(topic, "higher")));
    for (const plan of pilot) expect(known.has(plan.subtopics[0])).toBe(true);
  });

  it("a question next door to a pilot topic goes to its own topic, not the pilot one", () => {
    const neighbours: Array<[string, string]> = [
      ["Solve x^2 - 5x + 6 = 0", "quadratic-equations"],
      ["Solve the simultaneous equations 2x + y = 7 and x - y = 2", "simultaneous-equations"],
      ["Solve 3x + 2 < 11", "inequalities"],
      ["A car travels 120 miles in 3 hours. Work out its average speed.", "speed-distance-time"],
      ["The table shows a grouped frequency table. Estimate the mean.", "frequency-tables-grouped-data"],
      // It mentions a hypotenuse but is not a Pythagoras question.
      ["In a right-angled triangle, one angle is 35° and the hypotenuse is 12 cm. Use sin to find the opposite side.", "trigonometry"],
      ["Simplify the ratio 12 : 18", "simplifying-ratios"],
    ];
    for (const [question, id] of neighbours) expect(planForQuestion(question)?.id).toBe(id);
    expect(planForQuestion("")).toBeNull();
  });

  it("finds a plan from a topic name as typed or as the syllabus writes it", () => {
    expect(planForTopic("Pythagoras' theorem")?.id).toBe("pythagoras");
    expect(planForTopic("pythagoras")?.id).toBe("pythagoras");
    expect(planForTopic("Sharing in a ratio")?.id).toBe("sharing-in-a-ratio");
    expect(planForTopic("Mean, median, mode, range")?.id).toBe("averages");
    expect(planForTopic("averages")?.id).toBe("averages");
    expect(planForTopic("Circle theorems")?.id).toBe("circle-theorems");
    // The exact name wins over a name that merely contains it.
    expect(planForTopic("Expanding and factorising")?.id).toBe("expanding-brackets");
    expect(planForTopic("Functions")?.id).toBe("function-notation");
    expect(planForTopic("Study skills")).toBeNull();
  });
});

describe("what the model is told", () => {
  it("a question on a planned topic gets its plan, placed last", () => {
    const prompt = buildSystemPrompt("algebra", null, undefined, false, "higher", undefined, "Solve 4x + 7 = 2x + 19");
    expect(prompt).toContain("HOW TO TEACH THIS TOPIC: SOLVING LINEAR EQUATIONS");
    expect(prompt).toContain("An equation is a balance");
    // After the worked example, which is what a model otherwise copies.
    expect(prompt.indexOf("HOW TO TEACH THIS TOPIC")).toBeGreaterThan(prompt.indexOf("EXAMPLE:"));
  });

  it("a message that is not on any topic, or a photo, is unchanged", () => {
    const other = buildSystemPrompt("algebra", null, undefined, false, "higher", undefined, "Can you help me with my homework?");
    expect(other).not.toContain("HOW TO TEACH THIS TOPIC");
    const photo = buildSystemPrompt("algebra", null, undefined, true, "higher", undefined, "Solve 4x + 7 = 2x + 19");
    expect(photo).not.toContain("HOW TO TEACH THIS TOPIC");
  });

  it("each part of a plan is tied to the field it belongs in", () => {
    for (const plan of TOPIC_PLANS) {
      const told = planForSolving(plan);
      for (const field of ['"intro"', '"keyTakeaway"', '"why"', '"selfCheck"', '"hint"', '"examTip"']) {
        expect(told).toContain(field);
      }
      // As the model must write it: LaTeX backslashes doubled, ready for JSON.
      const asJson = (text: string) => text.replace(/\\/g, "\\\\");
      expect(told).toContain(asJson(plan.bigIdea));
      expect(told).toContain(asJson(plan.ask));
      // No LaTeX command is shown with a single backslash, which the model
      // would copy into its JSON and lose (π arrived as an unprintable character).
      expect(told).not.toMatch(/(?<!\\)\\(?:pi|frac|sqrt|times|leq|approx|cap|cup|binom)\b/);
      if (plan.picture) expect(told).toContain(`"${plan.picture.block}"`);
    }
  });

  it("a topic lesson is built on the plan, with what is needed first and three levels", () => {
    const prompt = buildLessonPrompt("Pythagoras' theorem", "GCSE", "higher");
    expect(prompt).toContain("HOW TO TEACH THIS TOPIC: PYTHAGORAS' THEOREM");
    expect(prompt).toContain("WHAT THE PUPIL NEEDS FIRST");
    expect(prompt).toContain("THREE LEVELS");
    expect(buildLessonPrompt("Study skills", "GCSE", "higher")).not.toContain("HOW TO TEACH THIS TOPIC");
    expect(planForLesson(TOPIC_PLANS[0])).toContain("LESSON CONTRACT");
  });

  it("a lesson saved before its topic had a plan is not served once it has one", () => {
    const withPlan = hashLessonKey("Pythagoras' theorem", "GCSE", "higher", planVersionFor("Pythagoras' theorem"));
    expect(planVersionFor("Pythagoras' theorem")).toBe("pythagoras@1");
    expect(withPlan).not.toBe(hashLessonKey("Pythagoras' theorem", "GCSE", "higher"));
    // Something with no plan keeps the key it always had.
    expect(planVersionFor("Study skills")).toBe("");
    expect(hashLessonKey("Study skills", "GCSE", "higher", planVersionFor("Study skills"))).toBe(
      hashLessonKey("Study skills", "GCSE", "higher"),
    );
  });
});

const step = (n: number, before: string, after: string, extra: Record<string, string> = {}) => ({
  stepNumber: n,
  operationLabel: `Step ${n}`,
  explanation: "Do it.",
  latexBefore: before,
  latexAfter: after,
  arrowDirection: "simplify" as const,
  ...extra,
});

describe("scoring an answer against its plan", () => {
  const plan = planForQuestion(PILOT[2][1])!;

  it("the answer the app gave before the plan had two of the seven parts", () => {
    const before: WhiteboardResponse = {
      intro: "Let's share £60 between Amy and Ben using the ratio 2:3.",
      blocks: [
        {
          type: "equation_steps",
          steps: [
            step(1, "2 + 3", "5", { why: "Total parts represent the whole £60." }),
            step(2, "60 \\div 5", "12"),
            step(3, "12 \\times 2", "24"),
            step(4, "12 \\times 3", "36"),
          ],
        },
      ],
      conclusion: "So Amy gets £24 and Ben gets £36.",
      hint: "Make sure the parts add up to the total amount (£60).",
      subject: "Maths",
    };
    const got = planCoverage(plan, before);
    expect(got).toEqual({
      picture: false,
      bigIdea: false,
      reasons: false,
      asksPupil: false,
      checksAnswer: false,
      mistake: true,
      marks: false,
    });
  });

  it("an answer that follows the plan has all seven", () => {
    const after: WhiteboardResponse = {
      intro: "Let's share £60 in the ratio 2 : 3. A ratio says how many equal parts each person gets.",
      blocks: [
        { type: "bar_model", parts: [{ label: "Amy", value: 12 }], totalLabel: "£60" },
        {
          type: "equation_steps",
          steps: [
            step(1, "2 + 3", "5", { why: "There are 5 equal parts altogether.", selfCheck: "How many parts are there altogether?" }),
            step(2, "60 \\div 5", "12", { why: "Sharing £60 into 5 equal parts gives one part." }),
            step(3, "12 \\times 2", "24", { why: "Amy has 2 of the parts." }),
            step(4, "12 \\times 3", "36", { why: "Ben has 3 of the parts.", selfCheck: "Check: £24 + £36 = £60 ✓" }),
          ],
        },
      ],
      conclusion: "Amy gets £24 and Ben gets £36.",
      keyTakeaway: "Find what one part is worth first.",
      hint: "Do not divide £60 by 2 and by 3. There are 5 parts, so one part is £60 ÷ 5.",
      examTip: "One mark for dividing by the total number of parts.",
      subject: "Maths",
    };
    expect(Object.values(planCoverage(plan, after)).every(Boolean)).toBe(true);
  });
});

describe("a question is asked before its answer goes on the board", () => {
  const lesson = (blocks: WhiteboardResponse["blocks"]): WhiteboardResponse => ({
    intro: "Let's share £60.",
    blocks,
    conclusion: "Amy gets £24.",
    subject: "Maths",
  });
  const working = (data: WhiteboardResponse) =>
    buildTutorSteps(data, buildNarrationPlan(data)).filter((s) => s.kind === "equation_step");

  it("moves the question onto the step before the one that answers it", () => {
    const steps = working(
      lesson([
        {
          type: "equation_steps",
          steps: [
            step(1, "60 \\div 5", "12"),
            // The model puts the question on the line that shows the answer.
            step(2, "12 \\times 2", "24", { selfCheck: "How much is Amy's share if each part is worth £12?" }),
          ],
        },
      ]),
    );
    expect(steps[0].check).toBe("How much is Amy's share if each part is worth £12?");
    expect(steps[1].check).toBeUndefined();
  });

  it("leaves a worked check where it is, on the line it checks", () => {
    const steps = working(
      lesson([
        {
          type: "equation_steps",
          steps: [step(1, "60 \\div 5", "12"), step(2, "24 + 36", "60", { selfCheck: "Check: £24 + £36 = £60 ✓" })],
        },
      ]),
    );
    expect(steps[0].check).toBeUndefined();
    expect(steps[1].check).toBe("Check: £24 + £36 = £60 ✓");
  });

  it("does not move a question onto a step that already has a check, or onto the first step", () => {
    const steps = working(
      lesson([
        {
          type: "equation_steps",
          steps: [
            step(1, "2 + 3", "5", { selfCheck: "How many parts altogether?" }),
            step(2, "60 \\div 5", "12", { selfCheck: "Check: 5 × 12 = 60 ✓" }),
            step(3, "12 \\times 2", "24", { selfCheck: "What is 12 times 2?" }),
          ],
        },
      ]),
    );
    expect(steps.map((s) => s.check)).toEqual(["How many parts altogether?", "Check: 5 × 12 = 60 ✓", "What is 12 times 2?"]);
  });
});

describe("faults the pilot runs exposed", () => {
  it("the chat never replaces an answer with a piece of its own working", () => {
    // The standard-form answer, with the place-value table the model added.
    // A built-in method read the table and replaced the whole answer with "10".
    const answer: WhiteboardResponse = {
      intro: "Let's multiply these numbers in standard form.",
      blocks: [
        {
          type: "table",
          headers: ["10^5", "10^4", "10^3", "10^2", "10^1", "10^0"],
          rows: [["", "3", "0", "0", "0", "0"]],
          caption: "Place value chart for 10",
        },
        {
          type: "equation_steps",
          steps: [step(1, "3 \\times 2", "6"), step(2, "10^{4} \\times 10^{5}", "10^{9}")],
        } as EquationStepBlock,
      ],
      conclusion: "So the answer is $6 \\times 10^9$.",
      subject: "Maths",
    };
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const shown = applyMethodBuilderToWhiteboard(answer, PILOT[0][1]);
    warn.mockRestore();
    expect(shown).toEqual(answer);
  });

  it("maths marked with \\( \\) is drawn, not printed with its brackets", () => {
    expect(mathsInDollars("Simplify \\(\\frac{48}{100}\\) to its simplest form.")).toBe(
      "Simplify $\\frac{48}{100}$ to its simplest form.",
    );
    // The half-fixed form the first run produced.
    expect(mathsInDollars("is \\($\\frac{12}{25}$\\) or 0.48.")).toBe("is $\\frac{12}{25}$ or 0.48.");
  });

  it("bare maths is drawn in the words beside the working, not only in the first and last line", () => {
    const sent = drawBareMaths({
      whiteboard: {
        intro: "Tree.",
        conclusion: "Done.",
        hint: "Simplify \\frac{48}{100}.",
        blocks: [
          {
            type: "equation_steps",
            steps: [
              {
                explanation: "Simplify \\(\\frac{48}{100}\\).",
                selfCheck: "Check: \\( \\frac{48}{100} = \\frac{12}{25} \\)",
                latexAfter: "\\frac{12}{25}",
              },
            ],
          },
          { type: "text", content: "That is \\frac{12}{25}." },
        ],
      },
    }) as { whiteboard: { hint: string; blocks: Array<Record<string, unknown>> } };
    const stepOut = (sent.whiteboard.blocks[0].steps as Array<Record<string, string>>)[0];
    expect(stepOut.explanation).toBe("Simplify $\\frac{48}{100}$.");
    expect(stepOut.selfCheck).toBe("Check: $ \\frac{48}{100} = \\frac{12}{25} $");
    // The working itself is maths already and is left exactly as it is.
    expect(stepOut.latexAfter).toBe("\\frac{12}{25}");
    expect(sent.whiteboard.blocks[1].content).toBe("That is $\\frac{12}{25}$.");
    expect(sent.whiteboard.hint).toBe("Simplify $\\frac{48}{100}$.");
  });
});
