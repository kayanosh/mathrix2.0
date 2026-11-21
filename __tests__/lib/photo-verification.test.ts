import { buildCriticUserMessage, parseCriticResponse } from "@/lib/prompts/critic";
import { postVerifyCAS } from "@/lib/cas-post-verify";
import { runCasChecks } from "@/lib/answer-agreement";
import { casSolve } from "@/lib/cas-solver";
import type { WhiteboardResponse } from "@/types/whiteboard";

/**
 * A photographed question has no question text. The only reading of the photo
 * was the solver's own, so every "check" on a photo answer was the solution
 * checking itself: a perfectly worked answer to a misread question passed.
 *
 * The critic is now shown the photo and reports what IT read, and the checks
 * run against that. These pin the pieces of that chain that do not need a
 * model call.
 */
const board = (firstLine: string, lastLine: string, conclusion: string): WhiteboardResponse => ({
  intro: "",
  blocks: [
    {
      type: "equation_steps",
      steps: [
        {
          stepNumber: 1,
          operationLabel: "Start",
          explanation: "",
          latexBefore: firstLine,
          latexAfter: lastLine,
          arrowDirection: "down",
        },
      ],
    } as WhiteboardResponse["blocks"][number],
  ],
  conclusion,
});

describe("critic and photos", () => {
  it("is told to read the image itself and report what it read", () => {
    const message = buildCriticUserMessage("Solve this question from the photo", "{}", true);
    expect(message).toMatch(/ATTACHED IMAGE/);
    expect(message).toMatch(/questionAsRead/);
    expect(message).toMatch(/do NOT take the solver's word/);
  });

  it("is not asked for a reading when there is no image", () => {
    expect(buildCriticUserMessage("Solve 3x + 5 = 20", "{}", false)).not.toMatch(/ATTACHED IMAGE/);
  });

  it("parses the critic's reading, and tolerates its absence", () => {
    const base = { verified: true, confidence: "high", issues: [] };
    expect(
      parseCriticResponse(JSON.stringify({ ...base, questionAsRead: "  Solve 3x + 5 = 20 " }))?.questionAsRead,
    ).toBe("Solve 3x + 5 = 20");
    expect(parseCriticResponse(JSON.stringify(base))?.questionAsRead).toBeUndefined();
    expect(parseCriticResponse(JSON.stringify({ ...base, questionAsRead: 42 }))?.questionAsRead).toBeUndefined();
    expect(
      parseCriticResponse(JSON.stringify({ ...base, questionAsRead: "x".repeat(1000) }))?.questionAsRead,
    ).toHaveLength(300);
  });
});

describe("a solution cannot be its own witness", () => {
  // The photo said 3x + 5 = 20. The solver misread it as 3x + 5 = 26 and then
  // solved THAT flawlessly: x = 7.
  const misread = board("3x + 5 = 26", "x = 7", "So $x = 7$.");

  it("says where the equation it checked against came from", () => {
    expect(postVerifyCAS(misread, "Solve this question from the photo").premise).toBe("board");
    expect(postVerifyCAS(misread, "Solve 3x + 5 = 20").premise).toBe("question");
  });

  it("gives no credit for agreeing with its own first line", () => {
    const selfCheck = postVerifyCAS(misread, "Solve this question from the photo");
    expect(selfCheck.verified).toBe(true); // internally consistent…
    const checks = runCasChecks(misread, "Solve this question from the photo", null);
    expect(checks.postCasVerified).toBe(false); // …which proves nothing about the photo
    expect(checks.preCasVerified).toBe(false);
  });

  it("is caught once checked against the critic's independent reading", () => {
    const criticRead = "Solve 3x + 5 = 20";
    const truth = casSolve(criticRead)!.answers;
    const checks = runCasChecks(misread, criticRead, truth);
    expect(checks.agreement).toBe("disagree");
    expect(checks.preCasVerified).toBe(false);
    expect(checks.postCasVerified).toBe(false);
  });

  it("earns both checks when the photo was read and solved correctly", () => {
    const right = board("3x + 5 = 20", "x = 5", "So $x = 5$.");
    const criticRead = "Solve 3x + 5 = 20";
    const checks = runCasChecks(right, criticRead, casSolve(criticRead)!.answers);
    expect(checks).toMatchObject({ agreement: "agree", preCasVerified: true, postCasVerified: true });
  });

  it("makes no claim when the critic's reading is not something the reader can solve", () => {
    const criticRead = "A rectangle has perimeter 20 and length 6. Find its area.";
    expect(casSolve(criticRead)).toBeNull();
    const checks = runCasChecks(board("P = 20", "A = 24", "The area is 24."), criticRead, null);
    expect(checks).toMatchObject({ agreement: "unknown", preCasVerified: false, postCasVerified: false });
  });
});
