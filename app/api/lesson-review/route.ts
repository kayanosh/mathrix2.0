import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isAuthErr } from "@/lib/centre";
import {
  listKS2LessonCacheForReview,
  setKS2LessonReviewStatus,
} from "@/lib/ks2-lesson-cache";

/**
 * GET /api/lesson-review?status=unreviewed|approved|rejected (default unreviewed)
 * Admin-only. Lists cached KS2 lessons for the DEF-003 review workflow —
 * see MATHRIX_REMEDIATION_PLAN.md for why this exists (the shared lesson
 * cache has no enforced approval gate; this is the tooling to build one).
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthErr(auth)) return auth.error;

  const statusParam = req.nextUrl.searchParams.get("status") || "unreviewed";
  if (!["unreviewed", "approved", "rejected"].includes(statusParam)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  const status = statusParam as "unreviewed" | "approved" | "rejected";

  const rows = await listKS2LessonCacheForReview(status, 50);

  // Shape a lightweight review payload — the worked example is the highest
  // pupil-facing risk (this is exactly where DEF-008 was found), so surface
  // it in full; omit whiteboard block internals, which are large and not
  // what a human reviewer needs to judge correctness.
  const items = rows.map((row) => ({
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
    workedExample: row.lesson.workedExample
      ? {
          question: row.lesson.workedExample.question,
          steps: row.lesson.workedExample.steps,
          answer: row.lesson.workedExample.answer,
        }
      : null,
    keyPoints: row.lesson.keyPoints ?? [],
    tryThis: row.lesson.tryThis ?? null,
    lessonId: row.lesson.lessonId ?? null,
    contentVersion: row.lesson.contentVersion ?? null,
    modelVersion: row.lesson.modelVersion ?? null,
    promptVersion: row.lesson.promptVersion ?? null,
  }));

  return NextResponse.json({ items, status });
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
