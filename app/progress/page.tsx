"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getMastery, getAccuracy, type MasteryLevel, type SkillRecord, type ServerProgressRow } from "@/lib/skills";
import { KS2_SUBJECT_META, type KS2SubjectId } from "@/lib/ks2";
import { RadialProgress, MasteryDistribution } from "@/components/ProgressChart";

const SUBJECT_COLOR: Record<string, string> = {
  maths: "#4f46e5",
  english: "#e11d48",
  science: "#059669",
  arabic: "#0891b2",
  vr: "#d97706",
  nvr: "#7c3aed",
};

function subjectMeta(id: string): { name: string; icon: string } {
  if (id in KS2_SUBJECT_META) return KS2_SUBJECT_META[id as KS2SubjectId];
  return { name: "Mathematics", icon: "📐" };
}

interface SkillEntry {
  key: string;
  record: SkillRecord;
}

interface SubjectGroup {
  id: string;
  name: string;
  icon: string;
  color: string;
  skills: SkillEntry[];
  attempted: number;
  mastered: number;
  avgAccuracy: number;
  distribution: Record<MasteryLevel, number>;
}

const EMPTY_DIST = (): Record<MasteryLevel, number> => ({
  unseen: 0,
  learning: 0,
  practiced: 0,
  confident: 0,
  mastered: 0,
});

export default function ProgressPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [studentName, setStudentName] = useState<string>("");
  const [rows, setRows] = useState<ServerProgressRow[]>([]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSignedIn(false);
        setLoading(false);
        return;
      }
      setSignedIn(true);
      setStudentName(user.user_metadata?.full_name || user.email || "");
      try {
        const res = await fetch("/api/progress");
        if (res.ok) {
          const { progress } = (await res.json()) as { progress: ServerProgressRow[] };
          setRows(progress);
        }
      } catch {
        /* ignore */
      }
      setLoading(false);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const groups = useMemo<SubjectGroup[]>(() => {
    const bySubject = new Map<string, SkillEntry[]>();
    for (const row of rows) {
      if (row.attempts <= 0) continue;
      const subjectId = row.subject || "maths";
      const entry: SkillEntry = {
        key: row.skill_key,
        record: {
          attempts: row.attempts,
          correct: row.correct,
          lastSeen: new Date(row.last_seen).getTime(),
        },
      };
      const list = bySubject.get(subjectId) || [];
      list.push(entry);
      bySubject.set(subjectId, list);
    }

    const order = ["maths", "english", "science", "arabic", "vr", "nvr"];
    return Array.from(bySubject.entries())
      .sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
      .map(([id, skills]) => {
        const meta = subjectMeta(id);
        const distribution = EMPTY_DIST();
        let accSum = 0;
        let mastered = 0;
        for (const s of skills) {
          const m = getMastery(s.record);
          distribution[m] += 1;
          accSum += getAccuracy(s.record);
          if (m === "mastered") mastered += 1;
        }
        skills.sort((a, b) => b.record.lastSeen - a.record.lastSeen);
        return {
          id,
          name: meta.name,
          icon: meta.icon,
          color: SUBJECT_COLOR[id] || "#4f46e5",
          skills,
          attempted: skills.length,
          mastered,
          avgAccuracy: skills.length ? Math.round(accSum / skills.length) : 0,
          distribution,
        };
      });
  }, [rows]);

  const totals = useMemo(() => {
    const attempted = groups.reduce((s, g) => s + g.attempted, 0);
    const mastered = groups.reduce((s, g) => s + g.mastered, 0);
    return { attempted, mastered };
  }, [groups]);

  // Reward badges: topics where a mastery quiz was passed (mastered_at set).
  const badges = useMemo(() => {
    const earned = rows.filter((r) => r.mastered_at);
    const byTier = { greater_depth: 0, secure: 0, developing: 0 } as Record<string, number>;
    for (const r of earned) {
      const t = r.tier || "secure";
      byTier[t] = (byTier[t] || 0) + 1;
    }
    return { total: earned.length, byTier, list: earned };
  }, [rows]);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="border-b border-gray-100 px-4 sm:px-8 py-4 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
        >
          <ArrowLeft size={16} /> Back to Mathrix
        </Link>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Mathrix" className="h-6 sm:h-8" />
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp size={22} className="text-indigo-600" />
          <h1 className="text-2xl sm:text-3xl font-bold">Progress</h1>
        </div>
        {studentName && (
          <p className="text-gray-500 mb-8">
            Showing progress for <span className="font-medium text-gray-700">{studentName}</span>
          </p>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
          </div>
        ) : !signedIn ? (
          <div className="rounded-2xl border border-gray-200 p-8 text-center">
            <p className="text-gray-600 mb-4">Sign in to view your progress.</p>
            <Link href="/" className="text-indigo-600 hover:text-indigo-800 font-medium">
              Go to home
            </Link>
          </div>
        ) : groups.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 p-8 text-center">
            <p className="text-gray-600 mb-2">No progress recorded yet.</p>
            <p className="text-gray-400 text-sm mb-5">
              Practise some questions and your mastery will appear here for parents to see.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link href="/ks2" className="text-indigo-600 hover:text-indigo-800 font-medium">
                Start KS2 practice
              </Link>
              <span className="text-gray-300">·</span>
              <Link href="/subjects" className="text-indigo-600 hover:text-indigo-800 font-medium">
                Practice hub
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Overall summary */}
            <section className="mb-8 rounded-2xl border border-gray-200 p-5 flex items-center gap-5">
              <RadialProgress
                percent={totals.attempted ? (totals.mastered / totals.attempted) * 100 : 0}
                centerLabel={`${totals.mastered}`}
                centerSub="mastered"
                color="#10b981"
              />
              <div>
                <p className="font-semibold text-gray-900">Overall</p>
                <p className="text-sm text-gray-500">
                  {totals.attempted} topic{totals.attempted !== 1 ? "s" : ""} practised across{" "}
                  {groups.length} subject{groups.length !== 1 ? "s" : ""}
                </p>
                <p className="text-sm text-gray-500">
                  {totals.mastered} mastered
                </p>
              </div>
            </section>

            {/* Reward badges */}
            {badges.total > 0 && (
              <section className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">🏅</span>
                  <h2 className="font-semibold text-amber-800">Badges earned ({badges.total})</h2>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {badges.byTier.greater_depth > 0 && (
                    <span className="rounded-full bg-amber-400 text-amber-950 px-3 py-1 text-sm font-bold">
                      🥇 Greater Depth × {badges.byTier.greater_depth}
                    </span>
                  )}
                  {badges.byTier.secure > 0 && (
                    <span className="rounded-full bg-gray-200 text-gray-700 px-3 py-1 text-sm font-bold">
                      🥈 Secure × {badges.byTier.secure}
                    </span>
                  )}
                  {badges.byTier.developing > 0 && (
                    <span className="rounded-full bg-orange-200 text-orange-800 px-3 py-1 text-sm font-bold">
                      🥉 Developing × {badges.byTier.developing}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {badges.list.slice(0, 16).map((b) => (
                    <span
                      key={b.skill_key}
                      className="rounded-lg bg-white/70 px-2.5 py-1 text-[12px] text-amber-900 ring-1 ring-amber-200"
                      title={b.skill_key}
                    >
                      ⭐ {b.skill_key.replace(/ — Mastery quiz$/, "")}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Per-subject cards */}
            <div className="space-y-5">
              {groups.map((g) => (
                <section key={g.id} className="rounded-2xl border border-gray-200 p-5">
                  <div className="flex items-center gap-5">
                    <RadialProgress percent={g.avgAccuracy} color={g.color} centerSub="accuracy" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{g.icon}</span>
                        <h2 className="font-semibold text-gray-900">{g.name}</h2>
                      </div>
                      <p className="text-sm text-gray-500 mb-3">
                        {g.attempted} topic{g.attempted !== 1 ? "s" : ""} practised · {g.mastered} mastered
                      </p>
                      <MasteryDistribution counts={g.distribution} />
                    </div>
                  </div>

                  {/* Topic breakdown */}
                  <div className="mt-4 border-t border-gray-100 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
                    {g.skills.slice(0, 12).map((s) => (
                      <div key={s.key} className="flex items-center justify-between gap-2 text-[13px]">
                        <span className="truncate text-gray-600">{s.key}</span>
                        <span className="shrink-0 text-gray-400">
                          {getAccuracy(s.record)}% · {s.record.attempts}×
                        </span>
                      </div>
                    ))}
                  </div>
                  {g.skills.length > 12 && (
                    <p className="mt-2 text-[12px] text-gray-400">+ {g.skills.length - 12} more topics</p>
                  )}
                </section>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
