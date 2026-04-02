"use client";

import InlineMath from "./InlineMath";
import type { RevisionNote } from "@/lib/revision-content";
import { BookOpen, Lightbulb, Calculator, Zap } from "lucide-react";

export default function RevisionContentRenderer({
  note,
}: {
  note: RevisionNote;
}) {
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
                <p className="text-[13px] text-gray-500 font-medium">
                  Q: <InlineMath text={ex.question} />
                </p>
                <p className="text-[14px] text-emerald-700 leading-relaxed">
                  <InlineMath text={ex.solution} />
                </p>
              </div>
            ))}
          </div>
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
