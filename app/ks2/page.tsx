"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, TrendingUp, GraduationCap, ArrowRight } from "lucide-react";
import { KS2_SECTIONS, ks2SectionPath, type KS2Section } from "@/lib/ks2";

interface AssignedTopic {
  id: string;
  topic_id: string;
  topic_name: string;
  subject: string | null;
  target: string | null;
  tier: string | null;
  due_date: string | null;
}

const SECTION_CARDS: Record<KS2Section, { emoji: string; gradient: string }> = {
  curriculum: { emoji: "📚", gradient: "from-sky-400 to-blue-500" },
  sats: { emoji: "📝", gradient: "from-emerald-400 to-green-500" },
  eleven_plus: { emoji: "🎯", gradient: "from-violet-400 to-purple-500" },
};

export default function KS2Page() {
  const [assigned, setAssigned] = useState<AssignedTopic[]>([]);

  useEffect(() => {
    fetch("/api/assignments")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setAssigned(d.assignments || []))
      .catch(() => {});
  }, []);

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
        <p className="text-gray-500 mb-7 text-lg">
          Choose your path. Learn it, practise it, and earn your stars. ⭐
        </p>

        {/* Assigned to you */}
        {assigned.length > 0 && (
          <div className="mb-8 rounded-2xl border-2 border-amber-200 bg-amber-50 p-4">
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

        {/* Section cards */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.08 } } }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          {KS2_SECTIONS.map((s) => {
            const card = SECTION_CARDS[s.id];
            return (
              <motion.div
                key={s.id}
                variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
              >
                <Link
                  href={ks2SectionPath(s.id)}
                  className="group block h-full rounded-3xl bg-white ring-1 ring-gray-200 p-6 hover:ring-indigo-300 hover:shadow-lg transition-all"
                >
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${card.gradient} flex items-center justify-center text-3xl mb-4 group-hover:scale-105 transition-transform`}>
                    {card.emoji}
                  </div>
                  <h2 className="text-xl font-extrabold text-gray-900 mb-1">{s.label}</h2>
                  <p className="text-sm text-gray-500 mb-4">{s.blurb}</p>
                  <span className="inline-flex items-center gap-1 text-sm font-bold text-indigo-600">
                    Start learning <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>

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
