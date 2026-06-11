import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { ks2SkillKey } from "@/lib/ks2";

async function getCaller() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, role: null as string | null };
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  return { user, role: profile?.role ?? "student" };
}

/**
 * GET /api/assignments
 * Teachers: their assignments (optional ?classId=) with completion counts.
 * Students: assignments for the classes they belong to ("assigned to you").
 */
export async function GET(req: NextRequest) {
  const { user, role } = await getCaller();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (role === "teacher" || role === "admin") {
    const classId = req.nextUrl.searchParams.get("classId");
    let q = supabaseAdmin
      .from("assignments")
      .select("id, class_id, topic_id, topic_name, subject, target, tier, due_date, created_at")
      .eq("teacher_id", user.id)
      .order("created_at", { ascending: false });
    if (classId) q = q.eq("class_id", classId);
    const { data: assignments, error } = await q;
    if (error) {
      console.error("assignments GET (teacher) error:", error);
      return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }

    const classIds = Array.from(new Set((assignments || []).map((a) => a.class_id)));
    const { data: members } = classIds.length
      ? await supabaseAdmin.from("class_members").select("class_id, student_id").in("class_id", classIds)
      : { data: [] as { class_id: string; student_id: string }[] };

    const membersByClass = new Map<string, string[]>();
    for (const m of members || []) {
      const list = membersByClass.get(m.class_id) || [];
      list.push(m.student_id);
      membersByClass.set(m.class_id, list);
    }

    const allStudentIds = Array.from(new Set((members || []).map((m) => m.student_id)));
    const masteryKeys = Array.from(new Set((assignments || []).map((a) => ks2SkillKey(a.topic_name, "Mastery quiz"))));
    const { data: progress } = allStudentIds.length && masteryKeys.length
      ? await supabaseAdmin
          .from("skill_progress")
          .select("user_id, skill_key, mastered_at")
          .in("user_id", allStudentIds)
          .in("skill_key", masteryKeys)
      : { data: [] as { user_id: string; skill_key: string; mastered_at: string | null }[] };

    // Set of "studentId|skillKey" that are mastered.
    const masteredSet = new Set(
      (progress || []).filter((p) => p.mastered_at).map((p) => `${p.user_id}|${p.skill_key}`)
    );

    const shaped = (assignments || []).map((a) => {
      const memberIds = membersByClass.get(a.class_id) || [];
      const key = ks2SkillKey(a.topic_name, "Mastery quiz");
      const completed = memberIds.filter((sid) => masteredSet.has(`${sid}|${key}`)).length;
      return { ...a, total: memberIds.length, completed };
    });

    return NextResponse.json({ assignments: shaped });
  }

  // Student view: assignments for their classes.
  const { data: myClasses } = await supabaseAdmin
    .from("class_members")
    .select("class_id")
    .eq("student_id", user.id);
  const classIds = (myClasses || []).map((m) => m.class_id);
  if (classIds.length === 0) return NextResponse.json({ assignments: [] });

  const { data: assignments } = await supabaseAdmin
    .from("assignments")
    .select("id, class_id, topic_id, topic_name, subject, target, tier, due_date")
    .in("class_id", classIds)
    .order("created_at", { ascending: false });

  return NextResponse.json({ assignments: assignments || [] });
}

/**
 * POST /api/assignments  (teacher only)
 * Body: { classId, topicId, topicName, subject?, target?, tier?, dueDate? }
 */
export async function POST(req: NextRequest) {
  const { user, role } = await getCaller();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (role !== "teacher" && role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));

  if (body.action === "delete") {
    if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });
    await supabaseAdmin.from("assignments").delete().eq("id", body.id).eq("teacher_id", user.id);
    return NextResponse.json({ ok: true });
  }

  const { classId, topicId, topicName } = body;
  if (!classId || !topicId || !topicName) {
    return NextResponse.json({ error: "classId, topicId and topicName are required" }, { status: 400 });
  }

  // Verify the teacher owns the class.
  const { data: cls } = await supabaseAdmin
    .from("classes")
    .select("id, teacher_id")
    .eq("id", classId)
    .single();
  if (!cls || cls.teacher_id !== user.id) {
    return NextResponse.json({ error: "Class not found" }, { status: 404 });
  }

  const { data, error } = await supabaseAdmin
    .from("assignments")
    .insert({
      teacher_id: user.id,
      class_id: classId,
      topic_id: topicId,
      topic_name: topicName,
      subject: body.subject || null,
      target: body.target || null,
      tier: body.tier || null,
      due_date: body.dueDate || null,
    })
    .select("id, class_id, topic_id, topic_name, subject, target, tier, due_date, created_at")
    .single();

  if (error) {
    console.error("assignments POST error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  return NextResponse.json({ assignment: { ...data, total: 0, completed: 0 } });
}
