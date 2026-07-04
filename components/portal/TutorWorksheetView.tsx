"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Sparkles } from "lucide-react";
import InlineMath from "@/components/InlineMath";
import PracticeWhiteboardModal from "@/components/PracticeWhiteboardModal";
import type { TutorWorksheet } from "@/types";

const DIFF_LABEL: Record<string, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
  exam: "Exam style",
};
const DIFF_DOT: Record<string, string> = {
  easy: "bg-emerald-500",
  medium: "bg-amber-500",
  hard: "bg-red-500",
  exam: "bg-purple-500",
};

export default function TutorWorksheetView({
  worksheet,
  isMaths,
}: {
  worksheet: TutorWorksheet;
  isMaths: boolean;
}) {
  const [showSolutions, setShowSolutions] = useState(false);
  const [explain, setExplain] = useState<string | null>(null);

  const date = new Date(worksheet.generatedAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const meta = [worksheet.stageLabel, worksheet.subjectName, worksheet.examBoard]
    .filter(Boolean)
    .join(" · ");

  return (
    <div>
      {/* On-screen controls */}
      <div className="flex items-center justify-between mb-4 print-hide">
        <h2 className="text-lg font-semibold text-gray-900">Worksheet</h2>
        <button
          onClick={() => setShowSolutions((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
        >
          {showSolutions ? <EyeOff size={15} /> : <Eye size={15} />}
          {showSolutions ? "Hide solutions" : "Show solutions"}
        </button>
      </div>

      {/* ── Worksheet (questions) ── */}
      <div className="print-avoid">
        <div className="flex items-center justify-between border-b-2 border-gray-900 pb-2 mb-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900">{worksheet.topicName}</h1>
            <p className="text-xs text-gray-500">{meta} · {date}</p>
          </div>
          <div className="text-right text-xs text-gray-500 print-only">
            <p>Name: ______________________</p>
            <p className="mt-1">Date: ____________</p>
          </div>
        </div>

        <ol className="space-y-4">
          {worksheet.questions.map((q) => (
            <li key={q.id} className="print-avoid">
              <div className="flex items-start gap-2">
                <span className="font-mono text-sm font-semibold text-gray-400 mt-0.5 min-w-[1.75rem]">{q.id}.</span>
                <div className="flex-1">
                  <div className="text-sm text-gray-900 whitespace-pre-wrap">
                    <span className={`inline-block w-2 h-2 rounded-full mr-2 align-middle print:hidden ${DIFF_DOT[q.difficulty]}`} />
                    <InlineMath text={q.questionText} />
                    {q.marks ? <span className="ml-2 text-xs font-medium text-gray-500">[{q.marks} marks]</span> : null}
                  </div>
                  {isMaths && (
                    <button
                      onClick={() => setExplain(q.questionText)}
                      className="mt-1 flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 print-hide"
                    >
                      <Sparkles size={12} /> Explain on whiteboard
                    </button>
                  )}
                  {/* Answer space on print */}
                  <div className="hidden print:block mt-2 h-14 border-b border-dashed border-gray-300" />
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* ── Full step-by-step solutions ── */}
      <div className={`mt-8 ${showSolutions ? "" : "print-only"} print-break`}>
        <h2 className="text-lg font-bold border-b-2 border-gray-900 pb-1 mb-4">Full solutions</h2>
        <div className="space-y-4">
          {worksheet.questions.map((q) => (
            <div key={q.id} className="print-avoid">
              <p className="text-sm font-semibold text-gray-900">
                <span className="font-mono text-gray-400 mr-1">{q.id}.</span>
                <span className="text-gray-500 text-xs uppercase tracking-wide mr-2">{DIFF_LABEL[q.difficulty]}</span>
                <InlineMath text={q.questionText} />
              </p>
              <ol className="list-decimal pl-7 text-sm text-gray-700 space-y-0.5 mt-1">
                {q.solutionSteps.map((s, i) => (
                  <li key={i}>
                    <InlineMath text={s} />
                  </li>
                ))}
              </ol>
              <p className="pl-7 mt-1 text-sm font-semibold text-emerald-700">
                Answer: <InlineMath text={q.answer} />
              </p>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {explain && <PracticeWhiteboardModal question={explain} onClose={() => setExplain(null)} />}
      </AnimatePresence>
    </div>
  );
}
