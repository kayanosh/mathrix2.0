/**
 * A builder must not overwrite a correct answer.
 *
 * The incident this guards: the linear builder mis-parsed "4x + 3 = 2x + 11" as
 * "4x + 3 = 2", replaced the model's correct x = 4 with x = -0.25, rewrote
 * whiteboard step 1 to the equation it had imagined, and the CAS post-check then
 * confirmed the wrong answer against the wrong premise. A builder overriding a
 * correct answer is strictly worse than the builder not running.
 *
 * The parser is fixed, but the gate is the structural protection: the NEXT
 * builder bug should cost arrows, not correctness.
 */
import { applyMethodBuilderToWhiteboard } from "@/lib/methods/apply-builder";
import type { WhiteboardResponse } from "@/types/whiteboard";

const board = (finalLatex: string, conclusion: string): WhiteboardResponse =>
  ({
    intro: "Let's solve it.",
    blocks: [
      {
        type: "equation_steps",
        steps: [
          { stepNumber: 1, latexBefore: "3x + 5 = 20", latexAfter: "3x = 15", explanation: "Subtract 5" },
          { stepNumber: 2, latexBefore: "3x = 15", latexAfter: finalLatex, explanation: "Divide by 3" },
        ],
      },
    ],
    conclusion,
  }) as unknown as WhiteboardResponse;

describe("applyMethodBuilderToWhiteboard ground-truth gate", () => {
  const original = board("x = 5", "So $x = 5$.");

  it("applies the overlay when CAS agrees with the builder", () => {
    const out = applyMethodBuilderToWhiteboard(original, "solve 3x + 5 = 20", undefined, undefined, {
      agreesWithGroundTruth: () => true,
    });
    // The builder rewrites the board (adds its arrows/steps), so it differs.
    expect(out.blocks).not.toBe(original.blocks);
  });

  it("REFUSES the overlay when CAS contradicts the builder", () => {
    const out = applyMethodBuilderToWhiteboard(original, "solve 3x + 5 = 20", undefined, undefined, {
      agreesWithGroundTruth: () => false,
    });
    // Untouched: the model's board and answer survive.
    expect(out).toBe(original);
    expect(out.conclusion).toContain("x = 5");
  });

  it("still applies the overlay when there is no ground truth to compare", () => {
    // An absent CAS result must not disable the overlay, or arrows vanish from
    // every question CAS cannot solve — which is most word problems.
    const out = applyMethodBuilderToWhiteboard(original, "solve 3x + 5 = 20", undefined, undefined, {
      agreesWithGroundTruth: undefined,
    });
    expect(out.blocks).not.toBe(original.blocks);
  });

  it("compares the builder's own answer, not the model's", () => {
    let seen: string | null = null;
    applyMethodBuilderToWhiteboard(original, "solve 3x + 5 = 20", undefined, undefined, {
      agreesWithGroundTruth: (a) => {
        seen = a;
        return true;
      },
    });
    expect(seen).toBe("x = 5");
  });

  it("leaves a board alone when no builder matches at all", () => {
    const prose = {
      intro: "Percentages",
      blocks: [{ type: "text", heading: "Idea", content: "Per hundred." }],
      conclusion: "Done.",
    } as unknown as WhiteboardResponse;
    const out = applyMethodBuilderToWhiteboard(prose, "what is a percentage?", undefined, undefined, {
      agreesWithGroundTruth: () => false,
    });
    expect(out).toBe(prose);
  });
});
