"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { AnimatePresence } from "framer-motion";
import {
  Sparkles,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  CheckCircle2,
  XCircle,
  Shuffle,
  BookOpen,
} from "lucide-react";
import { SUBJECTS } from "@/lib/subjects";
import {
  getQuestions,
  getQuestionCounts,
  type Difficulty,
  type QuestionBankEntry,
} from "@/lib/question-bank";
import {
  getSkillData,
  getMastery,
  getAccuracy,
  recordCorrect,
  recordIncorrect,
  type MasteryLevel,
} from "@/lib/skills";
import InlineMath from "@/components/InlineMath";
import PracticeWhiteboardModal from "@/components/PracticeWhiteboardModal";

const MASTERY_COLOR: Record<MasteryLevel, string> = {
  unseen: "bg-gray-600",
  learning: "bg-yellow-500",
  practiced: "bg-blue-500",
  confident: "bg-violet-500",
  mastered: "bg-emerald-500",
};

const DIFFICULTY_STYLE: Record<Difficulty, { label: string; bg: string; ring: string }> = {
  easy: { label: "Easy", bg: "bg-emerald-500/10 text-emerald-400", ring: "ring-emerald-500/30" },
  medium: { label: "Medium", bg: "bg-amber-500/10 text-amber-400", ring: "ring-amber-500/30" },
  hard: { label: "Hard", bg: "bg-red-500/10 text-red-400", ring: "ring-red-500/30" },
};

const mathsSubject = SUBJECTS.find((s) => s.id === "maths")!;

export default function PracticeHub() {
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [currentQ, setCurrentQ] = useState<QuestionBankEntry | null>(null);
  const [queueIndex, setQueueIndex] = useState(0);
  const [queue, setQueue] = useState<QuestionBankEntry[]>([]);
  const [showAnswer, setShowAnswer] = useState(false);
  const [reported, setReported] = useState(false);
  const [aiQuestion, setAiQuestion] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [skillData, setSkillData] = useState(getSkillData());
  const [helpQuestion, setHelpQuestion] = useState<string | null>(null);

  // Refresh skill data from localStorage
  const refreshSkills = useCallback(() => setSkillData(getSkillData()), []);

  // Load questions when topic/difficulty changes
  useEffect(() => {
    if (!expandedTopic) return;
    const qs = getQuestions(expandedTopic, difficulty);
    setQueue(qs);
    setQueueIndex(0);
    setCurrentQ(qs[0] || null);
    setShowAnswer(false);
    setReported(false);
    setAiQuestion(null);
  }, [expandedTopic, difficulty]);

  const loadNext = useCallback(() => {
    setShowAnswer(false);
    setReported(false);
    setAiQuestion(null);
    const nextIdx = queueIndex + 1;
    if (nextIdx < queue.length) {
      setQueueIndex(nextIdx);
      setCurrentQ(queue[nextIdx]);
    } else {
      // Exhausted bank — fetch AI question
      fetchAiQuestion();
    }
  }, [queueIndex, queue]);

  const fetchAiQuestion = async () => {
    if (!expandedTopic) return;
    setAiLoading(true);
    setCurrentQ(null);
    try {
      const topic = mathsSubject.topics.find((t) => t.id === expandedTopic);
      const res = await fetch("/api/generate-practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic?.name || expandedTopic,
          tier: "GCSE",
          difficulty,
        }),
      });
      const data = await res.json();
      if (data.question) {
        setAiQuestion(data.question);
      }
    } catch {
      setAiQuestion("Failed to generate question. Try again.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleSelfReport = (correct: boolean) => {
    if (!expandedTopic) return;
    const topic = mathsSubject.topics.find((t) => t.id === expandedTopic);
    const subtopic = currentQ?.subtopic || topic?.name || expandedTopic;
    const key = `${topic?.name || expandedTopic} — ${subtopic}`;
    if (correct) {
      recordCorrect(key);
    } else {
      recordIncorrect(key);
    }
    setReported(true);
    refreshSkills();
  };

  const questionText = currentQ?.questionText || aiQuestion;
  const answerText = currentQ?.answer;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-100">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Sparkles size={14} className="text-white" />
          </div>
          <span className="font-bold text-white">Mathrix</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/syllabus" className="text-sm text-gray-400 hover:text-white transition-colors">Syllabus</Link>
          <Link href="/revision" className="text-sm text-gray-400 hover:text-white transition-colors">Revision</Link>
          <Link href="/exam-papers" className="text-sm text-gray-400 hover:text-white transition-colors">Exam Papers</Link>
          <Link
            href="/chat"
            className="text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-1"
          >
            Open tutor <ArrowRight size={14} />
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-indigo-400 text-sm font-medium mb-2">
            <BookOpen size={16} />
            Practice Hub
          </div>
          <h1 className="text-3xl font-extrabold text-white mb-2">Question Bank</h1>
          <p className="text-gray-400 text-sm">
            Choose a topic, pick your difficulty, and start practising. Stuck? Hit &quot;Need Help&quot; to open the AI tutor.
          </p>
        </div>

        {/* Mastery legend */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          {(["unseen", "learning", "practiced", "confident", "mastered"] as MasteryLevel[]).map((m) => (
            <div key={m} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${MASTERY_COLOR[m]}`} />
              <span className="text-[11px] text-gray-500 capitalize">{m}</span>
            </div>
          ))}
        </div>

        {/* Topic list */}
        <div className="space-y-3">
          {mathsSubject.topics.map((topic) => {
            const isExpanded = expandedTopic === topic.id;
            const counts = getQuestionCounts(topic.id);
            const totalQs = counts.easy + counts.medium + counts.hard;

            // Aggregate mastery across topic subtopics
            const topicKeys = topic.subtopics.map((s) => `${topic.name} — ${s}`);
            const topicRecords = topicKeys.map((k) => skillData[k]).filter(Boolean);
            const avgMastery: MasteryLevel =
              topicRecords.length === 0
                ? "unseen"
                : getMastery(
                    topicRecords.reduce(
                      (acc, r) => ({
                        attempts: acc.attempts + r.attempts,
                        correct: acc.correct + r.correct,
                        lastSeen: Math.max(acc.lastSeen, r.lastSeen),
                      }),
                      { attempts: 0, correct: 0, lastSeen: 0 },
                    ),
                  );

            return (
              <div key={topic.id} className="rounded-2xl border border-gray-800 overflow-hidden">
                {/* Topic header */}
                <button
                  onClick={() => setExpandedTopic(isExpanded ? null : topic.id)}
                  className="w-full flex items-center justify-between px-5 py-4 bg-gray-900/50 hover:bg-gray-900/70 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${MASTERY_COLOR[avgMastery]}`} />
                    <span className="font-semibold text-white">{topic.name}</span>
                    <span className="text-xs text-gray-500">{totalQs} questions</span>
                  </div>
                  {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-5 py-5 bg-gray-900/30 border-t border-gray-800 space-y-5">
                    {/* Difficulty tabs */}
                    <div className="flex gap-2">
                      {(["easy", "medium", "hard"] as Difficulty[]).map((d) => {
                        const style = DIFFICULTY_STYLE[d];
                        const isActive = difficulty === d;
                        return (
                          <button
                            key={d}
                            onClick={() => setDifficulty(d)}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                              isActive
                                ? `${style.bg} ring-2 ${style.ring}`
                                : "text-gray-500 hover:text-gray-300"
                            }`}
                          >
                            {style.label}
                            <span className="ml-1 text-[11px] opacity-60">
                              ({counts[d]})
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Subtopic mastery pills */}
                    <div className="flex flex-wrap gap-2">
                      {topic.subtopics.map((sub) => {
                        const key = `${topic.name} — ${sub}`;
                        const rec = skillData[key];
                        const m = getMastery(rec);
                        const acc = getAccuracy(rec);
                        return (
                          <span
                            key={sub}
                            className="text-[11px] text-gray-400 bg-gray-800 rounded-lg px-2.5 py-1 flex items-center gap-1.5"
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${MASTERY_COLOR[m]}`} />
                            {sub}
                            {rec && rec.attempts > 0 && (
                              <span className="text-gray-500">{acc}%</span>
                            )}
                          </span>
                        );
                      })}
                    </div>

                    {/* Question card */}
                    <div className="rounded-xl border border-gray-700 bg-gray-900/60 p-5 min-h-[120px]">
                      {aiLoading ? (
                        <div className="flex items-center justify-center h-20">
                          <div className="animate-spin w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full" />
                          <span className="ml-3 text-sm text-gray-400">Generating question…</span>
                        </div>
                      ) : questionText ? (
                        <div>
                          <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                            <InlineMath text={questionText} />
                          </div>
                          {currentQ?.hintText && !showAnswer && (
                            <p className="mt-3 text-xs text-indigo-400 italic">
                              Hint: <InlineMath text={currentQ.hintText} />
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm text-center py-4">
                          No questions available for this difficulty. Try another or let AI generate one.
                        </p>
                      )}

                      {/* Answer reveal */}
                      {showAnswer && answerText && (
                        <div className="mt-4 pt-4 border-t border-gray-700">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Answer</p>
                          <div className="text-sm text-white">
                            <InlineMath text={answerText} />
                          </div>
                        </div>
                      )}

                      {/* AI-generated question answer note */}
                      {showAnswer && aiQuestion && !answerText && (
                        <div className="mt-4 pt-4 border-t border-gray-700">
                          <p className="text-xs text-gray-500">
                            AI-generated question — use &quot;Need Help&quot; for a full worked solution.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    {(questionText || aiQuestion) && (
                      <div className="flex flex-wrap gap-2">
                        {!showAnswer && (questionText || aiQuestion) && (
                          <button
                            onClick={() => setShowAnswer(true)}
                            className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm text-gray-200 transition-colors"
                          >
                            Show Answer
                          </button>
                        )}

                        {showAnswer && !reported && (
                          <>
                            <button
                              onClick={() => handleSelfReport(true)}
                              className="px-4 py-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-sm text-emerald-400 transition-colors flex items-center gap-1.5"
                            >
                              <CheckCircle2 size={14} /> I got it right
                            </button>
                            <button
                              onClick={() => handleSelfReport(false)}
                              className="px-4 py-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-sm text-red-400 transition-colors flex items-center gap-1.5"
                            >
                              <XCircle size={14} /> I got it wrong
                            </button>
                          </>
                        )}

                        {reported && (
                          <button
                            onClick={loadNext}
                            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm text-white transition-colors flex items-center gap-1.5"
                          >
                            <Shuffle size={14} /> Next Question
                          </button>
                        )}

                        <button
                          onClick={() => setHelpQuestion(questionText || aiQuestion || "")}
                          className="px-4 py-2 rounded-lg bg-violet-600/20 hover:bg-violet-600/30 text-sm text-violet-400 transition-colors flex items-center gap-1.5 ml-auto"
                        >
                          <HelpCircle size={14} /> Need Help
                        </button>
                      </div>
                    )}

                    {/* Generate AI question when no bank questions */}
                    {!questionText && !aiQuestion && !aiLoading && (
                      <button
                        onClick={fetchAiQuestion}
                        className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm text-white transition-colors"
                      >
                        Generate AI Question
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Whiteboard help modal */}
      <AnimatePresence>
        {helpQuestion && (
          <PracticeWhiteboardModal
            question={helpQuestion}
            onClose={() => setHelpQuestion(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
