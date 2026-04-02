"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, BookOpen, Filter, GraduationCap } from "lucide-react";
import { GCSE_SYLLABUS, getSubtopicsForTier, isHigherOnly } from "@/lib/syllabus";
import type { ExamBoard, GCSETier } from "@/types";

const BOARDS: Array<Extract<ExamBoard, "AQA" | "Edexcel" | "OCR">> = ["AQA", "Edexcel", "OCR"];
const TIERS: GCSETier[] = ["foundation", "higher"];

const BOARD_LABELS: Record<string, string> = {
  AQA: "AQA (8300)",
  Edexcel: "Edexcel (1MA1)",
  OCR: "OCR (J560)",
};

export default function SyllabusPage() {
  const [board, setBoard] = useState<Extract<ExamBoard, "AQA" | "Edexcel" | "OCR">>("AQA");
  const [tier, setTier] = useState<GCSETier>("higher");
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());

  const topics = GCSE_SYLLABUS[board];

  function toggleTopic(id: string) {
    setExpandedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

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
        <div className="flex items-center gap-3">
          <Link
            href="/subjects"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Practice
          </Link>
          <Link
            href="/revision"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Revision
          </Link>
          <Link
            href="/exam-papers"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Exam Papers
          </Link>
          <Link
            href="/chat"
            className="text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-1"
          >
            Open tutor <ArrowRight size={14} />
          </Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 text-indigo-400 text-sm font-medium mb-3">
            <GraduationCap size={16} />
            GCSE Mathematics
          </div>
          <h1 className="text-4xl font-extrabold text-white mb-3">
            GCSE Maths Syllabus
          </h1>
          <p className="text-gray-400 max-w-xl">
            Browse the full GCSE Maths syllabus for AQA, Edexcel and OCR.
            Filter by exam board and tier. Click any subtopic to start learning with the AI tutor.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-8 p-4 rounded-xl border border-gray-800 bg-gray-900/40">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Filter size={14} />
            Filters
          </div>

          {/* Exam Board selector */}
          <div className="flex gap-2">
            {BOARDS.map((b) => (
              <button
                key={b}
                onClick={() => setBoard(b)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  board === b
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:text-white"
                }`}
              >
                {BOARD_LABELS[b]}
              </button>
            ))}
          </div>

          {/* Tier selector */}
          <div className="flex gap-2 ml-auto">
            {TIERS.map((t) => (
              <button
                key={t}
                onClick={() => setTier(t)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium capitalize transition-colors ${
                  tier === t
                    ? t === "higher"
                      ? "bg-purple-600 text-white"
                      : "bg-emerald-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:text-white"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Tier badge */}
        <div className="mb-6 flex items-center gap-2">
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-medium ${
              tier === "higher"
                ? "bg-purple-500/20 text-purple-300"
                : "bg-emerald-500/20 text-emerald-300"
            }`}
          >
            {tier === "higher" ? "Higher Tier" : "Foundation Tier"}
          </span>
          <span className="text-xs text-gray-500">
            {tier === "higher"
              ? "All topics including Higher-only content"
              : "Foundation topics only (Higher-only content hidden)"}
          </span>
        </div>

        {/* Topics */}
        <div className="space-y-4">
          {topics.map((topic) => {
            const subtopics = getSubtopicsForTier(topic, tier);
            const isExpanded = expandedTopics.has(topic.id);

            return (
              <div
                key={topic.id}
                className="rounded-xl border border-gray-800 overflow-hidden bg-gray-900/30"
              >
                {/* Topic header — clickable to expand */}
                <button
                  onClick={() => toggleTopic(topic.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-800/30 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600/20 flex items-center justify-center">
                      <BookOpen size={14} className="text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-sm">
                        {topic.name}
                      </h3>
                      <span className="text-xs text-gray-500">
                        {subtopics.length} subtopics
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {tier === "higher" && topic.higherOnly.length > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
                        {topic.higherOnly.length} Higher-only
                      </span>
                    )}
                    <svg
                      className={`w-4 h-4 text-gray-500 transition-transform ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </button>

                {/* Subtopics list (expanded) */}
                {isExpanded && (
                  <div className="border-t border-gray-800 p-4">
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {subtopics.map((sub) => {
                        const higher = isHigherOnly(topic, sub);
                        return (
                          <li key={sub}>
                            <Link
                              href={`/chat?q=${encodeURIComponent(
                                `Explain: ${sub}`
                              )}&subject=maths&tier=${tier}&examBoard=${board}`}
                              className="flex items-center gap-2 text-xs py-1.5 px-2 rounded-lg hover:bg-gray-800/50 transition-colors group"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0" />
                              <span className="text-gray-300 group-hover:text-indigo-300 transition-colors">
                                {sub}
                              </span>
                              {higher && (
                                <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-medium">
                                  H
                                </span>
                              )}
                              <ArrowRight
                                size={10}
                                className="text-gray-600 group-hover:text-indigo-400 transition-colors flex-shrink-0"
                              />
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary stats */}
        <div className="mt-8 p-4 rounded-xl border border-gray-800 bg-gray-900/40 flex items-center justify-between">
          <div className="text-sm text-gray-400">
            <span className="text-white font-medium">{board}</span> ·{" "}
            <span className="capitalize">{tier}</span> tier ·{" "}
            {topics.length} topics ·{" "}
            {topics.reduce(
              (acc, t) => acc + getSubtopicsForTier(t, tier).length,
              0
            )}{" "}
            subtopics
          </div>
          <Link
            href={`/chat?subject=maths&tier=${tier}&examBoard=${board}`}
            className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
          >
            Ask tutor about any topic <ArrowRight size={12} />
          </Link>
        </div>
      </div>
    </div>
  );
}
