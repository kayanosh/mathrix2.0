import { getStage, getSubject, getSubjects } from "@/lib/curriculum";

export interface ProgressReportStudent {
  full_name: string;
  year_group: string | null;
  levels: { subject_id: string; current_stage: string | null; exam_board: string | null }[];
  summary: { taught: number; mastered: number; lastSession: string | null };
  assignedTutorName?: string | null;
}

export interface ProgressReportTopic {
  id: string;
  subject_id: string;
  topic_name: string;
  exam_board: string | null;
  level: string | null;
  status: string;
  studied_at: string;
  tutorName?: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  taught: "Taught",
  practised: "Practised",
  mastered: "Mastered",
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildProgressReportHtml(
  student: ProgressReportStudent,
  topics: ProgressReportTopic[],
  centreName: string,
): string {
  const date = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const subjects = getSubjects();

  const levelsHtml =
    student.levels.length === 0
      ? "<p style='color:#6b7280;font-size:14px;'>No levels set yet.</p>"
      : student.levels
          .map((l) => {
            const stage = getStage(l.current_stage as never);
            const subject = getSubject(l.subject_id as never);
            const board = l.exam_board ? ` (${escapeHtml(l.exam_board)})` : "";
            return `<span style="display:inline-block;border:1px solid #d1d5db;border-radius:8px;padding:4px 12px;margin:4px 4px 0 0;font-size:14px;color:#374151;"><strong>${escapeHtml(subject?.name || l.subject_id)}:</strong> ${escapeHtml(stage?.label || "—")}${board}</span>`;
          })
          .join("");

  const subjectSections = subjects
    .map((subj) => {
      const subjTopics = topics.filter((t) => t.subject_id === subj.id);
      if (subjTopics.length === 0) return "";
      const rows = subjTopics
        .map(
          (t) => `<tr>
            <td style="padding:6px 8px;border-bottom:1px solid #f3f4f6;color:#1f2937;">${escapeHtml(t.topic_name)}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #f3f4f6;color:#4b5563;">${escapeHtml([t.level, t.exam_board].filter(Boolean).join(" · ") || "—")}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #f3f4f6;color:#4b5563;">${escapeHtml(STATUS_LABEL[t.status] || t.status)}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #f3f4f6;color:#6b7280;">${new Date(t.studied_at).toLocaleDateString("en-GB")}</td>
          </tr>`,
        )
        .join("");
      return `<h2 style="font-size:16px;font-weight:600;color:#111827;margin:16px 0 8px;">${escapeHtml(subj.name)}</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <thead><tr style="text-align:left;color:#6b7280;border-bottom:1px solid #d1d5db;">
            <th style="padding:6px 8px;font-weight:500;">Topic</th>
            <th style="padding:6px 8px;font-weight:500;">Level</th>
            <th style="padding:6px 8px;font-weight:500;">Status</th>
            <th style="padding:6px 8px;font-weight:500;">Date</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>`;
    })
    .join("");

  const tutorLine = student.assignedTutorName
    ? `<p style="font-size:14px;color:#4b5563;margin:8px 0 0;">Tutor: <strong>${escapeHtml(student.assignedTutorName)}</strong></p>`
    : "";

  return `<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827;max-width:640px;margin:0 auto;padding:24px;">
  <div style="border-bottom:2px solid #111827;padding-bottom:12px;margin-bottom:20px;">
    <h1 style="font-size:20px;font-weight:700;margin:0 0 4px;">Progress report</h1>
    <p style="font-size:14px;color:#6b7280;margin:0;">${escapeHtml(centreName)}</p>
  </div>
  <div style="margin-bottom:20px;">
    <p style="font-size:16px;font-weight:600;margin:0;">${escapeHtml(student.full_name)}</p>
    ${student.year_group ? `<p style="font-size:14px;color:#6b7280;margin:4px 0 0;">${escapeHtml(student.year_group)}</p>` : ""}
    <p style="font-size:14px;color:#6b7280;margin:4px 0 0;">${date}</p>
    ${tutorLine}
  </div>
  <h2 style="font-size:16px;font-weight:600;margin:0 0 8px;">Current levels</h2>
  <div style="margin-bottom:16px;">${levelsHtml}</div>
  <p style="font-size:14px;color:#374151;margin-bottom:20px;">
    Topics covered: <strong>${student.summary.taught}</strong> · Mastered: <strong>${student.summary.mastered}</strong>
  </p>
  ${subjectSections}
  <p style="font-size:12px;color:#9ca3af;margin-top:32px;border-top:1px solid #e5e7eb;padding-top:16px;">
    Sent by Mathrix Tutor Portal on behalf of ${escapeHtml(centreName)}.
  </p>
</body>
</html>`;
}

export function buildSessionUpdateHtml(opts: {
  studentName: string;
  centreName: string;
  topicName: string;
  subjectId: string;
  status: string;
  tutorName: string;
  notes: string | null;
  parentName: string | null;
}): string {
  const greeting = opts.parentName ? `Dear ${escapeHtml(opts.parentName)},` : "Hello,";
  const subject = getSubject(opts.subjectId as never);
  const notesBlock = opts.notes
    ? `<p style="font-size:14px;color:#374151;margin:12px 0;padding:12px;background:#f9fafb;border-radius:8px;"><strong>Notes:</strong> ${escapeHtml(opts.notes)}</p>`
    : "";

  return `<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827;max-width:640px;margin:0 auto;padding:24px;">
  <p style="font-size:15px;">${greeting}</p>
  <p style="font-size:15px;line-height:1.6;">
    We wanted to let you know about <strong>${escapeHtml(opts.studentName)}</strong>&apos;s latest session at <strong>${escapeHtml(opts.centreName)}</strong>.
  </p>
  <div style="background:#f3f4f6;border-radius:12px;padding:16px;margin:16px 0;">
    <p style="margin:0 0 4px;font-size:14px;color:#6b7280;">Topic covered</p>
    <p style="margin:0;font-size:18px;font-weight:600;">${escapeHtml(opts.topicName)}</p>
    <p style="margin:8px 0 0;font-size:14px;color:#4b5563;">
      ${escapeHtml(subject?.name || opts.subjectId)} · ${escapeHtml(STATUS_LABEL[opts.status] || opts.status)} · Tutor: ${escapeHtml(opts.tutorName)}
    </p>
  </div>
  ${notesBlock}
  <p style="font-size:14px;color:#6b7280;">
    You can request a full progress report from your tuition centre at any time.
  </p>
  <p style="font-size:12px;color:#9ca3af;margin-top:32px;border-top:1px solid #e5e7eb;padding-top:16px;">
    Sent by Mathrix Tutor Portal on behalf of ${escapeHtml(opts.centreName)}.
  </p>
</body>
</html>`;
}
