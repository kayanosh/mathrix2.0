/**
 * Risk triage for the KS2 lesson review backlog (DEF-003).
 *
 * WHY THIS EXISTS. The review queue is ~440 cached lessons deep and a human can
 * only look at so many. Ordering by hit_count alone (what the queue did before)
 * puts the most-served lesson first regardless of whether anything is actually
 * wrong with it, so a reviewer spends their attention re-reading content the
 * deterministic maths layer already guarantees. This ranks by where human
 * judgement is the ONLY control, so the scarce resource goes where nothing else
 * is watching.
 *
 * THE CENTRAL MEASUREMENT, and the thing that makes this ranking non-obvious:
 * a stored lesson is not what a pupil receives. app/api/ks2-lesson's serve path
 * re-derives the worked example from a deterministic builder on every read
 * (hardenWorkedExample -> applyMethodBuilderToWorkedExample), which replaces the
 * answer, the prose steps AND the whiteboard whenever the question parses.
 * Measured across the live cache: 20 rows have a stored worked answer that
 * disagrees with the solver, and the serve path repairs all 20 — including
 * rows whose stored steps had dropped every digit before a comma
 * ("47,586 + 28,749" stored as "614"). Scoring the STORED form would therefore
 * rank 20 self-healing rows at the top and bury the content that has no
 * automatic repair at all.
 *
 * So risk here is a function of the SERVED form, and the dominant term is
 * unverifiability: 247 of 442 cached rows (every english/science/arabic/
 * computing/vr/nvr row, plus the maths questions no builder parses) have no
 * deterministic check of any kind. Those carry ~997 historical hits. That is
 * the actual backlog a teacher needs to work through.
 *
 * Stored-vs-solver disagreement is still scored, but as a PROXY rather than a
 * defect: a generation that got its worked answer badly wrong is evidence the
 * same generation's un-repairable prose (intro, sections, keyPoints,
 * commonMistakes) is also unreliable — and none of that prose is checked by
 * anything, at any point.
 */
import {
  deterministicMathsAnswer,
  hardenKS2MathsPracticeAnswers,
  mathsAnswersEquivalent,
} from "@/lib/ks2-maths-accuracy";
import {
  hardenWorkedExample,
  hardenSubjectWorkedExample,
  enrichTeachingFields,
} from "@/app/api/ks2-lesson/route";
import { deepRepairStrings } from "@/lib/validate";
import { normalizeEquationStepsDialect } from "@/lib/ks2-visual-fitness";
import {
  normalizeToTeachingLesson,
  validateKS2TeachingLesson,
} from "@/lib/ks2-lesson-validator";
import { resolveKS2Taxonomy } from "@/lib/ks2-taxonomy";
import {
  BLOCKING_LESSON_ISSUES,
  ENRICH_BACKFILLED_ISSUES,
  TEACHING_SUBJECTS,
} from "@/lib/ks2-lesson-issues";
import type { CachedKS2Lesson } from "@/lib/ks2-lesson-cache";

/** Builder-eligible block types — resolveBuild() picks ONE of these per example. */
const BUILDER_BLOCK_TYPES = new Set([
  "column_method",
  "table",
  "number_line",
  "equation_steps",
  "coordinate_graph",
]);

export interface LessonTriageContext {
  topicId: string;
  /** The topic's display name — the serve path passes this, not the strand. */
  topicName: string;
  subtopics: string[];
  subject: string;
  skill?: string;
  hitCount: number;
}

export interface RiskReason {
  code: string;
  weight: number;
  /** Shown to the human reviewer, so it must say what to go and look at. */
  detail: string;
}

export interface LessonTriage {
  /** 0-100. Higher = a human should look at this sooner. */
  score: number;
  band: "high" | "medium" | "low";
  reasons: RiskReason[];
  /** The serve path rejects this row and regenerates — no pupil sees it. */
  discardedOnServe: boolean;
  /** True when no deterministic check applies to this lesson at all. */
  unverifiable: boolean;
  /** Non-blocking validator codes on the SERVED form. */
  qualityIssues: string[];
  /** The worked example as a pupil actually receives it (post-harden). */
  servedWorkedExample: CachedKS2Lesson["workedExample"] | null;
  /** Set when the stored worked answer disagreed with the solver. */
  storedAnswerWasWrong: { stored: string; correct: string; builderId: string } | null;
}

/**
 * Re-derive a cached row into the form the serve path returns.
 *
 * Mirrors app/api/ks2-lesson's cache-hit branch. Imported rather than
 * reimplemented on purpose — scripts/audit-ks2-cache-health.ts documents why
 * ("a drifted copy makes a health report a confident lie"), and a triage that
 * scores a form production never emits is exactly that kind of lie.
 *
 * KNOWN LIMIT: the vr/nvr branch's skip of enrichTeachingFields is not
 * modelled. Those subjects score as unverifiable either way, so it cannot move
 * their ranking — but it does mean `servedWorkedExample` for a vr/nvr row may
 * carry enriched fields the real serve path leaves absent.
 */
export function servedFormOfCachedLesson(
  stored: CachedKS2Lesson,
  ctx: LessonTriageContext,
): CachedKS2Lesson {
  let lesson = deepRepairStrings(
    JSON.parse(JSON.stringify(stored)),
  ) as CachedKS2Lesson;

  if (ctx.subject === "maths" && lesson.workedExample?.question) {
    try {
      lesson.workedExample = hardenWorkedExample(
        lesson.workedExample as never,
        ctx.topicName,
        ctx.subtopics,
      ) as CachedKS2Lesson["workedExample"];
    } catch {
      /* a builder that cannot parse leaves the example untouched, as on serve */
    }
    // Mirrors app/api/ks2-lesson/route.ts's Object.assign on the cache-hit
    // branch. Omitting it was not a cosmetic drift: guidedPractice /
    // independentPractice / quickCheck / tryThis answers are repaired HERE, so
    // a triage without it saw math_answer_mismatch on practice items the serve
    // path had already fixed, wrongly marked those rows "discarded on serve",
    // clamped them to the bottom of the queue and told the reviewer no pupil
    // was taught them — while they were being served.
    //
    // PARITY CHECK, for whoever changes the serve path next: run this triage
    // over the live cache and count discardedOnServe. It lands at 33 against
    // scripts/audit-ks2-cache-health.ts's 35, and 0 surviving
    // math_answer_mismatch against that script's 1. The gap is the right way
    // round — that script substitutes applyMethodBuilderToWorkedExample for the
    // route's hardenWorkedExample (it says so in its own KNOWN LIMIT note) and
    // so misses the geometry/rounding/word-problem visual repairs, which this
    // does run. A count that drifts materially ABOVE 35 means this replica has
    // fallen behind the route again.
    try {
      Object.assign(lesson, hardenKS2MathsPracticeAnswers(lesson));
    } catch {
      /* ditto */
    }
  } else if (lesson.workedExample) {
    // The non-maths arm of the same cache-hit branch (route.ts). Without it the
    // queue would label a stored english/science example "as served to pupils"
    // while the serve path was rebuilding its visuals — reintroducing DEF-039
    // for every subject except the one it was found in.
    try {
      lesson.workedExample = hardenSubjectWorkedExample(
        lesson.workedExample as never,
        ctx.subject,
        ctx.topicName,
        ctx.skill ?? "",
      ) as CachedKS2Lesson["workedExample"];
    } catch {
      /* as on serve, an unparseable example is left untouched */
    }
  }

  if (Array.isArray(lesson.workedExample?.whiteboard?.blocks)) {
    lesson.workedExample.whiteboard.blocks = normalizeEquationStepsDialect(
      lesson.workedExample.whiteboard.blocks,
    );
  }

  if (TEACHING_SUBJECTS.has(ctx.subject)) {
    try {
      lesson = enrichTeachingFields(
        lesson as never,
        ctx.topicName,
        ctx.subtopics,
        ctx.topicId,
        ctx.subject,
      ) as unknown as CachedKS2Lesson;
    } catch {
      /* an un-enrichable row is scored as-is rather than skipped */
    }
  }

  return lesson;
}

/** Review-risk ceiling for a row the serve path never serves. Keeps it in the
 * queue but below anything a pupil actually receives. */
const DISCARDED_SCORE_CEILING = 20;

function bandOf(score: number): LessonTriage["band"] {
  if (score >= 55) return "high";
  if (score >= 30) return "medium";
  return "low";
}

/**
 * Exposure weighting. Deliberately banded rather than linear: a lesson served
 * 20 times is not 20x more urgent than one served once, but a lesson never
 * served at all genuinely can wait — 164 of 442 rows have zero hits and should
 * not crowd out content children are actually being taught from.
 *
 * The top band has to be able to outweigh the content-quality signals stacked
 * below, and that is a judgement about what a reviewer's hour is worth: an
 * unverifiable lesson taught to thirty children matters more than a tidier one
 * taught to nobody. An earlier 20-point ceiling here inverted that — it ranked
 * the entire vr/nvr set, served 1-3 times each, above every geometry lesson in
 * the cache.
 */
function exposurePoints(hits: number): number {
  if (hits <= 0) return 0;
  if (hits < 5) return 8;
  if (hits < 15) return 18;
  if (hits < 30) return 28;
  return 35;
}

export function triageCachedLesson(
  stored: CachedKS2Lesson,
  ctx: LessonTriageContext,
): LessonTriage {
  const served = servedFormOfCachedLesson(stored, ctx);
  const reasons: RiskReason[] = [];

  // ── 1. Is anything other than a human checking this lesson? ──────────────
  const question = served.workedExample?.question
    ? String(served.workedExample.question)
    : "";
  const solved = question ? deterministicMathsAnswer(question) : null;
  const unverifiable = !solved;

  if (unverifiable) {
    reasons.push({
      code: "no_deterministic_check",
      weight: 40,
      detail:
        ctx.subject === "maths"
          ? "No builder parses this question, so nothing verifies the maths — read the worked example and the answer."
          : `${ctx.subject} has no automatic correctness check at all — every claim here is unverified AI output.`,
    });
  } else {
    reasons.push({
      code: "solver_verified_answer",
      weight: 5,
      detail: `The ${solved.builderId} builder re-derives this answer on every request, so the worked example self-corrects.`,
    });
  }

  // ── 2. Did this generation demonstrably get the maths wrong? ─────────────
  // Scored as a quality proxy, NOT as a live defect — the serve path repairs
  // the worked example. What it does not repair is the surrounding prose.
  let storedAnswerWasWrong: LessonTriage["storedAnswerWasWrong"] = null;
  const storedQuestion = stored.workedExample?.question
    ? String(stored.workedExample.question)
    : "";
  const storedSolved = storedQuestion
    ? deterministicMathsAnswer(storedQuestion)
    : null;
  if (
    storedSolved &&
    !mathsAnswersEquivalent(String(stored.workedExample?.answer ?? ""), storedSolved.answer)
  ) {
    storedAnswerWasWrong = {
      stored: String(stored.workedExample?.answer ?? ""),
      correct: storedSolved.answer,
      builderId: storedSolved.builderId,
    };
    reasons.push({
      code: "generation_proved_unreliable",
      weight: 25,
      detail:
        `This lesson was generated with a wrong worked answer (stored "${storedAnswerWasWrong.stored}", ` +
        `correct "${storedAnswerWasWrong.correct}"). The serve path repairs that, but the intro, key points ` +
        `and common mistakes from the same generation are not repaired by anything — read those closely.`,
    });
  }

  // ── 3. Validator warnings that survive the serve path ────────────────────
  let qualityIssues: string[] = [];
  if (TEACHING_SUBJECTS.has(ctx.subject) || ctx.subject === "vr" || ctx.subject === "nvr") {
    const taxonomy = ctx.topicId
      ? resolveKS2Taxonomy(ctx.topicId, ctx.skill || undefined)
      : null;
    try {
      qualityIssues = validateKS2TeachingLesson(
        normalizeToTeachingLesson(served as unknown as Record<string, unknown>, {
          topic: ctx.topicName,
          skill: ctx.skill || taxonomy?.skill,
          yearGroup: taxonomy?.yearGroup,
          strand: taxonomy?.strand,
          method: taxonomy?.method,
        }) as never,
        { subject: ctx.subject, requireVisual: ctx.subject === "maths" },
      ).issues.map((i) => i.code);
    } catch {
      qualityIssues = [];
    }
  }
  const blockers = qualityIssues.filter((c) => BLOCKING_LESSON_ISSUES.has(c));
  // Discount what enrichTeachingFields backfills, exactly as the cache-health
  // report does. This matters most for vr/nvr, which skip enrich by design: the
  // missing_* codes fire on EVERY one of those rows, so scoring them put the
  // whole vr/nvr set above high-traffic geometry on a signal that distinguishes
  // nothing within it.
  const warnings = qualityIssues.filter(
    (c) => !BLOCKING_LESSON_ISSUES.has(c) && !ENRICH_BACKFILLED_ISSUES.has(c),
  );

  const discardedOnServe = blockers.length > 0;
  if (discardedOnServe) {
    reasons.push({
      code: "discarded_on_serve",
      weight: 0,
      detail:
        `Reviewing this would be wasted effort — the serve path rejects this row ` +
        `(${[...new Set(blockers)].join(", ")}) and regenerates from scratch, so no pupil is ` +
        `taught the content stored here and approving it would change nothing. It is a cost ` +
        `problem instead (a full generation on every request); scripts/audit-ks2-cache-health.ts tracks those.`,
    });
  }
  if (warnings.length > 0) {
    reasons.push({
      code: "quality_warnings",
      weight: Math.min(15, warnings.length * 5),
      detail: `Served with non-blocking quality warnings: ${warnings.join(", ")}.`,
    });
  }

  // ── 4. Provenance ────────────────────────────────────────────────────────
  if (!stored.schemaVersion) {
    reasons.push({
      code: "legacy_schema",
      weight: 10,
      detail:
        "Cached before the teaching-engine schema (no schemaVersion) — an older prompt and model wrote this.",
    });
  }

  // ── 5. Competing visuals. Low weight on purpose: measured across the live
  // cache, 91 rows carry more than one builder-eligible block type and most are
  // perfectly correct (a column_method beside equation_steps is normal). It
  // earns a mention because it is the shape DEF-020 took, not a presumption.
  const blocks = served.workedExample?.whiteboard?.blocks;
  if (Array.isArray(blocks)) {
    const kinds = new Set(
      blocks
        .map((b) => (b as { type?: string })?.type)
        .filter((t): t is string => !!t && BUILDER_BLOCK_TYPES.has(t)),
    );
    if (kinds.size > 1) {
      reasons.push({
        code: "competing_visual_blocks",
        weight: 5,
        detail: `Worked example carries ${kinds.size} competing visual methods (${[...kinds].join(", ")}) — check they teach the same thing.`,
      });
    }
  }

  // ── 6. Exposure ──────────────────────────────────────────────────────────
  const exposure = exposurePoints(ctx.hitCount);
  if (exposure > 0) {
    reasons.push({
      code: "pupil_exposure",
      weight: exposure,
      detail: `Served to pupils ${ctx.hitCount} time${ctx.hitCount === 1 ? "" : "s"}.`,
    });
  } else {
    reasons.push({
      code: "never_served",
      weight: 0,
      detail: "Never served — safe to review last.",
    });
  }

  let score = Math.max(
    0,
    Math.min(100, reasons.reduce((sum, r) => sum + r.weight, 0)),
  );

  // Content the serve path discards cannot reach a child, so it carries no
  // review risk no matter how unverifiable or well-trafficked it looks. Clamped
  // rather than zeroed: it still belongs in the queue (a reviewer may want to
  // see it), just never ahead of content pupils are actually being taught.
  // Without this, six of the top ten were rows nobody is ever served.
  if (discardedOnServe) {
    score = Math.min(score, DISCARDED_SCORE_CEILING);
  }

  return {
    score,
    band: bandOf(score),
    discardedOnServe,
    reasons: reasons.sort((a, b) => b.weight - a.weight),
    unverifiable,
    qualityIssues,
    servedWorkedExample: served.workedExample ?? null,
    storedAnswerWasWrong,
  };
}
