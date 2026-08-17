/**
 * Telling a teacher WHY a lesson did not load.
 *
 * The lesson panel threw away the response status and body (`throw new
 * Error("failed")`) and showed one line for every outcome: "Sorry, the lesson
 * couldn't load." So the 422 the API goes to the trouble of explaining — "The
 * generated lesson contained unsafe or mismatched teaching content" — never
 * reached anyone, and a rate-limit looked identical to a quality rejection.
 *
 * A teacher standing in front of thirty children needs to know which of three
 * things to do: wait, retry, or move on. An undifferentiated apology forces them
 * to guess, and guessing wrong in front of a class is what makes a pilot feel
 * unreliable.
 *
 * The retry decision matters as much as the copy. The panel used to auto-retry
 * every failure, which is actively harmful for a 429: retrying a rate limit is
 * what caused it.
 */

export type LessonFailureKind = "quality" | "busy" | "capacity" | "network";

export interface LessonFailure {
  kind: LessonFailureKind;
  /** Shown to whoever is looking at the screen, pupil or teacher. */
  message: string;
  /** What to do next, in plain words. */
  action: string;
  /** Whether an automatic retry could plausibly help. */
  retryable: boolean;
  /** Validator issue codes, when the API supplied them. Staff-facing only. */
  issues?: string[];
}

export function classifyLessonFailure(
  status: number | null,
  body?: { issues?: unknown } | null,
): LessonFailure {
  const issues = Array.isArray(body?.issues)
    ? (body!.issues as unknown[]).map(String)
    : undefined;

  // 422: generation succeeded but the lesson failed a teaching-quality gate.
  // Regenerating genuinely can help — the next attempt is a different sample —
  // so this is the one failure where an automatic retry is the right call.
  if (status === 422) {
    return {
      kind: "quality",
      message: "This lesson didn't pass our quality check, so we haven't shown it.",
      action: "Try again to build a fresh one, or pick another skill.",
      retryable: true,
      issues,
    };
  }

  // 429: we are the cause. Retrying immediately makes it worse.
  if (status === 429) {
    return {
      kind: "busy",
      message: "We're handling a lot of lesson requests from your school right now.",
      action: "Wait about a minute, then try again.",
      retryable: false,
      issues,
    };
  }

  // 5xx: upstream capacity, a model outage, or an exhausted quota. Worth one
  // automatic retry, but not more — a quota does not refill in 1.5 seconds.
  if (status !== null && status >= 500) {
    return {
      kind: "capacity",
      message: "Our lesson service is temporarily unavailable.",
      action: "Try again in a moment. If it keeps happening, please report it.",
      retryable: true,
      issues,
    };
  }

  // No status at all — the request never completed.
  return {
    kind: "network",
    message: "We couldn't reach the lesson service.",
    action: "Check the connection, then try again.",
    retryable: true,
    issues,
  };
}
