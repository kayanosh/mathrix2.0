"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, BookOpen } from "lucide-react";
import PortalShell from "@/components/portal/PortalShell";
import YearCard from "@/components/portal/YearCard";
import {
  getStages,
  getSubjectsForStage,
  getTopicsByStrand,
  getBoardsFor,
  stageHasBoards,
  type CurriculumStageId,
  type CurriculumSubjectId,
  type ExamBoardId,
} from "@/lib/curriculum";

function TeachHub() {
  const stages = getStages();
  const [stageId, setStageId] = useState<CurriculumStageId | null>(null);
  const [subjectId, setSubjectId] = useState<CurriculumSubjectId | null>(null);
  const [board, setBoard] = useState<ExamBoardId | null>(null);

  const subjects = useMemo(() => (stageId ? getSubjectsForStage(stageId) : []), [stageId]);
  const boards = useMemo(
    () => (stageId && subjectId ? getBoardsFor(stageId, subjectId) : []),
    [stageId, subjectId],
  );
  const showBoards = stageId ? stageHasBoards(stageId) : false;

  const strands = useMemo(() => {
    if (!stageId || !subjectId) return [];
    if (showBoards && !board) return [];
    return getTopicsByStrand(stageId, subjectId, board);
  }, [stageId, subjectId, board, showBoards]);

  function selectStage(id: CurriculumStageId) {
    setStageId(id);
    setSubjectId(null);
    setBoard(null);
  }
  function selectSubject(id: CurriculumSubjectId) {
    setSubjectId(id);
    setBoard(null);
  }

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Teach</h1>
      <p className="text-gray-500 text-sm mb-6">
        Pick a year, subject and topic. We&apos;ll generate a lesson, a worksheet with full worked
        solutions, and let you log it against a student.
      </p>

      {/* Step 1: Year cards */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">1 · Choose a year</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {stages.map((s) => (
            <YearCard key={s.id} stage={s} active={stageId === s.id} onClick={() => selectStage(s.id)} />
          ))}
        </div>
      </section>

      {/* Step 2: Subject */}
      {stageId && (
        <section className="mb-8">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">2 · Choose a subject</h2>
          <div className="flex flex-wrap gap-2">
            {subjects.map((sub) => (
              <button
                key={sub.id}
                onClick={() => selectSubject(sub.id)}
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                  subjectId === sub.id
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                    : "border-gray-200 bg-white text-gray-700 hover:border-indigo-300"
                }`}
              >
                <span>{sub.emoji}</span> {sub.name}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Step 3: Exam board (GCSE / A-Level only) */}
      {stageId && subjectId && showBoards && (
        <section className="mb-8">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">3 · Choose an exam board</h2>
          <div className="flex flex-wrap gap-2">
            {boards.map((b) => (
              <button
                key={b}
                onClick={() => setBoard(b)}
                className={`rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                  board === b
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                    : "border-gray-200 bg-white text-gray-700 hover:border-indigo-300"
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Step 4: Topics */}
      {stageId && subjectId && (!showBoards || board) && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
            {showBoards ? "4" : "3"} · Choose a topic
          </h2>
          {strands.length === 0 ? (
            <p className="text-sm text-gray-500">No topics found for this selection.</p>
          ) : (
            <div className="space-y-6">
              {strands.map((group) => (
                <div key={group.strand}>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">{group.strand}</h3>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {group.topics.map((t) => (
                      <Link
                        key={t.id}
                        href={`/portal/teach/${t.id}${board ? `?board=${board}` : ""}`}
                        className="group flex items-start justify-between gap-3 rounded-xl border border-gray-200 bg-white p-3 hover:border-indigo-300 hover:shadow-sm transition-all"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 font-medium text-gray-900">
                            <BookOpen size={15} className="text-indigo-500 shrink-0" />
                            <span className="truncate">{t.name}</span>
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                            {t.subtopics.slice(0, 3).join(" · ")}
                            {t.subtopics.length > 3 ? " …" : ""}
                          </div>
                        </div>
                        <ChevronRight size={18} className="text-gray-300 group-hover:text-indigo-500 shrink-0 mt-0.5" />
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}

export default function TeachHubPage() {
  return <PortalShell>{() => <TeachHub />}</PortalShell>;
}
