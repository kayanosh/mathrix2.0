"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, ClipboardList, Trash2, Check, Presentation } from "lucide-react";
import { listAllKS2Topics } from "@/lib/ks2";
import { KS2_TARGETS, KS2_TIERS, type KS2Target, type KS2Tier } from "@/lib/ks2-pathway";

interface ClassRow {
  id: string;
  name: string;
}

interface Assignment {
  id: string;
  class_id: string;
  topic_id: string;
  topic_name: string;
  subject: string | null;
  target: string | null;
  tier: string | null;
  due_date: string | null;
  total: number;
  completed: number;
}

function AssignInner() {
  const params = useSearchParams();
  const initialClass = params.get("classId") || "";

  const allTopics = useMemo(() => listAllKS2Topics(), []);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [classId, setClassId] = useState(initialClass);
  const [topicId, setTopicId] = useState("");
  const [target, setTarget] = useState<KS2Target>("curriculum");
  const [tier, setTier] = useState<KS2Tier>("secure");
  const [dueDate, setDueDate] = useState("");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [saving, setSaving] = useState(false);

  async function loadClasses() {
    const res = await fetch("/api/classes");
    if (res.status === 403 || res.status === 401) {
      setForbidden(true);
      return;
    }
    const data = await res.json();
    const cs: ClassRow[] = (data.classes || []).map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }));
    setClasses(cs);
    if (!initialClass && cs[0]) setClassId(cs[0].id);
  }

  async function loadAssignments() {
    const res = await fetch("/api/assignments");
    if (res.ok) {
      const data = await res.json();
      setAssignments(data.assignments || []);
    }
  }

  useEffect(() => {
    (async () => {
      await loadClasses();
      await loadAssignments();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createAssignment(e: React.FormEvent) {
    e.preventDefault();
    const topic = allTopics.find((t) => t.id === topicId);
    if (!classId || !topic) return;
    setSaving(true);
    await fetch("/api/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        classId,
        topicId: topic.id,
        topicName: topic.name,
        subject: topic.subjectId,
        target,
        tier,
        dueDate: dueDate || null,
      }),
    });
    setTopicId("");
    setDueDate("");
    setSaving(false);
    loadAssignments();
  }

  async function remove(id: string) {
    await fetch("/api/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    loadAssignments();
  }

  const classNameById = useMemo(() => new Map(classes.map((c) => [c.id, c.name])), [classes]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <nav className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100">
        <Link href="/teacher/classes" className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium">
          <ArrowLeft size={16} /> Classes
        </Link>
        <div className="flex items-center gap-2 text-gray-700 font-semibold">
          <ClipboardList size={18} /> Assignments
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
          </div>
        ) : forbidden ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
            <p className="text-gray-700 font-medium">Teacher access only.</p>
          </div>
        ) : classes.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
            <p className="text-gray-600 mb-3">Create a class first.</p>
            <Link href="/teacher/classes" className="text-indigo-600 font-medium">Go to Classes →</Link>
          </div>
        ) : (
          <>
            {/* New assignment */}
            <form onSubmit={createAssignment} className="rounded-2xl border border-gray-200 bg-white p-5 mb-6 space-y-3">
              <p className="font-semibold text-gray-900">Set new work</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-sm">
                  <span className="text-gray-500">Class</span>
                  <select
                    value={classId}
                    onChange={(e) => setClassId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="text-gray-500">Topic</span>
                  <select
                    value={topicId}
                    onChange={(e) => setTopicId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                  >
                    <option value="">Choose a topic…</option>
                    {allTopics.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.subjectName} · {t.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="text-gray-500">Target</span>
                  <select
                    value={target}
                    onChange={(e) => setTarget(e.target.value as KS2Target)}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                  >
                    {KS2_TARGETS.map((t) => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="text-gray-500">Challenge level</span>
                  <select
                    value={tier}
                    onChange={(e) => setTier(e.target.value as KS2Tier)}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                  >
                    {KS2_TIERS.map((t) => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="text-gray-500">Due date (optional)</span>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                  />
                </label>
              </div>
              <button
                type="submit"
                disabled={saving || !topicId || !classId}
                className="rounded-xl bg-indigo-600 text-white px-5 py-2 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? "Assigning…" : "Assign"}
              </button>
            </form>

            {/* Existing assignments */}
            <h2 className="font-semibold text-gray-900 mb-3">Current assignments</h2>
            {assignments.length === 0 ? (
              <p className="text-gray-500 text-sm">No assignments yet.</p>
            ) : (
              <div className="space-y-2">
                {assignments.map((a) => {
                  const pct = a.total ? Math.round((a.completed / a.total) * 100) : 0;
                  return (
                    <div key={a.id} className="rounded-2xl border border-gray-200 bg-white p-4 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{a.topic_name}</p>
                        <p className="text-[12px] text-gray-400">
                          {classNameById.get(a.class_id) || "Class"}
                          {a.target ? ` · ${a.target}` : ""}
                          {a.tier ? ` · ${a.tier}` : ""}
                          {a.due_date ? ` · due ${a.due_date}` : ""}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-emerald-600 flex items-center gap-1 justify-end">
                          <Check size={14} /> {a.completed}/{a.total}
                        </p>
                        <div className="w-24 h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                          <div className="h-full bg-emerald-400" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <Link
                        href={`/teacher/teach/${a.topic_id}`}
                        className="shrink-0 flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                        title="Teach this to the class"
                      >
                        <Presentation size={15} /> Teach
                      </Link>
                      <button onClick={() => remove(a.id)} className="text-gray-300 hover:text-rose-500 shrink-0">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default function TeacherAssignPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-7 h-7 animate-spin text-indigo-600" /></div>}>
      <AssignInner />
    </Suspense>
  );
}
