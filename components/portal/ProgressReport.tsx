"use client";

import { getStage, getSubject, getSubjects } from "@/lib/curriculum";
import type { StudentRow, StudentTopicRow } from "./types";

const STATUS_LABEL: Record<string, string> = {
  taught: "Taught",
  practised: "Practised",
  mastered: "Mastered",
};

export default function ProgressReport({
  student,
  topics,
  centreName,
}: {
  student: StudentRow;
  topics: StudentTopicRow[];
  centreName: string;
}) {
  const date = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const subjects = getSubjects();

  return (
    <div className="tutor-print-root">
      <header className="border-b-2 border-gray-900 pb-2 mb-4">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Progress report</h1>
            <p className="text-sm text-gray-500">{centreName}</p>
          </div>
          <div className="text-right text-sm text-gray-600">
            <p className="font-semibold text-gray-900">{student.full_name}</p>
            {student.year_group && <p>{student.year_group}</p>}
            <p>{date}</p>
          </div>
        </div>
      </header>

      {/* Levels */}
      <section className="mb-4">
        <h2 className="font-semibold text-gray-900 mb-2">Current levels</h2>
        <div className="flex flex-wrap gap-2">
          {student.levels.length === 0 ? (
            <p className="text-sm text-gray-500">No levels set yet.</p>
          ) : (
            student.levels.map((l) => {
              const stage = getStage(l.current_stage as never);
              const subject = getSubject(l.subject_id as never);
              return (
                <span key={l.subject_id} className="rounded-lg border border-gray-300 px-3 py-1 text-sm text-gray-700">
                  <strong>{subject?.name || l.subject_id}:</strong> {stage?.label || "—"}
                  {l.exam_board ? ` (${l.exam_board})` : ""}
                </span>
              );
            })
          )}
        </div>
      </section>

      {/* Summary */}
      <section className="mb-4 text-sm text-gray-700">
        <p>
          Topics covered: <strong>{student.summary.taught}</strong> · Mastered:{" "}
          <strong>{student.summary.mastered}</strong>
        </p>
      </section>

      {/* Topics by subject */}
      {subjects.map((subj) => {
        const subjTopics = topics.filter((t) => t.subject_id === subj.id);
        if (subjTopics.length === 0) return null;
        return (
          <section key={subj.id} className="mb-4 print-avoid">
            <h2 className="font-semibold text-gray-900 mb-1">{subj.name}</h2>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-300">
                  <th className="py-1 pr-2 font-medium">Topic</th>
                  <th className="py-1 pr-2 font-medium">Level</th>
                  <th className="py-1 pr-2 font-medium">Status</th>
                  <th className="py-1 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {subjTopics.map((t) => (
                  <tr key={t.id} className="border-b border-gray-100">
                    <td className="py-1 pr-2 text-gray-800">{t.topic_name}</td>
                    <td className="py-1 pr-2 text-gray-600">
                      {[t.level, t.exam_board].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td className="py-1 pr-2 text-gray-600">{STATUS_LABEL[t.status] || t.status}</td>
                    <td className="py-1 text-gray-500">
                      {new Date(t.studied_at).toLocaleDateString("en-GB")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        );
      })}
    </div>
  );
}
