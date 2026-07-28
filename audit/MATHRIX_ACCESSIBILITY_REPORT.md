# Mathrix Accessibility Report (WCAG 2.2 AA) — Live automated sweep complete; all 6 findings fixed; manual/screen-reader testing not done

**Status: automated sweep clean; manual testing still not done.** This session ran a live, automated `@axe-core/playwright` sweep against 13 public routes at two viewports (desktop 1440×900, tablet 768×1024 — 26 route/viewport combinations total), using a real running dev server (not a static/theoretical read of the code). This originally found 28 real, verified WCAG rule violations (DEF-014 through DEF-018) plus one hydration bug found independently of axe. **All six have since been fixed and re-verified live, same session — re-running the identical sweep now returns zero violations across all 13 routes and both viewports.** This does **not** replace manual testing (keyboard-only traversal, screen-reader announcement quality, reduced-motion behaviour) or a full sweep of every authenticated pupil/teacher route — see "Not covered" below.

## Method

`scripts/audit-a11y-render.ts` (added this session) drives Playwright/Chromium to each route, waits for network-idle, runs axe-core with the `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa` tag set, and screenshots the page. Raw results: `audit/evidence/a11y-render-results.json`. Screenshots: `audit/evidence/screenshots/`.

Routes swept (all public, no authentication required — confirmed via the Next.js build output, which marks them `○` static): `/`, `/ks2`, `/ks2/curriculum`, `/ks2/sats`, `/ks2/eleven-plus`, `/ks2/school`, `/subjects`, `/syllabus`, `/revision`, `/algebra`, `/privacy`, `/terms`, `/contact`.

## Findings (real, reproduced — see `audit/evidence/a11y-render-results.json` for exact node counts and CSS selectors)

**28 total axe violations across the 26 route/viewport combinations swept, as originally found.** By rule, most-to-least severe:

| axe rule | impact | Routes affected | Node count (desktop) | Defect ID | Status |
|---|---|---|---|---|---|
| `button-name` | critical | `/` (1), `/algebra` (9) | 10 | DEF-015 | **FIXED** |
| `color-contrast` | serious | `/` (6), `/subjects` (13), `/syllabus` (8), `/revision` (8), `/algebra` (4), `/privacy` (1), `/terms` (1), `/contact` (1) | 42 | DEF-016 | **FIXED** |
| `nested-interactive` | serious | `/revision` (6) | 6 | DEF-014 | **FIXED** |
| `target-size` | serious | `/algebra` (8) | 8 | DEF-017 | **FIXED** |
| `link-in-text-block` | serious | `/privacy` (4), `/terms` (3) | 7 | DEF-018 | **FIXED** |

Full detail, reproduction steps, and verification evidence for each are in `MATHRIX_DEFECT_REGISTER.csv` (DEF-014 through DEF-018).

**All fixed and verified live, same session. Re-running the identical sweep now returns 0 total violations across all 13 routes and both viewports** (was 28), and 0 console/page errors (was 4, including the hydration-mismatch below) — confirmed in the regenerated `audit/evidence/a11y-render-results.json`. `npx tsc --noEmit` clean; full test suite 738/738 passing throughout. Summary of fixes:

- **DEF-015 (`button-name`, critical)**: 3 icon-only buttons had no accessible name — the send-message button in `components/ChatInterface.tsx` (both layout variants), and the step-dot/replay buttons in `components/SvgDiagramPlayer.tsx`. Added `aria-label` to each.
- **DEF-016 (`color-contrast`, serious)**: muted-text colour tokens (`text-gray-400`, `text-indigo-400`) had 2.5–3.1:1 contrast on light backgrounds (needs 4.5:1) across `ChatInterface.tsx`, `TierSelector.tsx`, `Footer.tsx`, and the subjects/syllabus/revision pages — darkened to `text-gray-600`/`text-indigo-600`. The `/algebra` route's dark-theme instances had the *opposite* problem (too-dark grays on a near-black background) — lightened to `text-gray-400` there. Each replacement was checked against a real extracted computed-colour contrast ratio, not guessed.
- **DEF-014 (`nested-interactive`, serious)**: `TopicCard` in `app/revision/page.tsx` nested a real `<button>` (the "View all" control) inside another interactive element (the topic-toggle control). Restructured so both are true siblings instead. This also independently fixed the hydration-mismatch below.
- **DEF-017 (`target-size`, serious)**: the 8 step-dot buttons in `SvgDiagramPlayer.tsx` were the visible dot itself (7×7px). Restructured to a 24×24px hit area with the small dot as an inner element (appearance unchanged).
- **DEF-018 (`link-in-text-block`, serious)**: 7 in-text `mailto:`/`ico.org.uk` links on `/privacy` and `/terms` were colour-only. Added an underline.

A live Playwright functional smoke test confirmed the DEF-014 restructuring didn't break behaviour: expand/collapse still works, and "View all" still opens the topic viewer without triggering the toggle.

**The independent hydration-mismatch finding on `/revision` (not from axe) is also resolved.** The same nested-`<button>` markup that caused DEF-014's axe finding also threw a real React hydration-mismatch error in the browser console (`In HTML, <button> cannot be a descendant of <button>... Hydration failed...`), forcing a client-side re-render of the topic-card subtree on every page load. Fixing the nesting resolved both — the regenerated evidence file shows 0 console/page errors on `/revision`, where it previously showed 1.

**Zero violations found on:** `/ks2`, `/ks2/curriculum`, `/ks2/sats`, `/ks2/eleven-plus`, `/ks2/school`. These routes are clean against the axe rule set run.

## Positive finding carried over from architecture reading, now more precisely stated

The whiteboard's teaching-target cursor (`TeacherPointer.tsx`) is `aria-hidden` and purely visual. A screen-reader user has **no non-visual equivalent** for "what's being taught right now" via the cursor itself — but this session confirmed (by reading `components/WhiteboardTutor.tsx` and `components/whiteboard/tutor/ActiveStepCard.tsx`) that the underlying narration text IS present as real DOM text content (not canvas/image-only), so a screen reader can still read the lesson content; it just can't tell which specific digit/term the cursor is currently pointing at. This remains a gap against the brief's explicit "a non-cursor way to identify the current teaching target" requirement, but it is now confirmed as a real architectural gap (not just an inference) — a screen-reader-driven manual test would still be needed to confirm exactly what VoiceOver/NVDA announces during playback.

## Not covered this session

- **Manual/assistive-technology testing**: no keyboard-only traversal, no VoiceOver/NVDA session, no reduced-motion/zoom/text-resize testing was performed. Axe-core catches a meaningful, real subset of WCAG failures (as demonstrated above) but does not catch everything a manual pass would (e.g. logical focus order, meaningful screen-reader announcement of dynamic whiteboard updates, keyboard operability of the whiteboard's playback controls).
- **Authenticated routes**: this sweep covered only public, unauthenticated pages. `/chat`, `/portal`, `/ks2/topic/[topicId]`, `/teacher/*` (all of which pupils, parents, or teachers actually spend most of their time on) were not run through axe this session. A live authenticated session WAS used elsewhere this session (Phase 6/8/10 — see `MATHRIX_CURSOR_SYNC_REPORT.csv` and `MATHRIX_SECURITY_PRIVACY_REPORT.md`), so this gap is a matter of not having pointed the same axe sweep at those routes yet, not a missing capability.
- **ICO Children's Code / privacy-by-design accessibility interplay** (e.g. cookie-consent UI accessibility) — not assessed.

No overall numeric accessibility score is reported. All 13 routes checked are now clean against the axe rule set run — a genuinely good result — but this remains a bounded, public-routes-only, automated-only sweep; a single score would overstate how much of the brief's full accessibility checklist (manual/AT testing, authenticated routes, ICO privacy-by-design interplay) that actually covers.
