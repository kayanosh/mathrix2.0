"use client";

import Link from "next/link";
import { ChevronRight, Star } from "lucide-react";
import { getStage, getSubject } from "@/lib/curriculum";
import type { StudentRow } from "./types";

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export default function StudentTable({ students }: { students: StudentRow[] }) {
  if (students.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
        No students yet. Add your first student above.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 border-b border-gray-100">
            <th className="px-4 py-3 font-medium">Student</th>
            <th className="px-4 py-3 font-medium">Tutor</th>
            <th className="px-4 py-3 font-medium">Levels</th>
            <th className="px-4 py-3 font-medium text-center">Topics</th>
            <th className="px-4 py-3 font-medium text-center">Mastered</th>
            <th className="px-4 py-3 font-medium">Last session</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {students.map((s) => (
            <tr key={s.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <Link href={`/portal/students/${s.id}`} className="font-medium text-gray-900 hover:text-indigo-600">
                  {s.full_name}
                </Link>
                {s.year_group && <div className="text-xs text-gray-400">{s.year_group}</div>}
              </td>
              <td className="px-4 py-3 text-gray-600">
                {s.assigned_tutor_name || <span className="text-xs text-gray-400">—</span>}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {s.levels.length === 0 ? (
                    <span className="text-xs text-gray-400">Not set</span>
                  ) : (
                    s.levels.map((l) => {
                      const stage = getStage(l.current_stage as never);
                      const subject = getSubject(l.subject_id as never);
                      return (
                        <span
                          key={l.subject_id}
                          className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
                          title={`${subject?.name || l.subject_id}: ${stage?.label || "—"}${l.exam_board ? ` (${l.exam_board})` : ""}`}
                        >
                          {subject?.emoji} {stage?.shortLabel || "—"}
                          {l.exam_board ? ` · ${l.exam_board}` : ""}
                        </span>
                      );
                    })
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-center text-gray-700">{s.summary.taught}</td>
              <td className="px-4 py-3 text-center">
                <span className="inline-flex items-center gap-1 text-amber-600 font-semibold">
                  <Star size={13} className="fill-amber-400 text-amber-400" /> {s.summary.mastered}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-500">{timeAgo(s.summary.lastSession)}</td>
              <td className="px-4 py-3 text-right">
                <Link href={`/portal/students/${s.id}`} className="text-gray-300 hover:text-indigo-600">
                  <ChevronRight size={18} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
