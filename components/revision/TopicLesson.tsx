"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  Flag,
  HelpCircle,
  Lightbulb,
  Loader2,
  Printer,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import InlineMath from "@/components/InlineMath";
import RevisionContentRenderer from "@/components/RevisionContentRenderer";
import type { RevisionSubtopic, RevisionTopic } from "@/lib/revision-data";
import { mainIdeaFor } from "@/lib/revision-ideas";
import { COMPANY } from "@/lib/company";
import {
  MAX_SETS,
  SET_SIZE,
  levelName,
  noteFor,
  slug,
  type RevisionQuestion,
  type RevisionSet,
  type RevisionTier,
} from "@/lib/revision-sets";

const TIER_KEY = "mathrix-revision-tier";
export const RESULTS_KEY = "mathrix-revision-results";

export interface RevisionResult {
  /** The best score on any set of this topic, and what it was out of. */
  best: number;
  of: number;
  at: string;
}

export function readResults(): Record<string, RevisionResult> {
  try {
    const raw = localStorage.getItem(RESULTS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? (parsed as Record<string, RevisionResult>) : {};
  } catch {
    return {};
  }
}

type Mark = "yes" | "no";
type PrintWith = "questions" | "answers";

interface Props {
  topic: RevisionTopic;
  subtopic: RevisionSubtopic;
  onBack: () => void;
  /** The topic after this one, if there is one. */
  next?: { name: string; go: () => void };
  /** Called with the score when every question has been marked. */
  onScored?: (got: number, of: number) => void;
}

/**
 * One revision topic: its main idea, then six questions that teach it.
 *
 * The main idea is on the page at once (it is written by hand, see
 * lib/revision-ideas.ts). The questions are fetched, and the first time anyone
 * opens a topic they are being written and checked, which takes a while, so
 * the page says so instead of showing a bare spinner.
 */
export default function TopicLesson({ topic, subtopic, onBack, next, onScored }: Props) {
  const idea = mainIdeaFor(topic.id, subtopic.name);
  const note = useMemo(() => noteFor(topic.id, subtopic.name), [topic.id, subtopic.name]);

  const [tier, setTier] = useState<RevisionTier>(subtopic.higherOnly ? "higher" : "foundation");
  const [setNumber, setSetNumber] = useState(0);
  const [data, setData] = useState<RevisionSet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [hints, setHints] = useState<Set<number>>(new Set());
  const [answers, setAnswers] = useState<Set<number>>(new Set());
  const [marks, setMarks] = useState<Record<number, Mark>>({});
  const [showNotes, setShowNotes] = useState(false);
  const [printMenu, setPrintMenu] = useState(false);
  const [printWith, setPrintWith] = useState<PrintWith>("questions");
  const questionsTop = useRef<HTMLDivElement | null>(null);

  // The tier a pupil chose last time, unless this topic is Higher only.
  useEffect(() => {
    if (subtopic.higherOnly) return;
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(TIER_KEY);
    } catch {
      /* private browsing */
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read once from storage on open
    if (saved === "higher") setTier("higher");
  }, [subtopic.higherOnly]);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset before a new fetch
    setData(null);
    setError(null);
    setHints(new Set());
    setAnswers(new Set());
    setMarks({});
    fetch("/api/revision-set", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic: topic.id, subtopic: slug(subtopic.name), tier, set: setNumber }),
    })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok || !body.set) setError(body.error || "Could not load the questions. Please try again.");
        else setData(body.set as RevisionSet);
      })
      .catch(() => {
        if (!cancelled) setError("Could not reach Mathrix. Check your connection and try again.");
      });
    return () => {
      cancelled = true;
    };
  }, [topic.id, subtopic.name, tier, setNumber, attempt]);

  // The browser uses the page title as the name of a saved PDF.
  useEffect(() => {
    const previous = document.title;
    document.title = `${subtopic.name} - revision questions${printWith === "answers" ? " and answers" : ""}`;
    return () => {
      document.title = previous;
    };
  }, [subtopic.name, printWith]);

  const chooseTier = (value: RevisionTier) => {
    setTier(value);
    setSetNumber(0);
    try {
      localStorage.setItem(TIER_KEY, value);
    } catch {
      /* private browsing */
    }
  };

  const newQuestions = () => {
    setSetNumber((n) => (n + 1) % MAX_SETS);
    questionsTop.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const print = (what: PrintWith) => {
    setPrintMenu(false);
    setPrintWith(what);
    // After the page has been redrawn with (or without) the answers.
    setTimeout(() => window.print(), 80);
  };

  const questions = data?.questions ?? [];
  const marked = questions.filter((q) => marks[q.id]).length;
  const got = questions.filter((q) => marks[q.id] === "yes").length;
  const allMarked = questions.length > 0 && marked === questions.length;

  const mark = useCallback((id: number, value: Mark) => {
    setMarks((current) => ({ ...current, [id]: value }));
  }, []);

  // When the last question is marked, the score is kept on this device (so the
  // topic list can show how it went) and passed up, once for each set.
  const scored = useRef<string | null>(null);
  useEffect(() => {
    if (!data || !allMarked) return;
    const which = `${data.tier}:${data.set}:${got}`;
    if (scored.current === which) return;
    scored.current = which;
    const of = data.questions.length;
    try {
      const key = `${topic.id}::${subtopic.name}`;
      const all = readResults();
      const before = all[key];
      if (!before || got / of >= before.best / before.of) {
        all[key] = { best: got, of, at: new Date().toISOString() };
        localStorage.setItem(RESULTS_KEY, JSON.stringify(all));
      }
    } catch {
      /* private browsing */
    }
    onScored?.(got, of);
  }, [allMarked, data, got, onScored, subtopic.name, topic.id]);

  const reportHref = (q: RevisionQuestion) =>
    `mailto:${COMPANY.email}?subject=${encodeURIComponent(`Revision question to check: ${subtopic.name}`)}&body=${encodeURIComponent(
      `Topic: ${subtopic.name}\nTier: ${tier}\nSet: ${setNumber + 1}\nQuestion ${q.level}: ${q.question}\nAnswer given: ${q.answer}\n\nWhat looks wrong:\n`,
    )}`;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Top bar */}
      <div className="print-hide sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto flex items-center gap-2 px-4 py-2.5">
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft size={16} /> <span className="hidden sm:inline">All topics</span>
          </button>
          <div className="ml-auto flex items-center gap-2">
            {subtopic.higherOnly ? (
              <span className="text-[11px] font-semibold text-amber-700 bg-amber-100 px-2 py-1 rounded-md">Higher only</span>
            ) : (
              <div className="flex rounded-lg border border-gray-200 bg-white p-0.5 text-xs font-medium" role="group" aria-label="Tier">
                {(["foundation", "higher"] as const).map((value) => (
                  <button
                    key={value}
                    onClick={() => chooseTier(value)}
                    aria-pressed={tier === value}
                    className={`px-2.5 py-1.5 rounded-md transition-colors ${
                      tier === value ? "bg-indigo-600 text-white" : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    {value === "higher" ? "Higher" : "Foundation"}
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={newQuestions}
              disabled={!data && !error}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
            >
              <RefreshCw size={13} /> <span className="hidden sm:inline">New questions</span>
              <span className="sm:hidden">New</span>
            </button>
            <div className="relative">
              <button
                onClick={() => setPrintMenu((open) => !open)}
                disabled={!data}
                aria-haspopup="menu"
                aria-expanded={printMenu}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white hover:bg-gray-700 disabled:opacity-40"
              >
                <Printer size={13} /> Print <ChevronDown size={12} />
              </button>
              {printMenu && (
                <div role="menu" className="absolute right-0 mt-1 w-56 rounded-xl border border-gray-200 bg-white p-1 shadow-lg">
                  <button role="menuitem" onClick={() => print("questions")} className="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">
                    Questions only
                    <span className="block text-[11px] text-gray-500">With space to work them out</span>
                  </button>
                  <button role="menuitem" onClick={() => print("answers")} className="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">
                    Questions and worked answers
                    <span className="block text-[11px] text-gray-500">Answers start on a new page</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <article className="tutor-print-root max-w-3xl mx-auto px-4 py-6 sm:py-8">
        {/* Title */}
        <header className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
            {topic.name}
            <span className="text-gray-400"> · {tier === "higher" ? "Higher" : "Foundation"}</span>
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-gray-900">{subtopic.name}</h1>
          <p className="print-only mt-3 text-sm">Name: ______________________&nbsp;&nbsp; Date: ____________</p>
        </header>

        {/* The main idea */}
        <section className="print-avoid rounded-2xl border border-indigo-200 bg-indigo-50 p-5 sm:p-6">
          <div className="flex items-center gap-2 text-indigo-700">
            <Lightbulb size={18} />
            <h2 className="text-sm font-bold uppercase tracking-wide">The main idea</h2>
          </div>
          <p className="mt-2 text-[17px] sm:text-lg leading-relaxed text-gray-900">
            <InlineMath text={idea || note?.summary || `The key ideas of ${subtopic.name}.`} />
          </p>
          {note?.formulas && note.formulas.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2">
              {note.formulas.slice(0, 4).map((formula, i) => (
                <li key={i} className="rounded-lg bg-white px-3 py-1.5 text-sm text-indigo-800 border border-indigo-100">
                  <InlineMath text={formula} />
                </li>
              ))}
            </ul>
          )}
          {note && (
            <button
              onClick={() => setShowNotes((open) => !open)}
              aria-expanded={showNotes}
              className="print-hide mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-700 hover:text-indigo-900"
            >
              <BookOpen size={14} /> {showNotes ? "Hide the notes" : "Read the notes for this topic"}
              <ChevronDown size={14} className={showNotes ? "rotate-180 transition-transform" : "transition-transform"} />
            </button>
          )}
        </section>
        {note && showNotes && (
          <div className="print-hide mt-4">
            <RevisionContentRenderer note={note} />
          </div>
        )}

        {/* The questions */}
        <div ref={questionsTop} className="mt-8 scroll-mt-20">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Learn it by doing: six questions</h2>
              <p className="text-sm text-gray-500">
                Each one adds a step to the one before. The last is an exam question. Try each before you look at the answer.
              </p>
            </div>
            {data && (
              <p className="text-xs text-gray-500">
                Set {data.set + 1}
                {data.checked ? (
                  <span className="ml-2 inline-flex items-center gap-1 text-emerald-700">
                    <ShieldCheck size={12} className="print-hide" /> Every answer checked
                  </span>
                ) : (
                  <span className="ml-2 text-amber-700">Answers not double-checked</span>
                )}
              </p>
            )}
          </div>

          {error ? (
            <div className="print-hide mt-4 rounded-2xl border border-gray-200 bg-white p-8 text-center">
              <p className="text-gray-700 mb-4">{error}</p>
              <button onClick={() => setAttempt((n) => n + 1)} className="text-sm px-4 py-2 rounded-lg font-medium bg-indigo-600 text-white hover:bg-indigo-500">
                Try again
              </button>
            </div>
          ) : !data ? (
            <div className="print-hide mt-4 rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-500" role="status">
              <Loader2 size={26} className="mx-auto mb-3 animate-spin text-indigo-500" />
              <p className="font-medium text-gray-700">Getting your six questions ready…</p>
              <p className="text-sm mt-1 max-w-md mx-auto">
                The first time anyone opens a set, the questions are written and every answer is checked. That can take up to a
                minute. After that it opens straight away. Read the main idea while you wait.
              </p>
            </div>
          ) : (
            <ol className="mt-4 space-y-4">
              {questions.map((q) => {
                const isExam = q.level === 6;
                const hintOpen = hints.has(q.id);
                const answerOpen = answers.has(q.id);
                return (
                  <li
                    key={`${data.set}-${q.id}`}
                    data-question={q.level}
                    className={`print-avoid rounded-2xl border bg-white p-4 sm:p-5 ${isExam ? "border-indigo-300" : "border-gray-200"}`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                          isExam ? "bg-indigo-600 text-white" : "bg-gray-900 text-white"
                        }`}
                      >
                        {q.level}
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{levelName(q.level)}</span>
                      {!isExam && (
                        <span className="print-hide flex gap-0.5" aria-label={`Difficulty ${q.level} of 5`}>
                          {[1, 2, 3, 4, 5].map((dot) => (
                            <span key={dot} className={`h-1.5 w-1.5 rounded-full ${dot <= q.level ? "bg-indigo-500" : "bg-gray-200"}`} />
                          ))}
                        </span>
                      )}
                      <span className="ml-auto text-xs font-medium text-gray-500">
                        [{q.marks} mark{q.marks === 1 ? "" : "s"}]
                      </span>
                    </div>

                    {q.teaches && (
                      <p className="print-hide mt-2 text-[13px] text-indigo-700">
                        <InlineMath text={q.teaches} />
                      </p>
                    )}
                    <p className="mt-2 text-[17px] leading-relaxed text-gray-900">
                      <InlineMath text={q.question} />
                    </p>
                    {/* Room to work it out, on paper only. */}
                    <div className="print-only" style={{ height: `${24 + q.marks * 14}mm` }} />

                    <div className="print-hide mt-3 flex flex-wrap items-center gap-2">
                      {q.hint && !answerOpen && (
                        <button
                          onClick={() => setHints((s) => new Set(s).add(q.id))}
                          disabled={hintOpen}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-60"
                        >
                          <HelpCircle size={14} /> {hintOpen ? "Hint shown" : "Give me a hint"}
                        </button>
                      )}
                      <button
                        onClick={() =>
                          setAnswers((s) => {
                            const nextSet = new Set(s);
                            if (nextSet.has(q.id)) nextSet.delete(q.id);
                            else nextSet.add(q.id);
                            return nextSet;
                          })
                        }
                        aria-expanded={answerOpen}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500"
                      >
                        {answerOpen ? "Hide the worked answer" : "Show the worked answer"}
                      </button>
                    </div>

                    {hintOpen && !answerOpen && (
                      <p className="print-hide mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        <InlineMath text={q.hint} />
                      </p>
                    )}

                    {answerOpen && (
                      <div className="print-hide mt-4">
                        <WorkedAnswer q={q} />
                        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
                          <span className="text-sm text-gray-600">Did you get it?</span>
                          <button
                            onClick={() => mark(q.id, "yes")}
                            aria-pressed={marks[q.id] === "yes"}
                            className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium border ${
                              marks[q.id] === "yes"
                                ? "bg-emerald-600 border-emerald-600 text-white"
                                : "border-gray-200 text-gray-700 hover:bg-emerald-50"
                            }`}
                          >
                            <Check size={14} /> Yes
                          </button>
                          <button
                            onClick={() => mark(q.id, "no")}
                            aria-pressed={marks[q.id] === "no"}
                            className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium border ${
                              marks[q.id] === "no"
                                ? "bg-rose-600 border-rose-600 text-white"
                                : "border-gray-200 text-gray-700 hover:bg-rose-50"
                            }`}
                          >
                            <X size={14} /> Not yet
                          </button>
                          <Link
                            href={`/chat?q=${encodeURIComponent(q.question)}&autoSend=true&fromPractice=true`}
                            className="ml-auto inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-500"
                          >
                            <Sparkles size={13} /> Watch it on the whiteboard
                          </Link>
                          <a href={reportHref(q)} className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600" title="Tell us if this answer looks wrong">
                            <Flag size={12} /> Looks wrong?
                          </a>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}

          {data && data.questions.length < SET_SIZE && (
            <p className="print-hide mt-3 text-xs text-gray-500">
              This set has {data.questions.length} questions: {SET_SIZE - data.questions.length} did not pass our checks and{" "}
              {SET_SIZE - data.questions.length === 1 ? "was" : "were"} left out.
            </p>
          )}
        </div>

        {/* How it went */}
        {data && (
          <section className="print-hide mt-6 rounded-2xl border border-gray-200 bg-white p-5">
            {allMarked ? (
              <>
                <p className="text-base font-semibold text-gray-900">
                  You got {got} of {questions.length}.
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  {got === questions.length
                    ? "That is the whole topic, including the exam question. Try a new set to make sure it was not luck."
                    : got >= questions.length - 1
                      ? "Nearly all of it. Go back over the one you missed, then try a new set."
                      : "Read the worked answers for the ones you missed, one line at a time. Then try a new set: the questions change but the method is the same."}
                </p>
              </>
            ) : (
              <>
                <p className="text-base font-semibold text-gray-900">
                  {marked === 0 ? "Mark yourself as you go" : `${marked} of ${questions.length} marked`}
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  After each worked answer, say whether you got it. Your score is kept on this device and shown in the topic list.
                </p>
              </>
            )}
            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <button onClick={newQuestions} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500">
                <RefreshCw size={15} /> New questions
              </button>
              {next && (
                <button onClick={next.go} className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                  Next: {next.name} <ArrowRight size={15} />
                </button>
              )}
              <button onClick={onBack} className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                All topics
              </button>
            </div>
          </section>
        )}

        {/* On paper: the worked answers, on their own page. */}
        {data && printWith === "answers" && (
          <section className="print-only print-break">
            <h2 className="text-xl font-bold">{subtopic.name}: worked answers</h2>
            <ol className="mt-4 space-y-5">
              {questions.map((q) => (
                <li key={q.id} className="print-avoid">
                  <p className="text-sm font-semibold">
                    {q.level}. <InlineMath text={q.question} />
                  </p>
                  <div className="mt-1">
                    <WorkedAnswer q={q} />
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}

        <footer className="mt-8 border-t border-gray-200 pt-4 text-xs text-gray-500">
          Mathrix revision questions, written by AI and checked before you see them. If an answer looks wrong, tell us.
        </footer>
      </article>
    </div>
  );
}

/** The working, one line at a time with its reason, then the answer. */
function WorkedAnswer({ q }: { q: RevisionQuestion }) {
  return (
    <div>
      <ol className="space-y-2.5">
        {q.steps.map((step, i) => (
          <li key={i} className="flex gap-3">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[11px] font-semibold text-gray-600">
              {i + 1}
            </span>
            <div className="min-w-0">
              <p className="text-[15px] leading-relaxed text-gray-900">
                <InlineMath text={step.text} />
              </p>
              {step.why && (
                <p className="text-[13px] leading-relaxed text-gray-500">
                  <span className="font-medium text-gray-600">Why: </span>
                  <InlineMath text={step.why} />
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[15px] text-emerald-900">
        <span className="font-semibold">Answer: </span>
        <InlineMath text={q.answer} />
      </p>
      {q.markScheme && q.markScheme.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">How the marks are given</p>
          <ul className="mt-1 space-y-1">
            {q.markScheme.map((point, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-700">
                <span className="w-7 shrink-0 font-semibold text-indigo-700">{point.mark}</span>
                <InlineMath text={point.award} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
