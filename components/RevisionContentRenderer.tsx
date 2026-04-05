"use client";

import { useState } from "react";
import InlineMath from "./InlineMath";
import type { RevisionNote } from "@/lib/revision-content";
import { BookOpen, Lightbulb, Calculator, Zap, ListOrdered, AlertTriangle, Trophy } from "lucide-react";

export default function RevisionContentRenderer({
  note,
}: {
  note: RevisionNote;
}) {
  const [showChallenge, setShowChallenge] = useState(false);

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <p className="text-[15px] leading-relaxed text-gray-600">
          <InlineMath text={note.summary} />
        </p>
      </div>

      {/* Key Concepts */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen size={16} className="text-indigo-600" />
          <h3 className="text-sm font-semibold text-gray-900">Key Concepts</h3>
        </div>
        <ul className="space-y-2.5">
          {note.keyConcepts.map((concept, i) => (
            <li
              key={i}
              className="flex gap-2 text-[14px] leading-relaxed text-gray-700"
            >
              <span className="text-indigo-500 mt-1 shrink-0">•</span>
              <InlineMath text={concept} />
            </li>
          ))}
        </ul>
      </section>

      {/* Formulas */}
      {note.formulas && note.formulas.length > 0 && (
        <section className="rounded-xl border border-indigo-200 bg-indigo-50 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Calculator size={16} className="text-indigo-600" />
            <h3 className="text-sm font-semibold text-gray-900">
              Key Formulas
            </h3>
          </div>
          <ul className="space-y-2">
            {note.formulas.map((formula, i) => (
              <li
                key={i}
                className="text-[14px] leading-relaxed text-indigo-700 font-medium"
              >
                <InlineMath text={formula} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Method Steps */}
      {note.method && note.method.length > 0 && (
        <section className="rounded-xl border border-blue-200 bg-blue-50 p-5">
          <div className="flex items-center gap-2 mb-3">
            <ListOrdered size={16} className="text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-900">
              Step-by-Step Method
            </h3>
          </div>
          <ol className="space-y-2">
            {note.method.map((step, i) => (
              <li
                key={i}
                className="flex gap-3 text-[14px] leading-relaxed text-blue-800"
              >
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-200 text-blue-700 text-xs font-bold shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <InlineMath text={step} />
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Worked Examples */}
      {note.examples && note.examples.length > 0 && (
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={16} className="text-amber-500" />
            <h3 className="text-sm font-semibold text-gray-900">
              Worked Examples
            </h3>
          </div>
          <div className="space-y-4">
            {note.examples.map((ex, i) => (
              <div
                key={i}
                className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <p className="text-[13px] text-gray-500 font-medium">
                    Q: <InlineMath text={ex.question} />
                  </p>
                  {ex.difficulty && (
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ml-2 ${
                      ex.difficulty === "foundation"
                        ? "bg-green-100 text-green-700"
                        : ex.difficulty === "intermediate"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-purple-100 text-purple-700"
                    }`}>
                      {ex.difficulty === "foundation" ? "Foundation" : ex.difficulty === "intermediate" ? "Intermediate" : "Higher"}
                    </span>
                  )}
                </div>
                <p className="text-[14px] text-emerald-700 leading-relaxed">
                  <InlineMath text={ex.solution} />
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Common Mistakes */}
      {note.commonMistakes && note.commonMistakes.length > 0 && (
        <section className="rounded-xl border border-red-200 bg-red-50 p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-red-500" />
            <h3 className="text-sm font-semibold text-red-800">
              Common Mistakes
            </h3>
          </div>
          <div className="space-y-3">
            {note.commonMistakes.map((m, i) => (
              <div key={i} className="space-y-1.5">
                <p className="flex gap-2 text-[13px] leading-relaxed text-red-700">
                  <span className="shrink-0 mt-0.5">❌</span>
                  <InlineMath text={m.mistake} />
                </p>
                <p className="flex gap-2 text-[13px] leading-relaxed text-emerald-700">
                  <span className="shrink-0 mt-0.5">✅</span>
                  <InlineMath text={m.correction} />
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Grade 8/9 Challenge */}
      {note.challengeQuestions && note.challengeQuestions.length > 0 && (
        <section className="rounded-xl border border-purple-200 bg-purple-50 p-5">
          <button
            onClick={() => setShowChallenge(!showChallenge)}
            className="flex items-center gap-2 w-full text-left"
          >
            <Trophy size={16} className="text-purple-600" />
            <h3 className="text-sm font-semibold text-purple-800">
              Grade 8/9 Challenge
            </h3>
            <span className="ml-auto text-purple-400 text-xs">
              {showChallenge ? "Hide ▲" : "Show ▼"}
            </span>
          </button>
          {showChallenge && (
            <div className="mt-4 space-y-4">
              {note.challengeQuestions.map((cq, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-purple-200 bg-white p-4 space-y-2"
                >
                  <p className="text-[13px] text-purple-700 font-medium">
                    Q: <InlineMath text={cq.question} />
                  </p>
                  <p className="text-[14px] text-emerald-700 leading-relaxed">
                    <InlineMath text={cq.solution} />
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Tips */}
      {note.tips && note.tips.length > 0 && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb size={16} className="text-amber-500" />
            <h3 className="text-sm font-semibold text-amber-800">
              Exam Tips
            </h3>
          </div>
          <ul className="space-y-2">
            {note.tips.map((tip, i) => (
              <li
                key={i}
                className="flex gap-2 text-[13px] leading-relaxed text-amber-700"
              >
                <span className="text-amber-500 mt-0.5 shrink-0">💡</span>
                <InlineMath text={tip} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
