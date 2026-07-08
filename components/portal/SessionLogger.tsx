"use client";

import { useEffect, useState } from "react";
import { ClipboardCheck, Check, Loader2, Mail } from "lucide-react";
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

export default function SessionLogger({
  payload,
  studentId = null,
  student = null,
}: {
  payload: LogPayload;
  studentId?: string | null;
  student?: StudentRow | null;
}) {
  const [status, setStatus] = useState<string>("taught");
  const [notes, setNotes] = useState("");
  const [notifyParent, setNotifyParent] = useState(true);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    setNotifyParent(Boolean(student?.parent_email));
  }, [student]);

  async function log() {
    if (!studentId) return;
    setSaving(true);
    setDone(false);
    setFeedback("");
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
        notifyParent: notifyParent && Boolean(student?.parent_email),
      }),
    });
    setSaving(false);
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      setDone(true);
      setNotes("");
      if (data.parentNotified) {
        setFeedback("Parent notified by email");
      } else if (data.parentNotifyError && notifyParent) {
        setFeedback(data.parentNotifyError);
      }
      setTimeout(() => {
        setDone(false);
        setFeedback("");
      }, 3500);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 print-hide">
      <p className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <ClipboardCheck size={16} /> Log this topic
      </p>

      {!studentId ? (
        <p className="text-sm text-gray-500">
          Select a student tab above to log this topic against their record.
        </p>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-gray-500">
            {student?.assigned_tutor_name
              ? `Assigned tutor: ${student.assigned_tutor_name}`
              : "No tutor assigned"}
            {student?.parent_email
              ? ` · Parent: ${student.parent_email}`
              : " · No parent email on file"}
          </p>

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

          {student?.parent_email && (
            <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyParent}
                onChange={(e) => setNotifyParent(e.target.checked)}
                className="mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-300"
              />
              <span className="flex items-center gap-1.5">
                <Mail size={14} className="text-gray-400" />
                Email session update to parent
              </span>
            </label>
          )}

          <button
            onClick={log}
            disabled={saving}
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

          {feedback && (
            <p className={`text-xs ${feedback.includes("notified") ? "text-emerald-600" : "text-amber-600"}`}>
              {feedback}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
