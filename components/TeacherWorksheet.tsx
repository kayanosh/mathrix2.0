"use client";

import { useState } from "react";
import { Printer, Eye, EyeOff, Sparkles } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import InlineMath from "@/components/InlineMath";
import PracticeWhiteboardModal from "@/components/PracticeWhiteboardModal";
import type { TeacherQuestion } from "@/types";

const DIFFICULTY_CONFIG = {
  easy: {
    label: "Easy",
    subtitle: "Grade 1–3",
    color: "bg-emerald-50 border-emerald-200",
    badge: "bg-emerald-100 text-emerald-700",
    dot: "bg-emerald-500",
  },
  medium: {
    label: "Medium",
    subtitle: "Grade 4–6",
    color: "bg-amber-50 border-amber-200",
    badge: "bg-amber-100 text-amber-700",
    dot: "bg-amber-500",
  },
  hard: {
    label: "Hard",
    subtitle: "Grade 7–9",
    color: "bg-red-50 border-red-200",
    badge: "bg-red-100 text-red-700",
    dot: "bg-red-500",
  },
  exam: {
    label: "Exam Style",
    subtitle: "Past paper level",
    color: "bg-purple-50 border-purple-200",
    badge: "bg-purple-100 text-purple-700",
    dot: "bg-purple-500",
  },
} as const;

interface TeacherWorksheetProps {
  topic: string;
  subtopic: string;
  questions: TeacherQuestion[];
  generatedAt: string;
}

export default function TeacherWorksheet({
  topic,
  subtopic,
  questions,
  generatedAt,
}: TeacherWorksheetProps) {
  const [showAnswers, setShowAnswers] = useState(false);
  const [explainQuestion, setExplainQuestion] = useState<string | null>(null);

  const easyQs = questions.filter((q) => q.difficulty === "easy");
  const mediumQs = questions.filter((q) => q.difficulty === "medium");
  const hardQs = questions.filter((q) => q.difficulty === "hard");
  const examQs = questions.filter((q) => q.difficulty === "exam");

  const sections = [
    { key: "easy" as const, questions: easyQs },
    { key: "medium" as const, questions: mediumQs },
    { key: "hard" as const, questions: hardQs },
    { key: "exam" as const, questions: examQs },
  ].filter((s) => s.questions.length > 0);

  const handlePrint = () => {
    window.print();
  };

  const date = new Date(generatedAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="w-full">
      {/* ── Controls (hidden when printing) ─────────────────────────── */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Worksheet: {subtopic}
          </h2>
          <p className="text-sm text-gray-500">
            {questions.length} questions &middot; {date}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAnswers(!showAnswers)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {showAnswers ? <EyeOff size={15} /> : <Eye size={15} />}
            {showAnswers ? "Hide Answers" : "Show Answers"}
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            <Printer size={15} />
            Print
          </button>
        </div>
      </div>

      {/* ── Print Header (visible only when printing) ─────────────── */}
      <div className="hidden print:block mb-6">
        <div className="flex items-center justify-between border-b-2 border-gray-900 pb-2">
          <div>
            <h1 className="text-xl font-bold">
              Mathrix &mdash; {topic}: {subtopic}
            </h1>
            <p className="text-sm text-gray-600">{date}</p>
          </div>
          <div className="text-right text-sm text-gray-600">
            <p>Name: _________________________</p>
            <p className="mt-1">Class: __________</p>
          </div>
        </div>
      </div>

      {/* ── Question Sections ─────────────────────────────────────── */}
      <div className="space-y-6 print:space-y-4">
        {sections.map((section) => {
          const config = DIFFICULTY_CONFIG[section.key];
          return (
            <div key={section.key} className="print:break-inside-avoid">
              {/* Section Header */}
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-2.5 h-2.5 rounded-full ${config.dot}`} />
                <h3 className="font-semibold text-gray-900">{config.label}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full ${config.badge}`}>
                  {config.subtitle}
                </span>
              </div>

              {/* Questions */}
              <div className={`rounded-lg border p-4 ${config.color} print:border-gray-300 print:bg-white`}>
                <ol className="space-y-3">
                  {section.questions.map((q) => (
                    <li key={q.id} className="print:break-inside-avoid">
                      <div className="flex items-start gap-2">
                        <span className="font-mono text-sm font-semibold text-gray-500 mt-0.5 min-w-[2rem]">
                          {q.id}.
                        </span>
                        <div className="flex-1">
                          <div className="text-sm text-gray-900 whitespace-pre-wrap">
                            <InlineMath text={q.questionText} />
                            {q.marks && (
                              <span className="ml-2 text-xs font-medium text-gray-500">
                                [{q.marks} marks]
                              </span>
                            )}
                          </div>

                          {/* Explain button */}
                          <button
                            onClick={() => setExplainQuestion(q.questionText)}
                            className="mt-1 flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 transition-colors print:hidden"
                          >
                            <Sparkles size={12} />
                            Explain with AI
                          </button>

                          {/* Answer (toggled) */}
                          {showAnswers && (
                            <div className="mt-1.5 pl-3 border-l-2 border-emerald-300 text-sm text-emerald-700 print:text-gray-700">
                              <InlineMath text={q.answer} />
                            </div>
                          )}

                          {/* Print: answer space */}
                          {!showAnswers && (
                            <div className="hidden print:block mt-2 h-16 border-b border-dashed border-gray-300" />
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Print Answer Key (separate page) ──────────────────────── */}
      {showAnswers && (
        <div className="hidden print:block print:break-before-page mt-8">
          <h2 className="text-lg font-bold border-b-2 border-gray-900 pb-1 mb-4">
            Answer Key
          </h2>
          <div className="columns-2 gap-6 text-sm">
            {questions.map((q) => (
              <div key={q.id} className="break-inside-avoid mb-2 flex gap-2">
                <span className="font-mono font-semibold text-gray-500 min-w-[2rem]">
                  {q.id}.
                </span>
                <span className="text-gray-800">
                  <InlineMath text={q.answer} />
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── AI Explanation Modal ───────────────────────────────────── */}
      <AnimatePresence>
        {explainQuestion && (
          <PracticeWhiteboardModal
            question={explainQuestion}
            onClose={() => setExplainQuestion(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
