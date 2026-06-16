"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, RotateCcw, Lightbulb, CheckCircle2, Eye } from "lucide-react";
import InlineMath from "@/components/InlineMath";
import { getTopicVisual } from "@/lib/ks2-visuals";
import type { KS2SubjectId } from "@/lib/ks2";
import type { KS2Target, KS2Tier } from "@/lib/ks2-pathway";

export interface LessonSection {
  heading: string;
  body: string;
  emoji?: string;
}
export interface WorkedExample {
  question: string;
  steps: string[];
  answer: string;
  emoji?: string;
}
export interface KS2Lesson {
  intro: string;
  heroEmoji?: string;
  sections: LessonSection[];
  workedExample: WorkedExample;
  keyPoints: string[];
  tryThis?: { question: string; answer: string };
}

interface Props {
  subjectId: KS2SubjectId;
  subjectName: string;
  topicId: string;
  topicName: string;
  subtopics: string[];
  target: KS2Target;
  tier: KS2Tier;
  kind: "lesson" | "guided";
  accentHex: string;
}

const CACHE_PREFIX = "mathrix_ks2_lesson_v2_";
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

function cacheKey(p: Props): string {
  return `${CACHE_PREFIX}${p.topicId}|${p.target}|${p.tier}|${p.kind}`;
}

function readCache(key: string): KS2Lesson | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as { data: KS2Lesson; ts: number };
    if (Date.now() - entry.ts > CACHE_TTL) {
      localStorage.removeItem(key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

function writeCache(key: string, data: KS2Lesson): void {
  try {
    localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    /* ignore */
  }
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function LessonPanel(props: Props) {
  const { subjectId, subjectName, topicId, topicName, subtopics, target, tier, kind, accentHex } = props;
  const [lesson, setLesson] = useState<KS2Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showTryAnswer, setShowTryAnswer] = useState(false);

  const { Icon, accent } = getTopicVisual(topicId, topicName, subjectId);

  async function load(force = false) {
    const key = cacheKey(props);
    if (!force) {
      const cached = readCache(key);
      if (cached) {
        setLesson(cached);
        setLoading(false);
        return;
      }
    }
    setLoading(true);
    setError(false);
    setShowTryAnswer(false);
    try {
      const res = await fetch("/api/ks2-lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subjectName, topic: topicName, subtopics, target, tier, kind }),
      });
      if (!res.ok) throw new Error("failed");
      const data = (await res.json()) as { lesson: KS2Lesson };
      setLesson(data.lesson);
      writeCache(key, data.lesson);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicName, target, tier, kind]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        <p className="text-sm text-gray-500">{kind === "guided" ? "Preparing your guided practice…" : "Preparing your lesson…"}</p>
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-600 mb-3">Sorry, the lesson couldn&rsquo;t load.</p>
        <button onClick={() => load(true)} className="inline-flex items-center gap-2 text-indigo-600 font-medium">
          <RotateCcw size={15} /> Try again
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.08 } } }}
      className="space-y-5"
    >
      {/* Hero badge + intro */}
      <motion.div variants={fadeUp} className="flex items-center gap-3">
        <motion.div
          initial={{ scale: 0, rotate: -12 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 16 }}
          className={`relative w-14 h-14 rounded-2xl bg-gradient-to-br ${accent.gradient} flex items-center justify-center shrink-0 shadow-sm`}
        >
          {lesson.heroEmoji ? (
            <span className="text-3xl">{lesson.heroEmoji}</span>
          ) : (
            <Icon size={26} className="text-white" strokeWidth={2.2} />
          )}
        </motion.div>
        {lesson.intro && (
          <p className="text-lg text-gray-800 leading-snug">
            <InlineMath text={lesson.intro} />
          </p>
        )}
      </motion.div>

      {/* Sections */}
      {lesson.sections.map((s, i) => (
        <motion.div key={i} variants={fadeUp} className="flex gap-3">
          {s.emoji && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.1 }}
              className="text-2xl leading-none mt-0.5 shrink-0"
              aria-hidden
            >
              {s.emoji}
            </motion.span>
          )}
          <div>
            {s.heading && <h4 className="font-bold text-gray-900 mb-1">{<InlineMath text={s.heading} />}</h4>}
            <p className="text-gray-700 leading-relaxed">{<InlineMath text={s.body} />}</p>
          </div>
        </motion.div>
      ))}

      {/* Worked example */}
      {lesson.workedExample && lesson.workedExample.question && (
        <motion.div variants={fadeUp} className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
          <p className="text-[12px] font-bold uppercase tracking-wide text-indigo-500 mb-2">
            {lesson.workedExample.emoji ? `${lesson.workedExample.emoji} ` : ""}Worked example
          </p>
          <p className="font-medium text-gray-900 mb-3">{<InlineMath text={lesson.workedExample.question} />}</p>
          <ol className="space-y-1.5">
            {lesson.workedExample.steps.map((step, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.12 }}
                className="flex gap-2 text-gray-700"
              >
                <span className="font-bold text-indigo-500 shrink-0">{i + 1}.</span>
                <span>{<InlineMath text={step} />}</span>
              </motion.li>
            ))}
          </ol>
          {lesson.workedExample.answer && (
            <p className="mt-3 flex items-center gap-2 font-semibold text-emerald-700">
              <CheckCircle2 size={16} /> <InlineMath text={lesson.workedExample.answer} />
            </p>
          )}
        </motion.div>
      )}

      {/* Key points */}
      {lesson.keyPoints.length > 0 && (
        <motion.div variants={fadeUp} className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
          <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wide text-amber-600 mb-2">
            <Lightbulb size={14} /> Remember
          </p>
          <ul className="space-y-1">
            {lesson.keyPoints.map((k, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 280, damping: 18, delay: 0.1 + i * 0.1 }}
                className="flex gap-2 text-amber-900"
              >
                <span className="shrink-0">⭐</span>
                <span>{<InlineMath text={k} />}</span>
              </motion.li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Try this */}
      {lesson.tryThis && (
        <motion.div variants={fadeUp} className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/60 p-4">
          <p className="text-[12px] font-bold uppercase tracking-wide text-emerald-600 mb-1">Now you try</p>
          <p className="font-medium text-gray-900 mb-3">{<InlineMath text={lesson.tryThis.question} />}</p>
          {showTryAnswer ? (
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 font-semibold text-emerald-700"
            >
              <CheckCircle2 size={16} /> <InlineMath text={lesson.tryThis.answer} />
            </motion.p>
          ) : (
            <button
              onClick={() => setShowTryAnswer(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-50"
            >
              <Eye size={15} /> Show answer
            </button>
          )}
        </motion.div>
      )}

      <div className="flex justify-end">
        <button onClick={() => load(true)} className="inline-flex items-center gap-1.5 text-[13px] text-gray-400 hover:text-gray-600">
          <RotateCcw size={13} /> Regenerate
        </button>
      </div>

      {/* Accent underline */}
      <div className="h-1 w-16 rounded-full" style={{ background: accentHex }} />
    </motion.div>
  );
}
