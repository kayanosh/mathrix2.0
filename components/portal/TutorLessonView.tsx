"use client";

import InlineMath from "@/components/InlineMath";
import { Target, AlertTriangle, Lightbulb, CheckCircle2 } from "lucide-react";
import type { TutorLesson } from "@/types";

export default function TutorLessonView({
  lesson,
  topicName,
  meta,
}: {
  lesson: TutorLesson;
  topicName: string;
  meta: string;
}) {
  return (
    <article className="print-avoid">
      <header className="border-b-2 border-gray-900 pb-2 mb-4">
        <h1 className="text-xl font-bold text-gray-900">{topicName}</h1>
        <p className="text-sm text-gray-500">{meta} · Teaching notes</p>
      </header>

      <p className="text-gray-800 mb-4">
        <InlineMath text={lesson.intro} />
      </p>

      {lesson.objectives.length > 0 && (
        <div className="mb-4 rounded-xl bg-indigo-50 border border-indigo-100 p-3 print:bg-white print:border-gray-300">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-indigo-700 mb-1">
            <Target size={15} /> Learning objectives
          </p>
          <ul className="list-disc pl-5 text-sm text-gray-700 space-y-0.5">
            {lesson.objectives.map((o, i) => (
              <li key={i}>
                <InlineMath text={o} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {lesson.sections.map((s, i) => (
        <section key={i} className="mb-3 print-avoid">
          <h2 className="font-semibold text-gray-900">{s.heading}</h2>
          <p className="text-gray-700 text-sm">
            <InlineMath text={s.body} />
          </p>
        </section>
      ))}

      {lesson.workedExamples.length > 0 && (
        <div className="mt-4">
          <h2 className="font-bold text-gray-900 mb-2">Worked examples</h2>
          <div className="space-y-3">
            {lesson.workedExamples.map((ex, i) => (
              <div key={i} className="rounded-xl border border-gray-200 p-3 print-avoid">
                <p className="font-medium text-gray-900 mb-1">
                  <InlineMath text={ex.question} />
                </p>
                <ol className="list-decimal pl-5 text-sm text-gray-700 space-y-1">
                  {ex.steps.map((st, j) => (
                    <li key={j}>
                      <InlineMath text={st} />
                    </li>
                  ))}
                </ol>
                <p className="mt-1.5 text-sm font-semibold text-emerald-700">
                  Answer: <InlineMath text={ex.answer} />
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3 mt-4">
        {lesson.keyPoints.length > 0 && (
          <div className="rounded-xl border border-gray-200 p-3 print-avoid">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-800 mb-1">
              <CheckCircle2 size={15} className="text-emerald-600" /> Key points
            </p>
            <ul className="list-disc pl-5 text-sm text-gray-700 space-y-0.5">
              {lesson.keyPoints.map((k, i) => (
                <li key={i}>
                  <InlineMath text={k} />
                </li>
              ))}
            </ul>
          </div>
        )}
        {lesson.commonMistakes.length > 0 && (
          <div className="rounded-xl border border-gray-200 p-3 print-avoid">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-800 mb-1">
              <AlertTriangle size={15} className="text-amber-600" /> Common mistakes
            </p>
            <ul className="list-disc pl-5 text-sm text-gray-700 space-y-0.5">
              {lesson.commonMistakes.map((m, i) => (
                <li key={i}>
                  <InlineMath text={m} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {lesson.examTip && (
        <div className="mt-3 rounded-xl bg-amber-50 border border-amber-100 p-3 print:bg-white print:border-gray-300">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-700 mb-0.5">
            <Lightbulb size={15} /> Exam tip
          </p>
          <p className="text-sm text-gray-700">
            <InlineMath text={lesson.examTip} />
          </p>
        </div>
      )}
    </article>
  );
}
