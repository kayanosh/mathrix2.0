/**
 * The whiteboard cannot be its own witness.
 *
 * postVerifyCAS extracted the equation from whiteboard step 1 — but step 1 is
 * written by the same pipeline whose answer is being checked, and a
 * deterministic builder OVERWRITES it with whatever it parsed. So when the
 * linear builder mis-read "4x + 3 = 2x + 11" as "4x + 3 = 2", it wrote that into
 * step 1, and this module confirmed x = -0.25 against the wrong premise and
 * reported "✓ verified". That is how a wrong answer became a *trusted* wrong
 * answer.
 */
import { postVerifyCAS } from "@/lib/cas-post-verify";
import type { WhiteboardResponse } from "@/types/whiteboard";

/** A board whose step 1 has been corrupted, ending at the wrong answer. */
const corruptedBoard = {
  intro: "Let's solve it.",
  blocks: [
    {
      type: "equation_steps",
      steps: [
        // The builder wrote this — note it is NOT the question that was asked.
        { stepNumber: 1, latexBefore: "4x + 3 = 2", latexAfter: "4x + 3 = 2", explanation: "Start" },
        { stepNumber: 2, latexBefore: "4x = -1", latexAfter: "x = -0.25", explanation: "Solve" },
      ],
    },
  ],
  conclusion: "So $x = -0.25$.",
} as unknown as WhiteboardResponse;

describe("postVerifyCAS premise", () => {
  it("does NOT verify a wrong answer when the board's premise was corrupted", () => {
    const res = postVerifyCAS(corruptedBoard, "solve 4x + 3 = 2x + 11");
    expect(res.verified).toBe(false);
  });

  it("verifies against the question, not the board, when they disagree", () => {
    // Same board, but ending at the answer the QUESTION actually has.
    const correct = JSON.parse(JSON.stringify(corruptedBoard)) as typeof corruptedBoard;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const steps = (correct.blocks[0] as any).steps;
    steps[1] = { stepNumber: 2, latexBefore: "2x = 8", latexAfter: "x = 4", explanation: "Solve" };
    correct.conclusion = "So $x = 4$.";
    const res = postVerifyCAS(correct, "solve 4x + 3 = 2x + 11");
    expect(res.verified).toBe(true);
  });

  it("still attempts verification with no question text (image questions)", () => {
    // Post-verification exists partly FOR image uploads, where the pre-solver
    // cannot read the question. Removing the board fallback would silently
    // disable the only check those questions get.
    const board = {
      intro: "",
      blocks: [
        {
          type: "equation_steps",
          steps: [
            { stepNumber: 1, latexBefore: "3x + 5 = 20", latexAfter: "3x + 5 = 20", explanation: "" },
            { stepNumber: 2, latexBefore: "3x = 15", latexAfter: "x = 5", explanation: "" },
          ],
        },
      ],
      conclusion: "So $x = 5$.",
    } as unknown as WhiteboardResponse;
    const res = postVerifyCAS(board);
    expect(res.attempted).toBe(true);
    expect(res.verified).toBe(true);
  });

  it("does not claim to have attempted anything when there is no equation at all", () => {
    const prose = {
      intro: "Percentages explained.",
      blocks: [{ type: "text", heading: "Idea", content: "A percentage is per hundred." }],
      conclusion: "That's the idea.",
    } as unknown as WhiteboardResponse;
    const res = postVerifyCAS(prose, "what is a percentage?");
    expect(res.attempted).toBe(false);
    expect(res.verified).toBe(false);
  });
});
