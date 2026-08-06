# Mathrix Remediation Plan — Prioritised

Ordered by severity first, then by effort/blast-radius ratio within a severity tier. Effort estimates are from the defect register. Status markers added after two remediation passes this session — see `MATHRIX_DEFECT_REGISTER.csv`'s `status` column for full verification detail on each. **DEF-014 through DEF-019 were added in a later pass this session (running the remaining audit phases); all six have since been fixed and verified live across two follow-up passes — see the "P1/P2 — found in the remaining-phases pass" section below.**

## Do immediately (independent of this audit)

1. **[ STILL OPEN ] Rotate the live Stripe secret key** that was pasted into a chat session — as of this writing it has not been rotated. Not a code defect; a standing security action item for the user, repeated here because it's still true.

## P0 — blocks any "Ready" verdict

2. **[ DONE ] DEF-008 — fix comma-thousands parsing.** Fixed in `lib/methods/normalize-math-text.ts`. Verified: full test suite passes, live cache sweep confirmed 4/4 previously-wrong worked examples now correct with no purge, fresh generation independently confirmed correct.
21. **[ DONE ] DEF-020 — Year 6 "Position & Direction" worked examples didn't solve the stated question, in 4 of 6 sampled cache rows.** Root cause isolated and fixed: `lib/methods/apply-builder.ts`'s `resolveBuild()` walked whiteboard blocks in array order and returned on the first recognised block type; when the LLM emitted a stray `number_line` block alongside a correct `coordinate_graph` block for the same worked example, the number_line block won purely by appearing first, producing an unrelated "compare two numbers" answer for a "read the coordinates" question. Fixed by checking for a `coordinate_graph` block across the whole array first, before the per-block-type loop. Also fixed a related cosmetic bug: point/question labels wrapped in LaTeX delimiters (`$P$`) weren't matched, falling back to an array-index letter. The initial live 422 reported when this was first found turned out to be an artefact of the reproduction script omitting a required `topic` field (the real client always sends it) — not a real bug. Verified against the real captured bad fixture (now a permanent regression test) and by live-regenerating all 4 remaining bad cache rows, all now correct in the live cache — self-healed the same way DEF-008 self-healed, no purge/migration needed.

## P1 — blocks "Ready", high pupil impact

3. **[ DONE ] DEF-013 — Volume-of-cuboids (Y6, Guided) generation failure.** Root cause was more specific than originally logged: `parseRectMeasure()` never matched natural "N cm long, N cm wide and N cm high" phrasing at all. Fixed by extending that parser and unwrapping `\text{}` LaTeX in `normalizeMathText`; also widened the existing single quality-retry to two as defense-in-depth. Verified 8/8 fresh generations succeed (was ~4/5 failing intermittently before).
4. **[ DONE ] DEF-010 — public routes survive a Supabase outage.** `proxy.ts`'s Supabase client/session call now runs in try/catch, continuing logged-out on failure. Verified: 500→200 with Supabase entirely unconfigured.
5. **[ DONE, differently than planned ] DEF-002 — narration/cursor sync.** Spiked word-level Whisper timestamps first (per-defect-register instruction) and found them unreliable for comma-formatted numbers (`62,403` transcribes as two words). Implemented sentence/segment-level timestamps instead via a new `/api/tts-timing` endpoint, cached in `tts_cache.segments` (migration applied). Also switched the elapsed-time source to real `audio.currentTime`. Verified live: cold-miss transcribes+caches, warm-hit reads instantly.
6. **[ PARTIALLY FIXED — review workflow now built and working, existing backlog still unreviewed ] DEF-003 — lesson versioning/review-status fields.** `lessonId`, `contentVersion`, `curriculumObjectiveId`, `modelVersion`, `promptVersion`, `reviewStatus`, `teacherReviewer`, `sourceReferences` added to `CachedKS2Lesson`/`KS2TeachingLesson` in an earlier pass. **This pass**: built the actual review workflow — `requireAdmin()` helper (`lib/centre.ts`), `listKS2LessonCacheForReview()`/`setKS2LessonReviewStatus()` (`lib/ks2-lesson-cache.ts`), admin-only `/api/lesson-review` (GET queue, POST approve/reject), and an admin UI at `/admin/lesson-review`. The serving path (`app/api/ks2-lesson/route.ts`) now treats `reviewStatus:"rejected"` as a cache miss and regenerates fresh content instead of re-serving it — verified live end-to-end with a real admin account (GET the real 50-item unreviewed queue, approve, reject, then confirmed a fresh `/api/ks2-lesson` request for the rejected key returned `cached:false`, not the rejected content). No DB migration was needed (`reviewStatus` already lived in the JSON blob). **What's still open**: the existing ~437 cached lessons remain `unreviewed`, and unreviewed lessons ARE STILL SERVED (only `rejected` blocks serving) — deliberately not bulk-approved, since that would claim a review that never happened. DEF-003's original risk is unchanged for the existing backlog; what's new is a real, working mechanism for a human to work through it and for rejection to actually take effect. See DEF-020 for a serious correctness issue found live while testing this, in an unrelated topic (Y6 Position & Direction), not fixed.

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

## P1/P2 — found in the remaining-phases pass — all fixed

These six defects were found by actually running Phases 2, 5/6, 8, 9, 10, 11, 12 this session (see `MATHRIX_EXECUTIVE_AUDIT.md`'s "Remaining-phases findings" section for the full narrative, and `MATHRIX_DEFECT_REGISTER.csv` for reproduction steps). DEF-015 and DEF-019 were fixed in the first follow-up pass; DEF-014, 016, 017, 018 in a second. All six are now fixed and verified live.

15. **[ DONE ] DEF-015 — critical-impact `button-name` accessibility failure.** Root cause: 3 icon-only buttons with no accessible name — the send-message button in `components/ChatInterface.tsx` (both layout variants) and the step-dot/replay buttons in `components/SvgDiagramPlayer.tsx`. Fixed by adding `aria-label` to each. Verified: re-ran the same live axe-core sweep — zero `button-name` violations remain across all 13 routes/both viewports (was 10 nodes on 2 routes).
16. **[ DONE ] DEF-019 — child-safety defense-in-depth gap.** Root cause: `lib/input-safety.ts`'s harmful-content regex only matched "how **to** make a bomb"/"build a bomb," missing common phrasings like "how **do I** make a bomb." Fixed by broadening the regex to a paraphrase-tolerant pattern. Verified live end-to-end: re-sent the exact original repro string through a real pupil session — the intended crisis-support safeguarding copy now fires before any LLM call. 8 paraphrasings verified true, 3 ordinary "make/build" queries verified false (no over-blocking). Regression tests added in `__tests__/lib/input-safety.test.ts`.
17. **[ DONE ] DEF-014 — nested `<button>` causing a real React hydration-mismatch bug on `/revision`.** Root cause: `app/revision/page.tsx`'s `TopicCard` nested a real `<button>` (the "View all" control) inside another interactive element (the topic-toggle control) — invalid HTML, also flagged by axe as `nested-interactive`. An interim fix (converting the outer `<button>` to a `div[role="button"]`) resolved the HTML-validity/hydration bug but axe correctly still flagged the ARIA-nesting anti-pattern; the final fix restructured the two into true siblings. Verified: live functional smoke test confirms expand/collapse and "View all" still work correctly; regenerated evidence shows 0 console/page errors on `/revision` (was 1) and 0 `nested-interactive` violations (was 6).
18. **[ DONE ] DEF-016 — `color-contrast` violations across 8 of 13 routes swept (serious impact, 42 nodes total).** Root cause: a small number of shared muted-text colour tokens (`text-gray-400`, `text-indigo-400`) with 2.5–3.1:1 contrast on light backgrounds (needs 4.5:1), confirmed exactly as predicted — one shared `ModeToggle` pattern in `ChatInterface.tsx`, `TierSelector.tsx`, `Footer.tsx`, and page-specific captions on subjects/syllabus/revision. Darkened to `text-gray-600`/`text-indigo-600` (verified against real extracted contrast ratios, not guessed). The `/algebra` dark-theme instances needed the opposite fix (lightened to `text-gray-400`). Verified: zero `color-contrast` violations remain (was 42 nodes).
19. **[ DONE ] DEF-017 — `target-size` violations on `/algebra` (serious, 8 nodes).** Root cause: the 8 step-dot buttons in `SvgDiagramPlayer.tsx` were the visible 7×7px dot itself, with no separate hit area. Restructured to a 24×24px flex-centered button containing the original dot as an inner element. Verified: zero `target-size` violations remain.
20. **[ DONE ] DEF-018 — `link-in-text-block` violations on `/privacy` and `/terms` (serious, 7 nodes total).** Fixed by adding an `underline` class to the 7 flagged in-text `mailto:`/`ico.org.uk` links. Verified: zero `link-in-text-block` violations remain.

Combined verification for all six: re-ran the full live axe-core sweep after each pass — **0 total violations across all 13 routes/both viewports, 0 console/page errors** (was 28 violations / 4 errors originally). `npx tsc --noEmit` clean throughout; test suite at 738/738 passing, no regressions from any of this work.

## DEF-021 — the "missing_visual" intermittent failure: root-caused and FIXED (not an LLM reliability problem at all)

This was first investigated (and mis-diagnosed) earlier in the session, then instrumented and fixed. **Both earlier hypotheses turned out to be wrong, and the record is corrected here rather than quietly overwritten.**

**What the earlier pass guessed (both WRONG):**
- Guessed the model was intermittently omitting the whiteboard, i.e. an LLM-flakiness problem to be mitigated with retry nudging. It was not.
- Guessed a possible response **truncation** mechanism (`max_completion_tokens` cutting the JSON off before the whiteboard field), and that an attempted retry-message fix might have made things *worse* (20% → 75% failure). Both parts wrong: the 20% figure was a small-sample artefact (n=5), the true baseline was always ~75%, and the retry message neither helped nor hurt materially.

**What actually happens** (measured with `KS2_DEBUG_VISUAL=1` instrumentation added this pass):
- `finish_reason` was **`stop` on every single call** — truncation definitively ruled out. Responses ran ~1550–1730 completion tokens against a 2600 cap, and `JSON.parse` succeeded every time.
- The model **always emitted a `coordinate_graph` block** — on failures as well as successes.
- **Every** failure was the same silent parser drop: `parseWorkedExampleWhiteboard` requires `xRange`/`yRange` on a `coordinate_graph` and discarded the entire block when they were absent. For "read the coordinates"-style questions the model supplies correct points but omits the axis ranges on roughly 3 of 4 generations. All blocks dropped → `missing_visual` → 422 → pupil sees "the lesson couldn't load".

So a **correct, usable diagram was being thrown away over two derivable metadata fields.** The 422 response looked identical whether the model produced nothing or the parser discarded everything, which is exactly why two prior passes mis-attributed it to model flakiness.

**Fix:** derive the axis ranges from the block's own points/segments when the model omits them, instead of dropping the block — matching the convention `coordinateGraph()` in `lib/methods/ks2-topic-builders.ts` already uses (pad by 1, always include the origin so all four quadrants read correctly). Model-supplied ranges are never overridden; a partially-specified pair has only the missing axis filled in; and a graph with no geometry at all is still dropped rather than given an invented window.

**Verified:** live success rate on the affected skill went **2/8 → 8/8**, and all 8 were hand-checked for honesty, not just for passing validation — every stated answer matched its plotted points, every point fell inside the derived window, and the origin was visible in all 8. Regression test in `__tests__/lib/coordinate-graph-ranges.test.ts` (7 cases), *proven load-bearing* by temporarily reinstating the old drop behaviour and confirming 5 of the 7 fail. `tsc --noEmit` clean, `npm run build` compiles, suite at 757/757.

**Scope — now measured (was blocked on quota).** After credits were restored the sweep completed. Results:
- **Translation 3/3, Reflection 3/3** — and the instrumentation shows the DEF-021 derivation firing **6 times** across that sweep with **0** remaining `coordinate_graph` drops. So those skills were being saved by the same fix; the gap covered the whole coordinates family, not just one skill.
- **Volume of cuboids was a genuinely different bug**, as suspected — `4/5` pass, failing with `visual_mismatch` (not `missing_visual`), with the `cuboid_array` block present and surviving fitness. That turned out to be a **residual of DEF-013** and is now filed and fixed as **DEF-022**, with a P0 wrong-answer bug (**DEF-023**) found while verifying it. See both below.

**Kept deliberately:** the `KS2_DEBUG_VISUAL` instrumentation (off by default, gated on an env var, logs block types/shapes and token counts only — never pupil content). This class of failure is invisible from the API response alone; two passes mis-diagnosed it without this, and one pass with it found the cause immediately.

**Incidental observation, not fixed:** OpenAI quota exhaustion surfaces to the pupil as an opaque HTTP 500 "Failed to generate lesson". Worth a friendlier, distinguishable message, but out of scope here and not a correctness bug.

## DEF-022 — residual of DEF-013: the other word order (FIXED)

`volume`'s visual contract needs **both** `cuboid_array` and `equation_steps`, and the equation block comes from the deterministic builder via `parseRectMeasure()`. DEF-013 added a matcher for **number-then-word** ("4cm long, 3cm wide and 2cm high") but the mirror **word-then-number** order was never matched — `"length 4 units, width 3 units and height 2 units"` and `"A cuboid has length 5 cm, width 2 cm and height 3 cm"` both returned `null`, so no equation block was built and the lesson failed its own contract ~1 in 5 generations. Isolated offline at zero API cost by probing the parser directly with the failing vs known-good phrasings. Fixed by matching both word orders (plus the "a length of 6 cm" variant), keeping the all-three-dimensions requirement so a 2-D rectangle isn't misread as a cuboid. **Verified 4/5 → 8/8 → 5/5 live.**

DEF-013's original fix was correct — it just covered one of the two word orders the model actually uses.

## DEF-023 — P0 wrong answer, found while verifying DEF-022 (FIXED)

A live generation produced *"A cuboid is 4 cubes long, 3 cubes wide and 2 cubes high. What is its volume?"* and **taught the answer 4**. Correct is 4×3×2 = **24**.

`parseRectMeasure`'s total-cube-count branch runs *before* the dimension branch and matched the first `"<n> cubes"` it saw, reading "4 cubes long" as *a cuboid made of 4 unit cubes* → `cuboidDimensionsForUnitCubes(4)` → 2×2×1 → volume 4. The `cuboid_array` diagram was then drawn as 2×2×1, so **the diagram agreed with the wrong answer** and looked internally consistent while contradicting the question. Same class as DEF-008. A real cached row had the same defect (`"...4 unit cubes long, 3 unit cubes wide and 2 unit cubes high"` → answer 4).

Fixed with a negative lookahead so the total-count branch defers when the number is acting as a dimension, plus widening the dimension matcher's unit group to accept `cubes`/`units` and an optional qualifier — needed because otherwise the deferred case parses as nothing at all ("4 **unit cubes** long" has two words between the number and "long").

**Verified:** offline probe correct for both dimension *and* genuine total-count phrasings; **5/5 live generations arithmetically correct** against each question's own stated dimensions; and the bad cached row **self-healed on serve** (`cached:true`, answer 4 → 24, correct steps) with no purge or migration, exactly as DEF-008 did.

> **Process note worth keeping.** DEF-023 was only caught because verification checked the maths *against the question*. The wrong answer had a matching diagram, so every internal-consistency check and the HTTP status all passed. A status-code-only verification would have shipped it. Any future "did the fix work?" pass on lesson content should assert against the question's own numbers, not self-consistency.

## ⚠️ The systemic pattern behind DEF-008/020/023/024/025 — read this before touching a builder

Five separate P0/P1 defects this audit share one root cause, and each was found by accident until this pass built tooling for it:

| Defect | The builder's mistake |
|---|---|
| DEF-008 | Couldn't parse comma-thousands, so solved `403 − 27` for `62,403 − 27,568` |
| DEF-020 | Picked the wrong block when two were present, answering a different question |
| DEF-023 | Read "4 cubes long" as "made of 4 cubes", inventing a 2×2×1 |
| DEF-024 | Returned a hardcoded canonical shape (constant `51 cm²`) for every question |
| DEF-025 | Returned a generic list of ten multiples whatever was asked |

**The shared mechanism: the harden path unconditionally trusts any builder that pattern-matches, and overwrites the stored answer with the builder's.** A builder matching on *topic* keywords ("area", "multiple", "cuboid") will happily replace a correct, specific answer with generic topic output. In every one of these five, **the LLM was right and the deterministic "safety net" made it wrong** — the inversion first noted in DEF-008's headline finding.

Two properties make this class hard to see, and both are worth designing against:
1. **The diagram is regenerated from the same wrong numbers**, so it *agrees* with the wrong answer. Every internal-consistency check passes. Only comparing against the question's own numbers catches it.
2. **HTTP 200.** Nothing errors. A status-code-only verification passes happily — this is how DEF-023 nearly shipped.

**Practical rules this suggests:**
- A builder should **decline** rather than guess. Declining leaves the model's answer, which these five cases show is often correct; guessing actively corrupts.
- Never claim reasoning questions ("explain why…", "what does the 1 in 14 mean?") — a bare number cannot replace prose. Guards for this were added to the multiples builder (DEF-025) and are the prerequisite for DEF-026.
- Any "did the fix work?" check on lesson content must assert **against the question's own numbers**, never self-consistency or status codes.

**Tooling now exists:** `scripts/audit-cached-answers.ts` classifies every answer-bearing item in the live cache as AGREE / DISAGREE / UNVERIFIABLE with no API cost. It found DEF-024 and DEF-025 directly. Run it after any builder change.

## DEF-026 — half the maths answers had no verification, and it was hiding live DEF-008 damage (FIXED)

`deterministicMathsAnswer()` only read a builder's top-level `answer`, but the column/division builders put their result on `block.answer`. So it returned null for **all** column arithmetic — and since `hardenKS2MathsPracticeAnswers()` routes through it, **practice items were never verified or repaired**.

**That is why DEF-008 was still partly live.** Its parser fix healed *worked examples*; practice items kept their wrong answers for the whole audit:

| Question | Was served | Correct |
|---|---|---|
| `47,586 + 28,749` | **614** (11×) | 76,335 |
| `62,403 − 27,856` | **376** (7×) | 34,547 |
| `4,786 + 2,659` | **788** (9×) | 7,445 |
| `3,696 ÷ 4` | **174** (10×) | 924 |
| `2,347 × 6` | **2082** (13×) | 14,082 |

Fixed in the documented order: **guard first, then enable, then diff, then serve.**

The guard (`reasonToDeclineNumericAnswer`) was built from *every* risky real cached question, not guessed — sub-step framing, place-value asks, reasoning, derived-fact, fill-in-the-blank, verification, estimation, rule/sequence, multi-part, and decimals/fractions routed to integer-only builders.

**Measured outcome:** UNVERIFIABLE 50.9% → 43.4%; **200** newly verified-and-agreeing; **6** genuinely wrong answers caught. 38 items deliberately lost verification — I inspected all 38 and in **every** case the stored answer was right and the builder wrong, so each decline *prevented* a corruption. Live-served all 5 affected lessons: **39 bare-arithmetic answers checked against each question's own numbers, 0 wrong.**

> **Two lessons worth keeping.**
> **(1) "Fixed and self-healed" was verified on one code path and assumed for the others.** DEF-008 was closed on worked-example evidence while practice items stayed broken for months. When a fix claims to heal cached content, check *every* path that serves it.
> **(2) The test suite did not catch the fraction-guard bug.** `normalizeMathText` rewrites `\frac{8}{12}` → `8/12`, so a guard testing only the LaTeX macro let `long_division` answer "what is 8/12 simplified?" with `0 r 8`. 791 unit tests passed; the **before/after cache diff** caught it. Diff real content, don't just run the suite.

## DEF-027 — unit conversion: a silently wrong conversion behind a coverage gap (FIXED)

Follow-up to DEF-026. Having closed the mechanical gap, I characterised the remaining 962 unverifiable items to test my own claim that they were "genuinely unverifiable". Result: **841 (87%) had no builder at all, 121 were my deliberate guard declines, and zero were mechanical gaps** — so the claim held. But probing the largest buckets showed builders matching only their *canonical* phrasing, the DEF-013/DEF-022 pattern once more.

`parseUnitConversion` matched abbreviations only, alternation ordered shortest-first:

| Question | Parsed as | Answered | Correct |
|---|---|---|---|
| `Convert 5 m to millimetres` | m → **m** | **5 m** | 5000 mm |
| `Convert 250 cm to millimetres` | cm → **m** | **2.5 m** | 2500 mm |

`millimetres` prefix-matches `m`. A **confidently wrong conversion**, not a miss.

Fixing it surfaced a third problem: **7 cached items were serving answers to a completely different question** — `"Convert 2.7 m to centimetres"` answered `"7/10 = 0.7 = 70%"` (7× each). Decimal→fraction→percentage answers attached to unit-conversion questions.

**Measured:** UNVERIFIABLE 43.4% → 40.7%; 51 newly verified-and-agreeing; 7 wrong answers caught; **zero items lost verification**. Live-served both lessons: 13 answers checked against each question's own numbers, 0 wrong.

> **My own fix introduced a pupil-facing bug, and the suite missed it again.** Enabling more matches surfaced raw IEEE754 arithmetic: `4.6 × 100 = 459.99999999999994`, and `0.01 / 0.001 = 9.999999999999998` in the teaching text — so a Year 5 pupil would be told to "divide by 9.999999999999998". All 791 tests passed. I caught it reading the diff output. That is now **twice** in two passes that inspecting real content caught what the test suite could not.

## DEF-009 — the offline validator now tests real questions (FIXED), and immediately found 6 new issues

The harness tested most maths skills against **their own skill name** as the "question", so it structurally could not catch a wrong-answer defect — which is how DEF-008 survived a run reporting *"377/378 passed"*. Every wrong-answer defect in this audit came from a real generated question; none could have come from a skill name.

**Fix:** `scripts/generate-sample-questions.ts` mines the live cache for one real question per skill (preferring ones the builders can actually solve) into a **committed** fixture, so the validator stays offline and deterministic for CI. Fake questions: **146 → 1**.

Also fixed an inconsistency the switch exposed: the harness set practice answers from `built.answer`, which is `undefined` for column arithmetic, storing the literal `"see method"`. Harmless while nothing could solve those questions — but once DEF-026 taught the audit to solve them, it correctly flagged the harness's own fixture. Now uses `deterministicMathsAnswer()`, the same source production uses.

> **A misstep worth recording.** Switching to real questions initially produced **46 failures that were not lesson defects.** A builder legitimately yields 1–2 steps for *"Write 0.37 as a fraction"* while the validator requires 3+; real lessons make up the difference with LLM-authored teaching content that this synthetic fixture has none of. The old skill-name questions matched no builder at all, so a generic 6-step fallback had been silently satisfying the rule. Shipped as-is, this would have been a crying-wolf harness that trains people to ignore it. Fixed by scaffolding the builder's steps to the structural minimum — keeping the builder's own content, placed last so the answer never precedes the reasoning.

**Net:** 377 passed / 1 failed with 146 vacuous questions → **371 passed / 7 failed with 1 vacuous**. The 7 are substantive (`visual_mismatch` ×4, `unfit_visual`, `cuboid_array_invalid`, `sentence_too_long`) on real question shapes — **6 newly surfaced findings** of the same class as DEF-022, previously invisible. Not yet fixed; they are the natural next work:

| Skill | Code |
|---|---|
| y5m-shape / Measure angles in degrees | `visual_mismatch` |
| y5m-volume / Estimate volume | `cuboid_array_invalid` |
| y6m-place-value / Negative numbers | `unfit_visual` |
| y6m-algebra / Find pairs of values | `visual_mismatch` |
| y6m-decimals / Decimals and fractions | `visual_mismatch` |
| y6m-shape / Measure and classify angles | `visual_mismatch` |

## What this plan does not yet cover

Curriculum-coverage verification is a bounded 2-of-28-KS2-maths-topics spot-check (see `MATHRIX_CURRICULUM_COVERAGE.csv`), not a full traceability matrix — the other 26 maths topics, all non-maths KS2 subjects, and all GCSE board specs remain unchecked. The accessibility sweep covered only public routes; authenticated routes (`/chat`, `/portal`, lesson pages) have not been run through axe, and no manual/screen-reader testing has been done. The IDOR/authorisation sweep covered 2 student accounts and 7 API routes; cross-centre IDOR (needs a second tutor/centre account), file-upload abuse, and XSS/injection sweeps remain untested. Treat this as a living document.
