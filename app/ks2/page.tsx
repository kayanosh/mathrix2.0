"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight, TrendingUp, GraduationCap } from "lucide-react";
import {
  KS2_YEARS,
  KS2_SECTIONS,
  getKS2Content,
  sectionUsesYear,
  ks2SkillKey,
  type KS2Year,
  type KS2Section,
} from "@/lib/ks2";
import {
  getSkillData,
  getMastery,
  getAccuracy,
  recordSkillAttempt,
  syncSkillsFromServer,
  type MasteryLevel,
  type SkillData,
} from "@/lib/skills";

const MASTERY_DOT: Record<MasteryLevel, string> = {
  unseen: "bg-gray-300",
  learning: "bg-yellow-500",
  practiced: "bg-blue-500",
  confident: "bg-violet-500",
  mastered: "bg-emerald-500",
};

function practicePrompt(section: KS2Section, year: KS2Year, subjectName: string, sub: string): string {
  const context =
    section === "sats"
      ? "KS2 SATs"
      : section === "eleven_plus"
        ? "11+ exam"
        : `KS2 ${year}`;
  return `Give me one ${context} ${subjectName} practice question on "${sub}". Just the question first — I'll attempt it, then you can check my answer step by step.`;
}

export default function KS2Page() {
  const router = useRouter();
  const [section, setSection] = useState<KS2Section>("curriculum");
  const [year, setYear] = useState<KS2Year>("Year 5");
  const [activeSubject, setActiveSubject] = useState<string>("maths");
  const [skillData, setSkillData] = useState<SkillData>({});

  useEffect(() => {
    setSkillData(getSkillData());
    syncSkillsFromServer().then((merged) => {
      if (merged) setSkillData(merged);
    });
  }, []);

  const subjects = useMemo(() => getKS2Content(section, year), [section, year]);

  // Keep the active subject valid when the section changes
  useEffect(() => {
    if (!subjects.some((s) => s.id === activeSubject)) {
      setActiveSubject(subjects[0]?.id ?? "maths");
    }
  }, [subjects, activeSubject]);

  const current = subjects.find((s) => s.id === activeSubject) ?? subjects[0];

  function launchPractice(topicName: string, sub: string, subjectName: string, subjectId: string) {
    // Track the attempt against this subject so it shows on the parent progress chart.
    recordSkillAttempt(ks2SkillKey(topicName, sub), {
      section,
      subject: subjectId,
      year: sectionUsesYear(section) ? year : undefined,
    });
    // Use KS2 persona for the tutor.
    try {
      localStorage.setItem("mathrix_tier", "KS2");
    } catch {
      /* ignore */
    }
    const q = practicePrompt(section, year, subjectName, sub);
    router.push(`/?q=${encodeURIComponent(q)}`);
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
            <GraduationCap size={15} className="text-white" />
          </div>
          <span className="font-bold text-gray-900">Mathrix · KS2</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/progress" className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors">
            <TrendingUp size={14} /> Progress
          </Link>
          <Link href="/subjects" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            Practice
          </Link>
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            Home
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-8 sm:py-10">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={20} className="text-indigo-600" />
          <h1 className="text-2xl sm:text-3xl font-bold">KS2 · SATs · 11+</h1>
        </div>
        <p className="text-gray-500 mb-6">Year 5 &amp; Year 6 curriculum, SATs preparation, and 11+ entrance exam practice.</p>

        {/* Section tabs */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {KS2_SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                section === s.id
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
              title={s.blurb}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Year toggle (curriculum only) */}
        {sectionUsesYear(section) && (
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5 w-fit mb-5">
            {KS2_YEARS.map((y) => (
              <button
                key={y}
                onClick={() => setYear(y)}
                className={`px-3 py-1.5 rounded-md text-[13px] font-semibold transition-all ${
                  year === y ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {y}
              </button>
            ))}
          </div>
        )}

        {/* Subject tabs */}
        <div className="flex flex-wrap items-center gap-2 mb-6 border-b border-gray-100 pb-4">
          {subjects.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSubject(s.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium transition-all ${
                activeSubject === s.id
                  ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200"
                  : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
              }`}
            >
              <span>{s.icon}</span>
              {s.name}
            </button>
          ))}
        </div>

        {/* Topics + subtopics */}
        {current && (
          <div className="space-y-6">
            {current.topics.map((topic) => (
              <section key={topic.id}>
                <h2 className="text-[12px] font-semibold text-gray-400 uppercase tracking-wide mb-2.5">
                  {topic.name}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {topic.subtopics.map((sub) => {
                    const key = ks2SkillKey(topic.name, sub);
                    const record = skillData[key];
                    const mastery = getMastery(record);
                    return (
                      <button
                        key={sub}
                        onClick={() => launchPractice(topic.name, sub, current.name, current.id)}
                        className="group flex items-center justify-between gap-3 text-left rounded-xl border border-gray-200 px-4 py-3 hover:border-indigo-300 hover:bg-indigo-50/40 transition-all"
                      >
                        <span className="flex items-center gap-2.5 min-w-0">
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${MASTERY_DOT[mastery]}`} />
                          <span className="text-sm text-gray-700 truncate">{sub}</span>
                        </span>
                        <span className="flex items-center gap-2 shrink-0">
                          {record && record.attempts > 0 && (
                            <span className="text-[11px] text-gray-400">
                              {record.attempts}× · {getAccuracy(record)}%
                            </span>
                          )}
                          <ArrowRight size={15} className="text-gray-300 group-hover:text-indigo-500 transition-colors" />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
