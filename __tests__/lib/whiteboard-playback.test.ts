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

    // The reason follows the instruction directly. It is not announced.
    expect(parts.explanation).not.toContain("Here is why");
    expect(parts.explanation).toBe("Add 7 and 8 to make 15. Ten ones must be regrouped as one ten.");
    expect(parts.explanation).not.toContain("Where will the carried 1 go");
    expect(parts.check).toBe("Your turn. Where will the carried 1 go?");
    expect(parts.asksPupil).toBe(true);
  });

  it("a check the teacher shows is not handed to the pupil as a question", () => {
    const parts = buildTeacherSpeechParts(step({ check: "Check: $5(4) - 3 = 17$, $2(4) + 9 = 17$ ✓" }));
    expect(parts.check).toBe("Let's check. 5 times 4 minus 3, equals 17, 2 times 4 plus 9, equals 17");
    expect(parts.asksPupil).toBe(false);
  });

  it("names a rule once, in a sentence a teacher would say", () => {
    const first = buildTeacherSpeechParts(step({ rule: "Inverse operations", why: "Subtracting undoes the adding." }));
    expect(first.explanation).toBe("Add 7 and 8 to make 15. Subtracting undoes the adding. This is called inverse operations.");
    const again = buildTeacherSpeechParts(step({ rule: "Inverse operations", why: "Subtracting undoes the adding." }), false);
    expect(again.explanation).toBe("Add 7 and 8 to make 15. Subtracting undoes the adding.");
    expect(buildTeacherSpeechParts(step({ rule: "Pythagoras' theorem" })).explanation).toContain(
      "This is called Pythagoras' theorem.",
    );
    // Kept as a name, and spelt the way it is said.
    expect(buildTeacherSpeechParts(step({ rule: "SOHCAHTOA" })).explanation).toContain("This is called soh cah toa.");
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

  it("only takes a breath between steps where nothing was asked", () => {
    expect(pupilPauseDurationMs(1, false)).toBe(650);
    expect(pupilPauseDurationMs(2, false)).toBe(350);
    expect(pupilPauseDurationMs(1, true)).toBe(2200);
  });
});
