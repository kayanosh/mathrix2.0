import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

interface ProgressRow {
  skill_key: string;
  section: string | null;
  subject: string | null;
  year: string | null;
  attempts: number;
  correct: number;
  last_seen: string;
}

/**
 * GET /api/progress
 * Returns the signed-in user's per-skill progress. This is what powers the
 * personalised progress chart (viewable by parents through the student login).
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from("skill_progress")
      .select("skill_key, section, subject, year, attempts, correct, last_seen")
      .eq("user_id", user.id);

    if (error) {
      console.error("Progress GET error:", error);
      return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }

    const rows = (data || []) as ProgressRow[];
    return NextResponse.json({ progress: rows });
  } catch (error) {
    console.error("Progress API error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/**
 * POST /api/progress
 * Records a single skill attempt for the signed-in user.
 * Body: { skillKey, kind: "attempt" | "correct" | "incorrect", section?, subject?, year? }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body.skillKey !== "string" || !body.skillKey.trim()) {
      return NextResponse.json({ error: "Missing skillKey" }, { status: 400 });
    }

    const kind: string = body.kind === "correct" || body.kind === "incorrect" ? body.kind : "attempt";
    const correctDelta = kind === "correct" ? 1 : 0;

    const { error } = await supabaseAdmin.rpc("record_skill_attempt", {
      p_user_id: user.id,
      p_skill_key: body.skillKey,
      p_correct_delta: correctDelta,
      p_section: body.section ?? null,
      p_subject: body.subject ?? null,
      p_year: body.year ?? null,
    });

    if (error) {
      console.error("Progress POST error:", error);
      return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Progress API error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
