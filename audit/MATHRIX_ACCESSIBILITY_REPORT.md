# Mathrix Accessibility Report (WCAG 2.2 AA) — Not tested

**Status: Blocked / Not tested this session.** No accessibility testing (automated or manual) has been performed against a running instance. This session's time went to getting the app running at all (Node.js/credentials were both absent) and to a deep-dive on a P0 math-accuracy defect (see `MATHRIX_DEFECT_REGISTER.csv` DEF-008) that surfaced while doing Phase 3 checks.

## What would unblock this

- The app is now runnable locally (confirmed: `npm run dev`, serves real 200s). Playwright + Chromium are installed.
- Needed: `@axe-core/playwright` (or equivalent) added to the project, plus an authenticated pupil-role test session (no test accounts/credentials for logging in as a pupil were set up this session — only service-role DB access, which bypasses the UI entirely).
- The brief's specific checklist (keyboard-only traversal, screen-reader labels, semantic heading order, accessible math notation, caption/transcript for narration, colour contrast, reduced-motion, touch-target size, zoom/text-resize, error identification, a non-cursor way to identify the current teaching target) has not been evaluated against any of it.

## One relevant observation carried over from architecture reading (not a dynamic accessibility test)

- The whiteboard's teaching-target cursor (`TeacherPointer.tsx`) is `aria-hidden` and purely visual/pointer-events-none. Whether an equivalent non-visual (e.g. screen-reader-announced, or text-highlighted-in-sync) way to identify "what's being taught right now" exists was not confirmed — the brief explicitly requires "a non-cursor way to identify the current teaching target." **Not tested — flagging as a specific thing to check first in a future accessibility pass**, since the architecture as read suggests it may not exist, but this needs a screen-reader-driven test to confirm, not an inference.

No score is reported. Reporting one without having run WCAG testing would be a guess, which the audit brief prohibits.
