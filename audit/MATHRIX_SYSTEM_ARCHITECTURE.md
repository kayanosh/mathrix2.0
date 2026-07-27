# Mathrix System Architecture — Phase 1 Static Audit

**Method:** Read-only source inspection of the cloned repository (`~/mathrix2.0`, commit history intact, 180 commits). No code was executed — Node.js/npm are not installed on the audit machine (confirmed: `node`, `npm`, `npx`, `brew` all return "command not found"). Every claim below cites a file and, where useful, a line number or quoted line. Anything not verifiable by reading code is marked **Not tested** or **Blocked**, per instructions — not guessed.

---

## 1. Stack overview

| Layer | Technology | Evidence |
|---|---|---|
| Framework | Next.js 16.1.6, React 19.2.3, App Router | `package.json:29,34` |
| Styling | Tailwind CSS v4 | `package.json:43,56` |
| DB / Auth | Supabase (Postgres + `@supabase/ssr`) | `package.json:21-22`, `supabase-schema.sql` |
| AI providers | OpenAI (`openai` SDK) **and** Anthropic (`@anthropic-ai/sdk`) — both present | `package.json:18,30` |
| Math rendering | KaTeX / react-katex | `package.json:25,36` |
| Graphing | `mafs` | `package.json:27` |
| Symbolic CAS | `nerdamer` (client-side JS CAS) **and** a separate Python `sympy` service | `package.json:28`, `api/sympy_solver.py`, `requirements.txt` |
| Whiteboard drawing | `roughjs` (hand-drawn-style SVG/canvas) | `package.json:37` |
| PDF/image | `pdf-parse`, `pdfjs-dist` | `package.json:31-32` |
| Payments | Stripe | `package.json:38` |
| Validation | Zod v4 | `package.json:40` |
| Tests | Jest 30 + ts-jest, `@testing-library/react` | `package.json:44-58`, `jest.config.ts` |
| Animation | Framer Motion | `package.json:24` |

**No browser-automation/e2e tool is installed** (no Playwright, Cypress, Puppeteer in `package.json`). Phase 5/6/8 visual and interaction testing as specified in the audit brief cannot be executed until one is added. **Not tested.**

**No error-tracking/APM SDK is installed** — grepped `package.json` and the full `app`/`lib` tree for Sentry, PostHog, Datadog, LogRocket, Vercel Analytics: zero matches. Observability is limited to `console.log`/`console.warn`/`console.error` calls and one DB table (`ai_usage_log`, `supabase-schema.sql:50`). See §9.

---

## 2. Route map (`app/`)

```
/                       marketing / entry
/ks2, /ks2/curriculum, /ks2/sats, /ks2/eleven-plus, /ks2/school, /ks2/topic/[topicId]
/algebra, /revision, /subjects, /syllabus, /exam-papers
/chat                   general AI tutor chat
/portal, /portal/curriculum, /portal/settings, /portal/students, /portal/students/[id], /portal/teach, /portal/teach/[topicId]
/teacher, /teacher/assign, /teacher/classes, /teacher/teach, /teacher/teach/[topicId]
/account, /auth, /auth/callback, /privacy, /terms, /contact, /progress
```

API routes of note: `ks2-lesson`, `ks2-quiz`, `tutor-lesson`, `tutor-worksheet`, `generate-practice`, `chat`, `content-upload`, `exam-papers`, `progress`, `lesson-progress`, `student-topics`, `teacher-questions`, `classes`, `assignments`, `centre`, `stripe/*`, `tts`, `usage`.

**Two parallel product surfaces exist**: a **KS2 pathway** (`ks2-lesson` route, `lib/ks2*.ts`, own Zod schema, own cache table) and a **KS3–A-Level "tutor" pathway** (`tutor-lesson` route, `lib/curriculum/*`, `tutor_lesson_cache` table). They are structurally different systems, not one lesson engine with a stage parameter — see §6.

---

## 3. Curriculum scope actually implemented (Phase 2 pre-check)

Before spending any effort fetching DfE/exam-board specifications, I checked what the codebase claims to cover, per the advisor's guidance that this determines whether Phase 2 is a coverage matrix or a gap statement.

- `lib/curriculum/stages.ts:3-13` models Year 3 → A-Level (KS2 through KS5), consistent with the audit brief's KS2/KS3/GCSE scope.
- `lib/curriculum/stages.ts:21-25`: GCSE maths boards defined as **AQA, Edexcel, OCR, WJEC only**. No Eduqas or CCEA maths board exists anywhere in the codebase (confirmed by repo-wide search for `Eduqas`/`CCEA` in `lib/curriculum/**`, `lib/syllabus.ts` — zero maths matches; Eduqas appears only for English, `lib/curriculum/stages.ts:23`).
- GCSE maths topic data (`lib/syllabus.ts`, 421 lines) is a **hand-authored strand/subtopic name list per board** (AQA 8300, Edexcel 1MA1, OCR J560 — spec codes present as a comment, `lib/syllabus.ts:4`), with a `higherOnly` string array per topic. It is **not** keyed to official DfE/exam-board objective codes (e.g. AQA's "N1", "A2" assessment-objective references) — there is no `official_objective_code` field anywhere in `lib/curriculum/types.ts`. This means the traceability table the audit brief requests (curriculum_source → official_objective_code → Mathrix_lesson_id) **cannot be built from this data as-is**: the seed data has topic names, not objective codes, so any code-to-lesson mapping would have to be inferred by string-matching topic names, which is not verifiable ground truth.
- **KS3 (Year 7–9) maths** exists as `lib/curriculum/maths/year-7.ts`, `year-8.ts`, `year-9.ts` — content not yet read in this pass (**Not tested**, pending).
- **A-Level maths** exists (`lib/curriculum/maths/a-level.ts`) but is out of scope for this audit brief (KS2/KS3/GCSE only) — noted for completeness, not evaluated.
- Actual lesson **content** (worked examples, teaching steps) for GCSE/KS3 maths is generated live by an LLM at request time from the topic/subtopic name (see §6) — the `lib/syllabus.ts` file is a topic taxonomy, not lesson content.

**Conclusion for Phase 2 scope:** fetching AQA/Edexcel/OCR/Eduqas/WJEC/CCEA official specifications now would establish whether the *topic list* is accurate, but cannot yet produce the requested traceability table, because Mathrix has no `official_objective_code` field to map into. **This is itself a Phase 7 architecture finding, not just a Phase 2 gap** — recommended fix in the remediation plan.

---

## 4. Lesson content: generated live, not authored/stored (decisive finding)

This determines the shape of Phases 3, 4, and 7, so it was resolved before anything else.

- `app/api/ks2-lesson/route.ts:68-73` selects models via env vars with hardcoded fallback defaults:
  ```
  const LESSON_MODEL = process.env.OPENAI_KS2_LESSON_MODEL || "gpt-5.6-terra";
  const FAST_MODEL = process.env.OPENAI_KS2_FAST_MODEL || "gpt-5.6-luna";
  const LESSON_FALLBACK_MODEL = process.env.OPENAI_KS2_LESSON_FALLBACK_MODEL || "gpt-5.5";
  const FAST_FALLBACK_MODEL = process.env.OPENAI_KS2_FAST_FALLBACK_MODEL || "gpt-5.4-mini";
  ```
  **Verified via web search** (no API access needed for this check): GPT-5.6 Sol/Terra/Luna is a real OpenAI model family released 2026-07-09, GPT-5.5 released 2026-04-23, and GPT-5.4 mini released 2026-03-17 — all four fallback literals are real, current OpenAI model IDs, not placeholders. This is not a defect. Sources: [OpenAI — GPT-5.6](https://openai.com/index/gpt-5-6/), [Dataconomy](https://dataconomy.com/2026/07/10/openai-launches-gpt-5-6-with-sol-terra-and-luna-models/).
- Lessons are cached (`lib/ks2-lesson-cache.ts`, `ks2_lesson_cache`/`topic_lesson_cache`/`tutor_lesson_cache` tables in `supabase-schema.sql:196,221,671`) **after** generation, keyed by a content hash — this is a cache, not an authored, versioned lesson bank. There is no `lessonId`/`contentVersion` field anywhere in the lesson schema (§6), so a cache-key collision or cache-bust regenerates a *different* lesson for the same topic with no version history.
- `scripts/warm-ks2-lessons.ts` and `scripts/regenerate-ks2-lessons.ts` exist specifically to pre-warm/rebuild this cache — confirming the team already treats "lessons drift on regeneration" as a live concern. **I did not run either script** (both mutate the cache/DB; running them would have altered the audit baseline, per explicit instruction not to change anything during a read-only audit).
- Consequence for Phase 3 ("enumerate every lesson"): **this is not possible as literally specified.** There is no finite, enumerable lesson bank to iterate — a lesson is a function of `(topic, year, tier, board?) → LLM call → cache`. The audit brief's own Phase 7 language ("the live model should not freely invent core curriculum lessons each time a pupil opens a page") describes exactly the architecture found here. Phase 3 must instead audit: (a) the generator prompt and schema, (b) the deterministic validators that run against its output (§5), and (c) a sample of cached outputs — which requires either live API credentials or read access to the Supabase cache tables. **Blocked** on credentials (see "What I need" below).

---

## 5. Independent mathematical validation — stronger than a typical AI-tutor codebase (positive finding)

The audit brief asks for "independent answer calculation rather than asking the same language model to review its own output." This already exists, partially:

- `api/sympy_solver.py` (471 lines) is a **separate Python serverless function** (SymPy — a real, independent CAS, not the generating LLM) exposing `solve | simplify | expand | factorise | diff | integrate | evaluate | simultaneous`. Called from `lib/sympy-solver.ts:210` via `fetch('${baseUrl}/api/sympy_solver')`.
- `lib/ground-truth.ts` and `__tests__/lib/ground-truth.test.ts` reference `SympyResult` — indicating the generated answer is checked against an independently computed symbolic result, not just re-asked to the same model.
- `lib/cas-solver.ts` provides a separate JS-side CAS path (`nerdamer`), and `__tests__/lib/cas-post-verify.test.ts` exists.
- `lib/ks2-maths-accuracy.ts` + `__tests__/lib/ks2-maths-accuracy.test.ts` implement `deterministicMathsAnswer` / `mathsAnswersEquivalent` — a deterministic (non-LLM) answer checker used by `scripts/audit-ks2-maths-runtime.ts:16-17`.
- This is a genuine architectural strength: **evidence** for "what works well," not just a claim. **Caveat:** I have not verified the *coverage* of this validation (does every generated question type route through it, or only some?) — that requires either running the generator live or reading every call site exhaustively, which I have not yet done. **Partially tested; coverage — Not tested.**

---

## 6. Cursor/narration architecture — the audit brief's central concern, checked directly against code

The brief specifies a "preferred architecture" (stable element IDs, `focusTargetId` per narration segment, live bounds resolution, TTS word timestamps) and asks to flag fixed x/y coordinates as a major risk. Findings, both good and bad:

**What is good — live bounds resolution exists:**
`components/WhiteboardTutor.tsx:204-276` resolves the cursor target at render time via `focusEl.querySelectorAll('[id$="-from"], [id$="-to"]')` and `[data-teacher-target="primary|detail|visual"]`, then calls `target.getBoundingClientRect()` on every placement. It recalculates on `scroll`, `resize`, and via a `ResizeObserver` (`WhiteboardTutor.tsx:287-293`). This is **not** a fixed-pixel-coordinate design — the cursor is not frozen at authored x/y values.

**What is missing — no authored `focusTargetId`:**
There is no field anywhere in the lesson schema (`lib/ks2-lesson-zod.ts`, `types/whiteboard.ts`) that stores which element a given narration sentence should point at. Instead, `lib/teacher-pointer.ts:45-98` (`teacherTargetIndex`) **infers** the target at runtime by fuzzily matching words in the narration string against `target.dataset.teacherLabel || aria-label || textContent || id`, scored by word-distance from the currently-spoken word (`teacher-pointer.ts:66-92`), with `nearestDistance <= 4` as the match threshold. If no word matches, it falls back to a linear-progress guess (`teacher-pointer.ts:96-97`). This is a heuristic, not a schema-guaranteed mapping — a narration sentence that doesn't happen to repeat the visible label's words (e.g. "let's carry the one" pointing at a digit labelled `"7"`) will not match and falls through to the progress-based guess, which can point at the wrong element. **This is the architectural risk the brief asked me to flag, just not in the "fixed x/y" form it anticipated — it's "inferred by word-matching" instead of authored.**

**What is missing — no real TTS word timing (decisive, code-quoted):**
`components/whiteboard/tutor/SpeechHighlighter.tsx:70-80`:
```js
/** Estimate which word index should be active given elapsed ms and total duration. */
export function wordIndexAtProgress(text, elapsedMs, durationMs) {
  const words = text.split(/\s+/).filter(Boolean);
  const t = Math.min(1, Math.max(0, elapsedMs / durationMs));
  return Math.min(words.length - 1, Math.floor(t * words.length));
}
```
This divides the *total audio clip duration* evenly across word count and polls it on an 80ms `setInterval` (`lib/hooks/useWhiteboardSpeech.ts:41-58`). The TTS provider is OpenAI `tts-1` (`app/api/tts/route.ts:52-58`) via the standard `audio.speech.create` REST call, which **returns only an MP3 byte stream — no word- or phoneme-level timestamps**. So "speech timing data," as asked about explicitly in the Phase 1 checklist, **does not exist as real data** — it is a linear estimate. Longer words, numbers read digit-by-digit, mid-sentence pauses, and punctuation will all desynchronise the estimate from the actual audio, and the error compounds over a sentence. Ironically, the **offline browser-speech fallback path** (`useWhiteboardSpeech.ts:135-147`, used only when cloud TTS fails) gets *real* per-word timing from the Web Speech API's native `onboundary` event — better data than the primary path. This is worth noting as-is; it does not fix the primary-path problem.

**Net assessment:** the renderer-side half of the "preferred architecture" (live bounds, resize handling) is implemented reasonably well. The data-model half (authored `focusTargetId` per segment, real TTS timestamps) is absent, and both are called out explicitly as required in the audit brief. Quantitative sync accuracy (median/95th-percentile drift, missed-focus-event rate) is **Blocked** — it requires instrumenting a running app with real audio playback, which needs Node.js/npm installed and API credentials (none available in this session).

---

## 7. Lesson data model vs. the brief's proposed canonical schema

Actual schema in production (`lib/ks2-lesson-zod.ts:43-71`, `KS2StrictLessonSchema`): `keyStage, yearGroup, strand, topic, skill, method, learningObjective, priorKnowledge/prerequisiteKnowledge, coreExplanation/conceptExplanation, visualModel, workedExample(s), commonMistake(s), guidedPractice, independentPractice, quickCheck, recap`.

Compared field-by-field against the brief's proposed canonical model, the following are **absent from the schema entirely** (not just unpopulated — there is no field to populate):

| Missing field | Why it matters |
|---|---|
| `lessonId` | No stable identity for a lesson independent of its cache hash — can't reference "this lesson" for teacher review or regression testing. |
| `contentVersion` | No way to detect that a regeneration changed content a teacher already approved. |
| `curriculumObjectiveId` | No link from a lesson to an official DfE/exam-board objective code (confirms §3). |
| `focusTargetIds` | Confirms §6 — targeting is inferred, not authored. |
| `markScheme` | No mark allocation modelled; can't check "mark-scheme steps match allocated marks" (Phase 3 requirement) against anything. |
| `sourceReferences` | No traceability to the curriculum document a lesson was written against. |
| `modelVersion` / `promptVersion` | The model constants exist in the route file (§4) but are not stamped onto the produced lesson object — you cannot look at a cached lesson and know which model/prompt version produced it. |
| `teacherReviewer` / `reviewStatus` | No human-approval gate is representable in the data at all — by construction, every lesson a pupil sees is unreviewed LLM output unless validated purely by the automated checks in §5/§8. |

Also notable: `KS2RichWorkedExampleSchema.visualBlocks` (`lib/ks2-lesson-zod.ts:24`) is typed `z.array(z.record(z.string(), z.unknown())).optional()` — an **untyped escape hatch**. Whatever shape the LLM emits for whiteboard visuals passes Zod validation unconditionally at that field, so schema validation does not guarantee whiteboard-renderable content for that path.

**This directly answers Phase 7's core question**: no, Mathrix does not yet have a single canonical lesson model with the fields needed to guarantee narration/board/cursor/mark-scheme consistency or a teacher-approval gate. The generation pipeline the brief recommends (curriculum source → spec → generation → schema validation → math validation → pedagogical validation → teacher approval → versioned release → deterministic rendering) does not exist end-to-end; pieces of it exist (schema validation, math validation per §5) but there is no version/approval layer.

---

## 8. Existing automated quality checks (what already runs, statically confirmed)

71 test files exist under `__tests__/` (listed in full in the appendix below). Notable ones directly relevant to the audit brief:
- `ks2-maths-accuracy.test.ts`, `cas-solver.test.ts`, `cas-post-verify.test.ts`, `sympy-solver.test.ts`, `ground-truth.test.ts` — independent math verification, per §5.
- `ks2-lesson-quality.test.ts`, `gcse-lesson-quality.test.ts`, `ks2-explanation.test.ts`, `ks2-required-visuals.test.ts`, `ks2-teaching-engine.test.ts` — automated lesson-quality gates already exist and are a meaningful head start on Phase 3/4.
- `teacher-pointer.test.ts`, `whiteboard-playback.test.ts`, `TeacherPointer.test.ts` — the cursor logic in §6 already has unit tests; I have not yet read their assertions to know what they actually check (**Not tested** — pending, and lower priority than getting the suite runnable).
- No visual/screenshot regression tests exist (no Playwright), so §6/§Phase 5 rendering claims are untested by the current suite regardless of what the unit tests assert.
- `scripts/validate-ks2-lessons.ts` runs offline against deterministic fixtures/taxonomy (no network) — likely runnable once Node.js exists, without needing live credentials.
- `scripts/audit-ks2-maths-runtime.ts` makes live HTTP calls to `${BASE_URL}/api/ks2-lesson` (default `http://localhost:3000`) — **requires a running dev server and live OpenAI credentials**, i.e. fully blocked in this session.
- I did **not** execute any test file (Node.js is not installed — see "What I need," below). The existence and intent of these tests is confirmed by reading source; their current pass/fail state is **Not tested**.

---

## 9. Access control — one confirmed defect, one pattern worth flagging

- `supabase-schema.sql`: RLS is enabled on every one of the 19 tables I found (`grep -c "create table"` = 19, cross-checked against `enable row level security` statements for each). No table was found with RLS disabled. This is a genuine positive finding for child-data protection at the database layer.
- **Confirmed defect** (see `MATHRIX_DEFECT_REGISTER.csv`, DEF-001, P2): `app/api/content-upload/route.ts:30` and `app/api/exam-papers/route.ts:55` gate admin-only access with `profile?.subscription_status !== "admin"`. The `profiles.subscription_status` column has a hard `CHECK` constraint allowing only `'free' | 'pro' | 'cancelled'` (`supabase-schema.sql:8`) — `'admin'` is not a legal value and no migration widens it. This condition is therefore always true for every real row, so these two admin endpoints reject every request unconditionally. **Checked blast radius**: neither route is called from any page or component anywhere in the repo (repo-wide grep for both route paths) — the content-upload route's own docstring points to a separate manual script (`scripts/ingest-content-pdf.ts`), suggesting this is an internal operator utility, not a live pupil/teacher-facing feature, which is why severity is P2 rather than P1. Separately, **no code path anywhere sets `role='admin'`** (only `scripts/create-students.ts:169`, which sets `role: "student"`) — so fixing the column check alone would not yet make the endpoint usable; an admin-provisioning path does not currently exist in code. The codebase does have a working, correctly-checked `role` column pattern elsewhere (`role in ('student','teacher','admin')`, used correctly in `app/api/classes/route.ts:17`, `app/api/assignments/route.ts:27`).
- Multi-tenant "centre" tables (`students`, `student_levels`, `student_topics`, `supabase-schema.sql:605-669`) scope `SELECT` policies to `centre_id = (select centre_id from profiles where id = auth.uid())`, i.e. any authenticated member of a centre can read every student record in that centre. No `INSERT`/`UPDATE`/`DELETE` policies exist for these tables at all — all writes must go through the service-role key server-side. I have **not** verified (requires reading every write path) that each such server route checks the caller actually owns/belongs to the `centre_id`/`student_id` being written before using the service-role key, which would bypass RLS entirely if omitted. **Not tested — flagged for Phase 10 follow-up**, since a missing ownership check in a service-role write path is a classic IDOR and RLS provides no protection once the service-role key is used.

---

## 10. Secrets / repo hygiene (quick check, not a full security review)

- No `.env*` files are tracked in git (`git ls-files | grep '^\.env'` → empty); `.gitignore:33-34` excludes them. Good.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`/`NEXT_PUBLIC_SUPABASE_URL` are the only `NEXT_PUBLIC_*` values referencing credentials — this is Supabase's intended public/anon key design, not a leak.
- `last-dev.log` (committed at repo root) contains a truncated local dev-server startup log — no credentials, but it does disclose a local network IP (`192.168.1.134`) from a developer's machine. Low severity; recommend removing from version control and adding to `.gitignore` as hygiene.
- `.claude/settings.local.json` is tracked and contains historical Claude Code permission grants, including two full past commit messages. One is directly relevant evidence for "what is unreliable" in the AI-generation pipeline — the commit fixes **"LLM doubling LaTeX+text"**, **wrong geometry angle notation**, and **wrong `arrowDirection` on non-both-sides steps** in previously-shipped whiteboard output. This is a first-party admission, in the project's own history, that the generation pipeline has previously produced mathematically/visually incorrect output that reached (or nearly reached) production. Cited in the defect register as supporting evidence for the general reliability finding, not as a currently-open defect (the fix commit exists).
- `git log --all -p -- '.env*'` returns nothing — no historical secret commits found in tracked env files specifically. **This is not a full secret-scan** (I did not run a tool like `gitleaks` or `trufflehog` across full history/all files — Not tested, recommended for Phase 10).

---

## 11. What I could NOT test in this session, and why (explicit, per instructions)

| Area | Status | Blocker |
|---|---|---|
| Running the app, `npm test`, `npm run build`, `tsc --noEmit` | **Blocked** | Node.js/npm/npx are not installed on this machine at all (confirmed via `which`/`-v` on all three, and Homebrew is also absent). Nothing in Phases 3 (runtime sample), 5, 6 (quantitative), 8, 11, 12 can run until this is fixed. |
| Playwright/browser rendering, cross-browser/viewport testing (Phase 5) | **Blocked** | No browser-automation tool installed; would need to be added. |
| Cursor sync quantitative metrics (Phase 6 CSV) | **Blocked** | Needs a running app + audio playback + a browser; architecture-level findings above stand independently. |
| Teaching-quality scoring (Phase 4) | **Blocked** | Needs live lesson generation (API keys) or read access to cached lesson rows in Supabase; I have neither. |
| Full curriculum traceability table (Phase 2) | **Blocked on data model, not just external fetches** | See §3 — Mathrix has no official-objective-code field to map into yet; fetching DfE/exam-board specs now would validate topic *names* only. |
| Accessibility (Phase 9, WCAG) | **Not tested** | Requires a rendered page (axe-core/manual AT testing); no browser access. |
| Full security testing (Phase 10: injection, auth bypass, rate-limit bypass, upload fuzzing) | **Not tested**, beyond static grep in §9–10 | Requires a running instance and, for anything against a live DB, explicit written authorization to test against it (per my operating instructions I will not run destructive or exploit-style tests against a production system without that authorization, and no staging environment was made available). |
| Performance/latency measurement (Phase 11) | **Not tested** | Requires a running instance and load-testing tools, neither present. |
| Golden lesson regression suite (Phase 12) | Not built | No baseline exists yet to regress against; recommended as a deliverable once the schema in §7 gains `lessonId`/`contentVersion`. |

## What I need to do the rest of this audit (answering the "real-time checking" question directly)

To move from static findings to the dynamic phases (4, 5, 6's measurements, 8, 9's rendered checks, 10's live testing, 11, 12), in order of blocking severity:

1. **Node.js + npm** installed on this machine (currently absent entirely, along with Homebrew). This alone unblocks `npm install`, `npm run build`, `npm test`, `npx tsc --noEmit`, and the offline `validate:ks2-lessons` script — all read-only/non-mutating. I'd want your explicit go-ahead before installing anything, since it's new software on your machine.
2. **A `.env.local`** with working `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, and Stripe test keys — ideally pointed at a **staging** Supabase project and test-mode API keys, not production, so live testing (lesson generation, chat, uploads) doesn't touch real pupil data or run up production API cost.
3. **Playwright** (`npm i -D @playwright/test && npx playwright install`) to do any of Phase 5/6/8/9's rendered/visual checks — currently not in the project at all.
4. **A seeded test account per role** (student, teacher, centre_owner/tutor, admin) in that staging project, so Phase 8/9/10 role-based checks are possible without me creating real accounts.
5. Explicit confirmation that `npm run dev` and read-only test/lint commands are OK to run locally — and confirmation that I should **not** run `regenerate:ks2-lessons` or `warm:ks2-lessons` (both mutate the lesson cache/DB and would destroy the audit baseline; `validate:ks2-lessons` and `audit-ks2-maths-runtime` appear read-only against the app but the latter still needs a live server + API keys per §8).
6. For Phase 2's real curriculum crosswalk: confirmation you want me to fetch the live DfE/AQA/Edexcel/OCR specification documents via web search now (I have that capability) even though, per §3, Mathrix's current data model can't yet store the resulting objective codes — i.e., it would produce a "what's correct/missing in the topic list" comparison, not the full traceability table the brief asks for, until the schema changes.

I have not fabricated any score, defect, or pass/fail result for anything in this blocked list.

---

## Appendix: full test file list (71 files, confirmed via `find __tests__`)

`__tests__/lib/*`: ai-cost, algebra-builders, apply-builder, cas-post-verify, cas-solver, classify, column-method-layout, column-reveal, cuboid-volume, curriculum, emphasis-paths, equivalent-fractions, fdp-order, final-422-classes, fraction-conversion-steps, fraction-number-line, gcse-lesson-quality, geometry-visual-repairs, ground-truth, handwriting, input-safety, irregular-area, ks2-coordinate-quality, ks2-explanation, ks2-lesson-quality, ks2-maths-accuracy, ks2-multi-subject, ks2-multiples-quality, ks2-order-operations-quality, ks2-required-visuals, ks2-rounding-quality, ks2-subject-visuals, ks2-teaching-engine, latex-input, lesson-cache, lesson-contract, lesson-progress-key, maths-value, measure-angles-visuals, methods-column-multiplication, methods-fraction-decimal, methods-long-division, mistake-and-symmetry, mixed-number-fraction-ops, narration, normalize-math-text, openai-retry, rectilinear-perimeter, roman-numerals, rounding-place-value, schemas, sequence-and-word-problems, shape-dialect-normalization, skills, subjects, sympy-solver, teacher-pointer, tts-cache, tutor-steps, utils, validate, verification-badge, verification-tools, whiteboard-playback.
`__tests__/components/*`: CoordinateGraphRenderer, CuboidArrayRenderer, ForceDiagramRenderer, InlineMathDelimiters, TeacherPointer, TextRendererLessonSafety, WhiteboardTutor.
