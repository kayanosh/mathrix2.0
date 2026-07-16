import {
  LESSON_SECTION_ORDER,
  validateLessonContract,
  buildLessonRetryMessage,
  buildLessonContractPromptBlock,
} from "@/lib/lesson-contract";
import type { LessonSection, VisualBlock, WhiteboardResponse } from "@/types/whiteboard";

function sectionBlock(section: LessonSection, heading = section): VisualBlock {
  return { type: "text", section, heading, content: `${section} content` };
}

function eqBlock(): VisualBlock {
  return {
    type: "equation_steps",
    steps: [
      {
        stepNumber: 1,
        operationLabel: "Start",
        explanation: "Here we go",
        latexBefore: "a^2 + b^2",
        latexAfter: "c^2",
        arrowDirection: "down",
      },
    ],
  };
}

function makeLesson(sections: LessonSection[]): WhiteboardResponse {
  const blocks: VisualBlock[] = [];
  for (const s of sections) {
    blocks.push(sectionBlock(s));
    if (s === "rule" || s === "example") blocks.push(eqBlock());
  }
  return { intro: "Welcome", blocks, conclusion: "Well done" };
}

describe("validateLessonContract", () => {
  it("passes for a complete, ordered lesson with 2 examples", () => {
    const lesson = makeLesson([
      "objective",
      "prerequisites",
      "vocabulary",
      "rule",
      "example",
      "example",
      "guided",
      "practice",
      "check",
      "mistakes",
      "recap",
    ]);
    const result = validateLessonContract(lesson);
    expect(result.ok).toBe(true);
    expect(result.missing).toEqual([]);
    expect(result.counts.example).toBe(2);
  });

  it("reports missing sections", () => {
    const lesson = makeLesson([
      "objective",
      "rule",
      "example",
      "example",
    ]);
    const result = validateLessonContract(lesson);
    expect(result.ok).toBe(false);
    expect(result.missing).toEqual(
      expect.arrayContaining(["prerequisites", "vocabulary", "mistakes", "recap"]),
    );
  });

  it("requires two worked examples", () => {
    const lesson = makeLesson([
      "objective",
      "prerequisites",
      "vocabulary",
      "rule",
      "example",
      "guided",
      "practice",
      "check",
      "mistakes",
      "recap",
    ]);
    const result = validateLessonContract(lesson);
    expect(result.ok).toBe(false);
    expect(result.missing).toContain("example");
  });

  it("flags out-of-order sections as a warning, not a failure", () => {
    const lesson = makeLesson([
      "recap",
      "objective",
      "prerequisites",
      "vocabulary",
      "rule",
      "example",
      "example",
      "guided",
      "practice",
      "check",
      "mistakes",
    ]);
    const result = validateLessonContract(lesson);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("rejects a worked example with no structured working", () => {
    const lesson = makeLesson([
      "objective",
      "prerequisites",
      "vocabulary",
      "rule",
      "example",
      "example",
      "guided",
      "practice",
      "check",
      "mistakes",
      "recap",
    ]);
    const firstExample = lesson.blocks.findIndex(
      (block) => block.type === "text" && block.section === "example",
    );
    lesson.blocks.splice(firstExample + 1, 1);
    const result = validateLessonContract(lesson);
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("structured diagram or step-by-step working");
  });

  it("ignores untagged text blocks", () => {
    const lesson: WhiteboardResponse = {
      intro: "Hi",
      blocks: [{ type: "text", content: "just a note" }],
      conclusion: "bye",
    };
    const result = validateLessonContract(lesson);
    expect(result.counts.objective).toBe(0);
    expect(result.ok).toBe(false);
  });
});

describe("buildLessonRetryMessage", () => {
  it("names every missing section", () => {
    const msg = buildLessonRetryMessage(["vocabulary", "recap"]);
    expect(msg).toContain('"vocabulary"');
    expect(msg).toContain('"recap"');
  });

  it("mentions the example minimum when examples are missing", () => {
    const msg = buildLessonRetryMessage(["example"]);
    expect(msg.toLowerCase()).toContain("graded worked examples");
  });
});

describe("lesson contract prompt", () => {
  it("lists all sections in order", () => {
    const block = buildLessonContractPromptBlock();
    for (const s of LESSON_SECTION_ORDER) {
      expect(block).toContain(`"${s}"`);
    }
  });
});
