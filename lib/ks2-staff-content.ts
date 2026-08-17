import type { CentreRole } from "@/lib/centre";

/**
 * Keeping answer keys out of a pupil's browser.
 *
 * `/api/ks2-lesson` has no authentication — it is rate-limited by client key
 * only — and returns the full lesson including the answers to guided practice,
 * independent practice and the quick check. The lesson panel hides those behind
 * a `staffMode` toggle, but that toggle is plain client state: any pupil can
 * click it, and even without clicking it the answers are already sitting in the
 * network response. Hiding is not withholding.
 *
 * So the answers are removed server-side for anyone who is not staff. Assessment
 * integrity is a direct procurement question for a school, and "a child can read
 * the answers from the page source" is the kind of thing that ends a demo.
 *
 * What is NOT stripped, deliberately:
 *  - `tryThis.answer` — this is a PUPIL affordance. The "Now you try" panel has
 *    its own "Show answer" button so a child can self-check after attempting.
 *    Removing it would break the one place a pupil is meant to see a worked
 *    solution.
 *  - `workedExample` — the lesson teaches by showing it.
 *  - The "Cover staff guide" script, which is hardcoded UI text rather than
 *    lesson content, so there is nothing to remove.
 */

/** Roles that may see answer keys. */
const STAFF_ROLES: ReadonlySet<string> = new Set([
  "teacher",
  "tutor",
  "centre_owner",
  "admin",
]);

export function isStaffRole(role: string | null | undefined): boolean {
  return !!role && STAFF_ROLES.has(role);
}

/** Names of the fields this module withholds, for tests and documentation. */
export const STAFF_ONLY_ANSWER_PATHS = [
  "guidedPractice[].answer",
  "independentPractice[].answer",
  "quickCheck.answer",
] as const;

interface AnswerBearing {
  answer?: unknown;
  [key: string]: unknown;
}

function withoutAnswer<T extends AnswerBearing>(item: T): T {
  if (!item || typeof item !== "object" || !("answer" in item)) return item;
  const { answer: _omitted, ...rest } = item;
  return rest as T;
}

/**
 * Remove staff-only answers from a lesson before it leaves the server.
 *
 * Returns a shallow-copied lesson; the input is not mutated, because the same
 * object is written to the shared cache and must keep its answers for staff and
 * for the review queue.
 */
export function stripStaffOnlyContent<T extends Record<string, unknown>>(
  lesson: T,
): T {
  if (!lesson || typeof lesson !== "object") return lesson;
  const out: Record<string, unknown> = { ...lesson };

  if (Array.isArray(out.guidedPractice)) {
    out.guidedPractice = (out.guidedPractice as AnswerBearing[]).map(withoutAnswer);
  }
  if (Array.isArray(out.independentPractice)) {
    out.independentPractice = (out.independentPractice as AnswerBearing[]).map(
      withoutAnswer,
    );
  }
  if (out.quickCheck && typeof out.quickCheck === "object") {
    out.quickCheck = withoutAnswer(out.quickCheck as AnswerBearing);
  }

  return out as T;
}

/** Convenience for a route: strip unless the caller is staff. */
export function lessonForRole<T extends Record<string, unknown>>(
  lesson: T,
  role: CentreRole | string | null | undefined,
): T {
  return isStaffRole(role) ? lesson : stripStaffOnlyContent(lesson);
}
