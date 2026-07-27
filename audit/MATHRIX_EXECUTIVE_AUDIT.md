# Mathrix Executive Audit — Interim (dynamic testing now unblocked; Phases 1 and part of 3 evidenced)

**Status: audit in progress, resumed after an interruption.** The previous pass completed only Phase 1 (static, read-only) because Node.js/npm/Playwright were absent and there were no runnable credentials. This session installed Node.js (via nvm, no admin/sudo available on this machine), got the app running against real Supabase/OpenAI credentials, and ran the repo's own validation tooling plus targeted live checks. Phases 2, 4 (partial), 5, 7, 8, 9, 10, 11, 12 are still **not** complete — see "What's still pending" below. Numeric release-gate scores are still not reported, for the same reason as before: most of the required inputs still don't exist.

## Overall verdict

**Still cannot issue Ready / Ready with conditions / Not ready — most release-gate criteria remain untested.** But one thing changed this session: a **P0 has been confirmed with a precise, quantified, reproducible root cause** (DEF-008). That alone is enough to say **the platform is not currently safe to call "Ready"** regardless of what the remaining phases find, because the defect is in the exact place the brief cares about most — the worked example a pupil is taught from — and it is live in the production-pattern content cache right now, not a theoretical risk.

## Headline finding of this session

**The AI got the arithmetic right. The platform's own "safety net" overwrote it with a wrong answer.**

For the Y5/Y6 skill "column subtraction/addition of numbers with more than 4 digits," the generated worked example for `$62,403 - 27,568$` is taught to pupils with the answer **376** (correct answer: 34,835) — because the whiteboard steps and column-method diagram actually solve **403 − 27 = 376**, an unrelated, much simpler problem. This is not the LLM hallucinating: calling the platform's own deterministic method-builder directly with the exact same question string reproduces the identical wrong answer byte-for-byte. The prior session listed this deterministic-checker layer as a *strength* ("real independent math validation... not the LLM grading itself" — see DEF-002's original framing); this session found that the same layer is what authored this specific defect, by unconditionally overwriting the model's answer whenever it disagrees with a checker that itself has a parsing bug (see DEF-008 for full reproduction). Quantified against the live 437-row lesson cache: **4 of 4** sampled worked examples for these two skills are wrong, while every sibling practice/try-this/quick-check question on the *same* lessons is correct — the bug is precisely isolated to the worked-example override path. Fixing it requires a small, well-located change and **no cache purge**, because the buggy logic re-runs on every serve.

## What Mathrix does well (evidenced)

1. **Independent mathematical validation exists and is architecturally real** — a separate SymPy service, a JS CAS, and deterministic checkers are called against generated answers, not the LLM grading itself. (This session's finding refines, not reverses, this: the checker itself has a bug for one input class — comma-formatted numbers — the overall design of separating generation from checking is still correct and is how the bug was findable at all.)
2. **The app now actually runs and serves real pages** (confirmed this session: `npm run build` succeeds cleanly with zero env vars; the dev server serves real 200s on `/` and `/ks2` once Supabase credentials are present).
3. **718 tests across 71 suites pass offline**, no credentials required (`npm test`), confirming a real baseline of existing math/lesson-quality coverage.
4. **55 of 56 live KS2 maths topic-page generation flows (Learn + Guided, all 28 curriculum topics) succeed end-to-end** against the real OpenAI-backed API, most served from cache in under 200ms.
5. Row-Level Security enabled on all 19 database tables (Phase 1 finding, re-confirmed present).
6. The cursor's **target element** is resolved live via `getBoundingClientRect()` on `[data-teacher-target]` attributes and recalculates on scroll/resize — this matches the audit brief's own *preferred* architecture. (New this session — the prior pass had not run the renderer to see this.)
7. When live lesson generation fails validation, the client retries once automatically and then shows a friendly "Sorry, the lesson couldn't load / Try again" message — not a blank page or raw error (confirmed by reading `components/ks2/LessonPanel.tsx`).
8. No secrets committed to git; `.env*` correctly gitignored.

## Critical defects (P0/P1 confirmed)

- **DEF-008 (P0, NEW)** — worked-example answer/steps/whiteboard silently solve a different, simpler problem than the one displayed, for Y5/Y6 large-number column addition/subtraction. Root cause: comma-thousands separators are never stripped before regex operand-parsing in `lib/methods/normalize-math-text.ts` and its callers; the deterministic builder's (wrong) answer is then trusted as ground truth and overwrites the model's (correct) answer. Quantified 4/4 on live cache. See defect register for full repro.
- **DEF-013 (P1, NEW)** — the Guided flow for "Volume of cuboids" (Y6) reproducibly fails the platform's own content validator (`visual_mismatch`, HTTP 422) on 2/2 fresh-generation attempts. Root cause not yet isolated.
- **DEF-010 (P1, NEW)** — global middleware (`proxy.ts:7`) throws unconditionally when Supabase isn't reachable/configured, 500-ing *every* route including the fully public homepage. Reproduced 500→200 before/after in this session. Violates the brief's own Phase 11 fail-safe requirement.
- **DEF-002 (P1, revised this session)** — narration/cursor *word-level* timing is still a linear interpolation within each spoken phrase (no per-word TTS timestamps exist from the provider), **but** the *total* duration it interpolates across is confirmed to come from the real audio file when cloud TTS succeeds, not a guess as the total-duration claim might have implied. Sync should be accurate at phrase boundaries and can drift mid-phrase. Edited in place in the register — do not read the old wording as still current.
- **DEF-003 (P1, unchanged)** — lesson schema has no versioning/objective-link/review-approval fields.
- **DEF-001 (P2, unchanged)** — dead admin routes checking the wrong column; no caller in the live product.
- No confirmed safeguarding/security data-loss defect yet — Phase 9/10 (accessibility/privacy/security dynamic testing) has still not been run.

## New lower-severity findings this session

- **DEF-009 (P2, test-coverage)**: the repo's own offline validator (`scripts/validate-ks2-lessons.ts`) reported "377/378 passed" but its sample-question generator falls back to feeding the *skill name* in as the question for most skills, never constructing a comma-formatted number — so it structurally could not have caught DEF-008 despite running the same code path. Do not cite "377/378 passed" as coverage evidence for arithmetic correctness.
- **DEF-011 (P2, dependency-security)**: `npm audit` reports 10 vulnerabilities (1 low, 8 high, 1 critical — `handlebars` critical; `next`, `sharp`, `ws`, `js-yaml`, and others high). `next` and `sharp` are directly production-relevant and should be triaged first. Not fixed, per the audit brief's "do not begin by changing code" instruction for this pass.
- **DEF-012 (P3)**: one pre-existing TypeScript error, test-file only, doesn't affect the production build.

## Credentials and scope caveats — read before trusting "tested" claims elsewhere in this audit

- Supabase (URL, anon key, service-role key): provided, confirmed working, **user-confirmed staging/test data** (not production) — 28 profiles, 7 students, 5 centres, small non-zero row counts across all 11 checked tables, row *counts* only inspected, not row *content*.
- OpenAI API key: provided, working, used for the live generation checks above (real, modest API cost incurred with the user's knowledge).
- **Anthropic API key and Resend API key: never provided.** Anything in this audit involving Claude-model fallback paths or transactional email is untested and out of scope for this pass.
- **Stripe: a live secret key was pasted into the chat session and has NOT been rotated as of this writing.** No live Stripe API call was made in this audit (checkout/portal/webhook routes were deliberately not exercised) — Stripe coverage in this audit is static code review only. **This is an outstanding security action item independent of the audit**, not a Mathrix code defect: rotate the key in the Stripe dashboard.
- No Docker on this machine — a local, isolated Supabase instance could not be stood up as an alternative to using the shared project above.

## Numeric scores

**Still none reported.** One phase (3, partially) now has real dynamic evidence; the other seven+ required inputs (curriculum traceability data, Playwright, accessibility/security dynamic testing, reliability/perf measurement, the golden-lesson suite) are still absent. Reporting a score now would still be a guess.

## What's still pending, and on what

- **Phase 2 (curriculum coverage)**: not started this session. Bounded approach recommended (per the brief's own allowance for "Blocked"): enumerate Mathrix's own claimed topic list first (cheap, local), then spot-check a sample against official DfE/exam-board sources, rather than attempting full five-board traceability in one pass.
- **Phase 3/4 (lesson content, remaining skills; teaching-quality scoring)**: only the Y5/Y6 add/subtract and volume-of-cuboids areas got deep, live-evidenced treatment this session. The other ~26 KS2 maths topics, plus English/science/computing/Arabic and all GCSE content, are untested beyond the pass/fail signal in "55/56 flows passed."
- **Phase 5/6 (whiteboard rendering, cursor/narration quantitative sync)**: Playwright is now installed (Chromium browser downloaded), but the brief's specific metrics (median/95th-percentile `synchronisation_difference_ms`) are **structurally not measurable** with the current TTS provider — OpenAI `tts-1` returns no word timestamps, so there is no ground truth to measure drift against. This needs either a provider/mode that returns word timestamps or an offline forced-alignment pass, not more engineering time on this machine. A cheaper, still-real Phase 6 check (does the cursor's bounding box intersect a visible target element, spatially) was scoped but not run — it needs an authenticated pupil session, which was not set up this session.
- **Phase 7 (architecture)**: see `MATHRIX_SYSTEM_ARCHITECTURE.md` (Phase 1 static pass; not revisited this session beyond what's folded into the findings above).
- **Phase 8/9/10/11 (interaction, accessibility, security, reliability)**: **Not tested**, except: the DEF-010 fail-safe defect (found incidentally while getting the app running) and the npm-audit dependency scan (DEF-011). WCAG 2.2 AA, ICO Children's Code/DPIA review, and OWASP-style security probing have not been performed. The user has authorized write-path security testing against the current Supabase project (confirmed staging), which makes Phase 10 tractable in a future session.
- **Phase 12 (regression suite, remaining CSV/MD deliverables)**: `MATHRIX_CURRICULUM_COVERAGE.csv`, `MATHRIX_LESSON_QUALITY.csv`, `MATHRIX_CURSOR_SYNC_REPORT.csv`, `MATHRIX_ACCESSIBILITY_REPORT.md`, `MATHRIX_SECURITY_PRIVACY_REPORT.md`, `MATHRIX_PRODUCTION_READINESS.md`, `MATHRIX_REMEDIATION_PLAN.md` are stubbed with explicit Blocked/Not-tested markers in this directory rather than fabricated — see each file.
