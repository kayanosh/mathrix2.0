"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Sparkles, TrendingUp, GraduationCap } from "lucide-react";
import {
  KS2_YEARS,
  KS2_SECTIONS,
  getKS2Content,
  sectionUsesYear,
  type KS2Year,
  type KS2Section,
} from "@/lib/ks2";
import { getSkillData, syncSkillsFromServer, type SkillData } from "@/lib/skills";
import TopicCard from "@/components/ks2/TopicCard";

interface AssignedTopic {
  id: string;
  topic_id: string;
  topic_name: string;
  subject: string | null;
  target: string | null;
  tier: string | null;
  due_date: string | null;
}

export default function KS2Page() {
  const [section, setSection] = useState<KS2Section>("curriculum");
  const [year, setYear] = useState<KS2Year>("Year 5");
  const [activeSubject, setActiveSubject] = useState<string>("maths");
  const [skillData, setSkillData] = useState<SkillData>({});
  const [assigned, setAssigned] = useState<AssignedTopic[]>([]);

  useEffect(() => {
    setSkillData(getSkillData());
    syncSkillsFromServer().then((merged) => {
      if (merged) setSkillData(merged);
    });
    fetch("/api/assignments")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setAssigned(d.assignments || []))
      .catch(() => {});
  }, []);

  const subjects = useMemo(() => getKS2Content(section, year), [section, year]);

  useEffect(() => {
    if (!subjects.some((s) => s.id === activeSubject)) {
      setActiveSubject(subjects[0]?.id ?? "maths");
    }
  }, [subjects, activeSubject]);

  const current = subjects.find((s) => s.id === activeSubject) ?? subjects[0];

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/60 to-white text-gray-900">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center">
            <GraduationCap size={16} className="text-white" />
          </div>
          <span className="font-bold text-gray-900">Mathrix · KS2</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/progress" className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors">
            <TrendingUp size={14} /> My Progress
          </Link>
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            Home
          </Link>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 pb-16">
        {/* Hero */}
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">🚀</span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Let&rsquo;s Learn!</h1>
        </div>
        <p className="text-gray-500 mb-6 text-lg">
          Pick a subject and a topic. Learn it, practise it, and earn your stars. ⭐
        </p>

        {/* Assigned to you */}
        {assigned.length > 0 && (
          <div className="mb-7 rounded-2xl border-2 border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">📌</span>
              <h2 className="font-bold text-amber-800">Assigned to you</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {assigned.map((a) => (
                <Link
                  key={a.id}
                  href={`/ks2/topic/${a.topic_id}`}
                  className="rounded-xl bg-white p-3 ring-1 ring-amber-200 hover:ring-amber-300 hover:shadow-sm transition-all"
                >
                  <p className="font-semibold text-gray-800 text-sm truncate">{a.topic_name}</p>
                  <p className="text-[12px] text-gray-400">
                    {a.target ? a.target : "practice"}
                    {a.due_date ? ` · due ${a.due_date}` : ""}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Section tabs */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {KS2_SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-all ${
                section === s.id
                  ? "bg-indigo-600 text-white shadow-md scale-105"
                  : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"
              }`}
              title={s.blurb}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Year toggle (curriculum only) */}
        {sectionUsesYear(section) && (
          <div className="flex items-center gap-1 bg-white ring-1 ring-gray-200 rounded-xl p-0.5 w-fit mb-5">
            {KS2_YEARS.map((y) => (
              <button
                key={y}
                onClick={() => setYear(y)}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                  year === y ? "bg-indigo-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {y}
              </button>
            ))}
          </div>
        )}

        {/* Subject tabs */}
        <div className="flex flex-wrap items-center gap-2 mb-7">
          {subjects.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSubject(s.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all ${
                activeSubject === s.id
                  ? "bg-indigo-50 text-indigo-700 ring-2 ring-indigo-300 scale-105"
                  : "bg-white text-gray-500 ring-1 ring-gray-200 hover:bg-gray-50"
              }`}
            >
              <span className="text-lg">{s.icon}</span>
              {s.name}
            </button>
          ))}
        </div>

        {/* Topic cards */}
        {current && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {current.topics.map((topic) => (
              <TopicCard
                key={topic.id}
                topic={topic}
                subjectId={current.id}
                href={`/ks2/topic/${topic.id}`}
                skillData={skillData}
              />
            ))}
          </div>
        )}

        {/* Quick intro to the workflow */}
        <div className="mt-10 rounded-2xl bg-white ring-1 ring-gray-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={16} className="text-indigo-600" />
            <span className="font-bold text-gray-800">How it works</span>
          </div>
          <ol className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-sm text-gray-600">
            <li className="rounded-xl bg-indigo-50 p-3"><span className="font-bold text-indigo-700">1. Learn</span><br />Watch a friendly lesson.</li>
            <li className="rounded-xl bg-emerald-50 p-3"><span className="font-bold text-emerald-700">2. Practise</span><br />Try questions at your level.</li>
            <li className="rounded-xl bg-amber-50 p-3"><span className="font-bold text-amber-700">3. Master</span><br />Pass the quiz to win stars.</li>
            <li className="rounded-xl bg-rose-50 p-3"><span className="font-bold text-rose-700">4. Level up</span><br />Aim for Greater Depth!</li>
          </ol>
        </div>
      </main>
    </div>
  );
}
