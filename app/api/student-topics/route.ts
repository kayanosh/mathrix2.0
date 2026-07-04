import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireTutor, isAuthErr, studentInCentre } from "@/lib/centre";

/**
 * GET /api/student-topics?studentId=...
 * Returns the study log (which topics the student studied and at what level).
 */
export async function GET(req: NextRequest) {
  const auth = await requireTutor();
  if (isAuthErr(auth)) return auth.error;
  const { centreId } = auth;

  const studentId = req.nextUrl.searchParams.get("studentId");
  if (!studentId) return NextResponse.json({ error: "studentId required" }, { status: 400 });
  if (!(await studentInCentre(studentId, centreId))) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const { data, error } = await supabaseAdmin
    .from("student_topics")
    .select(
      "id, tutor_id, stage_id, subject_id, topic_id, topic_name, exam_board, level, status, notes, studied_at",
    )
    .eq("student_id", studentId)
    .eq("centre_id", centreId)
    .order("studied_at", { ascending: false });

  if (error) {
    console.error("student-topics GET error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  // Attach tutor names for display.
  const tutorIds = Array.from(new Set((data || []).map((r) => r.tutor_id).filter(Boolean))) as string[];
  const { data: tutors } = tutorIds.length
    ? await supabaseAdmin.from("profiles").select("id, full_name, email").in("id", tutorIds)
    : { data: [] as { id: string; full_name: string | null; email: string | null }[] };
  const tutorById = new Map((tutors || []).map((t) => [t.id, t.full_name || t.email || "Tutor"]));

  const shaped = (data || []).map((r) => ({
    ...r,
    tutorName: r.tutor_id ? tutorById.get(r.tutor_id) || "Tutor" : null,
  }));

  return NextResponse.json({ topics: shaped });
}

/**
 * POST /api/student-topics
 * Actions:
 *   { action: "log", studentId, stageId, subjectId, topicId, topicName, examBoard?, level?, status?, notes? }
 *   { action: "delete", id }
 */
export async function POST(req: NextRequest) {
  const auth = await requireTutor();
  if (isAuthErr(auth)) return auth.error;
  const { centreId, user } = auth;

  const body = await req.json().catch(() => ({}));
  const action: string = body.action || "log";

  if (action === "delete") {
    const id: string = body.id;
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    await supabaseAdmin.from("student_topics").delete().eq("id", id).eq("centre_id", centreId);
    return NextResponse.json({ ok: true });
  }

  if (action === "log") {
    const studentId: string = body.studentId;
    if (!studentId) return NextResponse.json({ error: "studentId required" }, { status: 400 });
    if (!(await studentInCentre(studentId, centreId))) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }
    if (!body.topicId || !body.topicName || !body.stageId || !body.subjectId) {
      return NextResponse.json({ error: "Missing topic details" }, { status: 400 });
    }
    const status = ["taught", "practised", "mastered"].includes(body.status) ? body.status : "taught";

    const { data, error } = await supabaseAdmin
      .from("student_topics")
      .insert({
        centre_id: centreId,
        tutor_id: user.id,
        student_id: studentId,
        stage_id: body.stageId,
        subject_id: body.subjectId,
        topic_id: body.topicId,
        topic_name: body.topicName,
        exam_board: body.examBoard || null,
        level: body.level || null,
        status,
        notes: (body.notes || "").toString().slice(0, 2000) || null,
      })
      .select("id, stage_id, subject_id, topic_id, topic_name, exam_board, level, status, notes, studied_at")
      .single();

    if (error) {
      console.error("student-topics log error:", error);
      return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
    return NextResponse.json({ topic: data });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
