import { CLAUDE_SOLVER_MODEL } from "@/lib/claude-solver";
import { isKnownModel } from "@/lib/ai-cost";

/**
 * The solver's model ID was once "claude-sonnet-4-6-20250514" — Sonnet 4.6 with
 * Sonnet 4's release date appended. The API rejected it, every caller fell back
 * to GPT-4o without a sound, and Claude never ran. These cannot prove an ID is
 * live (only the API can), but they catch that specific mistake coming back.
 */
describe("CLAUDE_SOLVER_MODEL", () => {
  it("is a Sonnet 4.6+ alias, which carries no date suffix", () => {
    expect(CLAUDE_SOLVER_MODEL).toMatch(/^claude-[a-z]+-\d+(-\d)?$/);
    expect(CLAUDE_SOLVER_MODEL).not.toMatch(/\d{8}$/);
  });

  it("has a price, so its cost is not logged as unknown", () => {
    expect(isKnownModel(CLAUDE_SOLVER_MODEL)).toBe(true);
  });
});
