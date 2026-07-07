import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireTutor, isAuthErr, studentInCentre, tutorInCentre } from "@/lib/centre";
import { isValidEmail } from "@/lib/email";
import { sendProgressReportToParent } from "@/lib/portal-student-notify";

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

const STUDENT_SELECT =
  "id, full_name, year_group, notes, archived, created_at, assigned_tutor_id, parent_email, parent_name";

async function resolveTutorNames(
  tutorIds: string[],
): Promise<Map<string, string>> {
  if (tutorIds.length === 0) return new Map();
  const { data: tutors } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, email")
    .in("id", tutorIds);
  return new Map((tutors || []).map((t) => [t.id, t.full_name || t.email || "Tutor"]));
}

async function validateTutorAssignment(
  tutorId: string | null | undefined,
  centreId: string,
): Promise<string | null> {
  if (tutorId === undefined) return null;
  if (tutorId === null || tutorId === "") return null;
  if (!(await tutorInCentre(tutorId, centreId))) {
    return "Tutor must belong to your centre";
  }
  return null;
}

function validateParentEmail(email: string | null | undefined): string | null {
  if (email === undefined || email === null || email === "") return null;
  const trimmed = email.trim();
  if (trimmed && !isValidEmail(trimmed)) return "Invalid parent email address";
  return null;
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
    .select(STUDENT_SELECT)
    .eq("centre_id", centreId)
    .order("full_name", { ascending: true });

  if (error) {
    console.error("students GET error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  const ids = (students || []).map((s) => s.id);
  const tutorIds = Array.from(
    new Set((students || []).map((s) => s.assigned_tutor_id).filter(Boolean)),
  ) as string[];
  const tutorById = await resolveTutorNames(tutorIds);

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
    assigned_tutor_name: s.assigned_tutor_id ? tutorById.get(s.assigned_tutor_id) || null : null,
    levels: levelsByStudent.get(s.id) || [],
    summary: summaryByStudent.get(s.id) || { taught: 0, mastered: 0, lastSession: null },
  }));

  return NextResponse.json({ students: shaped });
}

/**
 * POST /api/students
 * Actions:
 *   { action: "create", fullName, yearGroup?, assignedTutorId?, parentEmail?, parentName? }
 *   { action: "update", studentId, fullName?, yearGroup?, notes?, archived?, assignedTutorId?, parentEmail?, parentName? }
 *   { action: "setLevel", studentId, subjectId, currentStage, examBoard? }
 *   { action: "notifyParent", studentId }
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

    const tutorErr = await validateTutorAssignment(body.assignedTutorId, centreId);
    if (tutorErr) return NextResponse.json({ error: tutorErr }, { status: 400 });
    const emailErr = validateParentEmail(body.parentEmail);
    if (emailErr) return NextResponse.json({ error: emailErr }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from("students")
      .insert({
        centre_id: centreId,
        full_name: fullName,
        year_group: (body.yearGroup || "").trim() || null,
        assigned_tutor_id: body.assignedTutorId || null,
        parent_email: (body.parentEmail || "").trim().toLowerCase() || null,
        parent_name: (body.parentName || "").trim() || null,
      })
      .select(STUDENT_SELECT)
      .single();
    if (error) {
      console.error("create student error:", error);
      return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
    return NextResponse.json({
      student: {
        ...data,
        assigned_tutor_name: null,
        levels: [],
        summary: { taught: 0, mastered: 0, lastSession: null },
      },
    });
  }

  // All remaining actions operate on a specific student in this centre.
  const studentId: string = body.studentId;
  if (!studentId) return NextResponse.json({ error: "studentId required" }, { status: 400 });
  if (!(await studentInCentre(studentId, centreId))) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  if (action === "update") {
    const tutorErr = await validateTutorAssignment(body.assignedTutorId, centreId);
    if (tutorErr) return NextResponse.json({ error: tutorErr }, { status: 400 });
    const emailErr = validateParentEmail(body.parentEmail);
    if (emailErr) return NextResponse.json({ error: emailErr }, { status: 400 });

    const patch: Record<string, unknown> = {};
    if (typeof body.fullName === "string" && body.fullName.trim()) patch.full_name = body.fullName.trim();
    if (typeof body.yearGroup === "string") patch.year_group = body.yearGroup.trim() || null;
    if (typeof body.notes === "string") patch.notes = body.notes;
    if (typeof body.archived === "boolean") patch.archived = body.archived;
    if (body.assignedTutorId !== undefined) patch.assigned_tutor_id = body.assignedTutorId || null;
    if (typeof body.parentEmail === "string") {
      patch.parent_email = body.parentEmail.trim().toLowerCase() || null;
    }
    if (typeof body.parentName === "string") patch.parent_name = body.parentName.trim() || null;
    if (Object.keys(patch).length === 0) return NextResponse.json({ ok: true });
    await supabaseAdmin.from("students").update(patch).eq("id", studentId);
    return NextResponse.json({ ok: true });
  }

  if (action === "notifyParent") {
    const result = await sendProgressReportToParent(studentId, centreId);
    if (!result.ok) {
      const status = result.error.includes("not configured") ? 503 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }
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
