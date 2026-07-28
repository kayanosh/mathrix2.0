# Mathrix Remediation Plan — Prioritised

Ordered by severity first, then by effort/blast-radius ratio within a severity tier. Effort estimates are from the defect register. Status markers added after two remediation passes this session — see `MATHRIX_DEFECT_REGISTER.csv`'s `status` column for full verification detail on each.

## Do immediately (independent of this audit)

1. **[ STILL OPEN ] Rotate the live Stripe secret key** that was pasted into a chat session — as of this writing it has not been rotated. Not a code defect; a standing security action item for the user, repeated here because it's still true.

## P0 — blocks any "Ready" verdict

2. **[ DONE ] DEF-008 — fix comma-thousands parsing.** Fixed in `lib/methods/normalize-math-text.ts`. Verified: full test suite passes, live cache sweep confirmed 4/4 previously-wrong worked examples now correct with no purge, fresh generation independently confirmed correct.

## P1 — blocks "Ready", high pupil impact

3. **[ DONE ] DEF-013 — Volume-of-cuboids (Y6, Guided) generation failure.** Root cause was more specific than originally logged: `parseRectMeasure()` never matched natural "N cm long, N cm wide and N cm high" phrasing at all. Fixed by extending that parser and unwrapping `\text{}` LaTeX in `normalizeMathText`; also widened the existing single quality-retry to two as defense-in-depth. Verified 8/8 fresh generations succeed (was ~4/5 failing intermittently before).
4. **[ DONE ] DEF-010 — public routes survive a Supabase outage.** `proxy.ts`'s Supabase client/session call now runs in try/catch, continuing logged-out on failure. Verified: 500→200 with Supabase entirely unconfigured.
5. **[ DONE, differently than planned ] DEF-002 — narration/cursor sync.** Spiked word-level Whisper timestamps first (per-defect-register instruction) and found them unreliable for comma-formatted numbers (`62,403` transcribes as two words). Implemented sentence/segment-level timestamps instead via a new `/api/tts-timing` endpoint, cached in `tts_cache.segments` (migration applied). Also switched the elapsed-time source to real `audio.currentTime`. Verified live: cold-miss transcribes+caches, warm-hit reads instantly.
6. **[ FIELDS ADDED, NOT ENFORCED — remaining work below ] DEF-003 — lesson versioning/review-status fields.** `lessonId`, `contentVersion`, `curriculumObjectiveId`, `modelVersion`, `promptVersion`, `reviewStatus`, `teacherReviewer`, `sourceReferences` added to `CachedKS2Lesson`/`KS2TeachingLesson`, stamped on every generated lesson, verified persisting through cache hits. **Deliberately not wired into the serving path** — every one of the 437+ cached lessons is `reviewStatus: "unreviewed"`, so enforcing a gate now would brick production. Remaining work, genuinely separate and larger: a teacher-facing review UI that can set `reviewStatus: "approved"`, and a serving-path check that refuses `"unreviewed"`/`"rejected"` lessons once that UI exists.

## P2 — should fix before "Ready with conditions," lower individual pupil impact

7. **[ PARTIAL ] DEF-009 — offline validator's sample-question generator.** Added real sample questions for the two skills implicated in DEF-008; the harness now warns (visible) instead of silently passing for the other 26 maths skills still using the skill-name fallback. Authoring real questions for all 26 was judged the same content-authoring risk class as DEF-005 and not attempted wholesale.
8. **[ PARTIAL, by user decision ] DEF-011 — `npm audit` findings.** `npm audit fix` (no `--force`) resolved the critical `handlebars` finding. `next`/`sharp`/`postcss` need `--force` (major bumps); user chose to defer this to its own dedicated session rather than bundle a risky major-version change with everything else fixed this session.
9. **[ NOT STARTED ] DEF-004 — author `focusTargetId` per narration segment** instead of inferring the cursor target via fuzzy word-matching. Still open; not attempted — reasonably bundled with DEF-003's schema work (a `focusTargetId` needs the lesson-structure fields DEF-003 introduced to attach to properly), so sequence it after DEF-003's review workflow lands.
10. **[ SCOPED, by user decision — not "fixed" in the add-content sense ] DEF-005 — Eduqas/CCEA.** User chose to scope claims rather than author unverified curriculum content. WJEC removed from the GCSE maths board selector (it had zero backing content, so selecting it produced ungrounded AI claims about a spec this product doesn't model). Eduqas/CCEA remain absent — now honestly absent rather than contradicted by a selector that offered them without content.
11. **[ DONE ] DEF-001 — dead admin routes.** Both routes now check `role === 'admin'`; added `scripts/grant-admin.ts` (no provisioning path existed before). Verified via new authorization tests.
12. **[ WIRED, DSN-optional ] DEF-006 — error-tracking/APM.** `@sentry/nextjs` added with `sendDefaultPii: false` and body/cookie/header scrubbing in `beforeSend` (per `MATHRIX_SECURITY_PRIVACY_REPORT.md`'s no-pupil-data rule). Wired into `proxy.ts` and `/api/ks2-lesson`'s catch blocks; most other routes' catch blocks are not yet instrumented. No Sentry account exists to verify an actual captured event end-to-end — verified instead that build/boot are unaffected with no DSN set. Remaining work: instrument the other API routes' catch blocks; get a real DSN when the user has an account.

## P3 — trivial, no rush

13. **[ DONE ] DEF-012** — added the missing `style` field to the test fixture; `tsc --noEmit` clean.
14. **[ DONE ] DEF-007** — `last-dev.log` untracked via `git rm --cached`; `*.log` added to `.gitignore`.

## What this plan does not yet cover

Phases 2, 8, 9, 10 (curriculum traceability, student-interaction edge cases, accessibility, and most of security/privacy) still have not been run, so this plan still cannot include remediation items for whatever they'd find. Treat this as a living document.
