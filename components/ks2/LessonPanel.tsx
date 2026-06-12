"use client";

import { useEffect, useState } from "react";
import { Loader2, RotateCcw, Lightbulb, CheckCircle2, Eye } from "lucide-react";
import InlineMath from "@/components/InlineMath";
import type { KS2Target, KS2Tier } from "@/lib/ks2-pathway";

export interface LessonSection {
  heading: string;
  body: string;
}
export interface WorkedExample {
  question: string;
  steps: string[];
  answer: string;
}
export interface KS2Lesson {
  intro: string;
  sections: LessonSection[];
  workedExample: WorkedExample;
  keyPoints: string[];
  tryThis?: { question: string; answer: string };
}

interface Props {
  subjectName: string;
  topicId: string;
  topicName: string;
  subtopics: string[];
  target: KS2Target;
  tier: KS2Tier;
  kind: "lesson" | "guided";
  accentHex: string;
}

const CACHE_PREFIX = "mathrix_ks2_lesson_v1_";
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

export default function LessonPanel(props: Props) {
  const { subjectName, topicName, subtopics, target, tier, kind, accentHex } = props;
  const [lesson, setLesson] = useState<KS2Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showTryAnswer, setShowTryAnswer] = useState(false);

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
    <div className="space-y-5">
      {lesson.intro && <p className="text-lg text-gray-800">{<InlineMath text={lesson.intro} />}</p>}

      {lesson.sections.map((s, i) => (
        <div key={i}>
          {s.heading && <h4 className="font-bold text-gray-900 mb-1">{<InlineMath text={s.heading} />}</h4>}
          <p className="text-gray-700 leading-relaxed">{<InlineMath text={s.body} />}</p>
        </div>
      ))}

      {/* Worked example */}
      {lesson.workedExample && lesson.workedExample.question && (
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
          <p className="text-[12px] font-bold uppercase tracking-wide text-indigo-500 mb-2">Worked example</p>
          <p className="font-medium text-gray-900 mb-3">{<InlineMath text={lesson.workedExample.question} />}</p>
          <ol className="space-y-1.5">
            {lesson.workedExample.steps.map((step, i) => (
              <li key={i} className="flex gap-2 text-gray-700">
                <span className="font-bold text-indigo-500 shrink-0">{i + 1}.</span>
                <span>{<InlineMath text={step} />}</span>
              </li>
            ))}
          </ol>
          {lesson.workedExample.answer && (
            <p className="mt-3 flex items-center gap-2 font-semibold text-emerald-700">
              <CheckCircle2 size={16} /> <InlineMath text={lesson.workedExample.answer} />
            </p>
          )}
        </div>
      )}

      {/* Key points */}
      {lesson.keyPoints.length > 0 && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
          <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wide text-amber-600 mb-2">
            <Lightbulb size={14} /> Remember
          </p>
          <ul className="space-y-1">
            {lesson.keyPoints.map((k, i) => (
              <li key={i} className="flex gap-2 text-amber-900">
                <span className="shrink-0">⭐</span>
                <span>{<InlineMath text={k} />}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Try this */}
      {lesson.tryThis && (
        <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/60 p-4">
          <p className="text-[12px] font-bold uppercase tracking-wide text-emerald-600 mb-1">Now you try</p>
          <p className="font-medium text-gray-900 mb-3">{<InlineMath text={lesson.tryThis.question} />}</p>
          {showTryAnswer ? (
            <p className="flex items-center gap-2 font-semibold text-emerald-700">
              <CheckCircle2 size={16} /> <InlineMath text={lesson.tryThis.answer} />
            </p>
          ) : (
            <button
              onClick={() => setShowTryAnswer(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-50"
            >
              <Eye size={15} /> Show answer
            </button>
          )}
        </div>
      )}

      <div className="flex justify-end">
        <button onClick={() => load(true)} className="inline-flex items-center gap-1.5 text-[13px] text-gray-400 hover:text-gray-600">
          <RotateCcw size={13} /> Regenerate
        </button>
      </div>

      {/* Accent underline (keeps prop used for visual cohesion) */}
      <div className="h-1 w-16 rounded-full" style={{ background: accentHex }} />
    </div>
  );
}
