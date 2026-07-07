"use client";

import { useState } from "react";
import { Loader2, Mail, Save, UserRound } from "lucide-react";
import type { StudentRow } from "./types";
import type { TutorInfo } from "./PortalShell";

export default function StudentContactEditor({
  student,
  tutors,
  onSaved,
}: {
  student: StudentRow;
  tutors: TutorInfo[];
  onSaved: () => void;
}) {
  const [assignedTutorId, setAssignedTutorId] = useState(student.assigned_tutor_id || "");
  const [parentName, setParentName] = useState(student.parent_name || "");
  const [parentEmail, setParentEmail] = useState(student.parent_email || "");
  const [saving, setSaving] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const dirty =
    assignedTutorId !== (student.assigned_tutor_id || "") ||
    parentName !== (student.parent_name || "") ||
    parentEmail !== (student.parent_email || "");

  async function save() {
    setSaving(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update",
        studentId: student.id,
        assignedTutorId: assignedTutorId || null,
        parentName,
        parentEmail,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Could not save");
      return;
    }
    setMessage("Saved");
    onSaved();
  }

  async function emailParent() {
    setEmailing(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "notifyParent", studentId: student.id }),
    });
    setEmailing(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Could not send email");
      return;
    }
    setMessage("Progress report emailed to parent");
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 mb-6">
      <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <UserRound size={16} /> Tutor &amp; parent contact
      </h2>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-medium text-gray-500">Assigned tutor</span>
          <select
            value={assignedTutorId}
            onChange={(e) => setAssignedTutorId(e.target.value)}
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            <option value="">Not assigned</option>
            {tutors.map((t) => (
              <option key={t.id} value={t.id}>
                {t.full_name || t.email}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-medium text-gray-500">Parent / guardian name</span>
          <input
            value={parentName}
            onChange={(e) => setParentName(e.target.value)}
            placeholder="e.g. Mrs Smith"
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="text-xs font-medium text-gray-500">Parent email</span>
          <input
            type="email"
            value={parentEmail}
            onChange={(e) => setParentEmail(e.target.value)}
            placeholder="parent@example.com"
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <p className="text-xs text-gray-400 mt-1">
            Session updates and progress reports are emailed here.
          </p>
        </label>
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        {dirty && (
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 text-white px-4 py-2 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save contact details
          </button>
        )}
        <button
          onClick={emailParent}
          disabled={emailing || !parentEmail.trim()}
          className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {emailing ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
          Email progress report
        </button>
      </div>

      {error && <p className="text-sm text-rose-600 mt-3">{error}</p>}
      {message && !error && <p className="text-sm text-emerald-600 mt-3">{message}</p>}
    </section>
  );
}
