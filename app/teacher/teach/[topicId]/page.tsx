"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { getKS2TopicById, sectionUsesYear } from "@/lib/ks2";
import { getTopicVisual } from "@/lib/ks2-visuals";
import {
  KS2_TARGETS,
  KS2_TIERS,
  targetTierPhrase,
  type KS2Target,
  type KS2Tier,
} from "@/lib/ks2-pathway";

/**
 * Projector-friendly whole-class teaching view.
 * Big text, one teaching point at a time, prev/next navigation, and a button
 * to launch the live AI lesson for the current point on the board.
 */
export default function TeachPage({ params }: { params: Promise<{ topicId: string }> }) {
  const { topicId } = use(params);
  const router = useRouter();
  const ctx = useMemo(() => getKS2TopicById(topicId), [topicId]);

  const [step, setStep] = useState(0);
  const [target, setTarget] = useState<KS2Target>("curriculum");
  const [tier, setTier] = useState<KS2Tier>("secure");

  if (!ctx) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-white">
        <p className="text-gray-600">That topic could not be found.</p>
        <Link href="/teacher/classes" className="text-indigo-600 font-medium flex items-center gap-1">
          <ArrowLeft size={16} /> Back
        </Link>
      </div>
    );
  }

  const { topic, subject, section, year } = ctx;
  const { Icon, accent } = getTopicVisual(topic.id, topic.name, subject.id);

  // Teaching points: an intro slide + one slide per subtopic.
  const points = ["Today's topic", ...topic.subtopics];
  const total = points.length;
  const current = points[step];
  const isIntro = step === 0;

  function launchLesson() {
    const std = targetTierPhrase(target, tier);
    const focus = isIntro ? topic.name : `${topic.name}: ${current}`;
    const prompt = `Teach the whole class "${focus}" in ${subject.name} at ${std}. Explain clearly with a worked example suitable for showing on a board to Year 5/6 pupils.`;
    try {
      localStorage.setItem("mathrix_tier", "KS2");
    } catch {
      /* ignore */
    }
    router.push(`/?q=${encodeURIComponent(prompt)}`);
  }

  return (
    <div className={`min-h-screen flex flex-col ${accent.bg}`}>
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4">
        <Link href="/teacher/assign" className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 font-medium">
          <ArrowLeft size={16} /> Exit
        </Link>
        <span className="text-sm text-gray-500">
          {subject.name} · {sectionUsesYear(section) ? year : section === "sats" ? "SATs" : "11+"}
        </span>
      </header>

      {/* Controls */}
      <div className="px-6 flex flex-wrap items-center gap-2">
        <div className="flex gap-1 bg-white/70 rounded-xl p-0.5">
          {KS2_TARGETS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTarget(t.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${target === t.id ? "bg-indigo-600 text-white" : "text-gray-600"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-white/70 rounded-xl p-0.5">
          {KS2_TIERS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTier(t.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${tier === t.id ? "bg-indigo-600 text-white" : "text-gray-600"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Slide */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className={`w-24 h-24 sm:w-32 sm:h-32 rounded-3xl bg-gradient-to-br ${accent.gradient} flex items-center justify-center mb-8 shadow-lg`}>
          <Icon size={64} className="text-white" strokeWidth={2} />
        </div>

        {isIntro ? (
          <>
            <p className="text-xl text-gray-500 mb-2">Today we are learning</p>
            <h1 className={`text-4xl sm:text-6xl font-extrabold ${accent.text} max-w-4xl`}>{topic.name}</h1>
            <p className="mt-6 text-lg text-gray-500">{topic.subtopics.length} things we&rsquo;ll master together</p>
          </>
        ) : (
          <>
            <p className="text-xl text-gray-500 mb-3">
              Step {step} of {total - 1}
            </p>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-gray-900 max-w-4xl leading-tight">{current}</h1>
          </>
        )}

        <button
          onClick={launchLesson}
          className="mt-10 flex items-center gap-2 rounded-2xl bg-indigo-600 text-white px-7 py-3.5 text-lg font-bold hover:bg-indigo-700 shadow-md"
        >
          <Sparkles size={20} /> Show me on the board
        </button>
      </main>

      {/* Footer nav */}
      <footer className="px-6 py-6 flex items-center justify-between">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="flex items-center gap-2 rounded-2xl bg-white px-6 py-3 text-lg font-semibold text-gray-700 shadow-sm disabled:opacity-40"
        >
          <ChevronLeft size={22} /> Back
        </button>

        <div className="flex items-center gap-1.5">
          {points.map((_, i) => (
            <span key={i} className={`h-2.5 rounded-full transition-all ${i === step ? "w-6 bg-indigo-600" : "w-2.5 bg-gray-300"}`} />
          ))}
        </div>

        <button
          onClick={() => setStep((s) => Math.min(total - 1, s + 1))}
          disabled={step === total - 1}
          className="flex items-center gap-2 rounded-2xl bg-white px-6 py-3 text-lg font-semibold text-gray-700 shadow-sm disabled:opacity-40"
        >
          Next <ChevronRight size={22} />
        </button>
      </footer>
    </div>
  );
}
