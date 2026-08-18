import { getVerificationBadge } from "@/lib/verification-badge";
import type { VerificationStatus } from "@/types/whiteboard";

function v(partial: Partial<VerificationStatus>): VerificationStatus {
  return {
    preCasVerified: false,
    postCasVerified: false,
    criticVerified: false,
    toolChecksPassed: false,
    confidence: "low",
    warnings: [],
    ...partial,
  };
}

describe("getVerificationBadge", () => {
  it("returns null when nothing has been verified (e.g. teaching content)", () => {
    expect(getVerificationBadge({})).toBeNull();
    expect(getVerificationBadge({ casVerified: false })).toBeNull();
  });

  it("shows 'Independently verified' for a CAS-verified, non-low answer", () => {
    const badge = getVerificationBadge({
      casVerified: true,
      verification: v({ confidence: "high", agreementCount: 3 }),
    });
    expect(badge?.level).toBe("verified");
    expect(badge?.label).toContain("Independently verified");
    expect(badge?.detail).toBe("3/4 checks agreed");
  });

  it("shows 'Checked & consistent' for high confidence without a CAS stamp", () => {
    // Two GENUINELY passing checks. The flags were previously all false here,
    // which is the state three code paths actually send — see the honesty tests
    // at the bottom of this file.
    const badge = getVerificationBadge({
      casVerified: false,
      verification: v({
        confidence: "high",
        agreementCount: 2,
        criticVerified: true,
        toolChecksPassed: true,
      }),
    });
    expect(badge?.level).toBe("checked");
  });

  it("shows caution for medium confidence", () => {
    const badge = getVerificationBadge({
      casVerified: false,
      verification: v({ confidence: "medium", criticVerified: true }),
    });
    expect(badge?.level).toBe("caution");
    expect(badge?.label.toLowerCase()).toContain("double-check");
  });

  it("shows unverified for low confidence", () => {
    const badge = getVerificationBadge({
      casVerified: false,
      verification: v({ confidence: "low", criticVerified: true }),
    });
    expect(badge?.level).toBe("unverified");
  });

  it("does not claim verified when overall confidence is low", () => {
    const badge = getVerificationBadge({
      casVerified: true,
      verification: v({ confidence: "low" }),
    });
    expect(badge?.level).toBe("unverified");
  });

  it("omits the detail when no checks agreed", () => {
    const badge = getVerificationBadge({
      casVerified: true,
      verification: v({ confidence: "high", agreementCount: 0 }),
    });
    expect(badge?.level).toBe("verified");
    expect(badge?.detail).toBeUndefined();
  });
});

/**
 * The badge must never assert a check that did not happen.
 *
 * Three code paths — lesson mode, teacher mode, and follow-up answers — send
 * `confidence: "high"` with preCas/postCas/critic/toolChecks ALL false, because
 * they legitimately skip verification. This function rendered that as
 * "Checked & consistent": a claim that nothing had been checked.
 *
 * A badge that is always green is worth less than no badge. It trains students
 * to ignore it, and it converts a wrong answer into a wrong answer they were
 * told to trust — which for a paid product is a mis-selling problem, not just a
 * UX one.
 */
describe("getVerificationBadge honesty", () => {
  it("returns NO badge when confidence claims high but nothing passed", () => {
    expect(
      getVerificationBadge({
        casVerified: false,
        verification: v({ confidence: "high", agreementCount: 0 }),
      }),
    ).toBeNull();
  });

  it("returns no badge for the exact payload lesson/teacher/follow-up modes send", () => {
    expect(
      getVerificationBadge({
        verification: {
          confidence: "high",
          casVerified: false,
          criticVerified: false,
          toolChecksPassed: false,
        } as never,
      }),
    ).toBeNull();
  });

  it("will not say 'checked' on the strength of a single source", () => {
    // One passing check is "worth double-checking", not "checked & consistent".
    const badge = getVerificationBadge({
      casVerified: false,
      verification: v({ confidence: "high", agreementCount: 1, criticVerified: true }),
    });
    expect(badge?.level).not.toBe("checked");
  });

  it("still shows a badge as soon as one check genuinely passes", () => {
    // The guard must suppress false claims, not suppress the feature.
    for (const flag of ["preCasVerified", "postCasVerified", "criticVerified", "toolChecksPassed"] as const) {
      const badge = getVerificationBadge({
        casVerified: false,
        verification: v({ confidence: "medium", [flag]: true }),
      });
      expect(badge).not.toBeNull();
    }
  });
});
