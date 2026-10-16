import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isAuthErr } from "@/lib/centre";
import {
  listKS2LessonCacheForReview,
  setKS2LessonReviewStatus,
} from "@/lib/ks2-lesson-cache";
import { triageCachedLesson } from "@/lib/ks2-lesson-triage";
import { getKS2TopicById, listAllKS2Topics } from "@/lib/ks2";

/** How many ranked lessons a reviewer gets per page. */
const PAGE_SIZE = 50;

/**
 * Topic id -> subject ID ("maths"), which is NOT the ks2_lesson_cache.subject
 * column: that stores a display name ("Mathematics", and on one legacy row
 * "Maths"). The triage keys its maths-only harden and its validator call off
 * the id, so feeding it the display name silently skipped both and scored a
 * form the serve path never produces. getKS2TopicById() cannot supply this —
 * its result has no subjectId — so the summary list is the only source.
 */
const SUBJECT_BY_TOPIC = new Map(
  listAllKS2Topics().map((t) => [t.id, String(t.subjectId)]),
);

/**
 * GET /api/lesson-review?status=unreviewed|approved|rejected (default unreviewed)
 * Admin-only. Lists cached KS2 lessons for the DEF-003 review workflow —
 * see MATHRIX_REMEDIATION_PLAN.md for why this exists (the shared lesson
 * cache has no enforced approval gate; this is the tooling to build one).
 *
 * Ranked by lib/ks2-lesson-triage, not by raw hit_count. With ~440 rows in the
 * queue the ordering IS the product: hit_count alone put the most-served lesson
 * first whether or not anything was wrong with it, so a reviewer spent their
 * attention on maths the deterministic builders already re-derive on every
 * request. Risk-first puts the content nothing can check — all english,
 * science, arabic, computing, vr and nvr, plus any maths question no builder
 * parses — in front of a human, which is the only control those have.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthErr(auth)) return auth.error;

  const statusParam = req.nextUrl.searchParams.get("status") || "unreviewed";
  if (!["unreviewed", "approved", "rejected"].includes(statusParam)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  const status = statusParam as "unreviewed" | "approved" | "rejected";

  // Fetch the whole queue, then rank, then page. Slicing before the triage ran
  // would page by hit_count and silently discard the highest-risk rows.
  const rows = await listKS2LessonCacheForReview(status, 5000);

  const triaged = rows.map((row) => {
    const ctx = getKS2TopicById(row.topicId);
    return {
      row,
      triage: triageCachedLesson(row.lesson, {
        topicId: row.topicId,
        topicName: row.topicName ?? ctx?.topic.name ?? "",
        subtopics: ctx?.topic.subtopics ?? [],
        subject: SUBJECT_BY_TOPIC.get(row.topicId) ?? "unknown",
        skill: row.lesson.skill,
        hitCount: row.hitCount,
      }),
    };
  });

  triaged.sort(
    (a, b) => b.triage.score - a.triage.score || b.row.hitCount - a.row.hitCount,
  );

  // Shape a lightweight review payload. The worked example shown is the SERVED
  // form, not the stored JSON: the serve path re-derives it from a
  // deterministic builder on every read, so 19 rows in the live cache are
  // stored with a wrong answer and wrong steps that a pupil never sees
  // ("47,586 + 28,749" is stored as "614" and served as "76335"). Previewing
  // the stored form made a reviewer judge — and reject — content that is not
  // what is being taught. `storedAnswerWasWrong` carries that discrepancy
  // explicitly instead, because it is a real signal about the generation even
  // though it is not what reaches the class.
  const items = triaged.slice(0, PAGE_SIZE).map(({ row, triage }) => ({
    cacheKey: row.cacheKey,
    topicId: row.topicId,
    topicName: row.topicName,
    subject: row.subject,
    target: row.target,
    tier: row.tier,
    kind: row.kind,
    hitCount: row.hitCount,
    createdAt: row.createdAt,
    skill: row.lesson.skill ?? null,
    intro: row.lesson.intro,
    workedExample: triage.servedWorkedExample
      ? {
          question: triage.servedWorkedExample.question,
          steps: triage.servedWorkedExample.steps,
          answer: triage.servedWorkedExample.answer,
        }
      : null,
    keyPoints: row.lesson.keyPoints ?? [],
    tryThis: row.lesson.tryThis ?? null,
    lessonId: row.lesson.lessonId ?? null,
    contentVersion: row.lesson.contentVersion ?? null,
    modelVersion: row.lesson.modelVersion ?? null,
    promptVersion: row.lesson.promptVersion ?? null,
    // Triage surface — why this row is where it is in the queue.
    riskScore: triage.score,
    riskBand: triage.band,
    riskReasons: triage.reasons.map((r) => ({ code: r.code, detail: r.detail })),
    unverifiable: triage.unverifiable,
    qualityIssues: triage.qualityIssues,
    storedAnswerWasWrong: triage.storedAnswerWasWrong,
  }));

  return NextResponse.json({
    items,
    status,
    total: triaged.length,
    shown: items.length,
    highRisk: triaged.filter((t) => t.triage.band === "high").length,
    unverifiable: triaged.filter((t) => t.triage.unverifiable).length,
  });
}

/**
 * POST /api/lesson-review  { cacheKey, action: "approve" | "reject" }
 * Admin-only.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthErr(auth)) return auth.error;

  const body = await req.json().catch(() => null);
  const cacheKey = body?.cacheKey;
  const action = body?.action;

  if (!cacheKey || typeof cacheKey !== "string") {
    return NextResponse.json({ error: "cacheKey required" }, { status: 400 });
  }
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "action must be 'approve' or 'reject'" }, { status: 400 });
  }

  const result = await setKS2LessonReviewStatus(
    cacheKey,
    action === "approve" ? "approved" : "rejected",
    auth.user.id,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
