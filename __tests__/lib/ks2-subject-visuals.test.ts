import {
  buildForceDiagram,
  ensureRelevantSubjectVisuals,
  sanitizeSubjectVisuals,
  subjectVisualMismatch,
} from "@/lib/ks2-subject-visuals";
import type { LabeledShapeBlock } from "@/types/whiteboard";

const genericPentagon: LabeledShapeBlock = {
  type: "labeled_shape",
  shape: "polygon",
  vertices: ["A", "B", "C", "D", "E"].map((label) => ({ label })),
};

describe("KS2 subject-aware visual safety", () => {
  const gravityContext = {
    subject: "science",
    topic: "Forces",
    skill: "Gravity and the force of gravity on Earth",
    question:
      "A child drops an apple. Name the force, show its direction, and explain what happens.",
    answer: "Gravity makes the apple fall towards Earth.",
  };

  it("replaces the reported generic polygon with a relevant gravity diagram", () => {
    const blocks = ensureRelevantSubjectVisuals([genericPentagon], gravityContext);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({
      type: "force_diagram",
      objectLabel: "apple",
      objectEmoji: "🍎",
      groundLabel: expect.stringMatching(/Earth/),
      forces: [
        {
          label: "gravity",
          direction: "down",
          detail: expect.stringMatching(/Earth's centre/),
        },
      ],
    });
  });

  it("removes geometry placeholders from every non-maths subject", () => {
    for (const subject of ["science", "english", "computing", "arabic"]) {
      expect(
        sanitizeSubjectVisuals([genericPentagon], {
          subject,
          topic: "A non-geometry topic",
          question: "Explain the idea.",
        }),
      ).toEqual([]);
    }
  });

  it("keeps labeled shapes available for actual maths geometry", () => {
    expect(
      sanitizeSubjectVisuals([genericPentagon], {
        subject: "maths",
        topic: "Properties of polygons",
        question: "How many sides does a pentagon have?",
      }),
    ).toEqual([genericPentagon]);
  });

  it("does not invent a force direction from the word forces alone", () => {
    expect(
      buildForceDiagram({
        subject: "science",
        topic: "Forces",
        question: "What is a force?",
      }),
    ).toBeNull();
  });

  it.each([
    ["Air resistance on a falling parachutist", "air resistance", "up"],
    ["Water resistance on a moving boat", "water resistance", "left"],
    ["Friction opposes a moving car", "friction", "left"],
    ["Upthrust makes a boat float", "upthrust", "up"],
    ["A magnet pulls an object", "magnetic force", "right"],
  ] as const)("builds relevant arrows for %s", (question, label, direction) => {
    const diagram = buildForceDiagram({
      subject: "science",
      topic: "Forces",
      question,
    });
    expect(diagram?.forces).toContainEqual(
      expect.objectContaining({ label, direction }),
    );
  });

  it("rejects force diagrams outside a matching science topic", () => {
    const diagram = buildForceDiagram(gravityContext)!;
    expect(
      subjectVisualMismatch(diagram, {
        subject: "science",
        topic: "Materials",
        question: "Which materials dissolve?",
      }),
    ).toMatch(/does not match/i);
  });

  it("replaces a force diagram with the wrong object or arrow direction", () => {
    const blocks = ensureRelevantSubjectVisuals(
      [
        {
          type: "force_diagram",
          objectLabel: "pentagon",
          forces: [{ label: "gravity", direction: "up" }],
        },
      ],
      gravityContext,
    );

    expect(blocks).toEqual([
      expect.objectContaining({
        type: "force_diagram",
        objectLabel: "apple",
        forces: [expect.objectContaining({ label: "gravity", direction: "down" })],
      }),
    ]);
  });
});
