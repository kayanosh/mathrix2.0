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
    const badge = getVerificationBadge({
      casVerified: false,
      verification: v({ confidence: "high", agreementCount: 2 }),
    });
    expect(badge?.level).toBe("checked");
  });

  it("shows caution for medium confidence", () => {
    const badge = getVerificationBadge({
      casVerified: false,
      verification: v({ confidence: "medium" }),
    });
    expect(badge?.level).toBe("caution");
    expect(badge?.label.toLowerCase()).toContain("double-check");
  });

  it("shows unverified for low confidence", () => {
    const badge = getVerificationBadge({
      casVerified: false,
      verification: v({ confidence: "low" }),
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
