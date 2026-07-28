# Mathrix Production Readiness — Not Ready (updated after remediation)

## Verdict: **Not ready** (unchanged), but the reason has narrowed considerably

The original verdict was driven by a live P0 (DEF-008) plus two P1s (DEF-010, DEF-013) and an unenforced review gap (DEF-003). **DEF-008, DEF-010, and DEF-013 are now fixed and verified** (see `MATHRIX_DEFECT_REGISTER.csv`'s `status` column for reproduction/verification detail on each). The remaining blocker is narrower but still real:

- **DEF-003 (P1, fields added, not enforced)**: nothing in the serving path checks `reviewStatus` before serving a lesson. The fields now exist (`lessonId`, `contentVersion`, `modelVersion`, `promptVersion`, `reviewStatus`, `teacherReviewer`, `sourceReferences`) and are stamped on every generated/cached lesson, but every one of the 437+ cached lessons is `reviewStatus: "unreviewed"` and nothing stops them being served. This was a deliberate scope decision (see `MATHRIX_REMEDIATION_PLAN.md`) — enforcing it now, with zero lessons ever reviewed, would brick the product rather than fix it. Building the actual review workflow is separate, larger work.
- Phases 2 (curriculum traceability), most of 5/6 (quantitative cursor-sync numbers — see below), 8, 9, 10, and most of 11/12 are still untested, per `MATHRIX_EXECUTIVE_AUDIT.md`'s pending list.

This verdict would not change even if every remaining untested phase came back clean, because DEF-003's gap is structural, not a bug with a specific repro.

## Release-gate checklist (per the brief) — updated

| Gate condition | Status |
|---|---|
| No open P0 defects | **PASS** — DEF-008 fixed, verified live (cache self-healed, 4/4 wrong answers now correct; fresh generation confirmed correct) |
| No open P1 defects | **FAIL** — DEF-003 (fields exist, not enforced). DEF-002, DEF-010, DEF-013 fixed. |
| Every claimed curriculum objective has traceable coverage | Not tested (Phase 2 not run) |
| Every published lesson has passed mathematical validation | **IMPROVED, not fully resolved** — the specific DEF-008 parsing bug is fixed and self-healed the whole cache; DEF-009 (the harness's own coverage gap) is now visible via warnings for 26 named skills rather than silently passing, meaning further undiscovered instances of this failure class are more findable but not ruled out. |
| Every published lesson has a recorded content version | **PASS** — `contentVersion` (content hash) is now stamped on every generated lesson (DEF-003). |
| Every published lesson has an approval status | **FAIL** — `reviewStatus` field exists and is stamped, but always `"unreviewed"`; nothing gates on it (DEF-003, by design this pass). |
| Golden lesson regression tests pass | Blocked — no golden suite exists yet (Phase 12 not built) |
| Cursor/narration accuracy meets an agreed release threshold | **Structural blocker resolved differently than planned**: word-level timestamps were spiked and found unreliable for comma-formatted numbers; sentence/segment-level timestamps are implemented and verified instead (DEF-002). The brief's literal per-*word* `synchronisation_difference_ms` metric is still not the mechanism used — a per-*sentence* equivalent could be defined, but that measurement work itself has not been done. |
| Critical accessibility journeys meet WCAG 2.2 AA | Not tested (Phase 9 not run) |
| Child privacy risks assessed and addressed | Not tested (needs policy documents not supplied, plus Phase 9/10 code review) |
| Production monitoring and rollback operational | **PARTIAL** — Sentry now wired (DSN-optional, no PII), verified building and booting correctly, manually instrumented in 2 of many catch blocks (`proxy.ts`, `/api/ks2-lesson`). No account exists to verify an actual captured event, and most routes aren't instrumented yet (DEF-006). Rollback process itself: not addressed. |
| Model/prompt/content changes follow a controlled release process | **FAIL** — `modelVersion`/`promptVersion` are now recorded (DEF-003), which is the traceability half of this gate, but nothing *acts* on a change (no diff-and-flag, no review gate) — the control half is still absent. |

## What must be true before re-evaluating

1. ~~DEF-008 fixed~~ — done, verified.
2. ~~DEF-013 root-caused and fixed~~ — done, verified (8/8 fresh generations succeed).
3. ~~DEF-010 fixed~~ — done, verified.
4. Build and enforce an actual review workflow against DEF-003's now-existing fields — block serving a lesson whose `reviewStatus !== "approved"`, once there's a way for a teacher to set that status. This is the one remaining structural blocker from the original list.
5. The remaining phases (2, 5/6 quantitative measurement, 8, 9, 10, 11, 12) actually run, per the pending list in `MATHRIX_EXECUTIVE_AUDIT.md`.
6. Decide on DEF-011's remaining `--force` dependency bumps (Next.js/sharp/postcss) — deferred by user decision to its own session, not forgotten.
