"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Loader2, Mail, Users } from "lucide-react";
import { usePortalStudents } from "./PortalStudentContext";
import type { StudentRow } from "./types";

function studentLabel(s: StudentRow): string {
  return s.year_group ? `${s.full_name} · ${s.year_group}` : s.full_name;
}

export default function StudentSwitcher() {
  const pathname = usePathname();
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

  const [emailing, setEmailing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const showFilterToggle = myStudents.length > 0 && students.length > myStudents.length;

  if (pathname.startsWith("/portal/teach")) {
    return null;
  }

  async function emailParent() {
    if (!activeStudent?.parent_email) return;
    setEmailing(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "notifyParent", studentId: activeStudent.id }),
    });
    setEmailing(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Could not send email");
      return;
    }
    setMessage("Sent");
    setTimeout(() => setMessage(""), 2500);
  }

  if (loading) {
    return (
      <div className="hidden sm:flex items-center gap-2 px-2 py-1 text-gray-400">
        <Loader2 size={14} className="animate-spin" />
      </div>
    );
  }

  if (students.length === 0) {
    return null;
  }

  return (
    <div className="hidden md:flex items-center gap-2 min-w-0 max-w-[20rem]">
      <Users size={15} className="text-gray-400 shrink-0" />
      <select
        value={activeStudentId || ""}
        onChange={(e) => setActiveStudent(e.target.value || null)}
        className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 truncate"
        title="Active student"
      >
        {rosterStudents.length === 0 ? (
          <option value="">No students in roster</option>
        ) : (
          rosterStudents.map((s) => (
            <option key={s.id} value={s.id}>
              {studentLabel(s)}
            </option>
          ))
        )}
      </select>

      <button
        type="button"
        onClick={emailParent}
        disabled={emailing || !activeStudent?.parent_email}
        title={
          activeStudent?.parent_email
            ? "Email progress report to parent"
            : "No parent email on file"
        }
        className="shrink-0 grid place-items-center w-8 h-8 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {emailing ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
      </button>

      {showFilterToggle && (
        <button
          type="button"
          onClick={() => setFilterMode(filterMode === "mine" ? "all" : "mine")}
          className="shrink-0 text-[11px] font-medium text-indigo-600 hover:text-indigo-800 whitespace-nowrap"
        >
          {filterMode === "mine" ? `All (${students.length})` : `Mine (${myStudents.length})`}
        </button>
      )}

      {message && <span className="text-[11px] text-emerald-600 shrink-0">{message}</span>}
      {error && <span className="text-[11px] text-rose-600 shrink-0 max-w-[8rem] truncate">{error}</span>}
    </div>
  );
}
