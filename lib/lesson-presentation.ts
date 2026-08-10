import type { WhiteboardResponse } from "@/types/whiteboard";

/**
 * How a lesson payload should be presented.
 *
 * This exists because a FAILED generation is shaped exactly like a lesson —
 * intro, blocks, conclusion — so every affordance downstream treated it as one.
 * From a real pupil screenshot: the closing line was rendered inside the green
 * tick "Answer" card, a "Method learned! +10 XP +5 coins, streak up" toast fired,
 * the progress bar read 100%, and a "Watch on Whiteboard" button offered to play
 * a lesson that did not exist.
 *
 * Each of those was a separate check in a separate component, which is how they
 * came to disagree. Deciding it once, here, means a new surface has to opt in
 * rather than remember.
 */
export interface LessonPresentation {
  /** Progress through the lesson. Nothing was taught, so there is no progress. */
  showProgress: boolean;
  /** The green tick card. A failure has no answer to put in it. */
  showAnswerCard: boolean;
  /** XP / coins / streak. Never celebrate work the pupil did not get. */
  showCelebration: boolean;
  /** "Watch on Whiteboard" — there is nothing to play. */
  showWatchWhiteboard: boolean;
  /** Save as resumable progress, or "continue where you left off" resumes an apology. */
  persistProgress: boolean;
}

export function lessonPresentation(
  data: Pick<WhiteboardResponse, "generationFailed"> | null | undefined,
): LessonPresentation {
  const failed = !!data?.generationFailed;
  return {
    showProgress: !failed,
    showAnswerCard: !failed,
    showCelebration: !failed,
    showWatchWhiteboard: !failed,
    persistProgress: !failed,
  };
}
