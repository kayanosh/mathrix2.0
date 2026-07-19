"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { TrendingUp, GraduationCap, ArrowRight, Star } from "lucide-react";
import { KS2_SECTIONS, ks2SectionPath, type KS2Section } from "@/lib/ks2";
import { getKS2SchoolMeta, type KS2SchoolMeta } from "@/lib/ks2-school";

interface AssignedTopic {
  id: string;
  topic_id: string;
  topic_name: string;
  subject: string | null;
  target: string | null;
  tier: string | null;
  due_date: string | null;
}

const SECTION_CARDS: Record<
  KS2Section,
  { emoji: string; gradient: string; shadow: string }
> = {
  curriculum: {
    emoji: "📚",
    gradient: "from-sky-400 to-blue-500",
    shadow: "hover:shadow-sky-200",
  },
  sats: {
    emoji: "📝",
    gradient: "from-emerald-400 to-green-500",
    shadow: "hover:shadow-emerald-200",
  },
  eleven_plus: {
    emoji: "🎯",
    gradient: "from-violet-400 to-purple-500",
    shadow: "hover:shadow-violet-200",
  },
};

const HOW_IT_WORKS = [
  { emoji: "📖", label: "Learn", text: "Watch a friendly lesson.", bg: "bg-sky-50" },
  { emoji: "✏️", label: "Practise", text: "Try questions at your level.", bg: "bg-emerald-50" },
  { emoji: "⭐", label: "Master", text: "Pass the quiz to win stars.", bg: "bg-amber-50" },
  { emoji: "🚀", label: "Level up", text: "Aim for Greater Depth!", bg: "bg-rose-50" },
];

export default function KS2Page() {
  const [assigned, setAssigned] = useState<AssignedTopic[]>([]);
  const [school, setSchool] = useState<KS2SchoolMeta | null>(null);

  useEffect(() => {
    queueMicrotask(() => setSchool(getKS2SchoolMeta()));
    fetch("/api/assignments")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setAssigned(d.assignments || []))
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-indigo-50/40 to-white text-gray-900">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-200">
            <GraduationCap size={17} className="text-white" />
          </div>
          <span className="font-extrabold text-gray-900">Mathrix · KS2</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/progress"
            className="flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-bold text-indigo-600 shadow-sm ring-1 ring-indigo-100 hover:ring-indigo-300 transition-all"
          >
            <TrendingUp size={14} /> My Progress
          </Link>
          <Link
            href="/"
            className="rounded-full px-3 py-2 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors"
          >
            Home
          </Link>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 pb-16">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 120, damping: 18 }}
          className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-600 p-7 sm:p-10 mb-8 text-white shadow-xl shadow-indigo-200"
        >
          <div className="absolute -top-10 -right-10 h-44 w-44 rounded-full bg-white/10" aria-hidden />
          <div className="absolute -bottom-14 left-1/3 h-36 w-36 rounded-full bg-white/10" aria-hidden />
          <motion.div
            aria-hidden
            className="absolute right-6 sm:right-10 bottom-4 hidden sm:block w-28 lg:w-36"
            animate={{ y: [0, -8, 0], rotate: [0, 3, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/mascot.png" alt="" className="w-full drop-shadow-xl" />
          </motion.div>
          <div className="relative">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-2">
              Let&rsquo;s Learn!
            </h1>
            <p className="text-indigo-100 text-lg font-medium max-w-md">
              Choose your path. Learn it, practise it, and earn your stars.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {school && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-sm px-4 py-1.5 text-sm font-bold">
                  🏫 {school.name}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-sm px-4 py-1.5 text-sm font-bold">
                <Star size={14} className="fill-amber-300 text-amber-300" /> Collect stars as you master skills
              </span>
            </div>
          </div>
        </motion.div>

        {/* Assigned to you */}
        {assigned.length > 0 && (
          <div className="mb-8 rounded-3xl border-2 border-amber-200 bg-amber-50 p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl" aria-hidden>📌</span>
              <h2 className="font-extrabold text-amber-800 text-lg">Assigned to you</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {assigned.map((a) => (
                <motion.div key={a.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                  <Link
                    href={`/ks2/topic/${a.topic_id}`}
                    className="block rounded-2xl bg-white p-3.5 ring-1 ring-amber-200 hover:ring-amber-300 hover:shadow-md transition-all"
                  >
                    <p className="font-bold text-gray-800 text-sm truncate">{a.topic_name}</p>
                    <p className="text-[12px] text-gray-400">
                      {a.target ? a.target : "practice"}
                      {a.due_date ? ` · due ${a.due_date}` : ""}
                    </p>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Section cards */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.1 } } }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5"
        >
          {KS2_SECTIONS.map((s) => {
            const card = SECTION_CARDS[s.id];
            return (
              <motion.div
                key={s.id}
                variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0 } }}
                whileHover={{ y: -6 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 300, damping: 22 }}
              >
                <Link
                  href={ks2SectionPath(s.id)}
                  className={`group block h-full rounded-[1.75rem] bg-white ring-1 ring-gray-100 p-6 shadow-sm hover:shadow-xl ${card.shadow} transition-shadow`}
                >
                  <div
                    className={`w-18 h-18 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-br ${card.gradient} flex items-center justify-center text-4xl mb-4 shadow-lg group-hover:scale-105 group-hover:-rotate-3 transition-transform`}
                  >
                    {card.emoji}
                  </div>
                  <h2 className="text-2xl font-extrabold text-gray-900 mb-1">{s.label}</h2>
                  <p className="text-sm text-gray-500 mb-4">{s.blurb}</p>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-4 py-2 text-sm font-extrabold text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    Start learning <ArrowRight size={15} />
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>

        {/* How it works */}
        <div className="mt-10 rounded-3xl bg-white ring-1 ring-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl" aria-hidden>✨</span>
            <span className="font-extrabold text-gray-800 text-lg">How it works</span>
          </div>
          <ol className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-sm text-gray-600">
            {HOW_IT_WORKS.map((step, i) => (
              <li key={step.label} className={`rounded-2xl ${step.bg} p-4`}>
                <span className="text-2xl" aria-hidden>{step.emoji}</span>
                <span className="block font-extrabold text-gray-800 mt-1">
                  {i + 1}. {step.label}
                </span>
                {step.text}
              </li>
            ))}
          </ol>
        </div>
      </main>
    </div>
  );
}
