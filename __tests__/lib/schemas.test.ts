import {
  WhiteboardResponseSchema,
  EquationStepBlockSchema,
  CoordinateGraphBlockSchema,
  LabeledShapeBlockSchema,
  ProbabilityTreeBlockSchema,
  VennDiagramBlockSchema,
  NumberLineBlockSchema,
  TableBlockSchema,
  ChartBlockSchema,
  ColumnMethodBlockSchema,
  TextBlockSchema,
  QuestionCategorySchema,
} from "@/lib/schemas";

describe("EquationStepBlockSchema", () => {
  it("validates a correct equation_steps block", () => {
    const data = {
      type: "equation_steps",
      steps: [
        {
          stepNumber: 1,
          operationLabel: "Start",
          explanation: "Begin",
          latexAfter: "2x = 6",
          arrowDirection: "down",
        },
      ],
    };
    const result = EquationStepBlockSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("rejects empty steps", () => {
    const data = { type: "equation_steps", steps: [] };
    const result = EquationStepBlockSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("rejects invalid step number", () => {
    const data = {
      type: "equation_steps",
      steps: [
        {
          stepNumber: 0,
          operationLabel: "x",
          explanation: "x",
          latexAfter: "x",
          arrowDirection: "down",
        },
      ],
    };
    const result = EquationStepBlockSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("accepts optional fields (rule, why, selfCheck)", () => {
    const data = {
      type: "equation_steps",
      steps: [
        {
          stepNumber: 1,
          operationLabel: "Subtract 4",
          explanation: "Remove 4",
          latexAfter: "2x = 6",
          arrowDirection: "down",
          rule: "Inverse operations",
          why: "Subtracting undoes adding",
          selfCheck: "Check: 2(3) + 4 = 10",
        },
      ],
    };
    const result = EquationStepBlockSchema.safeParse(data);
    expect(result.success).toBe(true);
  });
});

describe("CoordinateGraphBlockSchema", () => {
  it("validates a correct graph block", () => {
    const data = {
      type: "coordinate_graph",
      xRange: [-10, 10],
      yRange: [-10, 10],
      plots: [{ equation: "y = x", fn: "x" }],
    };
    const result = CoordinateGraphBlockSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("validates with points and segments", () => {
    const data = {
      type: "coordinate_graph",
      xRange: [-5, 5],
      yRange: [-5, 5],
      plots: [],
      points: [{ point: { x: 0, y: 0 }, label: "Origin" }],
      segments: [
        { from: { x: 0, y: 0 }, to: { x: 3, y: 4 }, style: "dashed" },
      ],
    };
    const result = CoordinateGraphBlockSchema.safeParse(data);
    expect(result.success).toBe(true);
  });
});

describe("LabeledShapeBlockSchema", () => {
  it("validates a triangle", () => {
    const data = {
      type: "labeled_shape",
      shape: "triangle",
      vertices: [{ label: "A" }, { label: "B" }, { label: "C" }],
      sides: [{ from: "A", to: "B", label: "5 cm" }],
      angles: [{ vertex: "A", degrees: 60, label: "60°" }],
    };
    const result = LabeledShapeBlockSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("validates a circle", () => {
    const data = {
      type: "labeled_shape",
      shape: "circle",
      circle: { center: "O", radius: "5", showRadius: true },
    };
    const result = LabeledShapeBlockSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("rejects invalid shape type", () => {
    const data = { type: "labeled_shape", shape: "hexagon" };
    const result = LabeledShapeBlockSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

describe("ProbabilityTreeBlockSchema", () => {
  it("validates a probability tree", () => {
    const data = {
      type: "probability_tree",
      rootLabel: "Coin flip",
      branches: [
        { event: "Heads", probability: "1/2", probabilityValue: 0.5 },
        { event: "Tails", probability: "1/2", probabilityValue: 0.5 },
      ],
    };
    const result = ProbabilityTreeBlockSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("rejects empty branches", () => {
    const data = {
      type: "probability_tree",
      rootLabel: "Test",
      branches: [],
    };
    const result = ProbabilityTreeBlockSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("rejects probability > 1", () => {
    const data = {
      type: "probability_tree",
      rootLabel: "Test",
      branches: [
        { event: "A", probability: "1.5", probabilityValue: 1.5 },
      ],
    };
    const result = ProbabilityTreeBlockSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("allows nested children", () => {
    const data = {
      type: "probability_tree",
      rootLabel: "Two picks",
      branches: [
        {
          event: "Red",
          probability: "1/2",
          probabilityValue: 0.5,
          children: [
            { event: "Red", probability: "1/3", probabilityValue: 0.333 },
            { event: "Blue", probability: "2/3", probabilityValue: 0.667 },
          ],
        },
        { event: "Blue", probability: "1/2", probabilityValue: 0.5 },
      ],
    };
    const result = ProbabilityTreeBlockSchema.safeParse(data);
    expect(result.success).toBe(true);
  });
});

describe("VennDiagramBlockSchema", () => {
  it("validates a valid Venn diagram", () => {
    const data = {
      type: "venn_diagram",
      sets: [{ label: "A" }, { label: "B" }],
      regions: [
        { region: "A_only", value: "5" },
        { region: "A_and_B", value: "3" },
        { region: "B_only", value: "7" },
      ],
    };
    const result = VennDiagramBlockSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("rejects 0 sets", () => {
    const data = {
      type: "venn_diagram",
      sets: [],
      regions: [],
    };
    const result = VennDiagramBlockSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("rejects more than 3 sets", () => {
    const data = {
      type: "venn_diagram",
      sets: [{ label: "A" }, { label: "B" }, { label: "C" }, { label: "D" }],
      regions: [],
    };
    const result = VennDiagramBlockSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

describe("NumberLineBlockSchema", () => {
  it("validates a number line", () => {
    const data = {
      type: "number_line",
      range: [-5, 5],
      tickInterval: 1,
      markers: [{ value: 3, style: "filled" }],
    };
    const result = NumberLineBlockSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("rejects non-positive tick interval", () => {
    const data = {
      type: "number_line",
      range: [-5, 5],
      tickInterval: 0,
      markers: [],
    };
    const result = NumberLineBlockSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

describe("TableBlockSchema", () => {
  it("validates a table", () => {
    const data = {
      type: "table",
      headers: ["Name", "Score"],
      rows: [["Alice", "90"], ["Bob", "85"]],
    };
    const result = TableBlockSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("rejects empty headers", () => {
    const data = {
      type: "table",
      headers: [],
      rows: [["1"]],
    };
    const result = TableBlockSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("rejects empty rows", () => {
    const data = {
      type: "table",
      headers: ["A"],
      rows: [],
    };
    const result = TableBlockSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

describe("ChartBlockSchema", () => {
  it("validates a bar chart", () => {
    const data = {
      type: "chart",
      chartType: "bar",
      bars: [{ label: "A", value: 10 }, { label: "B", value: 20 }],
    };
    const result = ChartBlockSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("validates a box plot", () => {
    const data = {
      type: "chart",
      chartType: "box_plot",
      boxPlot: { min: 1, q1: 3, median: 5, q3: 7, max: 10 },
    };
    const result = ChartBlockSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("validates a pie chart", () => {
    const data = {
      type: "chart",
      chartType: "pie",
      slices: [
        { label: "Red", value: 30 },
        { label: "Blue", value: 70 },
      ],
    };
    const result = ChartBlockSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("rejects invalid chart type", () => {
    const data = { type: "chart", chartType: "scatter" };
    const result = ChartBlockSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

describe("ColumnMethodBlockSchema", () => {
  it("validates a column method", () => {
    const data = {
      type: "column_method",
      method: "long_division",
      rows: ["384", "12"],
      question: "384 ÷ 12",
      answer: "32",
    };
    const result = ColumnMethodBlockSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("rejects empty rows", () => {
    const data = {
      type: "column_method",
      method: "long_division",
      rows: [],
      question: "384 ÷ 12",
      answer: "32",
    };
    const result = ColumnMethodBlockSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

describe("TextBlockSchema", () => {
  it("validates a text block", () => {
    const data = { type: "text", content: "Hello world" };
    const result = TextBlockSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("accepts optional latex", () => {
    const data = { type: "text", content: "The equation", latex: "x^2" };
    const result = TextBlockSchema.safeParse(data);
    expect(result.success).toBe(true);
  });
});

describe("WhiteboardResponseSchema", () => {
  it("validates a full response", () => {
    const data = {
      intro: "Hello",
      blocks: [{ type: "text", content: "Body" }],
      conclusion: "Done",
    };
    const result = WhiteboardResponseSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("accepts optional fields", () => {
    const data = {
      intro: "Hello",
      blocks: [{ type: "text", content: "Body" }],
      conclusion: "Done",
      hint: "Watch out",
      subject: "maths",
      topic: "algebra",
      casVerified: true,
      groundTruthSource: "sympy",
      keyTakeaway: "Remember this",
    };
    const result = WhiteboardResponseSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("rejects more than 15 blocks", () => {
    const blocks = Array.from({ length: 16 }, () => ({
      type: "text",
      content: "x",
    }));
    const data = { intro: "Hello", blocks, conclusion: "Done" };
    const result = WhiteboardResponseSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("rejects missing intro", () => {
    const data = {
      blocks: [{ type: "text", content: "Body" }],
      conclusion: "Done",
    };
    const result = WhiteboardResponseSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

describe("QuestionCategorySchema", () => {
  it("accepts valid categories", () => {
    const categories = [
      "algebra", "number", "geometry", "trigonometry",
      "statistics", "probability", "graphs", "calculus",
    ];
    for (const cat of categories) {
      expect(QuestionCategorySchema.safeParse(cat).success).toBe(true);
    }
  });

  it("rejects invalid category", () => {
    expect(QuestionCategorySchema.safeParse("physics").success).toBe(false);
  });
});
