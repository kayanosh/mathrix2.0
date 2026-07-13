"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2, Printer, Trash2, Star, Save } from "lucide-react";
import PortalShell, { type PortalContext } from "@/components/portal/PortalShell";
import ProgressReport from "@/components/portal/ProgressReport";
import StudentContactEditor from "@/components/portal/StudentContactEditor";
import {
  getStages,
  getSubjects,
  getStage,
  getBoardsFor,
  stageHasBoards,
} from "@/lib/curriculum";
import type { StudentRow, StudentTopicRow } from "@/components/portal/types";

const STATUS_STYLE: Record<string, string> = {
  taught: "bg-sky-100 text-sky-700",
  practised: "bg-amber-100 text-amber-700",
  mastered: "bg-emerald-100 text-emerald-700",
};

function StudentDetail({ ctx, studentId }: { ctx: PortalContext; studentId: string }) {
  const [student, setStudent] = useState<StudentRow | null>(null);
  const [topics, setTopics] = useState<StudentTopicRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [sRes, tRes] = await Promise.all([
        fetch("/api/students"),
        fetch(`/api/student-topics?studentId=${studentId}`),
      ]);
      const sData = await sRes.json();
      const tData = await tRes.json();
      setStudent((sData.students || []).find((s: StudentRow) => s.id === studentId) || null);
      setTopics(tData.topics || []);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, [studentId]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  async function deleteTopic(id: string) {
    await fetch("/api/student-topics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    load();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!student) {
    return (
      <main className="max-w-3xl mx-auto px-6 py-16 text-center">
        <p className="text-gray-600">Student not found.</p>
        <Link href="/portal" className="text-indigo-600 hover:underline mt-2 inline-block">
          Back to dashboard
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      <div className="print-hide">
        <Link href="/portal" className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 mb-3">
          <ArrowLeft size={15} /> Dashboard
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{student.full_name}</h1>
            <p className="text-sm text-gray-500">
              {student.year_group || "No year group"}
              {student.assigned_tutor_name ? ` · Tutor: ${student.assigned_tutor_name}` : ""}
              {" · "}{student.summary.taught} topics ·{" "}
              <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                <Star size={12} className="fill-amber-400 text-amber-400" /> {student.summary.mastered} mastered
              </span>
            </p>
          </div>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <Printer size={16} /> Print report
          </button>
        </div>

        {/* Tutor & parent contact */}
        <StudentContactEditor student={student} tutors={ctx.tutors} onSaved={load} />

        {/* Levels editor */}
        <LevelsEditor student={student} onSaved={load} />

        {/* Study log */}
        <section className="mt-6">
          <h2 className="font-semibold text-gray-900 mb-3">Study log</h2>
          {topics.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500">
              Nothing logged yet. Teach a topic and log it from the Teach tab.
            </div>
          ) : (
            <div className="space-y-2">
              {topics.map((t) => (
                <div key={t.id} className="flex items-start justify-between gap-3 rounded-xl border border-gray-200 bg-white p-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900">{t.topic_name}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[t.status]}`}>
                        {t.status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {getStage(t.stage_id as never)?.label} · {t.subject_id}
                      {t.exam_board ? ` · ${t.exam_board}` : ""}
                      {t.level ? ` · ${t.level}` : ""} ·{" "}
                      {new Date(t.studied_at).toLocaleDateString("en-GB")}
                      {t.tutorName ? ` · ${t.tutorName}` : ""}
                    </div>
                    {t.notes && <p className="text-sm text-gray-600 mt-1">{t.notes}</p>}
                  </div>
                  <button
                    onClick={() => deleteTopic(t.id)}
                    className="text-gray-300 hover:text-rose-500 shrink-0"
                    title="Delete entry"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Printable report */}
      <ProgressReport student={student} topics={topics} centreName={ctx.centre.name} />
    </main>
  );
}

function LevelsEditor({ student, onSaved }: { student: StudentRow; onSaved: () => void }) {
  const subjects = getSubjects();
  const stages = getStages();

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4">
      <h2 className="font-semibold text-gray-900 mb-3">Levels</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {subjects.map((subj) => {
          const existing = student.levels.find((l) => l.subject_id === subj.id);
          return (
            <SubjectLevelEditor
              key={subj.id}
              studentId={student.id}
              subjectId={subj.id}
              subjectName={subj.name}
              emoji={subj.emoji}
              stages={stages}
              initialStage={existing?.current_stage || ""}
              initialBoard={existing?.exam_board || ""}
              onSaved={onSaved}
            />
          );
        })}
      </div>
    </section>
  );
}

function SubjectLevelEditor({
  studentId,
  subjectId,
  subjectName,
  emoji,
  stages,
  initialStage,
  initialBoard,
  onSaved,
}: {
  studentId: string;
  subjectId: string;
  subjectName: string;
  emoji: string;
  stages: ReturnType<typeof getStages>;
  initialStage: string;
  initialBoard: string;
  onSaved: () => void;
}) {
  const [stageId, setStageId] = useState(initialStage);
  const [boardId, setBoardId] = useState(initialBoard);
  const [saving, setSaving] = useState(false);

  const boards = useMemo(
    () => (stageId && stageHasBoards(stageId as never) ? getBoardsFor(stageId as never, subjectId as never) : []),
    [stageId, subjectId],
  );
  const dirty = stageId !== initialStage || boardId !== initialBoard;

  async function save() {
    setSaving(true);
    await fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "setLevel",
        studentId,
        subjectId,
        currentStage: stageId || null,
        examBoard: boards.length ? boardId || null : null,
      }),
    });
    setSaving(false);
    onSaved();
  }

  return (
    <div className="rounded-xl border border-gray-100 p-3">
      <p className="text-sm font-medium text-gray-800 mb-2">
        {emoji} {subjectName}
      </p>
      <select
        value={stageId}
        onChange={(e) => {
          setStageId(e.target.value);
          setBoardId("");
        }}
        className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
      >
        <option value="">Not set</option>
        {stages.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>
      {boards.length > 0 && (
        <select
          value={boardId}
          onChange={(e) => setBoardId(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          <option value="">Board…</option>
          {boards.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      )}
      {dirty && (
        <button
          onClick={save}
          disabled={saving}
          className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 text-white py-1.5 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
        </button>
      )}
    </div>
  );
}

export default function StudentDetailPage() {
  const params = useParams();
  const studentId = String(params.studentId || "");
  return <PortalShell>{(ctx) => <StudentDetail ctx={ctx} studentId={studentId} />}</PortalShell>;
}
