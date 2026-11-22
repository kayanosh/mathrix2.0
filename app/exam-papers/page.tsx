"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Download, ExternalLink, FileText, Filter, PenLine, Sparkles } from "lucide-react";
import type { ExamPaper } from "@/types";
import {
  PAPER_BOARDS,
  PAPERS_CHECKED_ON,
  PAST_PAPERS,
  paperSeries,
  paperYears,
  seriesNotLinked,
  type PaperBoard,
  type PaperTier,
  type PastPaper,
} from "@/lib/past-papers";
import { solutionsHref } from "@/lib/paper-solutions";

const BOARD_COLORS: Record<string, string> = {
  AQA: "bg-blue-100 text-blue-700",
  Edexcel: "bg-pink-100 text-pink-700",
  OCR: "bg-amber-100 text-amber-700",
};

const TIER_COLORS: Record<PaperTier, string> = {
  foundation: "bg-emerald-100 text-emerald-700",
  higher: "bg-purple-100 text-purple-700",
};

const chip = (active: boolean, activeClass = "bg-indigo-600 text-white") =>
  `text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
    active ? activeClass : "bg-white text-gray-500 hover:text-gray-900 border border-gray-200"
  }`;

function PaperRow({ paper }: { paper: PastPaper }) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5">
      <div className="min-w-[9rem] flex-1">
        <p className="text-sm font-semibold text-gray-900">{paper.name}</p>
        <p className="text-xs text-gray-400">{paper.note}</p>
      </div>
      <a
        href={paper.questionPaper}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-lg transition-colors inline-flex items-center gap-1.5"
      >
        <Download size={12} />
        Question paper
      </a>
      {paper.markScheme ? (
        <a
          href={paper.markScheme}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg transition-colors inline-flex items-center gap-1.5"
        >
          <Download size={12} />
          Mark scheme
        </a>
      ) : (
        <span className="text-xs text-gray-400 px-3 py-2">Mark scheme not found</span>
      )}
      {paper.markScheme && (
        <Link
          href={solutionsHref(paper)}
          className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-3 py-2 rounded-lg transition-colors inline-flex items-center gap-1.5"
        >
          <PenLine size={12} />
          Worked solutions
        </Link>
      )}
    </li>
  );
}

export default function ExamPapersPage() {
  const [board, setBoard] = useState<PaperBoard | "all">("all");
  const [tier, setTier] = useState<PaperTier | "all">("all");
  const [year, setYear] = useState<number | "all">("all");
  const [uploaded, setUploaded] = useState<ExamPaper[]>([]);

  // Papers an administrator has uploaded to Mathrix itself (its own practice
  // papers). Shown under the boards' papers when there are any.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/exam-papers")
      .then((res) => (res.ok ? res.json() : { papers: [] }))
      .then((data) => {
        if (!cancelled) setUploaded(Array.isArray(data.papers) ? data.papers : []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const series = useMemo(() => paperSeries({ board, tier, year }), [board, tier, year]);
  const years = useMemo(() => paperYears(), []);
  const boards = PAPER_BOARDS.filter((b) => board === "all" || b.board === board);
  const total = series.reduce((sum, s) => sum + s.papers.length, 0);
  const checked = new Date(`${PAPERS_CHECKED_ON}T12:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

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
          <Link href="/topics" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            Topics
          </Link>
          <Link href="/syllabus" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            Syllabus
          </Link>
          <Link href="/revision" className="hidden sm:inline text-sm text-gray-500 hover:text-gray-900 transition-colors">
            Revision
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
            <FileText size={16} />
            Past Papers
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 mb-3">GCSE Maths Past Papers</h1>
          <p className="text-gray-500 max-w-2xl">
            {PAST_PAPERS.length} question papers from AQA, Edexcel and OCR, each with its mark scheme
            and a worked-solutions paper. The question paper and mark scheme open as PDFs on the exam
            board&apos;s own website, where you can download or print them.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-3 mb-8 p-4 rounded-xl border border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Filter size={14} />
            Filters
          </div>

          <div className="flex flex-wrap gap-2" role="group" aria-label="Exam board">
            <button onClick={() => setBoard("all")} className={chip(board === "all")} aria-pressed={board === "all"}>
              All boards
            </button>
            {PAPER_BOARDS.map((b) => (
              <button
                key={b.board}
                onClick={() => setBoard(b.board)}
                className={chip(board === b.board)}
                aria-pressed={board === b.board}
              >
                {b.board}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2" role="group" aria-label="Tier">
            <button onClick={() => setTier("all")} className={chip(tier === "all")} aria-pressed={tier === "all"}>
              Both tiers
            </button>
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

          <label className="flex items-center gap-2 text-xs text-gray-500 sm:ml-auto">
            Year
            <select
              value={year}
              onChange={(e) => setYear(e.target.value === "all" ? "all" : Number(e.target.value))}
              className="text-xs rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-gray-700"
            >
              <option value="all">All years</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
        </div>

        {series.length === 0 ? (
          <div className="text-center py-16">
            <FileText size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No papers match those filters.</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-400 mb-4">
              Showing {total} {total === 1 ? "paper" : "papers"} in {series.length}{" "}
              {series.length === 1 ? "exam series" : "exam series"}.
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {series.map((s) => {
                const tiers = (["foundation", "higher"] as PaperTier[]).filter((t) =>
                  s.papers.some((p) => p.tier === t),
                );
                return (
                  <section
                    key={`${s.board}-${s.label}`}
                    className="rounded-xl border border-gray-200 bg-white p-5"
                    aria-label={`${s.board} ${s.label}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-lg font-bold text-gray-900">{s.label}</h2>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                          BOARD_COLORS[s.board] || "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {s.board}
                      </span>
                    </div>
                    {tiers.map((t) => (
                      <div key={t} className="mt-3">
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded-full font-medium capitalize ${TIER_COLORS[t]}`}
                        >
                          {t}
                        </span>
                        <ul className="divide-y divide-gray-100 mt-1">
                          {s.papers
                            .filter((p) => p.tier === t)
                            .map((p) => (
                              <PaperRow key={`${p.tier}-${p.paper}`} paper={p} />
                            ))}
                        </ul>
                      </div>
                    ))}
                  </section>
                );
              })}
            </div>
          </>
        )}

        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
          {boards.map((b) => {
            const missing = seriesNotLinked(b.board);
            return (
              <div key={b.board} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm font-semibold text-gray-900">{b.board}</p>
                <p className="text-xs text-gray-500 mb-3">{b.qualification}</p>
                <a
                  href={b.indexUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-600 hover:text-indigo-500 font-medium inline-flex items-center gap-1"
                >
                  {b.indexLabel} <ExternalLink size={12} />
                </a>
                {missing.length > 0 && (
                  <p className="text-xs text-gray-500 mt-3">
                    Not here: {missing.join(", ")}. {b.missingNote}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {uploaded.length > 0 && (
          <div className="mt-12">
            <h2 className="text-lg font-bold text-gray-900 mb-4">More papers from Mathrix</h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {uploaded.map((paper) => (
                <li key={paper.id} className="rounded-xl border border-gray-200 bg-white p-4 flex flex-col gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{paper.title}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {paper.exam_board} · {paper.year} · {paper.paper_number}
                      {paper.is_mark_scheme ? " · Mark scheme" : ""}
                    </p>
                  </div>
                  <a
                    href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/exam-papers/${paper.storage_path}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-lg transition-colors inline-flex items-center justify-center gap-1.5 mt-auto"
                  >
                    <Download size={12} />
                    Download
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-xs text-gray-400 mt-10 max-w-3xl">
          Past papers and mark schemes belong to AQA, Pearson Edexcel and OCR. Mathrix does not copy
          them: every link goes to the exam board&apos;s own published file. Links were last checked on{" "}
          {checked}. The worked solutions are written by Mathrix using AI and checked against the mark
          scheme; they are not published or endorsed by the exam boards.
        </p>
      </div>
    </div>
  );
}
