"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Download, Loader2, Printer, ShieldCheck } from "lucide-react";
import InlineMath from "@/components/InlineMath";
import { findPaper, paperTitle, type PaperSolutions } from "@/lib/paper-solutions";

type Stage = "loading" | "writing" | "checking";

const STAGE_TEXT: Record<Stage, { title: string; detail: string }> = {
  loading: { title: "Looking for the worked solutions…", detail: "" },
  writing: {
    title: "Writing the worked solutions…",
    detail:
      "Nobody has opened this paper's solutions before, so they are being written now from the exam board's paper and mark scheme. This takes two or three minutes. Keep this page open.",
  },
  checking: {
    title: "Checking every answer against the mark scheme…",
    detail: "Nearly there. This takes up to a minute.",
  },
};

async function post(paper: string, step: "load" | "write" | "check") {
  const res = await fetch("/api/paper-solutions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paper, step }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Could not load those solutions. Please try again.");
  return data as { solutions?: PaperSolutions; status?: string };
}

function Solutions() {
  const id = useSearchParams().get("paper") || "";
  const paper = findPaper(id);

  const [solutions, setSolutions] = useState<PaperSolutions | null>(null);
  const [stage, setStage] = useState<Stage>("loading");
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const valid = paper !== null;
  useEffect(() => {
    if (!valid) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset before a new fetch
    setSolutions(null);
    setError(null);
    setStage("loading");
    (async () => {
      try {
        let reply = await post(id, "load");
        if (!reply.solutions) {
          if (cancelled) return;
          setStage("writing");
          reply = await post(id, "write");
        }
        if (!reply.solutions) {
          if (cancelled) return;
          setStage("checking");
          reply = await post(id, "check");
        }
        if (cancelled) return;
        if (reply.solutions) setSolutions(reply.solutions);
        else setError("Could not load those solutions. Please try again.");
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load those solutions.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [valid, id, attempt]);

  // The browser uses the page title as the PDF's file name.
  useEffect(() => {
    if (!paper) return;
    const previous = document.title;
    document.title = `${paperTitle(paper)} - Worked solutions`;
    return () => {
      document.title = previous;
    };
  }, [paper]);

  const print = useCallback(() => window.print(), []);

  if (!paper) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-20 text-center">
        <p className="text-gray-700 font-medium mb-2">That paper is not on our list.</p>
        <Link href="/exam-papers" className="text-sm text-indigo-600 hover:text-indigo-500">
          Back to past papers
        </Link>
      </div>
    );
  }

  const link =
    "text-sm px-3 py-2 rounded-lg font-medium bg-white text-gray-600 hover:text-gray-900 border border-gray-200 inline-flex items-center gap-1.5";

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="print-hide flex flex-wrap items-center gap-2 mb-6">
        <Link href="/exam-papers" className="text-sm text-gray-500 hover:text-gray-900 inline-flex items-center gap-1 mr-auto">
          <ArrowLeft size={14} /> All past papers
        </Link>
        <a href={paper.questionPaper} target="_blank" rel="noopener noreferrer" className={link}>
          <Download size={14} /> Question paper
        </a>
        {paper.markScheme && (
          <a href={paper.markScheme} target="_blank" rel="noopener noreferrer" className={link}>
            <Download size={14} /> Mark scheme
          </a>
        )}
        <button
          onClick={print}
          disabled={!solutions}
          className="text-sm px-4 py-2 rounded-lg font-medium bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-40 inline-flex items-center gap-1.5"
        >
          <Printer size={14} /> Download / Print
        </button>
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
      ) : !solutions ? (
        <div className="text-center py-20 text-gray-500" role="status">
          <Loader2 size={28} className="mx-auto mb-4 animate-spin text-indigo-500" />
          <p className="font-medium text-gray-700">{STAGE_TEXT[stage].title}</p>
          {STAGE_TEXT[stage].detail && <p className="text-sm mt-1 max-w-md mx-auto">{STAGE_TEXT[stage].detail}</p>}
        </div>
      ) : (
        <article className="tutor-print-root bg-white">
          <header className="border-b-2 border-gray-900 pb-3 mb-6">
            <p className="text-xs uppercase tracking-wide text-gray-500">
              {solutions.board} GCSE Maths · {solutions.tier === "higher" ? "Higher" : "Foundation"} · {solutions.note}
            </p>
            <h1 className="text-2xl font-extrabold text-gray-900 mt-1">
              {solutions.month} {solutions.year} {solutions.paperName} — Worked solutions
            </h1>
            <p className="text-sm text-gray-600 mt-2">
              Use these next to the {solutions.board} question paper. Each solution is numbered to match.
            </p>
          </header>

          <ol className="space-y-4">
            {solutions.items.map((item) => (
              <li key={item.ref} className="print-avoid rounded-lg border border-gray-200 p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="font-bold text-gray-900">Question {item.ref}</h2>
                  {item.marks !== null && (
                    <span className="text-sm text-gray-500 whitespace-nowrap">
                      {item.marks} {item.marks === 1 ? "mark" : "marks"}
                    </span>
                  )}
                </div>
                {item.working.length > 0 && (
                  <ol className="mt-2 space-y-1 text-gray-800 list-decimal list-inside marker:text-gray-400">
                    {item.working.map((step, i) => (
                      <li key={i}>
                        <InlineMath text={step} />
                      </li>
                    ))}
                  </ol>
                )}
                {item.confirmed || !solutions.checked ? (
                  <p className="mt-3 font-semibold text-gray-900">
                    Answer: <InlineMath text={item.answer} />
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-amber-700">{item.answer}</p>
                )}
              </li>
            ))}
          </ol>

          <footer className="mt-8 pt-3 border-t border-gray-200 text-xs text-gray-500 space-y-1">
            <p>
              Worked solutions written by Mathrix using AI. They are not published or endorsed by{" "}
              {solutions.board}. The question paper and mark scheme belong to {solutions.board}.
            </p>
            {solutions.checked ? (
              <p className="inline-flex items-center gap-1">
                <ShieldCheck size={12} className="print-hide" /> Every answer shown was checked against the
                official mark scheme.
                {solutions.withheld > 0 &&
                  ` ${solutions.withheld} ${solutions.withheld === 1 ? "answer" : "answers"} did not match and ${
                    solutions.withheld === 1 ? "is" : "are"
                  } left to the mark scheme.`}
              </p>
            ) : (
              <p className="font-medium text-amber-700">
                These answers have not been checked against the mark scheme yet. Check each one against the
                official mark scheme.
              </p>
            )}
          </footer>
        </article>
      )}
    </div>
  );
}

export default function PaperSolutionsPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Suspense fallback={<div className="py-20 text-center text-gray-400">Loading…</div>}>
        <Solutions />
      </Suspense>
    </div>
  );
}
