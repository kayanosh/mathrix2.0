# Mathrix Security & Privacy Report — Partial (one incidental finding; full Phase 9/10 not run)

**Status: mostly Blocked / Not tested.** No structured OWASP-style probing (auth bypass, IDOR, injection, prompt injection, file-upload abuse) or ICO Children's Code / UK GDPR review has been performed this session. One reliability/fail-safe defect was found incidentally while getting the app running, and is recorded here and in the defect register rather than omitted.

## What was actually checked

- **Supabase data classification**: row counts only (no row content) were read across all 11 core tables to decide whether write-path security testing was safe to run. The user confirmed this project is **staging/test data**, not production, and explicitly authorized write-path testing (auth bypass attempts, cross-account access probes) against it. That testing itself has not been performed yet — only the safety-classification step.
- **Secrets in the repo**: `.env*` correctly gitignored, confirmed no secrets in tracked git history for env files (carried over from the Phase 1 pass).
- **Dependency vulnerabilities**: `npm audit` — 10 findings (1 low, 8 high, 1 critical). See DEF-011 in the defect register for the named packages. Not fixed, per the "do not begin by changing code" instruction for this pass.
- **Fail-safe / availability (incidental finding, DEF-010)**: global middleware (`proxy.ts:7`) throws unconditionally when Supabase is unreachable/misconfigured, returning HTTP 500 on every route including the fully public homepage. Reproduced 500→200 before/after in this session. This is a reliability defect with a security-adjacent flavor (an outage of one dependency takes down the entire site, including pages with no dependency on it) — filed as P1 reliability, not P0 security, since no data exposure or unauthorized access is involved.

## Explicitly out of scope / not exercised this session

- **Stripe**: a live secret key was pasted into chat during credential setup and has **not been rotated** as of this writing. No live Stripe API call was made (checkout/portal/webhook routes deliberately not exercised) — this is a standing security action item for the user, independent of Mathrix's code, and is repeated here because it belongs in a security report.
- Auth bypass / IDOR / cross-account leakage probing — authorized by the user, not yet executed.
- Prompt injection / indirect prompt injection via uploaded PDFs.
- File-upload validation, PDF/image parser risks.
- XSS / SQL/NoSQL injection sweeps.
- ICO Children's Code / UK GDPR review (DPIA, data minimisation, retention, subprocessors, voice-recording/AI-provider data retention) — this needs product/policy documents (privacy policy, any existing DPIA) that were not supplied, in addition to code-level review.

No security or privacy score is reported.
