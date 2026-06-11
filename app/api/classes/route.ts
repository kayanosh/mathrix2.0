import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

/** Verify the caller and that they are a teacher/admin. */
async function requireTeacher() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "teacher" && profile.role !== "admin")) {
    return { error: NextResponse.json({ error: "Forbidden — teacher access only" }, { status: 403 }) };
  }
  return { user };
}

function makeJoinCode(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

/**
 * GET /api/classes
 * Returns the teacher's classes, each with members and a progress summary
 * (topics attempted + topics mastered) so teachers see who has mastered what.
 */
export async function GET() {
  const auth = await requireTeacher();
  if (auth.error) return auth.error;
  const { user } = auth;

  const { data: classes, error: classErr } = await supabaseAdmin
    .from("classes")
    .select("id, name, join_code, school, created_at")
    .eq("teacher_id", user.id)
    .order("created_at", { ascending: true });

  if (classErr) {
    console.error("classes GET error:", classErr);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  const classIds = (classes || []).map((c) => c.id);
  const { data: members } = classIds.length
    ? await supabaseAdmin.from("class_members").select("class_id, student_id").in("class_id", classIds)
    : { data: [] as { class_id: string; student_id: string }[] };

  const studentIds = Array.from(new Set((members || []).map((m) => m.student_id)));

  const { data: profiles } = studentIds.length
    ? await supabaseAdmin.from("profiles").select("id, full_name, email, year_group").in("id", studentIds)
    : { data: [] as { id: string; full_name: string | null; email: string | null; year_group: string | null }[] };

  const { data: progress } = studentIds.length
    ? await supabaseAdmin.from("skill_progress").select("user_id, attempts, mastered_at").in("user_id", studentIds)
    : { data: [] as { user_id: string; attempts: number; mastered_at: string | null }[] };

  // Aggregate progress per student.
  const stats = new Map<string, { attempted: number; mastered: number }>();
  for (const row of progress || []) {
    const s = stats.get(row.user_id) || { attempted: 0, mastered: 0 };
    if (row.attempts > 0) s.attempted += 1;
    if (row.mastered_at) s.mastered += 1;
    stats.set(row.user_id, s);
  }

  const profileById = new Map((profiles || []).map((p) => [p.id, p]));

  const shaped = (classes || []).map((c) => {
    const classMembers = (members || [])
      .filter((m) => m.class_id === c.id)
      .map((m) => {
        const p = profileById.get(m.student_id);
        const s = stats.get(m.student_id) || { attempted: 0, mastered: 0 };
        return {
          id: m.student_id,
          name: p?.full_name || p?.email || "Unknown",
          email: p?.email || "",
          yearGroup: p?.year_group || "",
          attempted: s.attempted,
          mastered: s.mastered,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
    return { ...c, members: classMembers };
  });

  return NextResponse.json({ classes: shaped });
}

/**
 * POST /api/classes
 * Actions: { action: "create", name, school }
 *          { action: "addMember", classId, email }
 *          { action: "removeMember", classId, studentId }
 */
export async function POST(req: NextRequest) {
  const auth = await requireTeacher();
  if (auth.error) return auth.error;
  const { user } = auth;

  const body = await req.json().catch(() => ({}));
  const action: string = body.action || "create";

  if (action === "create") {
    const name = (body.name || "").trim();
    if (!name) return NextResponse.json({ error: "Class name required" }, { status: 400 });

    // Retry a couple of times in case of a join_code collision.
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data, error } = await supabaseAdmin
        .from("classes")
        .insert({ teacher_id: user.id, name, school: body.school || null, join_code: makeJoinCode() })
        .select("id, name, join_code, school, created_at")
        .single();
      if (!error && data) return NextResponse.json({ class: { ...data, members: [] } });
      if (error && !error.message.includes("duplicate")) {
        console.error("create class error:", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
      }
    }
    return NextResponse.json({ error: "Could not generate a unique code" }, { status: 500 });
  }

  // Membership actions require ownership of the target class.
  const classId: string = body.classId;
  if (!classId) return NextResponse.json({ error: "classId required" }, { status: 400 });
  const { data: cls } = await supabaseAdmin
    .from("classes")
    .select("id, teacher_id")
    .eq("id", classId)
    .single();
  if (!cls || cls.teacher_id !== user.id) {
    return NextResponse.json({ error: "Class not found" }, { status: 404 });
  }

  if (action === "addMember") {
    const email = (body.email || "").trim().toLowerCase();
    if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });
    const { data: student } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .single();
    if (!student) return NextResponse.json({ error: "No student with that email" }, { status: 404 });

    const { error } = await supabaseAdmin
      .from("class_members")
      .upsert({ class_id: classId, student_id: student.id }, { onConflict: "class_id,student_id" });
    if (error) {
      console.error("addMember error:", error);
      return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  if (action === "removeMember") {
    const studentId: string = body.studentId;
    if (!studentId) return NextResponse.json({ error: "studentId required" }, { status: 400 });
    const { error } = await supabaseAdmin
      .from("class_members")
      .delete()
      .eq("class_id", classId)
      .eq("student_id", studentId);
    if (error) {
      console.error("removeMember error:", error);
      return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
