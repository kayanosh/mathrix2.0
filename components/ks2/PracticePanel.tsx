"use client";

import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Loader2, RotateCcw, Eye, EyeOff, Sparkles, Printer } from "lucide-react";
import InlineMath from "@/components/InlineMath";
import PracticeWhiteboardModal from "@/components/PracticeWhiteboardModal";
import KS2ExplainModal from "@/components/ks2/KS2ExplainModal";
import { targetMeta, tierMeta, type KS2Target, type KS2Tier } from "@/lib/ks2-pathway";

interface QuizQuestion {
  question: string;
  answer: string;
}

interface Props {
  subjectId: string;
  subjectName: string;
  topicName: string;
  subtopics: string[];
  target: KS2Target;
  tier: KS2Tier;
}

export default function PracticePanel({ subjectId, subjectName, topicName, subtopics, target, tier }: Props) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [askQuestion, setAskQuestion] = useState<string | null>(null);
  const [includeAnswers, setIncludeAnswers] = useState(false);

  const isMaths = /math/i.test(subjectName) || subjectId === "maths";

  async function load() {
    setLoading(true);
    setError(false);
    setRevealed({});
    try {
      const res = await fetch("/api/ks2-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subjectName, topic: topicName, subtopics, target, tier, count: 6 }),
      });
      if (!res.ok) throw new Error("failed");
      const data = (await res.json()) as { questions: QuizQuestion[] };
      setQuestions(data.questions);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicName, target, tier]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        <p className="text-sm text-gray-500">Making your practice questions…</p>
      </div>
    );
  }

  if (error || questions.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-600 mb-3">Sorry, the questions couldn&rsquo;t load.</p>
        <button onClick={load} className="inline-flex items-center gap-2 text-indigo-600 font-medium">
          <RotateCcw size={15} /> Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500">
          Have a go at these. Stuck? Tap <span className="font-semibold text-indigo-600">Ask AI</span> for a step-by-step explanation.
        </p>
        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeAnswers}
              onChange={(e) => setIncludeAnswers(e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            Answer key
          </label>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-gray-800"
          >
            <Printer size={14} /> Print
          </button>
        </div>
      </div>

      {questions.map((q, i) => (
        <div key={i} className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="flex items-start gap-2">
            <span className="font-bold text-indigo-500 shrink-0">{i + 1}.</span>
            <p className="flex-1 text-gray-900">{<InlineMath text={q.question} />}</p>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              onClick={() => setRevealed((r) => ({ ...r, [i]: !r[i] }))}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gray-100 px-3 py-1.5 text-[13px] font-semibold text-gray-700 hover:bg-gray-200"
            >
              {revealed[i] ? <EyeOff size={14} /> : <Eye size={14} />}
              {revealed[i] ? "Hide answer" : "Show answer"}
            </button>
            <button
              onClick={() => setAskQuestion(q.question)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 px-3 py-1.5 text-[13px] font-semibold text-indigo-700 hover:bg-indigo-100"
            >
              <Sparkles size={14} /> Ask AI
            </button>
          </div>

          {revealed[i] && (
            <div className="mt-3 rounded-xl border-l-4 border-emerald-300 bg-emerald-50 pl-3 py-2 text-emerald-800">
              {<InlineMath text={q.answer || "Check with your teacher."} />}
            </div>
          )}
        </div>
      ))}

      <div className="flex justify-end">
        <button onClick={load} className="inline-flex items-center gap-1.5 text-[13px] text-gray-400 hover:text-gray-600">
          <RotateCcw size={13} /> New questions
        </button>
      </div>

      <AnimatePresence>
        {askQuestion &&
          (isMaths ? (
            <PracticeWhiteboardModal question={askQuestion} level="KS2" tier={tier} onClose={() => setAskQuestion(null)} />
          ) : (
            <KS2ExplainModal
              subjectName={subjectName}
              topicName={topicName}
              subtopics={subtopics}
              question={askQuestion}
              onClose={() => setAskQuestion(null)}
            />
          ))}
      </AnimatePresence>

      {/* Print-only worksheet (hidden on screen) */}
      <div className="ks2-print-root">
        <div style={{ borderBottom: "2px solid #000", paddingBottom: "8px", marginBottom: "16px" }}>
          <div style={{ fontSize: "20px", fontWeight: 700 }}>
            {subjectName}: {topicName}
          </div>
          <div style={{ fontSize: "12px", marginTop: "2px" }}>
            {targetMeta(target).label} · {tierMeta(tier).label} ({tierMeta(tier).standard})
          </div>
          <div style={{ display: "flex", gap: "32px", marginTop: "12px", fontSize: "13px" }}>
            <span>Name: ______________________________</span>
            <span>Date: ____________________</span>
          </div>
        </div>

        <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {questions.map((q, i) => (
            <li
              key={i}
              className="ks2-print-question"
              style={{ marginBottom: "22px", fontSize: "14px", lineHeight: 1.5 }}
            >
              <div style={{ display: "flex", gap: "8px" }}>
                <span style={{ fontWeight: 700 }}>{i + 1}.</span>
                <span>
                  <InlineMath text={q.question} />
                </span>
              </div>
              {includeAnswers ? (
                <div style={{ marginTop: "6px", fontSize: "13px", fontStyle: "italic" }}>
                  Answer: <InlineMath text={q.answer || ""} />
                </div>
              ) : (
                <div style={{ borderBottom: "1px solid #bbb", height: "26px", marginTop: "10px" }} />
              )}
            </li>
          ))}
        </ol>

        <div style={{ marginTop: "24px", fontSize: "11px", textAlign: "center", color: "#555" }}>
          Mathrix · KS2 practice worksheet
        </div>
      </div>
    </div>
  );
}
