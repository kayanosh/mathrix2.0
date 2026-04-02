"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  Download,
  FileText,
  Filter,
  Printer,
} from "lucide-react";
import type { ExamBoard, GCSETier, ExamPaper } from "@/types";

const BOARDS: Array<Extract<ExamBoard, "AQA" | "Edexcel" | "OCR">> = [
  "AQA",
  "Edexcel",
  "OCR",
];
const TIERS: GCSETier[] = ["foundation", "higher"];

const BOARD_COLORS: Record<string, string> = {
  AQA: "bg-blue-100 text-blue-700",
  Edexcel: "bg-pink-100 text-pink-700",
  OCR: "bg-amber-100 text-amber-700",
};

export default function ExamPapersPage() {
  const [board, setBoard] = useState<string>("all");
  const [tier, setTier] = useState<string>("all");
  const [showMarkSchemes, setShowMarkSchemes] = useState(false);
  const [papers, setPapers] = useState<ExamPaper[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPapers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (board !== "all") params.set("exam_board", board);
    if (tier !== "all") params.set("tier", tier);

    try {
      const res = await fetch(`/api/exam-papers?${params.toString()}`);
      const data = await res.json();
      setPapers(data.papers || []);
    } catch {
      setPapers([]);
    } finally {
      setLoading(false);
    }
  }, [board, tier]);

  useEffect(() => {
    fetchPapers();
  }, [fetchPapers]);

  // Filter by mark scheme toggle
  const filtered = showMarkSchemes
    ? papers
    : papers.filter((p) => !p.is_mark_scheme);

  // Group by year
  const grouped = filtered.reduce<Record<number, ExamPaper[]>>((acc, p) => {
    if (!acc[p.year]) acc[p.year] = [];
    acc[p.year].push(p);
    return acc;
  }, {});

  const years = Object.keys(grouped)
    .map(Number)
    .sort((a, b) => b - a);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Sparkles size={14} className="text-white" />
          </div>
          <span className="font-bold text-gray-900">Mathrix</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/subjects"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            Practice
          </Link>
          <Link
            href="/syllabus"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            Syllabus
          </Link>
          <Link
            href="/revision"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
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
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 text-indigo-400 text-sm font-medium mb-3">
            <FileText size={16} />
            Past Papers
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 mb-3">
            GCSE Maths Exam Papers
          </h1>
          <p className="text-gray-500 max-w-xl">
            Download past exam papers and mark schemes for AQA, Edexcel and OCR
            GCSE Maths. Filter by exam board, tier and year.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-8 p-4 rounded-xl border border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Filter size={14} />
            Filters
          </div>

          {/* Board */}
          <div className="flex gap-2">
            <button
              onClick={() => setBoard("all")}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                board === "all"
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-gray-500 hover:text-gray-900 border border-gray-200"
              }`}
            >
              All Boards
            </button>
            {BOARDS.map((b) => (
              <button
                key={b}
                onClick={() => setBoard(b)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  board === b
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-gray-500 hover:text-gray-900 border border-gray-200"
                }`}
              >
                {b}
              </button>
            ))}
          </div>

          {/* Tier */}
          <div className="flex gap-2">
            <button
              onClick={() => setTier("all")}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                tier === "all"
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-gray-500 hover:text-gray-900 border border-gray-200"
              }`}
            >
              All Tiers
            </button>
            {TIERS.map((t) => (
              <button
                key={t}
                onClick={() => setTier(t)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium capitalize transition-colors ${
                  tier === t
                    ? t === "higher"
                      ? "bg-purple-600 text-white"
                      : "bg-emerald-600 text-white"
                    : "bg-white text-gray-500 hover:text-gray-900 border border-gray-200"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Mark scheme toggle */}
          <label className="flex items-center gap-2 ml-auto cursor-pointer">
            <input
              type="checkbox"
              checked={showMarkSchemes}
              onChange={(e) => setShowMarkSchemes(e.target.checked)}
              className="rounded border-gray-300 bg-white text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-xs text-gray-500">Show mark schemes</span>
          </label>
        </div>

        {/* Papers */}
        {loading ? (
          <div className="text-center py-16 text-gray-400">
            Loading papers...
          </div>
        ) : years.length === 0 ? (
          <div className="text-center py-16">
            <FileText size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 mb-2">No exam papers found</p>
            <p className="text-xs text-gray-400">
              Papers will appear here once uploaded by an administrator.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {years.map((year) => (
              <div key={year}>
                <h2 className="text-lg font-bold text-gray-900 mb-4">{year}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {grouped[year].map((paper) => (
                    <div
                      key={paper.id}
                      className="rounded-xl border border-gray-200 bg-white p-4 flex flex-col gap-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900">
                            {paper.title}
                          </h3>
                          <p className="text-xs text-gray-400 mt-1">
                            {paper.paper_number}
                          </p>
                        </div>
                        {paper.is_mark_scheme && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700 font-medium">
                            MS
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            BOARD_COLORS[paper.exam_board] ||
                            "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {paper.exam_board}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${
                            paper.tier === "higher"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {paper.tier}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-auto">
                        <a
                          href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/exam-papers/${paper.storage_path}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Download size={12} />
                          Download
                        </a>
                        <button
                          onClick={() => {
                            const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/exam-papers/${paper.storage_path}`;
                            window.open(url, "_blank");
                          }}
                          className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5"
                          title="Open in new tab to print"
                        >
                          <Printer size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
