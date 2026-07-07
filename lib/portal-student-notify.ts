import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendEmail, isValidEmail } from "@/lib/email";
import {
  buildProgressReportHtml,
  buildSessionUpdateHtml,
  type ProgressReportTopic,
} from "@/lib/portal-progress-report";

interface StudentRow {
  id: string;
  full_name: string;
  year_group: string | null;
  parent_email: string | null;
  parent_name: string | null;
  assigned_tutor_id: string | null;
  notes: string | null;
}

async function loadStudentReportData(studentId: string, centreId: string) {
  const { data: student } = await supabaseAdmin
    .from("students")
    .select("id, full_name, year_group, parent_email, parent_name, assigned_tutor_id, notes")
    .eq("id", studentId)
    .eq("centre_id", centreId)
    .single();

  if (!student) return null;

  const [{ data: centre }, { data: levels }, { data: topics }] = await Promise.all([
    supabaseAdmin.from("centres").select("name").eq("id", centreId).single(),
    supabaseAdmin
      .from("student_levels")
      .select("subject_id, current_stage, exam_board")
      .eq("student_id", studentId),
    supabaseAdmin
      .from("student_topics")
      .select("id, tutor_id, subject_id, topic_name, exam_board, level, status, studied_at")
      .eq("student_id", studentId)
      .eq("centre_id", centreId)
      .order("studied_at", { ascending: false }),
  ]);

  const tutorIds = Array.from(
    new Set(
      [student.assigned_tutor_id, ...(topics || []).map((t) => t.tutor_id)].filter(Boolean),
    ),
  ) as string[];

  const { data: tutors } = tutorIds.length
    ? await supabaseAdmin.from("profiles").select("id, full_name, email").in("id", tutorIds)
    : { data: [] as { id: string; full_name: string | null; email: string | null }[] };

  const tutorById = new Map((tutors || []).map((t) => [t.id, t.full_name || t.email || "Tutor"]));

  const summary = { taught: 0, mastered: 0, lastSession: null as string | null };
  for (const t of topics || []) {
    summary.taught += 1;
    if (t.status === "mastered") summary.mastered += 1;
    if (!summary.lastSession || t.studied_at > summary.lastSession) summary.lastSession = t.studied_at;
  }

  const shapedTopics: ProgressReportTopic[] = (topics || []).map((t) => ({
    ...t,
    tutorName: t.tutor_id ? tutorById.get(t.tutor_id) || "Tutor" : null,
  }));

  return {
    student: student as StudentRow,
    centreName: centre?.name || "Your tuition centre",
    levels: levels || [],
    topics: shapedTopics,
    summary,
    assignedTutorName: student.assigned_tutor_id
      ? tutorById.get(student.assigned_tutor_id) || null
      : null,
  };
}

export async function sendProgressReportToParent(
  studentId: string,
  centreId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const data = await loadStudentReportData(studentId, centreId);
  if (!data) return { ok: false, error: "Student not found" };

  const email = (data.student.parent_email || "").trim();
  if (!email) return { ok: false, error: "No parent email on file for this student" };
  if (!isValidEmail(email)) return { ok: false, error: "Parent email address is invalid" };

  const html = buildProgressReportHtml(
    {
      full_name: data.student.full_name,
      year_group: data.student.year_group,
      levels: data.levels,
      summary: data.summary,
      assignedTutorName: data.assignedTutorName,
    },
    data.topics,
    data.centreName,
  );

  return sendEmail({
    to: email,
    subject: `Progress report for ${data.student.full_name} — ${data.centreName}`,
    html,
  });
}

export async function sendSessionUpdateToParent(opts: {
  studentId: string;
  centreId: string;
  topicName: string;
  subjectId: string;
  status: string;
  tutorName: string;
  notes: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const data = await loadStudentReportData(opts.studentId, opts.centreId);
  if (!data) return { ok: false, error: "Student not found" };

  const email = (data.student.parent_email || "").trim();
  if (!email) return { ok: false, error: "No parent email on file" };
  if (!isValidEmail(email)) return { ok: false, error: "Parent email address is invalid" };

  const html = buildSessionUpdateHtml({
    studentName: data.student.full_name,
    centreName: data.centreName,
    topicName: opts.topicName,
    subjectId: opts.subjectId,
    status: opts.status,
    tutorName: opts.tutorName,
    notes: opts.notes,
    parentName: data.student.parent_name,
  });

  return sendEmail({
    to: email,
    subject: `${data.student.full_name} — session update (${opts.topicName})`,
    html,
  });
}
