import {
  buildTeacherSpeechParts,
  nextPlaybackPhase,
  phaseHasReached,
  pacingForTier,
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
    expect(nextPlaybackPhase("point", false)).toBe("perform");
    expect(nextPlaybackPhase("perform", false)).toBe("pupil_pause");
    expect(nextPlaybackPhase("pupil_pause", false)).toBe("complete");
  });

  it("inserts the check phase when the pupil has a question", () => {
    expect(nextPlaybackPhase("perform", true)).toBe("check");
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
    expect(phaseHasReached("point", "perform")).toBe(false);
    expect(phaseHasReached("perform", "perform")).toBe(true);
    expect(phaseHasReached("check", "perform")).toBe(true);
  });

  it("keeps enough pupil thinking time at faster playback speeds", () => {
    expect(pupilPauseDurationMs(1)).toBe(2200);
    expect(pupilPauseDurationMs(2)).toBe(1400);
  });

  /**
   * `secure` must reproduce the original constants exactly — that equivalence
   * is what makes the pacing change safe to land without re-tuning every
   * existing lesson.
   */
  it("leaves the secure tier on the original timings", () => {
    const secure = pacingForTier("secure");
    expect(secure.focusSettleMs).toBe(260);
    expect(secure.pointerSettleMs).toBe(480);
    expect(secure.pupilPauseMs).toBe(2200);
    expect(secure.pupilPauseFloorMs).toBe(1400);
    expect(pupilPauseDurationMs(1, secure)).toBe(2200);
    expect(pupilPauseDurationMs(2, secure)).toBe(1400);
    // An unknown or absent tier must behave like secure, not like a gap.
    expect(pacingForTier(undefined)).toEqual(secure);
    expect(pacingForTier(null)).toEqual(secure);
  });

  it("slows down for developing and tightens up for greater depth", () => {
    const developing = pacingForTier("developing");
    const secure = pacingForTier("secure");
    const greater = pacingForTier("greater_depth");

    for (const key of [
      "focusSettleMs",
      "pointerSettleMs",
      "pupilPauseMs",
      "handCharMs",
      "mathCharMs",
      "cellWriteMs",
    ] as const) {
      expect(developing[key]).toBeGreaterThan(secure[key]);
      expect(greater[key]).toBeLessThan(secure[key]);
    }

    // Only the developing tier gets an extra beat between micro-steps.
    expect(developing.microBeatGapMs).toBeGreaterThan(0);
    expect(secure.microBeatGapMs).toBe(0);
    expect(greater.microBeatGapMs).toBe(0);

    // The floor still holds at speed, and is higher for a pupil who needs it.
    expect(pupilPauseDurationMs(4, developing)).toBe(developing.pupilPauseFloorMs);
    expect(developing.pupilPauseFloorMs).toBeGreaterThan(secure.pupilPauseFloorMs);
  });
});
