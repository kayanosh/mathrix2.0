# Mathrix Remediation Plan — Prioritised

Ordered by severity first, then by effort/blast-radius ratio within a severity tier. Effort estimates are from the defect register.

## Do immediately (independent of this audit)

1. **Rotate the live Stripe secret key** that was pasted into this chat session — it has not been rotated as of this writing. Not a code defect; a standing security action item for the user.

## P0 — blocks any "Ready" verdict

2. **DEF-008 — fix comma-thousands parsing.** Add comma-stripping to `lib/methods/normalize-math-text.ts` (the single shared entry point for every operand parser). No cache purge required — `hardenWorkedExample()` re-derives the answer on every serve, so the fix self-heals the live cache. After deploying: re-run the cache sweep methodology from this session (or formalize it as a script) to confirm 0-of-N wrong across the full cache, not just the 2 skills sampled here. Effort: Small.

## P1 — blocks "Ready", high pupil impact

3. **DEF-013 — isolate and fix the Volume-of-cuboids (Y6, Guided) generation failure.** Start by reading `lib/ks2-visual-fitness.ts`'s `cuboid_array` rule against whatever the model is actually generating for this skill. Effort: Small–Medium once isolated.
4. **DEF-010 — make public routes survive a Supabase outage.** Wrap the middleware's `createServerClient()` call in a try/catch; let public/static routes render logged-out on failure instead of 500-ing. Effort: Small.
5. **DEF-002 — close the narration/cursor word-alignment gap.** Requires a TTS provider/mode with word timestamps, or an offline forced-alignment pass (e.g. Whisper word-level timestamps) cached alongside each generated clip. Effort: Large — this is the one P1 that's an architecture change, not a small fix; sequence it after the two small P1s above land.
6. **DEF-003 — add lesson versioning/review-status fields to the schema.** `lessonId`, `contentVersion`, `curriculumObjectiveId`, `modelVersion`, `promptVersion`, `reviewStatus`, `teacherReviewer`, `sourceReferences`. This is a prerequisite for several release-gate conditions in `MATHRIX_PRODUCTION_READINESS.md`, not optional. Effort: Large (schema + pipeline + review UI) — scope the schema addition first, review UI can follow.

## P2 — should fix before "Ready with conditions," lower individual pupil impact

7. **DEF-009 — fix the offline validator's sample-question generator** so it stops silently skipping realistic inputs (comma-formatted large numbers, etc.) for most skills. This is what let DEF-008 through undetected; fixing it is cheap insurance against the next instance of this failure class. Effort: Small–Medium.
8. **DEF-011 — triage `npm audit` findings**, starting with `next` and `sharp` (production-relevant) before the likely-transitive build-tool ones. Effort: Small (triage) to Medium (major bumps).
9. **DEF-004 — author `focusTargetId` per narration segment** instead of inferring the cursor target via fuzzy word-matching. Effort: Medium.
10. **DEF-005 — decide and act on Eduqas/CCEA scope** for GCSE maths: either add the missing board data, or explicitly scope the product's marketing/claims to the boards actually modelled. Effort: Medium (data authoring) to Large (full parity).
11. **DEF-001 — fix the two dead admin routes** (wrong column check) and add a real admin-provisioning path, since none exists today even after the column-check fix. Effort: Small + Small.
12. **DEF-006 — add error-tracking/APM tooling** (e.g. Sentry) to the API routes and whiteboard/cursor client code. Effort: Medium.

## P3 — trivial, no rush

13. **DEF-012** — add the missing `style` field to a test fixture (`__tests__/lib/equivalent-fractions.test.ts`).
14. **DEF-007** — remove `last-dev.log` from git, add `*.log` to `.gitignore`.

## What this plan does not yet cover

Phases 2, 8, 9, 10 (curriculum traceability, student-interaction edge cases, accessibility, and most of security/privacy) have not been run, so this plan cannot yet include remediation items for whatever they find. Treat this as a living document — re-run the pending phases (see `MATHRIX_EXECUTIVE_AUDIT.md`) and append to this plan rather than treating items 1–14 as the complete list.
