"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, RotateCcw, Lightbulb, CheckCircle2, Eye, Printer, MonitorPlay } from "lucide-react";
import InlineMath from "@/components/InlineMath";
import BlockRenderer from "@/components/whiteboard/BlockRenderer";
import WhiteboardTutor from "@/components/WhiteboardTutor";
import StepController from "@/components/ks2/StepController";
import { getTopicVisual } from "@/lib/ks2-visuals";
import type { KS2SubjectId } from "@/lib/ks2";
import { targetMeta, tierMeta, type KS2Target, type KS2Tier } from "@/lib/ks2-pathway";
import { applyMethodBuilderToWorkedExample } from "@/lib/methods/apply-builder";
import type { TeachingStep } from "@/lib/methods/types";
import type { VisualBlock, WhiteboardResponse } from "@/types/whiteboard";
import type {
  KS2CommonMistake,
  KS2PracticeItem,
  KS2TeachingBlock,
} from "@/types/ks2-lesson";

export interface LessonSection {
  heading: string;
  body: string;
  emoji?: string;
}
export interface WorkedExampleWhiteboard {
  intro: string;
  blocks: VisualBlock[];
  conclusion: string;
}
export interface WorkedExample {
  question: string;
  steps: string[];
  answer: string;
  emoji?: string;
  whiteboard?: WorkedExampleWhiteboard;
  /** Builder teaching script — title + explanation + why for each step */
  teachingSteps?: TeachingStep[];
}
export interface KS2Lesson {
  intro: string;
  heroEmoji?: string;
  sections: LessonSection[];
  workedExample: WorkedExample;
  keyPoints: string[];
  tryThis?: { question: string; answer: string };
  schemaVersion?: 2;
  learningObjective?: string;
  prerequisiteKnowledge?: string[];
  teachingBlocks?: KS2TeachingBlock[];
  commonMistakes?: KS2CommonMistake[];
  guidedPractice?: KS2PracticeItem[];
  independentPractice?: KS2PracticeItem[];
  quickCheck?: KS2PracticeItem;
  recap?: string;
  yearGroup?: string;
  strand?: string;
  skill?: string;
  method?: string;
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

const CACHE_PREFIX = "mathrix_ks2_lesson_v19_";
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((x) => String(x)) : [];
}

function asTeachingSteps(value: unknown): TeachingStep[] {
  return Array.isArray(value) ? (value as TeachingStep[]) : [];
}

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
  const [includeTryAnswer, setIncludeTryAnswer] = useState(true);
  const [fromLibrary, setFromLibrary] = useState(false);
  const [watchMode, setWatchMode] = useState(false);
  const [tryWatchMode, setTryWatchMode] = useState(false);

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
    setFromLibrary(false);
    try {
      const res = await fetch("/api/ks2-lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicId,
          subject: subjectName,
          topic: topicName,
          subtopics,
          target,
          tier,
          kind,
          force,
        }),
      });
      if (!res.ok) throw new Error("failed");
      const data = (await res.json()) as { lesson: KS2Lesson; cached?: boolean };
      setLesson(data.lesson);
      setFromLibrary(data.cached === true);
      writeCache(key, data.lesson);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setShowTryAnswer(false);
    setTryWatchMode(false);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicName, target, tier, kind]);

  const displayExample = useMemo(() => {
    if (!lesson?.workedExample?.question) return lesson?.workedExample;
    // Deterministic builders only for maths Learn/Guided worksheets.
    if (subjectId !== "maths") return lesson.workedExample;
    return applyMethodBuilderToWorkedExample(
      lesson.workedExample,
      topicName,
      subtopics,
    );
  }, [lesson?.workedExample, topicName, subtopics, subjectId]);

  const workedWhiteboard: WhiteboardResponse | null =
    displayExample?.whiteboard &&
    Array.isArray(displayExample.whiteboard.blocks) &&
    displayExample.whiteboard.blocks.length > 0
      ? {
          intro: displayExample.whiteboard.intro || displayExample.question,
          blocks: displayExample.whiteboard.blocks,
          conclusion:
            displayExample.whiteboard.conclusion || displayExample.answer,
          subject: subjectName,
          topic: topicName,
        }
      : null;

  /** Full solution for "Now you try" — builder board + steps when maths parses. */
  const trySolution = useMemo((): WorkedExample | null => {
    if (!lesson?.tryThis?.question) return null;
    if (subjectId !== "maths") {
      return {
        question: lesson.tryThis.question,
        steps: [],
        answer: lesson.tryThis.answer || "",
      };
    }
    return applyMethodBuilderToWorkedExample(
      {
        question: lesson.tryThis.question,
        steps: [],
        answer: lesson.tryThis.answer || "",
      },
      topicName,
      subtopics,
    );
  }, [lesson?.tryThis, topicName, subtopics, subjectId]);

  const tryWhiteboard: WhiteboardResponse | null =
    trySolution?.whiteboard &&
    Array.isArray(trySolution.whiteboard.blocks) &&
    trySolution.whiteboard.blocks.length > 0
      ? {
          intro: trySolution.whiteboard.intro || trySolution.question,
          blocks: trySolution.whiteboard.blocks,
          conclusion:
            trySolution.whiteboard.conclusion ||
            trySolution.answer ||
            lesson?.tryThis?.answer ||
            "",
          subject: subjectName,
          topic: topicName,
        }
      : null;

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
    <>
      {watchMode && workedWhiteboard && (
        <WhiteboardTutor data={workedWhiteboard} onClose={() => setWatchMode(false)} />
      )}
      {tryWatchMode && tryWhiteboard && (
        <WhiteboardTutor data={tryWhiteboard} onClose={() => setTryWatchMode(false)} />
      )}
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.08 } } }}
      className="space-y-5"
    >
      <div className="flex flex-wrap items-center gap-3 justify-end">
        {fromLibrary && (
          <p className="text-[12px] font-medium text-indigo-600 mr-auto">Loaded from saved lesson library</p>
        )}
          {lesson.tryThis && (
            <label className="inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeTryAnswer}
                onChange={(e) => setIncludeTryAnswer(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              Include try-this answer
            </label>
          )}
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-gray-800"
          >
            <Printer size={14} /> Print
          </button>
      </div>

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

      {/* Teaching engine: objective + prior knowledge */}
      {lesson.learningObjective && (
        <motion.div
          variants={fadeUp}
          className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4"
        >
          <p className="text-[12px] font-bold uppercase tracking-wide text-sky-600 mb-1">
            Learning objective
          </p>
          <p className="text-gray-900 font-medium">
            <InlineMath text={lesson.learningObjective} />
          </p>
          {lesson.method && (
            <p className="mt-1 text-[13px] text-sky-800">Method: {lesson.method}</p>
          )}
        </motion.div>
      )}
      {Array.isArray(lesson.prerequisiteKnowledge) &&
        lesson.prerequisiteKnowledge.length > 0 && (
          <motion.div variants={fadeUp} className="rounded-2xl bg-gray-50 border border-gray-200 p-4">
            <p className="text-[12px] font-bold uppercase tracking-wide text-gray-500 mb-2">
              You should already know
            </p>
            <ul className="space-y-1">
              {lesson.prerequisiteKnowledge.map((p, i) => (
                <li key={i} className="text-gray-700 text-sm flex gap-2">
                  <span className="text-gray-400">•</span>
                  <InlineMath text={p} />
                </li>
              ))}
            </ul>
          </motion.div>
        )}

      {/* Sections */}
      {(Array.isArray(lesson.sections) ? lesson.sections : []).map((s, i) => (
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

      {/* Extra teaching blocks (tips, definitions) */}
      {(lesson.teachingBlocks || [])
        .filter((b) =>
          ["definition", "teacherExplanation", "teacherTip", "conceptExplanation"].includes(
            b.type,
          ),
        )
        .map((b, i) => (
          <motion.div
            key={`tb-${i}`}
            variants={fadeUp}
            className="rounded-xl border border-gray-100 bg-white p-3"
          >
            {b.title && (
              <p className="text-[12px] font-bold uppercase tracking-wide text-gray-500 mb-1">
                {b.title}
              </p>
            )}
            <p className="text-gray-800 text-sm">
              <InlineMath text={b.body} />
            </p>
            {b.visual && (
              <div className="mt-2">
                <BlockRenderer block={b.visual} index={i} baseDelay={0.05} />
              </div>
            )}
          </motion.div>
        ))}

      {/* Worked example */}
      {displayExample && displayExample.question && (
        <motion.div variants={fadeUp} className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <p className="text-[12px] font-bold uppercase tracking-wide text-indigo-500">
              {displayExample.emoji ? `${displayExample.emoji} ` : ""}Worked example
            </p>
            {workedWhiteboard && (
              <button
                type="button"
                onClick={() => setWatchMode(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-100 px-3 py-1.5 text-[12px] font-semibold text-indigo-700 hover:bg-indigo-200"
              >
                <MonitorPlay size={14} /> Watch me solve it
              </button>
            )}
          </div>
          <p className="font-medium text-gray-900 mb-3">{<InlineMath text={displayExample.question} />}</p>

          {workedWhiteboard && (
            <div className="mb-4 space-y-3 rounded-xl bg-white/80 p-3 border border-indigo-100">
              {workedWhiteboard.intro && (
                <p className="text-sm text-gray-600">{<InlineMath text={workedWhiteboard.intro} />}</p>
              )}
              {(workedWhiteboard.blocks || []).map((block, bi) => (
                <BlockRenderer key={bi} block={block} index={bi} baseDelay={0.1 + bi * 0.2} />
              ))}
            </div>
          )}

          {asTeachingSteps(displayExample.teachingSteps).length > 0 ? (
            <StepController
              steps={asTeachingSteps(displayExample.teachingSteps)}
              answer={displayExample.answer}
            />
          ) : (
            <>
              <ol className="space-y-2.5">
                {asStringArray(displayExample.steps).map((step, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 + i * 0.12 }}
                    className="flex gap-2 text-gray-700"
                  >
                    <span className="font-bold text-indigo-500 shrink-0">{i + 1}.</span>
                    <p>
                      <InlineMath text={step} />
                    </p>
                  </motion.li>
                ))}
              </ol>
              {displayExample.answer && (
                <p className="mt-3 flex items-center gap-2 font-semibold text-emerald-700">
                  <CheckCircle2 size={16} /> <InlineMath text={displayExample.answer} />
                </p>
              )}
            </>
          )}
        </motion.div>
      )}

      {/* Common mistakes */}
      {Array.isArray(lesson.commonMistakes) && lesson.commonMistakes.length > 0 && (
        <motion.div variants={fadeUp} className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4">
          <p className="text-[12px] font-bold uppercase tracking-wide text-rose-600 mb-2">
            Common mistake
          </p>
          <ul className="space-y-3">
            {lesson.commonMistakes.map((m, i) => (
              <li key={i} className="text-sm space-y-1">
                <p className="text-rose-900">
                  <span className="font-semibold">Watch out: </span>
                  <InlineMath text={m.mistake} />
                </p>
                <p className="text-emerald-800">
                  <span className="font-semibold">Instead: </span>
                  <InlineMath text={m.correction} />
                </p>
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Key points */}
      {asStringArray(lesson.keyPoints).length > 0 && (
        <motion.div variants={fadeUp} className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
          <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wide text-amber-600 mb-2">
            <Lightbulb size={14} /> Remember
          </p>
          <ul className="space-y-1">
            {asStringArray(lesson.keyPoints).map((k, i) => (
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

      {lesson.recap && (
        <motion.div variants={fadeUp} className="rounded-2xl border border-violet-200 bg-violet-50/60 p-4">
          <p className="text-[12px] font-bold uppercase tracking-wide text-violet-600 mb-1">
            Recap
          </p>
          <p className="text-gray-800">
            <InlineMath text={lesson.recap} />
          </p>
        </motion.div>
      )}

      {/* Guided practice */}
      {Array.isArray(lesson.guidedPractice) && lesson.guidedPractice.length > 0 && (
        <motion.div variants={fadeUp} className="rounded-2xl border border-teal-200 bg-teal-50/60 p-4">
          <p className="text-[12px] font-bold uppercase tracking-wide text-teal-700 mb-2">
            Guided practice
          </p>
          <ul className="space-y-3">
            {lesson.guidedPractice.map((item, i) => (
              <li key={i} className="text-sm space-y-1">
                <p className="font-medium text-gray-900">
                  <InlineMath text={item.question} />
                </p>
                {item.hint && (
                  <p className="text-[13px] text-teal-800">
                    <span className="font-semibold">Hint: </span>
                    <InlineMath text={item.hint} />
                  </p>
                )}
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Independent / quick check */}
      {Array.isArray(lesson.independentPractice) &&
        lesson.independentPractice.length > 0 && (
          <motion.div variants={fadeUp} className="rounded-2xl border border-gray-200 bg-white p-4">
            <p className="text-[12px] font-bold uppercase tracking-wide text-gray-500 mb-2">
              Independent practice
            </p>
            <ul className="space-y-2">
              {lesson.independentPractice.map((item, i) => (
                <li key={i} className="text-sm text-gray-800">
                  <InlineMath text={item.question} />
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      {lesson.quickCheck?.question && (
        <motion.div variants={fadeUp} className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4">
          <p className="text-[12px] font-bold uppercase tracking-wide text-indigo-600 mb-1">
            Quick check
          </p>
          <p className="font-medium text-gray-900">
            <InlineMath text={lesson.quickCheck.question} />
          </p>
        </motion.div>
      )}

      {/* Try this */}
      {lesson.tryThis && (
        <motion.div variants={fadeUp} className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/60 p-4">
          <p className="text-[12px] font-bold uppercase tracking-wide text-emerald-600 mb-1">Now you try</p>
          <p className="font-medium text-gray-900 mb-3">{<InlineMath text={lesson.tryThis.question} />}</p>
          {showTryAnswer ? (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[12px] font-bold uppercase tracking-wide text-emerald-700">
                  Full solution
                </p>
                {tryWhiteboard && (
                  <button
                    type="button"
                    onClick={() => setTryWatchMode(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-100 px-3 py-1.5 text-[12px] font-semibold text-emerald-800 hover:bg-emerald-200"
                  >
                    <MonitorPlay size={14} /> Watch me solve it
                  </button>
                )}
              </div>

              {trySolution?.whiteboard &&
                Array.isArray(trySolution.whiteboard.blocks) &&
                trySolution.whiteboard.blocks.length > 0 && (
                <div className="space-y-3 rounded-xl bg-white/90 p-3 border border-emerald-100">
                  {trySolution.whiteboard.intro && (
                    <p className="text-sm text-gray-600">
                      <InlineMath text={trySolution.whiteboard.intro} />
                    </p>
                  )}
                  {trySolution.whiteboard.blocks.map((block, bi) => (
                    <BlockRenderer
                      key={bi}
                      block={block}
                      index={bi}
                      baseDelay={0.05 + bi * 0.15}
                    />
                  ))}
                </div>
              )}

              {(asTeachingSteps(trySolution?.teachingSteps).length ||
                asStringArray(trySolution?.steps).length) ? (
                <ol className="space-y-2.5">
                  {(asTeachingSteps(trySolution?.teachingSteps).length > 0
                    ? asTeachingSteps(trySolution?.teachingSteps)
                    : asStringArray(trySolution?.steps).map(
                        (step): TeachingStep => ({
                          title: "",
                          explanation: step,
                          narration: step,
                          cellKeys: [],
                          carryKeys: [],
                          noteKeys: [],
                        }),
                      )
                  ).map((step, i) => (
                    <li key={i} className="flex gap-2 text-gray-700">
                      <span className="font-bold text-emerald-600 shrink-0">{i + 1}.</span>
                      <div className="min-w-0 space-y-0.5">
                        {step.title ? (
                          <p className="font-semibold text-gray-900 text-[15px]">
                            {step.title}
                          </p>
                        ) : null}
                        <p className="text-gray-700">
                          <InlineMath text={step.explanation} />
                        </p>
                        {step.why ? (
                          <p className="text-[13px] text-amber-800/90 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1">
                            <span className="font-semibold text-amber-700">Why: </span>
                            {step.why}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ol>
              ) : null}

              <p className="flex items-center gap-2 font-semibold text-emerald-700">
                <CheckCircle2 size={16} />{" "}
                <InlineMath
                  text={
                    trySolution?.answer ||
                    lesson.tryThis.answer ||
                    "Check with your teacher."
                  }
                />
              </p>
            </motion.div>
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

      {/* Print-only lesson (hidden on screen) */}
      <div className="ks2-print-root">
        <div style={{ borderBottom: "2px solid #000", paddingBottom: "8px", marginBottom: "16px" }}>
          <div style={{ fontSize: "20px", fontWeight: 700 }}>
            {subjectName}: {topicName}
          </div>
          <div style={{ fontSize: "12px", marginTop: "2px" }}>
            {kind === "guided" ? "Guided practice" : "Learn lesson"} · {targetMeta(target).label} ·{" "}
            {tierMeta(tier).label} ({tierMeta(tier).standard})
          </div>
        </div>

        {lesson.intro && (
          <p style={{ fontSize: "14px", lineHeight: 1.55, marginBottom: "16px" }}>
            <InlineMath text={lesson.intro} />
          </p>
        )}

        {(Array.isArray(lesson.sections) ? lesson.sections : []).map((s, i) => (
          <div key={i} className="ks2-print-question" style={{ marginBottom: "14px", fontSize: "14px", lineHeight: 1.5 }}>
            {s.heading && (
              <div style={{ fontWeight: 700, marginBottom: "4px" }}>
                {s.emoji ? `${s.emoji} ` : ""}
                <InlineMath text={s.heading} />
              </div>
            )}
            <p style={{ margin: 0 }}>
              <InlineMath text={s.body} />
            </p>
          </div>
        ))}

        {displayExample?.question && (
          <div className="ks2-print-question" style={{ marginBottom: "16px", fontSize: "14px", lineHeight: 1.5 }}>
            <div style={{ fontWeight: 700, marginBottom: "6px" }}>
              {displayExample.emoji ? `${displayExample.emoji} ` : ""}Worked example
            </div>
            <p style={{ fontWeight: 600, margin: "0 0 8px" }}>
              <InlineMath text={displayExample.question} />
            </p>
            <ol style={{ margin: 0, paddingLeft: "20px" }}>
              {asStringArray(displayExample.steps).map((step, i) => (
                <li key={i} style={{ marginBottom: "4px" }}>
                  <InlineMath text={step} />
                </li>
              ))}
            </ol>
            {displayExample.answer && (
              <p style={{ margin: "8px 0 0", fontWeight: 600 }}>
                Answer: <InlineMath text={displayExample.answer} />
              </p>
            )}
          </div>
        )}

        {asStringArray(lesson.keyPoints).length > 0 && (
          <div className="ks2-print-question" style={{ marginBottom: "16px", fontSize: "14px", lineHeight: 1.5 }}>
            <div style={{ fontWeight: 700, marginBottom: "6px" }}>Remember</div>
            <ul style={{ margin: 0, paddingLeft: "20px" }}>
              {asStringArray(lesson.keyPoints).map((k, i) => (
                <li key={i} style={{ marginBottom: "4px" }}>
                  <InlineMath text={k} />
                </li>
              ))}
            </ul>
          </div>
        )}

        {lesson.tryThis && (
          <div className="ks2-print-question" style={{ fontSize: "14px", lineHeight: 1.5 }}>
            <div style={{ fontWeight: 700, marginBottom: "6px" }}>Now you try</div>
            <p style={{ margin: "0 0 8px" }}>
              <InlineMath text={lesson.tryThis.question} />
            </p>
            {includeTryAnswer && (
              <>
                {(asTeachingSteps(trySolution?.teachingSteps).length ||
                  asStringArray(trySolution?.steps).length) ? (
                  <ol style={{ margin: "0 0 8px", paddingLeft: "20px" }}>
                    {(asTeachingSteps(trySolution?.teachingSteps).length > 0
                      ? asTeachingSteps(trySolution?.teachingSteps).map((s) => s.explanation)
                      : asStringArray(trySolution?.steps)
                    ).map((step, i) => (
                      <li key={i} style={{ marginBottom: "4px" }}>
                        <InlineMath text={step} />
                      </li>
                    ))}
                  </ol>
                ) : null}
                {(trySolution?.answer || lesson.tryThis.answer) && (
                  <p style={{ margin: 0, fontWeight: 600 }}>
                    Answer:{" "}
                    <InlineMath
                      text={trySolution?.answer || lesson.tryThis.answer}
                    />
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Accent underline */}
      <div className="h-1 w-16 rounded-full" style={{ background: accentHex }} />
    </motion.div>
    </>
  );
}
