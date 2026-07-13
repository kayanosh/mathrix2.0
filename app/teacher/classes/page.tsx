"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Loader2, Users, Copy, UserPlus, Trash2, GraduationCap, Star } from "lucide-react";

interface Member {
  id: string;
  name: string;
  email: string;
  yearGroup: string;
  attempted: number;
  mastered: number;
}

interface ClassRow {
  id: string;
  name: string;
  join_code: string;
  school: string | null;
  members: Member[];
}

export default function TeacherClassesPage() {
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [newName, setNewName] = useState("");
  const [newSchool, setNewSchool] = useState("");
  const [creating, setCreating] = useState(false);
  const [addEmail, setAddEmail] = useState<Record<string, string>>({});

  async function load() {
    try {
      const res = await fetch("/api/classes");
      if (res.status === 403 || res.status === 401) {
        setForbidden(true);
        setLoading(false);
        return;
      }
      const data = await res.json();
      setClasses(data.classes || []);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }

  useEffect(() => {
    queueMicrotask(() => void load());
  }, []);

  async function createClass(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    await fetch("/api/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", name: newName.trim(), school: newSchool.trim() }),
    });
    setNewName("");
    setNewSchool("");
    setCreating(false);
    load();
  }

  async function addMember(classId: string) {
    const email = (addEmail[classId] || "").trim();
    if (!email) return;
    const res = await fetch("/api/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "addMember", classId, email }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(d.error || "Could not add student");
      return;
    }
    setAddEmail((m) => ({ ...m, [classId]: "" }));
    load();
  }

  async function removeMember(classId: string, studentId: string) {
    await fetch("/api/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "removeMember", classId, studentId }),
    });
    load();
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <nav className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100">
        <Link href="/teacher" className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium">
          <ArrowLeft size={16} /> Teacher tools
        </Link>
        <div className="flex items-center gap-2 text-gray-700 font-semibold">
          <GraduationCap size={18} /> My Classes
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
          </div>
        ) : forbidden ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
            <p className="text-gray-700 font-medium mb-1">Teacher access only</p>
            <p className="text-gray-500 text-sm">
              Your account needs the <span className="font-mono">teacher</span> role. Ask an admin to set it.
            </p>
          </div>
        ) : (
          <>
            {/* Create class */}
            <form onSubmit={createClass} className="rounded-2xl border border-gray-200 bg-white p-5 mb-6">
              <p className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Plus size={16} /> Create a class
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Class name (e.g. Year 5 Falcons)"
                  className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
                <input
                  value={newSchool}
                  onChange={(e) => setNewSchool(e.target.value)}
                  placeholder="School (optional)"
                  className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
                <button
                  type="submit"
                  disabled={creating || !newName.trim()}
                  className="rounded-xl bg-indigo-600 text-white px-5 py-2 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
                >
                  {creating ? "Creating…" : "Create"}
                </button>
              </div>
            </form>

            {classes.length === 0 ? (
              <p className="text-center text-gray-500 py-10">No classes yet. Create one above.</p>
            ) : (
              <div className="space-y-5">
                {classes.map((c) => (
                  <section key={c.id} className="rounded-2xl border border-gray-200 bg-white p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h2 className="font-bold text-gray-900 flex items-center gap-2">
                          <Users size={16} className="text-indigo-600" /> {c.name}
                        </h2>
                        {c.school && <p className="text-[12px] text-gray-400">{c.school}</p>}
                      </div>
                      <button
                        onClick={() => navigator.clipboard?.writeText(c.join_code)}
                        className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-mono text-gray-700 hover:bg-gray-200"
                        title="Copy join code"
                      >
                        {c.join_code} <Copy size={13} />
                      </button>
                    </div>

                    {/* Members */}
                    {c.members.length === 0 ? (
                      <p className="text-sm text-gray-400 mb-3">No students yet.</p>
                    ) : (
                      <div className="divide-y divide-gray-100 mb-3">
                        {c.members.map((m) => (
                          <div key={m.id} className="flex items-center gap-3 py-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{m.name}</p>
                              <p className="text-[12px] text-gray-400 truncate">
                                {m.email}
                                {m.yearGroup ? ` · ${m.yearGroup}` : ""}
                              </p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0 text-[13px]">
                              <span className="text-gray-500">{m.attempted} practised</span>
                              <span className="flex items-center gap-1 text-amber-600 font-semibold">
                                <Star size={13} className="fill-amber-400 text-amber-400" /> {m.mastered}
                              </span>
                              <button
                                onClick={() => removeMember(c.id, m.id)}
                                className="text-gray-300 hover:text-rose-500"
                                title="Remove from class"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add member */}
                    <div className="flex gap-2">
                      <input
                        value={addEmail[c.id] || ""}
                        onChange={(e) => setAddEmail((mm) => ({ ...mm, [c.id]: e.target.value }))}
                        onKeyDown={(e) => e.key === "Enter" && addMember(c.id)}
                        placeholder="Add student by email"
                        className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      />
                      <button
                        onClick={() => addMember(c.id)}
                        className="flex items-center gap-1.5 rounded-xl bg-indigo-50 text-indigo-700 px-4 py-2 text-sm font-semibold hover:bg-indigo-100"
                      >
                        <UserPlus size={15} /> Add
                      </button>
                    </div>

                    {/* Assign work */}
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <Link
                        href={`/teacher/assign?classId=${c.id}`}
                        className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        Assign work to this class →
                      </Link>
                    </div>
                  </section>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
