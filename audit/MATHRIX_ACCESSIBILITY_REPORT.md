# Mathrix Accessibility Report (WCAG 2.2 AA) — Live automated sweep complete; critical finding fixed; manual/screen-reader testing not done

**Status: partial, critical finding remediated.** This session ran a live, automated `@axe-core/playwright` sweep against 13 public routes at two viewports (desktop 1440×900, tablet 768×1024 — 26 route/viewport combinations total), using a real running dev server (not a static/theoretical read of the code). This finds real, verified WCAG rule violations. It does **not** replace manual testing (keyboard-only traversal, screen-reader announcement quality, reduced-motion behaviour) or a full sweep of every authenticated pupil/teacher route — see "Not covered" below. **Update, same session: the critical-impact `button-name` finding (DEF-015) has been fixed and re-verified live** — see below.

## Method

`scripts/audit-a11y-render.ts` (added this session) drives Playwright/Chromium to each route, waits for network-idle, runs axe-core with the `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa` tag set, and screenshots the page. Raw results: `audit/evidence/a11y-render-results.json`. Screenshots: `audit/evidence/screenshots/`.

Routes swept (all public, no authentication required — confirmed via the Next.js build output, which marks them `○` static): `/`, `/ks2`, `/ks2/curriculum`, `/ks2/sats`, `/ks2/eleven-plus`, `/ks2/school`, `/subjects`, `/syllabus`, `/revision`, `/algebra`, `/privacy`, `/terms`, `/contact`.

## Findings (real, reproduced — see `audit/evidence/a11y-render-results.json` for exact node counts and CSS selectors)

**28 total axe violations across the 26 route/viewport combinations swept, as originally found** (violation counts were consistent between the two viewports for every route this session — no viewport-specific issue was found). By rule, most-to-least severe:

| axe rule | impact | Routes affected | Node count (desktop) | Defect ID | Status |
|---|---|---|---|---|---|
| `button-name` | critical | `/` (1), `/algebra` (9) | 10 | DEF-015 | **FIXED** (see below) |
| `color-contrast` | serious | `/` (6), `/subjects` (13), `/syllabus` (8), `/revision` (8), `/algebra` (4), `/privacy` (1), `/terms` (1), `/contact` (1) | 42 | DEF-016 | Not fixed |
| `nested-interactive` | serious | `/revision` (6) | 6 | DEF-014 | Not fixed |
| `target-size` | serious | `/algebra` (8) | 8 | DEF-017 | Not fixed |
| `link-in-text-block` | serious | `/privacy` (4), `/terms` (3) | 7 | DEF-018 | Not fixed |

Full detail, reproduction steps, and recommended fixes for each are in `MATHRIX_DEFECT_REGISTER.csv` (DEF-014 through DEF-018).

**DEF-015 fixed and verified live, same session.** Root cause: 3 icon-only buttons with no accessible name — the send-message button in `components/ChatInterface.tsx` (both its desktop and mobile-layout variants, lines ~1187-1204 and ~1408-1419), the 8 step-dot buttons in `components/SvgDiagramPlayer.tsx` (lines ~212-228), and that same component's replay button (lines ~231-236). Added `aria-label` to each ("Send message"; "Go to step N of M" plus `aria-current` on the active dot; "Replay this step"). Re-ran the identical live axe-core sweep afterward: **zero `button-name` violations remain across all 13 routes and both viewports** (confirmed in `audit/evidence/a11y-render-results.json`, regenerated after the fix). `npx tsc --noEmit` clean; full test suite 738/738 passing, no regressions.

**A second, independent finding on `/revision` (not from axe):** the same nested-`<button>` markup that axe flags as `nested-interactive` also throws a real React hydration-mismatch error in the browser console (`In HTML, <button> cannot be a descendant of <button>... Hydration failed...`). This means every visit to `/revision` forces a client-side re-render of the topic-card subtree, since the browser auto-corrects the invalid nested markup on the client, producing a DOM that doesn't match what the server sent. This is the same defect as DEF-014's axe finding, with a second, independent line of evidence.

**Zero violations found on:** `/ks2`, `/ks2/curriculum`, `/ks2/sats`, `/ks2/eleven-plus`, `/ks2/school`. These routes are clean against the axe rule set run.

## Positive finding carried over from architecture reading, now more precisely stated

The whiteboard's teaching-target cursor (`TeacherPointer.tsx`) is `aria-hidden` and purely visual. A screen-reader user has **no non-visual equivalent** for "what's being taught right now" via the cursor itself — but this session confirmed (by reading `components/WhiteboardTutor.tsx` and `components/whiteboard/tutor/ActiveStepCard.tsx`) that the underlying narration text IS present as real DOM text content (not canvas/image-only), so a screen reader can still read the lesson content; it just can't tell which specific digit/term the cursor is currently pointing at. This remains a gap against the brief's explicit "a non-cursor way to identify the current teaching target" requirement, but it is now confirmed as a real architectural gap (not just an inference) — a screen-reader-driven manual test would still be needed to confirm exactly what VoiceOver/NVDA announces during playback.

## Not covered this session

- **Manual/assistive-technology testing**: no keyboard-only traversal, no VoiceOver/NVDA session, no reduced-motion/zoom/text-resize testing was performed. Axe-core catches a meaningful, real subset of WCAG failures (as demonstrated above) but does not catch everything a manual pass would (e.g. logical focus order, meaningful screen-reader announcement of dynamic whiteboard updates, keyboard operability of the whiteboard's playback controls).
- **Authenticated routes**: this sweep covered only public, unauthenticated pages. `/chat`, `/portal`, `/ks2/topic/[topicId]`, `/teacher/*` (all of which pupils, parents, or teachers actually spend most of their time on) were not run through axe this session. A live authenticated session WAS used elsewhere this session (Phase 6/8/10 — see `MATHRIX_CURSOR_SYNC_REPORT.csv` and `MATHRIX_SECURITY_PRIVACY_REPORT.md`), so this gap is a matter of not having pointed the same axe sweep at those routes yet, not a missing capability.
- **ICO Children's Code / privacy-by-design accessibility interplay** (e.g. cookie-consent UI accessibility) — not assessed.

No overall numeric accessibility score is reported — the sweep found real, specific, fixable violations on 8 of 13 routes checked, and 5 of 13 routes are clean against the rule set run; a single pass/fail score across an incomplete (public-routes-only) sweep would overstate or understate the true picture either way.
