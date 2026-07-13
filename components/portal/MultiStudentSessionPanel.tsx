"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ClipboardCheck, Loader2, Mail } from "lucide-react";
import { usePortalStudents } from "./PortalStudentContext";
import type { StudentRow } from "./types";

interface LogPayload {
  stageId: string;
  subjectId: string;
  topicId: string;
  topicName: string;
  examBoard?: string | null;
  level?: string | null;
}

interface StudentFormState {
  status: string;
  notes: string;
  notifyParent: boolean;
}

const STATUSES = [
  { id: "taught", label: "Taught" },
  { id: "practised", label: "Practised" },
  { id: "mastered", label: "Mastered" },
] as const;

const DEFAULT_FORM: StudentFormState = {
  status: "taught",
  notes: "",
  notifyParent: true,
};

function chipLabel(s: StudentRow): string {
  return s.year_group ? `${s.full_name} (${s.year_group})` : s.full_name;
}

export default function MultiStudentSessionPanel({ payload }: { payload: LogPayload }) {
  const {
    rosterStudents,
    myStudents,
    students,
    activeStudentId,
    activeStudent,
    filterMode,
    loading,
    setActiveStudent,
    setFilterMode,
  } = usePortalStudents();

  const [formByStudent, setFormByStudent] = useState<Record<string, StudentFormState>>({});
  const [saving, setSaving] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [done, setDone] = useState(false);
  const [feedback, setFeedback] = useState("");

  const showFilterToggle = myStudents.length > 0 && students.length > myStudents.length;

  const form = useMemo(() => {
    if (!activeStudentId) return DEFAULT_FORM;
    return formByStudent[activeStudentId] || {
      ...DEFAULT_FORM,
      notifyParent: Boolean(activeStudent?.parent_email),
    };
  }, [activeStudentId, formByStudent, activeStudent?.parent_email]);

  const updateForm = useCallback(
    (patch: Partial<StudentFormState>) => {
      if (!activeStudentId) return;
      setFormByStudent((prev) => ({
        ...prev,
        [activeStudentId]: {
          ...(prev[activeStudentId] || {
            ...DEFAULT_FORM,
            notifyParent: Boolean(activeStudent?.parent_email),
          }),
          ...patch,
        },
      }));
    },
    [activeStudentId, activeStudent?.parent_email],
  );

  useEffect(() => {
    if (!activeStudentId || !activeStudent) return;
    queueMicrotask(() => {
      setFormByStudent((prev) => {
        if (prev[activeStudentId]) return prev;
        return {
          ...prev,
          [activeStudentId]: {
            ...DEFAULT_FORM,
            notifyParent: Boolean(activeStudent.parent_email),
          },
        };
      });
    });
  }, [activeStudentId, activeStudent]);

  async function logTopic() {
    if (!activeStudentId || !activeStudent) return;
    setSaving(true);
    setDone(false);
    setFeedback("");
    const res = await fetch("/api/student-topics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "log",
        studentId: activeStudentId,
        stageId: payload.stageId,
        subjectId: payload.subjectId,
        topicId: payload.topicId,
        topicName: payload.topicName,
        examBoard: payload.examBoard || null,
        level: payload.level || null,
        status: form.status,
        notes: form.notes,
        notifyParent: form.notifyParent && Boolean(activeStudent.parent_email),
      }),
    });
    setSaving(false);
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      setDone(true);
      updateForm({ notes: "" });
      if (data.parentNotified) {
        setFeedback("Parent notified by email");
      } else if (data.parentNotifyError && form.notifyParent) {
        setFeedback(data.parentNotifyError);
      } else {
        setFeedback("Topic logged");
      }
      setTimeout(() => {
        setDone(false);
        setFeedback("");
      }, 3500);
    } else {
      const data = await res.json().catch(() => ({}));
      setFeedback(data.error || "Could not log topic");
    }
  }

  async function emailProgressReport() {
    if (!activeStudent?.parent_email) return;
    setEmailing(true);
    setFeedback("");
    const res = await fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "notifyParent", studentId: activeStudent.id }),
    });
    setEmailing(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setFeedback(d.error || "Could not send email");
      return;
    }
    setFeedback("Progress report emailed to parent");
    setTimeout(() => setFeedback(""), 3500);
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-4 print-hide flex justify-center">
        <Loader2 size={20} className="animate-spin text-indigo-600" />
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-4 print-hide">
        <p className="text-sm text-gray-500">
          No students yet. Add students on the dashboard to record their progress.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 print-hide">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <p className="font-semibold text-gray-900 flex items-center gap-2">
          <ClipboardCheck size={16} /> Log this topic
        </p>
        {showFilterToggle && (
          <button
            type="button"
            onClick={() => setFilterMode(filterMode === "mine" ? "all" : "mine")}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
          >
            {filterMode === "mine" ? `Show all students (${students.length})` : `My students (${myStudents.length})`}
          </button>
        )}
      </div>

      {rosterStudents.length === 0 ? (
        <p className="text-sm text-gray-500">
          No students assigned to you. Switch to all students or assign students on the dashboard.
        </p>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {rosterStudents.map((s) => {
              const active = s.id === activeStudentId;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveStudent(s.id)}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {chipLabel(s)}
                </button>
              );
            })}
          </div>

          {activeStudent && (
            <>
              <p className="text-xs text-gray-500">
                {activeStudent.assigned_tutor_name
                  ? `Assigned tutor: ${activeStudent.assigned_tutor_name}`
                  : "No tutor assigned yet"}
                {activeStudent.parent_email
                  ? ` · Parent: ${activeStudent.parent_email}`
                  : " · No parent email on file"}
              </p>

              <div className="flex gap-1">
                {STATUSES.map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => updateForm({ status: st.id })}
                    className={`flex-1 rounded-lg border px-2 py-1.5 text-sm font-medium transition-colors ${
                      form.status === st.id
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>

              <textarea
                value={form.notes}
                onChange={(e) => updateForm({ notes: e.target.value })}
                placeholder="Session notes (optional)"
                rows={2}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />

              {activeStudent.parent_email ? (
                <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.notifyParent}
                    onChange={(e) => updateForm({ notifyParent: e.target.checked })}
                    className="mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-300"
                  />
                  <span className="flex items-center gap-1.5">
                    <Mail size={14} className="text-gray-400" />
                    Email session update to parent
                  </span>
                </label>
              ) : (
                <p className="text-xs text-amber-600">
                  Add a parent email on the student profile to send updates.
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={logTopic}
                  disabled={saving}
                  className="flex-1 min-w-[8rem] rounded-xl bg-indigo-600 text-white py-2 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
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
                <button
                  type="button"
                  onClick={emailProgressReport}
                  disabled={emailing || !activeStudent.parent_email}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {emailing ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                  Email progress report
                </button>
              </div>

              {feedback && (
                <p
                  className={`text-xs ${
                    feedback.includes("notified") || feedback.includes("emailed") || feedback.includes("logged")
                      ? "text-emerald-600"
                      : "text-amber-600"
                  }`}
                >
                  {feedback}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
