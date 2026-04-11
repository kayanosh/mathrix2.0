"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  BookOpen,
  Sparkles,
  Loader2,
  FileText,
} from "lucide-react";
import { SUBJECTS } from "@/lib/subjects";
import InlineMath from "@/components/InlineMath";
import WhiteboardRenderer from "@/components/whiteboard/WhiteboardRenderer";
import TeacherWorksheet from "@/components/TeacherWorksheet";
import type { WhiteboardResponse } from "@/types/whiteboard";
import type { TeacherQuestion, TeacherWorksheetData } from "@/types";

// ── Constants ─────────────────────────────────────────────────────────────────

const mathsSubject = SUBJECTS.find((s) => s.id === "maths")!;

const DAILY_LIMIT = 1;
const STORAGE_KEY_PREFIX = "mathrix_teacher_lessons_";
const LESSON_CACHE_PREFIX = "mathrix_teacher_cache_lesson_";
const WORKSHEET_CACHE_PREFIX = "mathrix_teacher_cache_ws_";

function getTodayKey(): string {
  return STORAGE_KEY_PREFIX + new Date().toISOString().split("T")[0];
}

function getLessonsToday(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(getTodayKey()) || "0", 10);
}

function incrementLessonsToday(): void {
  if (typeof window === "undefined") return;
  const current = getLessonsToday();
  localStorage.setItem(getTodayKey(), String(current + 1));
}

/** Build a cache key from topic + subtopic */
function cacheKey(prefix: string, topic: string, subtopic: string): string {
  return prefix + `${topic}|${subtopic}`.toLowerCase().replace(/\s+/g, "_");
}

/** Read a cached JSON value from localStorage, returns null if missing or expired (>7 days) */
function readCache<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as { data: T; ts: number };
    // Expire after 7 days
    if (Date.now() - entry.ts > 7 * 24 * 60 * 60 * 1000) {
      localStorage.removeItem(key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

/** Write a value to localStorage cache with timestamp */
function writeCache<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    // localStorage full — silently ignore
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

type Phase = "browse" | "explaining" | "explained" | "generating" | "worksheet";

export default function TeacherModePage() {
  // Topic selection
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedSubtopic, setSelectedSubtopic] = useState<string | null>(null);

  // Lesson state
  const [phase, setPhase] = useState<Phase>("browse");
  const [explanation, setExplanation] = useState<WhiteboardResponse | null>(null);
  const [worksheet, setWorksheet] = useState<TeacherWorksheetData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [isPro, setIsPro] = useState(false);

  const lessonRef = useRef<HTMLDivElement>(null);

  // ── Fetch subscription status on mount ──────────────────────────
  useEffect(() => {
    fetch("/api/usage")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.subscriptionStatus === "pro") {
          setIsPro(true);
        }
      })
      .catch(() => {});
  }, []);

  // ── Topic Explanation ───────────────────────────────────────────
  const handleSelectSubtopic = useCallback(
    async (topicName: string, subtopic: string) => {
      // Check usage limit — Pro users are unlimited
      if (!isPro && getLessonsToday() >= DAILY_LIMIT) {
        setLimitReached(true);
        return;
      }

      setSelectedTopic(topicName);
      setSelectedSubtopic(subtopic);
      setExplanation(null);
      setWorksheet(null);
      setError(null);

      // ── Check lesson cache first ──────────────────────────────
      const lessonKey = cacheKey(LESSON_CACHE_PREFIX, topicName, subtopic);
      const cachedLesson = readCache<WhiteboardResponse>(lessonKey);
      if (cachedLesson) {
        setExplanation(cachedLesson);
        setPhase("explained");
        // Also try loading cached worksheet
        const wsKey = cacheKey(WORKSHEET_CACHE_PREFIX, topicName, subtopic);
        const cachedWs = readCache<TeacherWorksheetData>(wsKey);
        if (cachedWs) {
          setWorksheet(cachedWs);
          setPhase("worksheet");
        }
        setTimeout(() => {
          lessonRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
        return;
      }

      setPhase("explaining");

      // Scroll to lesson area
      setTimeout(() => {
        lessonRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [
              {
                role: "user",
                content: `[TEACHER MODE] Explain the topic "${topicName} — ${subtopic}" with a worked example for GCSE students.`,
              },
            ],
            level: "GCSE",
            useWhiteboard: true,
            teacherMode: true,
          }),
        });

        if (!res.ok) throw new Error("Failed to get explanation");

        // Parse SSE response
        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // Parse SSE events
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const eventData = JSON.parse(line.slice(6));
                if (eventData.whiteboard) {
                  setExplanation(eventData.whiteboard);
                  setPhase("explained");
                  // Cache the lesson
                  writeCache(
                    cacheKey(LESSON_CACHE_PREFIX, topicName, subtopic),
                    eventData.whiteboard,
                  );
                }
              } catch {
                // Skip unparseable lines
              }
            }
          }
        }

        // Mark usage (only for non-Pro users)
        if (!isPro) {
          incrementLessonsToday();
        }
      } catch (err) {
        console.error("Teacher explanation error:", err);
        setError("Failed to generate topic explanation. Please try again.");
        setPhase("browse");
      }
    },
    [isPro],
  );

  // ── Question Generation ─────────────────────────────────────────
  const handleGenerateQuestions = useCallback(async () => {
    if (!selectedTopic || !selectedSubtopic) return;

    // ── Check worksheet cache first ─────────────────────────────
    const wsKey = cacheKey(WORKSHEET_CACHE_PREFIX, selectedTopic, selectedSubtopic);
    const cachedWs = readCache<TeacherWorksheetData>(wsKey);
    if (cachedWs) {
      setWorksheet(cachedWs);
      setPhase("worksheet");
      return;
    }

    setPhase("generating");
    setError(null);

    try {
      const res = await fetch("/api/teacher-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: selectedTopic,
          subtopic: selectedSubtopic,
          level: "GCSE",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.error === "limit_reached") {
          setLimitReached(true);
          setPhase("explained");
          return;
        }
        throw new Error("Failed to generate questions");
      }

      const data: TeacherWorksheetData = await res.json();
      setWorksheet(data);
      setPhase("worksheet");

      // Cache the worksheet
      writeCache(wsKey, data);
    } catch (err) {
      console.error("Question generation error:", err);
      setError("Failed to generate questions. Please try again.");
      setPhase("explained");
    }
  }, [selectedTopic, selectedSubtopic]);

  // ── Reset ───────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    setPhase("browse");
    setSelectedTopic(null);
    setSelectedSubtopic(null);
    setExplanation(null);
    setWorksheet(null);
    setError(null);
    setLimitReached(false);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white print:bg-white print:from-white print:to-white">
      {/* ── Header (hidden when printing) ────────────────────────── */}
      <header className="print:hidden sticky top-0 z-20 bg-white/80 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">Back to Tutor</span>
            </Link>
            <div className="h-5 w-px bg-slate-200" />
            <div className="flex items-center gap-1.5">
              <GraduationCap size={20} className="text-blue-600" />
              <span className="font-semibold text-slate-900">Teacher Mode</span>
            </div>
          </div>
          {phase !== "browse" && (
            <button
              onClick={handleReset}
              className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              New Lesson
            </button>
          )}
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 print:px-0 print:py-0">
        {/* ── Limit Reached Banner ──────────────────────────────── */}
        <AnimatePresence>
          {limitReached && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 rounded-lg bg-amber-50 border border-amber-200 print:hidden"
            >
              <p className="text-sm text-amber-800 font-medium">
                You&apos;ve reached the free limit of {DAILY_LIMIT} lesson per day.
              </p>
              <p className="text-sm text-amber-600 mt-1">
                Upgrade to Pro for unlimited Teacher Mode lessons.
              </p>
              <Link
                href="/account"
                className="inline-block mt-2 text-sm font-medium text-amber-700 hover:text-amber-800 underline"
              >
                Upgrade &rarr;
              </Link>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Error Banner ──────────────────────────────────────── */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 print:hidden">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* ── Two-column layout ─────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print:block">
          {/* Left: Topic Browser */}
          <aside className={`lg:col-span-4 print:hidden ${phase !== "browse" && phase !== "explained" ? "lg:col-span-3" : ""}`}>
            <div className="sticky top-20">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen size={18} className="text-blue-600" />
                <h2 className="font-semibold text-slate-900">GCSE Maths Topics</h2>
              </div>

              <div className="space-y-1">
                {mathsSubject.topics.map((topic) => {
                  const isExpanded = expandedTopic === topic.id;
                  const isActive = selectedTopic === topic.name;

                  return (
                    <div key={topic.id}>
                      <button
                        onClick={() =>
                          setExpandedTopic(isExpanded ? null : topic.id)
                        }
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isActive
                            ? "bg-blue-50 text-blue-700"
                            : "text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <span>{topic.name}</span>
                        {isExpanded ? (
                          <ChevronUp size={16} className="text-slate-400" />
                        ) : (
                          <ChevronDown size={16} className="text-slate-400" />
                        )}
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="pl-4 py-1 space-y-0.5">
                              {topic.subtopics.map((sub) => {
                                const isSelected =
                                  selectedTopic === topic.name &&
                                  selectedSubtopic === sub;
                                const isHigherOnly =
                                  topic.higherOnly?.includes(sub);

                                return (
                                  <button
                                    key={sub}
                                    onClick={() =>
                                      handleSelectSubtopic(topic.name, sub)
                                    }
                                    disabled={
                                      phase === "explaining" ||
                                      phase === "generating"
                                    }
                                    className={`w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors disabled:opacity-50 ${
                                      isSelected
                                        ? "bg-blue-100 text-blue-800 font-medium"
                                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                    }`}
                                  >
                                    <span>{sub}</span>
                                    {isHigherOnly && (
                                      <span className="ml-1.5 text-[10px] font-medium text-purple-500">
                                        H
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>

          {/* Right: Lesson Content */}
          <main
            ref={lessonRef}
            className={`lg:col-span-8 ${phase !== "browse" && phase !== "explained" ? "lg:col-span-9" : ""}`}
          >
            {/* Browse state — intro message */}
            {phase === "browse" && !selectedSubtopic && (
              <div className="flex flex-col items-center justify-center py-20 text-center print:hidden">
                <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center mb-4">
                  <GraduationCap size={32} className="text-blue-600" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">
                  Teacher Mode
                </h1>
                <p className="text-slate-500 max-w-md">
                  Select a topic from the sidebar and the AI will explain it on
                  the whiteboard with a worked example, then generate a printable
                  worksheet of 20 questions.
                </p>
              </div>
            )}

            {/* Explaining state — loading */}
            {phase === "explaining" && (
              <div className="flex flex-col items-center justify-center py-20 print:hidden">
                <Loader2
                  size={32}
                  className="text-blue-500 animate-spin mb-4"
                />
                <p className="text-slate-600 font-medium">
                  Preparing lesson on{" "}
                  <span className="text-blue-600">{selectedSubtopic}</span>...
                </p>
                <p className="text-slate-400 text-sm mt-1">
                  This may take a moment
                </p>
              </div>
            )}

            {/* Explained state — whiteboard + generate button */}
            {(phase === "explained" || phase === "generating" || phase === "worksheet") &&
              explanation && (
                <div>
                  {/* Topic badge */}
                  <div className="flex items-center gap-2 mb-4 print:hidden">
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">
                      {selectedTopic}
                    </span>
                    <span className="text-xs text-slate-400">&rarr;</span>
                    <span className="text-xs font-medium text-slate-700">
                      {selectedSubtopic}
                    </span>
                  </div>

                  {/* Whiteboard explanation */}
                  <div className="mb-6">
                    <WhiteboardRenderer data={explanation} revealAll />
                  </div>

                  {/* Generate Questions Button */}
                  {phase === "explained" && (
                    <div className="flex justify-center mb-8 print:hidden">
                      <button
                        onClick={handleGenerateQuestions}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                      >
                        <FileText size={18} />
                        Generate 20 Practice Questions
                      </button>
                    </div>
                  )}

                  {/* Generating state */}
                  {phase === "generating" && (
                    <div className="flex flex-col items-center py-8 print:hidden">
                      <Loader2
                        size={24}
                        className="text-blue-500 animate-spin mb-3"
                      />
                      <p className="text-slate-600 text-sm">
                        Generating questions...
                      </p>
                    </div>
                  )}

                  {/* Worksheet */}
                  {phase === "worksheet" && worksheet && (
                    <div className="mt-6">
                      <TeacherWorksheet
                        topic={worksheet.topic}
                        subtopic={worksheet.subtopic}
                        questions={worksheet.questions}
                        generatedAt={worksheet.generatedAt}
                      />
                    </div>
                  )}
                </div>
              )}
          </main>
        </div>
      </div>
    </div>
  );
}
