import {
  buildTeacherSpeechParts,
  nextPlaybackPhase,
  phaseHasReached,
  pupilPauseDurationMs,
} from "@/lib/whiteboard-playback";
import type { TutorStepModel } from "@/lib/tutor-steps";

function step(overrides: Partial<TutorStepModel> = {}): TutorStepModel {
  return {
    cueIndex: 0,
    kind: "teaching_step",
    title: "Add the ones",
    explanation: "Add 7 and 8 to make 15.",
    narration: "Add 7 and 8 to make 15.",
    visual: { type: "text", content: "7 + 8 = 15" },
    ...overrides,
  };
}

describe("whiteboard playback", () => {
  it("runs the complete teacher sequence and skips a missing check", () => {
    expect(nextPlaybackPhase("focus", false)).toBe("point");
    expect(nextPlaybackPhase("point", false)).toBe("write");
    expect(nextPlaybackPhase("write", false)).toBe("explain");
    expect(nextPlaybackPhase("explain", false)).toBe("pupil_pause");
    expect(nextPlaybackPhase("pupil_pause", false)).toBe("complete");
  });

  it("inserts the check phase when the pupil has a question", () => {
    expect(nextPlaybackPhase("explain", true)).toBe("check");
    expect(nextPlaybackPhase("check", true)).toBe("pupil_pause");
  });

  it("keeps why in the explanation but separates the pupil check", () => {
    const parts = buildTeacherSpeechParts(
      step({
        why: "Ten ones must be regrouped as one ten.",
        check: "Where will the carried 1 go?",
      }),
    );

    expect(parts.explanation).toContain("Here is why");
    expect(parts.explanation).toContain("Ten ones must be regrouped");
    expect(parts.explanation).not.toContain("Where will the carried 1 go");
    expect(parts.check).toBe("Your turn. Where will the carried 1 go?");
  });

  it("does not repeat a reason already present in the explanation", () => {
    const parts = buildTeacherSpeechParts(
      step({
        explanation:
          "Ten ones must be regrouped as one ten before we add the tens.",
        why: "Ten ones must be regrouped as one ten.",
      }),
    );

    expect(parts.explanation.match(/Ten ones must be regrouped/g)).toHaveLength(1);
  });

  it("reports when writing and checking content should be visible", () => {
    expect(phaseHasReached("point", "write")).toBe(false);
    expect(phaseHasReached("write", "write")).toBe(true);
    expect(phaseHasReached("check", "explain")).toBe(true);
  });

  it("keeps enough pupil thinking time at faster playback speeds", () => {
    expect(pupilPauseDurationMs(1)).toBe(2200);
    expect(pupilPauseDurationMs(2)).toBe(1400);
  });
});
