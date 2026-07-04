"use client";

import { useEffect, useState } from "react";
import { ClipboardCheck, Check, Loader2 } from "lucide-react";
import type { StudentRow } from "./types";

interface LogPayload {
  stageId: string;
  subjectId: string;
  topicId: string;
  topicName: string;
  examBoard?: string | null;
  level?: string | null;
}

const STATUSES = [
  { id: "taught", label: "Taught" },
  { id: "practised", label: "Practised" },
  { id: "mastered", label: "Mastered" },
] as const;

export default function SessionLogger({ payload }: { payload: LogPayload }) {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [studentId, setStudentId] = useState("");
  const [status, setStatus] = useState<string>("taught");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch("/api/students")
      .then((r) => r.json())
      .then((d) => setStudents(d.students || []))
      .catch(() => {});
  }, []);

  async function log() {
    if (!studentId) return;
    setSaving(true);
    setDone(false);
    const res = await fetch("/api/student-topics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "log",
        studentId,
        stageId: payload.stageId,
        subjectId: payload.subjectId,
        topicId: payload.topicId,
        topicName: payload.topicName,
        examBoard: payload.examBoard || null,
        level: payload.level || null,
        status,
        notes,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setDone(true);
      setNotes("");
      setTimeout(() => setDone(false), 2500);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 print-hide">
      <p className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <ClipboardCheck size={16} /> Log this topic for a student
      </p>

      {students.length === 0 ? (
        <p className="text-sm text-gray-500">
          No students yet. Add students on the dashboard to record their progress.
        </p>
      ) : (
        <div className="space-y-3">
          <select
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            <option value="">Select a student…</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name}
                {s.year_group ? ` (${s.year_group})` : ""}
              </option>
            ))}
          </select>

          <div className="flex gap-1">
            {STATUSES.map((st) => (
              <button
                key={st.id}
                onClick={() => setStatus(st.id)}
                className={`flex-1 rounded-lg border px-2 py-1.5 text-sm font-medium transition-colors ${
                  status === st.id
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Session notes (optional)"
            rows={2}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />

          <button
            onClick={log}
            disabled={!studentId || saving}
            className="w-full rounded-xl bg-indigo-600 text-white py-2 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : done ? (
              <>
                <Check size={16} /> Logged!
              </>
            ) : (
              "Log topic"
            )}
          </button>
        </div>
      )}
    </div>
  );
}
