/**
 * A failed generation must not be presented as a success.
 *
 * From a real pupil screenshot of "I need to rebuild this lesson before teaching
 * it": the closing line was rendered inside the green tick "Answer" card, a
 * "Method learned! +10 XP +5 coins, streak up" toast fired, the progress bar read
 * 100%, and a "Watch on Whiteboard" button offered to play a lesson that did not
 * exist. Four separate components each decided this independently, which is how
 * they came to disagree.
 */
import { lessonPresentation } from "@/lib/lesson-presentation";

describe("lessonPresentation", () => {
  it("suppresses every success affordance for a failed generation", () => {
    expect(lessonPresentation({ generationFailed: true })).toEqual({
      showProgress: false,
      showAnswerCard: false,
      showCelebration: false,
      showWatchWhiteboard: false,
      persistProgress: false,
    });
  });

  it("leaves a real lesson fully intact", () => {
    // The guard must be specific to failures, not a blanket removal.
    expect(lessonPresentation({})).toEqual({
      showProgress: true,
      showAnswerCard: true,
      showCelebration: true,
      showWatchWhiteboard: true,
      persistProgress: true,
    });
  });

  it("treats a missing payload as a lesson, not a failure", () => {
    // Absence of the flag must never be read as failure, or a legitimate lesson
    // silently loses its answer card.
    expect(lessonPresentation(null).showAnswerCard).toBe(true);
    expect(lessonPresentation(undefined).showAnswerCard).toBe(true);
    expect(lessonPresentation({ generationFailed: false }).showCelebration).toBe(true);
  });
});
