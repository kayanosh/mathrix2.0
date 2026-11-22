"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ClipboardCheck, FileText, Loader2, Printer, ShieldCheck, Sparkles } from "lucide-react";
import InlineMath from "@/components/InlineMath";
import { resolveSheetRequest, sheetHref, type TopicSheet } from "@/lib/topic-sheets";

type View = "questions" | "mark-scheme";

function tierName(tier: string): string {
  return tier === "higher" ? "Higher" : "Foundation";
}

function Sheet() {
  const params = useSearchParams();
  const board = params.get("board") || "";
  const tier = params.get("tier") || "";
  const topic = params.get("topic") || "";
  const subtopic = params.get("subtopic") || "";
  const view: View = params.get("view") === "mark-scheme" ? "mark-scheme" : "questions";

  // Checked here as well as on the server, so a mistyped address says so at
  // once instead of after a wait.
  const request = resolveSheetRequest({ board, tier, topic, subtopic });

  const [sheet, setSheet] = useState<TopicSheet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const valid = request !== null;
  useEffect(() => {
    if (!valid) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset before a new fetch
    setSheet(null);
    setError(null);
    fetch("/api/topic-questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ board, tier, topic, subtopic }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok || !data.sheet) setError(data.error || "Could not load that sheet. Please try again.");
        else setSheet(data.sheet as TopicSheet);
      })
      .catch(() => {
        if (!cancelled) setError("Could not reach Mathrix. Check your connection and try again.");
      });
    return () => {
      cancelled = true;
    };
  }, [valid, board, tier, topic, subtopic, attempt]);

  // The browser uses the page title as the PDF's file name.
  useEffect(() => {
    if (!sheet) return;
    const previous = document.title;
    document.title = `${sheet.board} ${tierName(sheet.tier)} - ${sheet.subtopic} - ${
      view === "mark-scheme" ? "Mark scheme" : "Questions"
    }`;
    return () => {
      document.title = previous;
    };
  }, [sheet, view]);

  const print = useCallback(() => window.print(), []);

  if (!request) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-20 text-center">
        <p className="text-gray-700 font-medium mb-2">That topic is not on the syllabus.</p>
        <Link href="/topics" className="text-sm text-indigo-600 hover:text-indigo-500">
          Back to all topics
        </Link>
      </div>
    );
  }

  const title = request.subtopic;
  const tab = (target: View) =>
    `text-sm px-4 py-2 rounded-lg font-medium transition-colors inline-flex items-center gap-1.5 ${
      view === target ? "bg-indigo-600 text-white" : "bg-white text-gray-600 hover:text-gray-900 border border-gray-200"
    }`;

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="print-hide flex flex-wrap items-center gap-3 mb-6">
        <Link href="/topics" className="text-sm text-gray-500 hover:text-gray-900 inline-flex items-center gap-1">
          <ArrowLeft size={14} /> All topics
        </Link>
        <div className="flex gap-2 ml-auto">
          <Link href={sheetHref(request.board, request.tier, request.topic.id, title, "questions")} className={tab("questions")}>
            <FileText size={14} /> Questions
          </Link>
          <Link
            href={sheetHref(request.board, request.tier, request.topic.id, title, "mark-scheme")}
            className={tab("mark-scheme")}
          >
            <ClipboardCheck size={14} /> Mark scheme
          </Link>
          <button
            onClick={print}
            disabled={!sheet}
            className="text-sm px-4 py-2 rounded-lg font-medium bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-40 inline-flex items-center gap-1.5"
          >
            <Printer size={14} /> Download / Print
          </button>
        </div>
      </div>

      {error ? (
        <div className="text-center py-16">
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={() => setAttempt((n) => n + 1)}
            className="text-sm px-4 py-2 rounded-lg font-medium bg-indigo-600 text-white hover:bg-indigo-500"
          >
            Try again
          </button>
        </div>
      ) : !sheet ? (
        <div className="text-center py-20 text-gray-500" role="status">
          <Loader2 size={28} className="mx-auto mb-4 animate-spin text-indigo-500" />
          <p className="font-medium text-gray-700">Getting the {title} sheet ready…</p>
          <p className="text-sm mt-1">
            The first time anyone opens a topic, the questions are written and every answer is
            checked. That takes up to a minute. After that it opens straight away.
          </p>
        </div>
      ) : (
        <article className="tutor-print-root bg-white">
          <header className="border-b-2 border-gray-900 pb-3 mb-6">
            <p className="text-xs uppercase tracking-wide text-gray-500">
              {sheet.board} GCSE Maths · {tierName(sheet.tier)} · {sheet.topicName}
            </p>
            <h1 className="text-2xl font-extrabold text-gray-900 mt-1">
              {sheet.subtopic}
              {view === "mark-scheme" ? " — Mark scheme" : ""}
            </h1>
            <div className="flex flex-wrap items-center justify-between gap-2 mt-2 text-sm text-gray-600">
              <span>
                {sheet.questions.length} questions · {sheet.totalMarks} marks
              </span>
              {view === "questions" && (
                <span className="print-only">Name: ______________________&nbsp;&nbsp; Date: ____________</span>
              )}
            </div>
          </header>

          {view === "questions" ? (
            <ol className="space-y-7">
              {sheet.questions.map((q) => (
                <li key={q.id} className="print-avoid">
                  <div className="flex gap-3">
                    <span className="font-bold text-gray-900 w-6 shrink-0">{q.id}.</span>
                    <div className="flex-1">
                      <p className="text-gray-900 leading-relaxed">
                        <InlineMath text={q.question} />
                      </p>
                      {/* Room to work, sized to the marks, as on an exam paper. */}
                      <div aria-hidden style={{ height: `${Math.min(9, 2 + q.marks * 1.4)}rem` }} />
                      <div className="flex items-end justify-between gap-4">
                        <span className="flex-1 border-b border-dotted border-gray-400 max-w-xs ml-auto" />
                        <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                          ({q.marks} {q.marks === 1 ? "mark" : "marks"})
                        </span>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <ol className="space-y-6">
              {sheet.questions.map((q) => (
                <li key={q.id} className="print-avoid rounded-lg border border-gray-200 p-4">
                  <div className="flex gap-3">
                    <span className="font-bold text-gray-900 w-6 shrink-0">{q.id}.</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-500">
                        <InlineMath text={q.question} />
                      </p>
                      {q.method.length > 0 && (
                        <ol className="mt-3 space-y-1 text-gray-800 list-decimal list-inside marker:text-gray-400">
                          {q.method.map((step, i) => (
                            <li key={i}>
                              <InlineMath text={step} />
                            </li>
                          ))}
                        </ol>
                      )}
                      <p className="mt-3 font-semibold text-gray-900">
                        Answer: <InlineMath text={q.answer} />
                      </p>
                      <table className="mt-3 w-full text-sm">
                        <tbody>
                          {q.markScheme.map((point, i) => (
                            <tr key={i} className="border-t border-gray-100">
                              <td className="py-1 pr-3 font-semibold text-gray-900 w-10 align-top">{point.mark}</td>
                              <td className="py-1 text-gray-700">
                                <InlineMath text={point.award} />
                              </td>
                            </tr>
                          ))}
                          <tr className="border-t border-gray-200">
                            <td colSpan={2} className="pt-1 text-right text-gray-500">
                              Total: {q.marks} {q.marks === 1 ? "mark" : "marks"}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}

          <footer className="mt-8 pt-3 border-t border-gray-200 text-xs text-gray-500 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="inline-flex items-center gap-1">
              <Sparkles size={12} className="print-hide" /> Mathrix practice questions, written by AI in
              the style of {sheet.board} papers. Not real exam questions.
            </span>
            {sheet.checked ? (
              <span className="inline-flex items-center gap-1">
                <ShieldCheck size={12} className="print-hide" /> Every answer checked by a second AI.
              </span>
            ) : (
              <span className="font-medium text-amber-700">
                These answers have not been checked yet. Treat the mark scheme with care.
              </span>
            )}
          </footer>
        </article>
      )}
    </div>
  );
}

export default function TopicSheetPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Suspense fallback={<div className="py-20 text-center text-gray-400">Loading…</div>}>
        <Sheet />
      </Suspense>
    </div>
  );
}
