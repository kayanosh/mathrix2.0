import { buildNarrationPlan, sanitizeForTTS } from "@/lib/narration";
import type { WhiteboardResponse } from "@/types/whiteboard";

describe("buildNarrationPlan", () => {
  it("generates intro cue", () => {
    const data: WhiteboardResponse = {
      intro: "Let's solve this!",
      blocks: [{ type: "text", content: "Hello" }],
      conclusion: "Done.",
    };
    const plan = buildNarrationPlan(data);
    expect(plan[0].kind).toBe("intro");
    expect(plan[0].blockIndex).toBe(-1);
  });

  it("generates conclusion cue", () => {
    const data: WhiteboardResponse = {
      intro: "Start",
      blocks: [{ type: "text", content: "Body" }],
      conclusion: "The answer is x = 3.",
    };
    const plan = buildNarrationPlan(data);
    const conclusionCue = plan.find((c) => c.kind === "conclusion");
    expect(conclusionCue).toBeDefined();
    expect(conclusionCue!.blockIndex).toBe(-2);
  });

  it("generates equation_step cues for each step", () => {
    const data: WhiteboardResponse = {
      intro: "Start",
      blocks: [
        {
          type: "equation_steps",
          steps: [
            {
              stepNumber: 1,
              operationLabel: "Start",
              explanation: "Begin with the equation",
              latexBefore: "2x+4=10",
              latexAfter: "2x+4=10",
              arrowDirection: "down",
            },
            {
              stepNumber: 2,
              operationLabel: "Subtract 4",
              explanation: "Subtract 4 from both sides",
              latexBefore: "2x+4=10",
              latexAfter: "2x=6",
              arrowDirection: "down",
            },
          ],
        },
      ],
      conclusion: "x = 3",
    };
    const plan = buildNarrationPlan(data);
    const stepCues = plan.filter((c) => c.kind === "equation_step");
    expect(stepCues.length).toBe(2);
    expect(stepCues[0].subIndex).toBe(0);
    expect(stepCues[1].subIndex).toBe(1);
  });

  it("speaks the reason and pupil check for rich teaching steps", () => {
    const data: WhiteboardResponse = {
      intro: "Let's round carefully.",
      blocks: [
        {
          type: "number_line",
          range: [40, 50],
          tickInterval: 1,
          markers: [{ value: 47, style: "filled" }],
        },
      ],
      teachingSteps: [
        {
          title: "Find halfway",
          explanation: "Find the halfway point.",
          why: "Halfway tells us which multiple is nearer.",
          check: "Is 47 above or below 45?",
          narration: "Find the halfway point.",
        },
      ],
      conclusion: "47 rounds to 50.",
    };

    const cue = buildNarrationPlan(data).find((item) => item.kind === "teaching_step");
    expect(cue?.blockIndex).toBe(0);
    expect(cue?.text).toContain("Halfway tells us");
    expect(cue?.text).toContain("Quick check");
  });

  it("keeps a column-method teaching sequence on its primary visual", () => {
    const data: WhiteboardResponse = {
      intro: "Add using columns.",
      blocks: [
        {
          type: "column_method",
          method: "column_addition",
          rows: ["47", "+38", "85"],
          question: "47 + 38",
          answer: "85",
        },
        {
          type: "equation_steps",
          steps: [
            {
              stepNumber: 1,
              operationLabel: "Check",
              explanation: "Check the total.",
              latexBefore: "47+38",
              latexAfter: "85",
              arrowDirection: "simplify",
            },
          ],
        },
      ],
      teachingSteps: [
        { title: "Add the ones", explanation: "Add 7 and 8.", narration: "Add 7 and 8." },
        { title: "Carry the ten", explanation: "Carry 1 into the tens.", narration: "Carry 1 into the tens." },
      ],
      conclusion: "The answer is 85.",
    };

    const teaching = buildNarrationPlan(data).filter((cue) => cue.kind === "teaching_step");
    expect(teaching.map((cue) => cue.blockIndex)).toEqual([0, 0]);
  });

  it("generates graph cue", () => {
    const data: WhiteboardResponse = {
      intro: "Graph",
      blocks: [
        {
          type: "coordinate_graph",
          xRange: [-10, 10],
          yRange: [-10, 10],
          plots: [{ equation: "y = 2x + 1", fn: "2*x+1", label: "Line 1" }],
        },
      ],
      conclusion: "Done",
    };
    const plan = buildNarrationPlan(data);
    const graphCue = plan.find((c) => c.kind === "graph");
    expect(graphCue).toBeDefined();
    expect(graphCue!.text).toContain("Line 1");
  });

  it("generates shape cue", () => {
    const data: WhiteboardResponse = {
      intro: "Shape",
      blocks: [
        {
          type: "labeled_shape",
          shape: "triangle",
          sides: [{ from: "A", to: "B", label: "5 cm" }],
          angles: [{ vertex: "A", degrees: 60, label: "60°" }],
        },
      ],
      conclusion: "Done",
    };
    const plan = buildNarrationPlan(data);
    const shapeCue = plan.find((c) => c.kind === "shape");
    expect(shapeCue).toBeDefined();
    expect(shapeCue!.text).toContain("triangle");
  });

  it("generates probability tree cue", () => {
    const data: WhiteboardResponse = {
      intro: "Probability",
      blocks: [
        {
          type: "probability_tree",
          rootLabel: "First pick",
          branches: [
            { event: "Red", probability: "1/3", probabilityValue: 0.333 },
            { event: "Blue", probability: "2/3", probabilityValue: 0.667 },
          ],
        },
      ],
      conclusion: "Done",
    };
    const plan = buildNarrationPlan(data);
    const treeCue = plan.find((c) => c.kind === "tree");
    expect(treeCue).toBeDefined();
    expect(treeCue!.text).toContain("First pick");
  });

  it("generates venn cue", () => {
    const data: WhiteboardResponse = {
      intro: "Venn",
      blocks: [
        {
          type: "venn_diagram",
          sets: [{ label: "A" }, { label: "B" }],
          regions: [{ region: "A_and_B", value: "5" }],
        },
      ],
      conclusion: "Done",
    };
    const plan = buildNarrationPlan(data);
    const vennCue = plan.find((c) => c.kind === "venn");
    expect(vennCue).toBeDefined();
    expect(vennCue!.text).toContain("A and B");
  });

  it("generates number_line cue", () => {
    const data: WhiteboardResponse = {
      intro: "Number line",
      blocks: [
        {
          type: "number_line",
          range: [-5, 5],
          tickInterval: 1,
          markers: [{ value: 3, style: "filled" }],
          inequalityLabel: "x > 3",
        },
      ],
      conclusion: "Done",
    };
    const plan = buildNarrationPlan(data);
    const nlCue = plan.find((c) => c.kind === "number_line");
    expect(nlCue).toBeDefined();
    expect(nlCue!.text).toContain("x > 3");
  });

  it("generates table cue", () => {
    const data: WhiteboardResponse = {
      intro: "Table",
      blocks: [
        {
          type: "table",
          headers: ["A", "B"],
          rows: [["1", "2"]],
          caption: "My data table",
        },
      ],
      conclusion: "Done",
    };
    const plan = buildNarrationPlan(data);
    const tableCue = plan.find((c) => c.kind === "table");
    expect(tableCue).toBeDefined();
    expect(tableCue!.text).toContain("My data table");
  });

  it("generates chart cue", () => {
    const data: WhiteboardResponse = {
      intro: "Chart",
      blocks: [
        {
          type: "chart",
          chartType: "bar",
          title: "Test Chart",
        },
      ],
      conclusion: "Done",
    };
    const plan = buildNarrationPlan(data);
    const chartCue = plan.find((c) => c.kind === "chart");
    expect(chartCue).toBeDefined();
    expect(chartCue!.text).toContain("Test Chart");
  });

  it("generates column method cue", () => {
    const data: WhiteboardResponse = {
      intro: "Column",
      blocks: [
        {
          type: "column_method",
          method: "long_division",
          rows: ["384", "12"],
          question: "384 ÷ 12",
          answer: "32",
        },
      ],
      conclusion: "Done",
    };
    const plan = buildNarrationPlan(data);
    const colCues = plan.filter((c) => c.kind === "column");
    expect(colCues.length).toBeGreaterThanOrEqual(1);
    expect(colCues.some((c) => c.text.includes("384 ÷ 12"))).toBe(true);
    expect(colCues.some((c) => c.text.includes("32"))).toBe(true);
  });

  it("includes hint and keyTakeaway cues", () => {
    const data: WhiteboardResponse = {
      intro: "Start",
      blocks: [{ type: "text", content: "Body" }],
      conclusion: "End",
      hint: "Don't forget to check your answer",
      keyTakeaway: "Always balance both sides",
    };
    const plan = buildNarrationPlan(data);
    const hints = plan.filter((c) => c.kind === "hint");
    expect(hints.length).toBe(2);
  });
});

describe("sanitizeForTTS", () => {
  it("strips dollar sign delimiters", () => {
    const result = sanitizeForTTS("The answer is $x = 3$.");
    expect(result).not.toContain("$");
  });

  it("converts LaTeX fractions to speech", () => {
    const result = sanitizeForTTS("$\\frac{3}{4}$");
    expect(result).toContain("over");
  });

  it("converts squared to speech", () => {
    const result = sanitizeForTTS("$x^2$");
    expect(result).toContain("squared");
  });

  it("removes emoji characters", () => {
    const result = sanitizeForTTS("Great job! 🎉 Well done! ✅");
    expect(result).not.toMatch(/[\u{1F600}-\u{1FAFF}]/u);
  });

  it("removes check marks", () => {
    const result = sanitizeForTTS("Correct ✓ answer ✔️");
    expect(result).not.toContain("✓");
  });

  it("collapses whitespace", () => {
    const result = sanitizeForTTS("Too   many    spaces   here");
    expect(result).toBe("Too many spaces here");
  });
});
