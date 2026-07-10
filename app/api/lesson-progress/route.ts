import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Lesson playback progress — resume position + completed-lesson history.
 *
 * GET  /api/lesson-progress            → { sessions: [...] } (recent, newest first)
 * GET  /api/lesson-progress?key=<hash> → { session } (single, or null)
 * POST /api/lesson-progress            → upsert { contentKey, position, totalSteps, ... }
 *
 * Progress is per authenticated user. Anonymous users get a soft no-op (200 with
 * persisted:false) so the client can call unconditionally without error noise.
 */

const SESSION_COLUMNS =
  "content_key, kind, title, topic, subject, level, tier, total_steps, last_position, completed, completed_at, updated_at";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      // Anonymous — nothing to resume, but not an error.
      const key = req.nextUrl.searchParams.get("key");
      return NextResponse.json(key ? { session: null } : { sessions: [] });
    }

    const key = req.nextUrl.searchParams.get("key");

    if (key) {
      const { data, error } = await supabaseAdmin
        .from("lesson_sessions")
        .select(SESSION_COLUMNS)
        .eq("user_id", user.id)
        .eq("content_key", key)
        .maybeSingle();

      if (error) {
        console.error("[LessonProgress] GET by key error:", error.message);
        return NextResponse.json({ session: null });
      }
      return NextResponse.json({ session: data ?? null });
    }

    const { data, error } = await supabaseAdmin
      .from("lesson_sessions")
      .select(SESSION_COLUMNS)
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[LessonProgress] GET list error:", error.message);
      return NextResponse.json({ sessions: [] });
    }
    return NextResponse.json({ sessions: data ?? [] });
  } catch (error) {
    console.error("[LessonProgress] GET threw:", (error as Error).message);
    return NextResponse.json({ sessions: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: true, persisted: false });
    }

    const body = await req.json().catch(() => null);
    const contentKey = typeof body?.contentKey === "string" ? body.contentKey.trim() : "";
    if (!contentKey) {
      return NextResponse.json({ error: "Missing contentKey" }, { status: 400 });
    }

    const totalSteps = Math.max(0, Number(body.totalSteps) || 0);
    const position = Math.max(0, Number(body.position) || 0);
    const completedFlag = body.completed === true;

    // Preserve a sticky "completed" and never let position regress on the server.
    const { data: existing } = await supabaseAdmin
      .from("lesson_sessions")
      .select("last_position, completed")
      .eq("user_id", user.id)
      .eq("content_key", contentKey)
      .maybeSingle();

    const nextPosition = Math.max(position, (existing?.last_position as number) || 0);
    const nextCompleted = completedFlag || existing?.completed === true;

    const { error } = await supabaseAdmin.from("lesson_sessions").upsert(
      {
        user_id: user.id,
        content_key: contentKey,
        kind: typeof body.kind === "string" ? body.kind : "solve",
        title: body.title ?? null,
        topic: body.topic ?? null,
        subject: body.subject ?? null,
        level: body.level ?? null,
        tier: body.tier ?? null,
        total_steps: totalSteps,
        last_position: nextPosition,
        completed: nextCompleted,
        completed_at: nextCompleted ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,content_key" },
    );

    if (error) {
      console.error("[LessonProgress] POST error:", error.message);
      return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, persisted: true });
  } catch (error) {
    console.error("[LessonProgress] POST threw:", (error as Error).message);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
