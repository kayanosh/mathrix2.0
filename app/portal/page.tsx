"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, UserPlus, BookOpenCheck, Users, Star } from "lucide-react";
import PortalShell from "@/components/portal/PortalShell";
import StudentTable from "@/components/portal/StudentTable";
import type { StudentRow } from "@/components/portal/types";

function Dashboard() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [yearGroup, setYearGroup] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/students");
      const data = await res.json();
      setStudents(data.students || []);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addStudent(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    await fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", fullName: name.trim(), yearGroup: yearGroup.trim() }),
    });
    setName("");
    setYearGroup("");
    setCreating(false);
    load();
  }

  const totalMastered = students.reduce((a, s) => a + s.summary.mastered, 0);
  const totalTaught = students.reduce((a, s) => a + s.summary.taught, 0);

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Student dashboard</h1>
          <p className="text-gray-500 text-sm">Everyone in your centre, at a glance.</p>
        </div>
        <Link
          href="/portal/teach"
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-indigo-700"
        >
          <BookOpenCheck size={16} /> Start teaching
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Stat icon={<Users size={16} />} label="Students" value={students.length} />
        <Stat icon={<BookOpenCheck size={16} />} label="Topics logged" value={totalTaught} />
        <Stat icon={<Star size={16} className="fill-amber-400 text-amber-400" />} label="Mastered" value={totalMastered} />
      </div>

      {/* Add student */}
      <form onSubmit={addStudent} className="rounded-2xl border border-gray-200 bg-white p-4 mb-6">
        <p className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <UserPlus size={16} /> Add a student
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <input
            value={yearGroup}
            onChange={(e) => setYearGroup(e.target.value)}
            placeholder="Year group (optional)"
            className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <button
            type="submit"
            disabled={creating || !name.trim()}
            className="rounded-xl bg-indigo-600 text-white px-5 py-2 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
          >
            {creating ? "Adding…" : "Add"}
          </button>
        </div>
      </form>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        </div>
      ) : (
        <StudentTable students={students} />
      )}
    </main>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-1.5 text-gray-400 text-xs font-medium">{icon} {label}</div>
      <div className="text-2xl font-bold text-gray-900 mt-1">{value}</div>
    </div>
  );
}

export default function PortalDashboardPage() {
  return <PortalShell>{() => <Dashboard />}</PortalShell>;
}
