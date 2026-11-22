"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, ClipboardCheck, FileText, Search, Sparkles } from "lucide-react";
import { SHEET_BOARDS, sheetHref, sheetsFor, type SheetBoard, type SheetTier } from "@/lib/topic-sheets";

const chip = (active: boolean, activeClass = "bg-indigo-600 text-white") =>
  `text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
    active ? activeClass : "bg-white text-gray-500 hover:text-gray-900 border border-gray-200"
  }`;

export default function TopicsPage() {
  const [board, setBoard] = useState<SheetBoard>("AQA");
  const [tier, setTier] = useState<SheetTier>("higher");
  const [search, setSearch] = useState("");

  // Start on the board and tier the pupil already chose in the tutor. Read
  // after hydration so the first render matches the server's.
  useEffect(() => {
    try {
      const savedBoard = localStorage.getItem("mathrix_exam_board");
      const savedTier = localStorage.getItem("mathrix_gcse_tier");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-off read of saved choices
      if (savedBoard && (SHEET_BOARDS as string[]).includes(savedBoard)) setBoard(savedBoard as SheetBoard);
      if (savedTier === "foundation" || savedTier === "higher") setTier(savedTier);
    } catch {
      /* storage blocked: keep the defaults */
    }
  }, []);

  const chooseBoard = (next: SheetBoard) => {
    setBoard(next);
    try {
      localStorage.setItem("mathrix_exam_board", next);
    } catch {
      /* storage blocked */
    }
  };

  const topics = useMemo(() => {
    const term = search.trim().toLowerCase();
    return sheetsFor(board, tier)
      .map((group) => ({
        ...group,
        subtopics: term
          ? group.subtopics.filter(
              (s) => s.name.toLowerCase().includes(term) || group.topic.name.toLowerCase().includes(term),
            )
          : group.subtopics,
      }))
      .filter((group) => group.subtopics.length > 0);
  }, [board, tier, search]);

  const count = topics.reduce((sum, group) => sum + group.subtopics.length, 0);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Sparkles size={14} className="text-white" />
          </div>
          <span className="font-bold text-gray-900">Mathrix</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/exam-papers" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            Past papers
          </Link>
          <Link href="/syllabus" className="hidden sm:inline text-sm text-gray-500 hover:text-gray-900 transition-colors">
            Syllabus
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
        <div className="mb-8">
          <div className="flex items-center gap-2 text-indigo-400 text-sm font-medium mb-3">
            <BookOpen size={16} />
            Topics
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 mb-3">GCSE Maths Topic Questions</h1>
          <p className="text-gray-500 max-w-2xl">
            Every topic on the GCSE Maths syllabus, each with a sheet of exam-style questions and a
            full mark scheme you can download or print.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-3 mb-8 p-4 rounded-xl border border-gray-200 bg-gray-50">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Exam board">
            {SHEET_BOARDS.map((b) => (
              <button key={b} onClick={() => chooseBoard(b)} className={chip(board === b)} aria-pressed={board === b}>
                {b}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Tier">
            <button
              onClick={() => setTier("foundation")}
              className={chip(tier === "foundation", "bg-emerald-600 text-white")}
              aria-pressed={tier === "foundation"}
            >
              Foundation
            </button>
            <button
              onClick={() => setTier("higher")}
              className={chip(tier === "higher", "bg-purple-600 text-white")}
              aria-pressed={tier === "higher"}
            >
              Higher
            </button>
          </div>
          <label className="relative sm:ml-auto w-full sm:w-64">
            <span className="sr-only">Search topics</span>
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search topics"
              className="w-full text-sm rounded-lg border border-gray-200 bg-white pl-8 pr-3 py-2 text-gray-700 placeholder:text-gray-400"
            />
          </label>
        </div>

        {topics.length === 0 ? (
          <p className="text-center py-16 text-gray-500">No topics match “{search}”.</p>
        ) : (
          <>
            <p className="text-xs text-gray-400 mb-4">
              {count} {count === 1 ? "topic" : "topics"} for {board} {tier === "higher" ? "Higher" : "Foundation"}.
            </p>
            <div className="space-y-8">
              {topics.map(({ topic, subtopics }) => (
                <section key={topic.id} aria-label={topic.name}>
                  <h2 className="text-lg font-bold text-gray-900 mb-3">{topic.name}</h2>
                  <ul className="rounded-xl border border-gray-200 divide-y divide-gray-100">
                    {subtopics.map((sub) => (
                      <li key={sub.name} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
                        <div className="flex-1 min-w-[12rem]">
                          <span className="text-sm font-medium text-gray-900">{sub.name}</span>
                          {sub.higherOnly && (
                            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-medium">
                              Higher only
                            </span>
                          )}
                        </div>
                        <Link
                          href={sheetHref(board, tier, topic.id, sub.name, "questions")}
                          className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-lg transition-colors inline-flex items-center gap-1.5"
                        >
                          <FileText size={12} />
                          Questions
                        </Link>
                        <Link
                          href={sheetHref(board, tier, topic.id, sub.name, "mark-scheme")}
                          className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg transition-colors inline-flex items-center gap-1.5"
                        >
                          <ClipboardCheck size={12} />
                          Mark scheme
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </>
        )}

        <p className="text-xs text-gray-400 mt-10 max-w-3xl">
          These questions are written by AI in the style of {board} papers and every answer is checked
          by a second AI before the sheet is saved. They are practice questions, not real exam
          questions. For real ones, see the{" "}
          <Link href="/exam-papers" className="text-indigo-600 hover:text-indigo-500">
            past papers
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
