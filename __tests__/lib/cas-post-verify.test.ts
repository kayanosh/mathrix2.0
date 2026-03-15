import { postVerifyCAS } from "@/lib/cas-post-verify";
import type { WhiteboardResponse } from "@/types/whiteboard";

describe("postVerifyCAS", () => {
  it("returns attempted=false when no equation_steps blocks", () => {
    const data: WhiteboardResponse = {
      intro: "Hello",
      blocks: [{ type: "text", content: "No equations here" }],
      conclusion: "Done",
    };
    const result = postVerifyCAS(data);
    expect(result.attempted).toBe(false);
  });

  it("verifies correct linear equation solution", () => {
    const data: WhiteboardResponse = {
      intro: "Solving 2x + 4 = 10",
      blocks: [
        {
          type: "equation_steps",
          steps: [
            {
              stepNumber: 1,
              operationLabel: "Start",
              explanation: "Original equation",
              latexBefore: "2x + 4 = 10",
              latexAfter: "2x + 4 = 10",
              arrowDirection: "down",
            },
            {
              stepNumber: 2,
              operationLabel: "Subtract 4",
              explanation: "Subtract 4",
              latexBefore: "2x + 4 = 10",
              latexAfter: "2x = 6",
              arrowDirection: "down",
            },
            {
              stepNumber: 3,
              operationLabel: "Divide by 2",
              explanation: "Divide by 2",
              latexBefore: "2x = 6",
              latexAfter: "x = 3",
              arrowDirection: "down",
            },
          ],
        },
      ],
      conclusion: "Therefore x = 3",
    };
    const result = postVerifyCAS(data);
    expect(result.attempted).toBe(true);
    expect(result.verified).toBe(true);
    expect(result.warnings.length).toBe(0);
  });

  it("detects incorrect solution", () => {
    const data: WhiteboardResponse = {
      intro: "Solving 2x + 4 = 10",
      blocks: [
        {
          type: "equation_steps",
          steps: [
            {
              stepNumber: 1,
              operationLabel: "Start",
              explanation: "Original",
              latexBefore: "2x + 4 = 10",
              latexAfter: "2x + 4 = 10",
              arrowDirection: "down",
            },
            {
              stepNumber: 2,
              operationLabel: "Wrong",
              explanation: "Wrong answer",
              latexBefore: "2x + 4 = 10",
              latexAfter: "x = 5",
              arrowDirection: "down",
            },
          ],
        },
      ],
      conclusion: "Therefore x = 5",
    };
    const result = postVerifyCAS(data);
    expect(result.attempted).toBe(true);
    expect(result.verified).toBe(false);
  });

  it("returns attempted=false when first step has no equation", () => {
    const data: WhiteboardResponse = {
      intro: "Start",
      blocks: [
        {
          type: "equation_steps",
          steps: [
            {
              stepNumber: 1,
              operationLabel: "Intro",
              explanation: "Let's begin",
              latexBefore: "some text without equals",
              latexAfter: "still no equals",
              arrowDirection: "down",
            },
          ],
        },
      ],
      conclusion: "Done",
    };
    const result = postVerifyCAS(data);
    expect(result.attempted).toBe(false);
  });
});
