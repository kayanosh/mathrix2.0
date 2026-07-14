import { ks2ExplanationToWhiteboard } from "@/lib/ks2-explanation";

describe("ks2ExplanationToWhiteboard", () => {
  it("preserves teacher reasons, checks and exact block ownership", () => {
    const board = ks2ExplanationToWhiteboard(
      {
        intro: "Let's investigate.",
        steps: [
          {
            text: "Find the verb in the sentence.",
            why: "A verb tells us what is happening.",
            check: "Which word shows the action?",
            emoji: "🔎",
          },
        ],
        conclusion: "Now we can identify the verb.",
        answer: "jumped",
      },
      "English",
      "Word classes",
    );

    expect(board.teachingSteps?.[0]).toMatchObject({
      blockIndex: 0,
      why: "A verb tells us what is happening.",
      check: "Which word shows the action?",
    });
  });
});
