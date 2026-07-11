/**
 * Honest verification gating for the answer shown on the whiteboard.
 *
 * The pipeline runs up to four independent checks (SymPy/Nerdamer pre-solve,
 * Nerdamer post-check, GPT-4o critic, deterministic tool checks) and rolls them
 * into a confidence level. The UI must NOT claim an answer is "verified" unless
 * it genuinely passed independent checks — otherwise we mislead students.
 *
 * `getVerificationBadge` maps the response's verification metadata to a single,
 * truthful badge (or null when there is nothing to assert, e.g. teaching
 * content or before verification has run).
 */
import type { WhiteboardResponse } from "@/types/whiteboard";

export type VerificationLevel =
  | "verified" // independently CAS-verified, high confidence
  | "checked" // multiple checks agree, high confidence (not necessarily CAS)
  | "caution" // partially checked — medium confidence
  | "unverified"; // could not be confirmed — low confidence

export interface VerificationBadge {
  level: VerificationLevel;
  label: string;
  /** Optional supporting detail, e.g. "3/4 checks agreed". */
  detail?: string;
}

/**
 * Decide the truthful verification badge for a response, or null if none
 * should be shown (no verification metadata — e.g. a topic lesson, or the
 * first paint before the verification pass completes).
 */
export function getVerificationBadge(
  data: Pick<WhiteboardResponse, "casVerified" | "verification">,
): VerificationBadge | null {
  const v = data.verification;
  const verified = data.casVerified === true;
  const confidence = v?.confidence;
  const agreement = v?.agreementCount;

  // Nothing to assert — no verification ran (teaching content / pre-verification).
  if (!v && !verified) return null;

  const detail =
    typeof agreement === "number" && agreement > 0
      ? `${agreement}/4 checks agreed`
      : undefined;

  // Genuinely CAS-verified and not contradicted by a low overall confidence.
  if (verified && confidence !== "low") {
    return { level: "verified", label: "Independently verified", detail };
  }

  // Multiple checks agree even without a CAS stamp.
  if (confidence === "high") {
    return { level: "checked", label: "Checked & consistent", detail };
  }

  if (confidence === "medium") {
    return {
      level: "caution",
      label: "Partly checked — worth double-checking",
      detail,
    };
  }

  // Low confidence, or verified===false with no better signal.
  return {
    level: "unverified",
    label: "Not fully verified — please double-check this answer",
  };
}
