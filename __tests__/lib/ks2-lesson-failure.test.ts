/**
 * A teacher needs to know whether to wait, retry, or move on.
 *
 * The lesson panel threw away the response status and body and showed one line
 * for every outcome: "Sorry, the lesson couldn't load." So the 422 the API goes
 * to the trouble of explaining never reached anyone, and a rate limit looked
 * identical to a quality rejection. It also auto-retried EVERY failure, which is
 * actively harmful for a 429 — retrying a rate limit is what caused it.
 */
import { classifyLessonFailure } from "@/lib/ks2-lesson-failure";

describe("classifyLessonFailure", () => {
  it("treats a 422 as a quality rejection worth retrying", () => {
    // Regeneration genuinely can help: the next attempt is a different sample.
    const f = classifyLessonFailure(422, { issues: ["math_answer_mismatch"] });
    expect(f.kind).toBe("quality");
    expect(f.retryable).toBe(true);
    expect(f.issues).toEqual(["math_answer_mismatch"]);
    expect(f.message).toMatch(/quality check/i);
    expect(f.action).toMatch(/another skill/i);
  });

  it("never auto-retries a 429", () => {
    // The single most important assertion here: retrying a rate limit is what
    // caused it, and the old code retried everything.
    const f = classifyLessonFailure(429, null);
    expect(f.kind).toBe("busy");
    expect(f.retryable).toBe(false);
    expect(f.action).toMatch(/wait/i);
  });

  it("retries a 5xx once, and says so honestly", () => {
    for (const status of [500, 502, 503]) {
      const f = classifyLessonFailure(status, null);
      expect(f.kind).toBe("capacity");
      expect(f.retryable).toBe(true);
    }
  });

  it("handles a request that never completed", () => {
    const f = classifyLessonFailure(null, null);
    expect(f.kind).toBe("network");
    expect(f.retryable).toBe(true);
  });

  it("never invents issue codes", () => {
    // A body without issues must not produce an empty array that the UI would
    // then render as "Failed checks: ".
    expect(classifyLessonFailure(422, {}).issues).toBeUndefined();
    expect(classifyLessonFailure(422, null).issues).toBeUndefined();
    expect(classifyLessonFailure(422, { issues: "not-an-array" }).issues).toBeUndefined();
  });

  it("gives every outcome both a message and an action", () => {
    for (const status of [422, 429, 500, null]) {
      const f = classifyLessonFailure(status, null);
      expect(f.message.length).toBeGreaterThan(10);
      expect(f.action.length).toBeGreaterThan(10);
      // Pupils read this screen too — no status codes or jargon.
      expect(f.message).not.toMatch(/\b(4\d\d|5\d\d|null|undefined)\b/);
    }
  });
});
