import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireTutor, isAuthErr, studentInCentre } from "@/lib/centre";

interface StudentLevelRow {
  student_id: string;
  subject_id: string;
  current_stage: string | null;
  exam_board: string | null;
}
interface StudentTopicRow {
  student_id: string;
  status: string;
  studied_at: string;
}

/**
 * GET /api/students
 * Lists the centre's students with their per-subject levels and a study
 * summary (topics taught / mastered, last session date).
 */
export async function GET() {
  const auth = await requireTutor();
  if (isAuthErr(auth)) return auth.error;
  const { centreId } = auth;

  const { data: students, error } = await supabaseAdmin
    .from("students")
    .select("id, full_name, year_group, notes, archived, created_at")
    .eq("centre_id", centreId)
    .order("full_name", { ascending: true });

  if (error) {
    console.error("students GET error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  const ids = (students || []).map((s) => s.id);

  const { data: levels } = ids.length
    ? await supabaseAdmin
        .from("student_levels")
        .select("student_id, subject_id, current_stage, exam_board")
        .in("student_id", ids)
    : { data: [] as StudentLevelRow[] };

  const { data: topics } = ids.length
    ? await supabaseAdmin
        .from("student_topics")
        .select("student_id, status, studied_at")
        .in("student_id", ids)
    : { data: [] as StudentTopicRow[] };

  const levelsByStudent = new Map<string, StudentLevelRow[]>();
  for (const l of (levels || []) as StudentLevelRow[]) {
    const arr = levelsByStudent.get(l.student_id) || [];
    arr.push(l);
    levelsByStudent.set(l.student_id, arr);
  }

  const summaryByStudent = new Map<string, { taught: number; mastered: number; lastSession: string | null }>();
  for (const t of (topics || []) as StudentTopicRow[]) {
    const s = summaryByStudent.get(t.student_id) || { taught: 0, mastered: 0, lastSession: null };
    s.taught += 1;
    if (t.status === "mastered") s.mastered += 1;
    if (!s.lastSession || t.studied_at > s.lastSession) s.lastSession = t.studied_at;
    summaryByStudent.set(t.student_id, s);
  }

  const shaped = (students || []).map((s) => ({
    ...s,
    levels: levelsByStudent.get(s.id) || [],
    summary: summaryByStudent.get(s.id) || { taught: 0, mastered: 0, lastSession: null },
  }));

  return NextResponse.json({ students: shaped });
}

/**
 * POST /api/students
 * Actions:
 *   { action: "create", fullName, yearGroup? }
 *   { action: "update", studentId, fullName?, yearGroup?, notes?, archived? }
 *   { action: "setLevel", studentId, subjectId, currentStage, examBoard? }
 *   { action: "delete", studentId }
 */
export async function POST(req: NextRequest) {
  const auth = await requireTutor();
  if (isAuthErr(auth)) return auth.error;
  const { centreId } = auth;

  const body = await req.json().catch(() => ({}));
  const action: string = body.action || "";

  if (action === "create") {
    const fullName = (body.fullName || "").trim();
    if (!fullName) return NextResponse.json({ error: "Student name required" }, { status: 400 });
    const { data, error } = await supabaseAdmin
      .from("students")
      .insert({
        centre_id: centreId,
        full_name: fullName,
        year_group: (body.yearGroup || "").trim() || null,
      })
      .select("id, full_name, year_group, notes, archived, created_at")
      .single();
    if (error) {
      console.error("create student error:", error);
      return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
    return NextResponse.json({ student: { ...data, levels: [], summary: { taught: 0, mastered: 0, lastSession: null } } });
  }

  // All remaining actions operate on a specific student in this centre.
  const studentId: string = body.studentId;
  if (!studentId) return NextResponse.json({ error: "studentId required" }, { status: 400 });
  if (!(await studentInCentre(studentId, centreId))) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  if (action === "update") {
    const patch: Record<string, unknown> = {};
    if (typeof body.fullName === "string" && body.fullName.trim()) patch.full_name = body.fullName.trim();
    if (typeof body.yearGroup === "string") patch.year_group = body.yearGroup.trim() || null;
    if (typeof body.notes === "string") patch.notes = body.notes;
    if (typeof body.archived === "boolean") patch.archived = body.archived;
    if (Object.keys(patch).length === 0) return NextResponse.json({ ok: true });
    await supabaseAdmin.from("students").update(patch).eq("id", studentId);
    return NextResponse.json({ ok: true });
  }

  if (action === "setLevel") {
    const subjectId: string = body.subjectId;
    if (!subjectId) return NextResponse.json({ error: "subjectId required" }, { status: 400 });
    const { error } = await supabaseAdmin.from("student_levels").upsert(
      {
        centre_id: centreId,
        student_id: studentId,
        subject_id: subjectId,
        current_stage: body.currentStage || null,
        exam_board: body.examBoard || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "student_id,subject_id" },
    );
    if (error) {
      console.error("setLevel error:", error);
      return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  if (action === "delete") {
    await supabaseAdmin.from("students").delete().eq("id", studentId).eq("centre_id", centreId);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
