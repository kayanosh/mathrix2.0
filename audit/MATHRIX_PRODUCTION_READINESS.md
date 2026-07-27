# Mathrix Production Readiness — Not Ready (partial evidence)

## Verdict: **Not ready**

Per the audit brief's own release gate, "Ready" requires (among other things) *no open P0 defects* and *every published lesson has passed mathematical validation*. Both are currently violated with direct evidence:

- **DEF-008 (P0)**: at least one worked example currently teaches an arithmetically wrong answer to Year 5/6 pupils, live in the shared lesson cache, for a core Y5/Y6 skill ("more than 4 digits" column addition/subtraction). This alone is sufficient for a **Not ready** verdict under the brief's own gate — the brief states "no open P0 defects remain," full stop.
- **DEF-013 (P1)**: at least one Guided-mode lesson (Volume of cuboids, Y6) cannot currently be generated successfully at all (reproducible 422).
- **DEF-010 (P1)**: the platform has no fail-safe for a Supabase outage/misconfiguration — every route, including public ones, goes down together.

This verdict would not change even if every remaining untested phase (curriculum traceability, accessibility, security, reliability/perf, the golden-lesson suite) came back clean, because the gate is written as an AND of all conditions and at least one is already confirmed false.

## Release-gate checklist (per the brief)

| Gate condition | Status |
|---|---|
| No open P0 defects | **FAIL** — DEF-008 |
| No open P1 defects | **FAIL** — DEF-002, DEF-003, DEF-010, DEF-013 |
| Every claimed curriculum objective has traceable coverage | Not tested (Phase 2 not run) |
| Every published lesson has passed mathematical validation | **FAIL** — DEF-008 demonstrates the validation layer itself has a bug that lets wrong answers through |
| Every published lesson has a recorded content version | **FAIL** — no `contentVersion` field exists in the schema (DEF-003) |
| Every published lesson has an approval status | **FAIL** — no `reviewStatus` field exists in the schema (DEF-003) |
| Golden lesson regression tests pass | Blocked — no golden suite exists yet (Phase 12 not built) |
| Cursor/narration accuracy meets an agreed release threshold | Not tested — and the specific brief metric is structurally unmeasurable with the current TTS provider (see DEF-002, `MATHRIX_CURSOR_SYNC_REPORT.csv`) |
| Critical accessibility journeys meet WCAG 2.2 AA | Not tested (Phase 9 not run) |
| Child privacy risks assessed and addressed | Not tested (needs policy documents not supplied, plus Phase 9/10 code review) |
| Production monitoring and rollback operational | **FAIL** — no error-tracking/APM tooling found anywhere in the codebase (DEF-006, carried over from Phase 1) |
| Model/prompt/content changes follow a controlled release process | **FAIL** — follows directly from DEF-003 (no version/review fields to control against) |

## What must be true before re-evaluating

1. DEF-008 fixed (small, well-located fix — see defect register) and the live-cache sweep re-run to confirm 0 wrong answers, not just this one skill.
2. DEF-013 root-caused and fixed, or the skill temporarily removed from the catalogue rather than served broken.
3. DEF-010 fixed (public routes must survive a Supabase outage).
4. A decision made and acted on for DEF-003 (lesson versioning/review schema) — this is a structural prerequisite for ever being able to claim "every published lesson has an approval status," not optional polish.
5. The remaining phases (2, 5/6 quantitative, 8, 9, 10, 11, 12) actually run, per the pending list in `MATHRIX_EXECUTIVE_AUDIT.md`.
