"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, BookOpen, Search } from "lucide-react";
import YearCard from "@/components/portal/YearCard";
import { useTeachSession } from "@/components/portal/TeachSessionProvider";
import { getStudentTeachDefaults } from "@/lib/portal-student-curriculum";
import {
  getStages,
  getSubjectsForStage,
  getTopicsByStrand,
  getBoardsFor,
  stageHasBoards,
  type CurriculumStageId,
  type CurriculumSubjectId,
  type ExamBoardId,
  type ScienceTrack,
} from "@/lib/curriculum";

function topicHref(
  topicId: string,
  board: ExamBoardId | null,
  studentId: string | null,
): string {
  const params = new URLSearchParams();
  if (board) params.set("board", board);
  if (studentId) params.set("student", studentId);
  const qs = params.toString();
  return `/portal/teach/${topicId}${qs ? `?${qs}` : ""}`;
}

function StrandGroup({
  strand,
  topics,
  board,
  studentId,
}: {
  strand: string;
  topics: { id: string; name: string; subtopics: string[] }[];
  board: ExamBoardId | null;
  studentId: string | null;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50"
      >
        <span className="text-sm font-semibold text-gray-800">
          {strand}
          <span className="ml-2 text-xs font-normal text-gray-400">({topics.length})</span>
        </span>
        {open ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
      </button>
      {open && (
        <div className="px-3 pb-3 grid sm:grid-cols-2 gap-2">
          {topics.map((t) => (
            <Link
              key={t.id}
              href={topicHref(t.id, board, studentId)}
              className="group flex items-start justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50/50 p-3 hover:border-indigo-300 hover:bg-white transition-all"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 font-medium text-gray-900 text-sm">
                  <BookOpen size={14} className="text-indigo-500 shrink-0" />
                  <span className="truncate">{t.name}</span>
                </div>
                <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                  {t.subtopics.slice(0, 3).join(" · ")}
                  {t.subtopics.length > 3 ? " …" : ""}
                </div>
              </div>
              <ChevronRight size={16} className="text-gray-300 group-hover:text-indigo-500 shrink-0 mt-0.5" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TeachHubPage() {
  const stages = getStages();
  const { activeStudent, activeStudentId, rosterStudents, getPrefs, savePrefs } = useTeachSession();

  const [stageId, setStageId] = useState<CurriculumStageId | null>(null);
  const [subjectId, setSubjectId] = useState<CurriculumSubjectId | null>(null);
  const [board, setBoard] = useState<ExamBoardId | null>(null);
  const [scienceTrack, setScienceTrack] = useState<ScienceTrack | null>(null);
  const [search, setSearch] = useState("");
  const skipSaveRef = useRef(false);

  useEffect(() => {
    if (!activeStudentId || !activeStudent) return;
    const saved = getPrefs(activeStudentId);
    const defaults = getStudentTeachDefaults(activeStudent);
    const prefs = saved ?? defaults;
    queueMicrotask(() => {
      skipSaveRef.current = true;
      setStageId(prefs.stageId);
      setSubjectId(prefs.subjectId);
      setBoard(prefs.board);
      setScienceTrack(prefs.scienceTrack);
      setSearch("");
    });
  }, [activeStudentId, activeStudent, getPrefs]);

  useEffect(() => {
    if (!activeStudentId) return;
    if (skipSaveRef.current) {
      skipSaveRef.current = false;
      return;
    }
    savePrefs(activeStudentId, { stageId, subjectId, board, scienceTrack });
  }, [activeStudentId, stageId, subjectId, board, scienceTrack, savePrefs]);

  const subjects = useMemo(() => (stageId ? getSubjectsForStage(stageId) : []), [stageId]);
  const boards = useMemo(
    () => (stageId && subjectId ? getBoardsFor(stageId, subjectId) : []),
    [stageId, subjectId],
  );
  const showBoards = stageId ? stageHasBoards(stageId) : false;
  const needsScienceTrack = stageId === "gcse" && subjectId === "science";

  const strands = useMemo(() => {
    if (!stageId || !subjectId) return [];
    if (showBoards && !board) return [];
    if (needsScienceTrack && !scienceTrack) return [];
    const groups = getTopicsByStrand(stageId, subjectId, board, { scienceTrack });
    if (!search.trim()) return groups;
    const q = search.toLowerCase();
    return groups
      .map((g) => ({
        ...g,
        topics: g.topics.filter(
          (t) =>
            t.name.toLowerCase().includes(q) ||
            t.subtopics.some((s) => s.toLowerCase().includes(q)),
        ),
      }))
      .filter((g) => g.topics.length > 0);
  }, [stageId, subjectId, board, showBoards, needsScienceTrack, scienceTrack, search]);

  function selectStage(id: CurriculumStageId) {
    setStageId(id);
    setSubjectId(null);
    setBoard(null);
    setScienceTrack(null);
    setSearch("");
  }
  function selectSubject(id: CurriculumSubjectId) {
    setSubjectId(id);
    setBoard(null);
    setScienceTrack(null);
    setSearch("");
  }

  const stepTopic = showBoards ? (needsScienceTrack ? 5 : 4) : needsScienceTrack ? 4 : 3;

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Teach</h1>
          <p className="text-gray-500 text-sm">
            Pick a year, subject and topic. We&apos;ll generate a lesson, a worksheet with full worked
            solutions, and let you log it against a student.
          </p>
        </div>
        <Link
          href="/portal/curriculum"
          className="text-sm text-indigo-600 hover:text-indigo-800 font-medium shrink-0"
        >
          View full curriculum →
        </Link>
      </div>

      {activeStudent && (
        <div className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-indigo-900">
            Teaching:{" "}
            <strong>{activeStudent.full_name}</strong>
            {activeStudent.year_group ? ` · ${activeStudent.year_group}` : ""}
          </p>
          <Link
            href={`/portal/students/${activeStudent.id}`}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
          >
            View student record →
          </Link>
        </div>
      )}

      {rosterStudents.length === 0 && (
        <div className="mb-6 rounded-xl border border-dashed border-indigo-200 bg-white px-4 py-3 text-sm text-indigo-700">
          Use <strong>+ Add</strong> in the session bar above to roster students for this hour. Tabs
          switch curriculum and logging per student.
        </div>
      )}

      <section className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">1 · Choose a year</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {stages.map((s) => (
            <YearCard key={s.id} stage={s} active={stageId === s.id} onClick={() => selectStage(s.id)} />
          ))}
        </div>
      </section>

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

      {stageId && subjectId && needsScienceTrack && (!showBoards || board) && (
        <section className="mb-8">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
            {showBoards ? "4" : "3"} · Choose science route
          </h2>
          <div className="flex flex-wrap gap-2">
            {(["combined", "triple"] as ScienceTrack[]).map((track) => (
              <button
                key={track}
                onClick={() => setScienceTrack(track)}
                className={`rounded-xl border px-4 py-2 text-sm font-medium transition-colors capitalize ${
                  scienceTrack === track
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                    : "border-gray-200 bg-white text-gray-700 hover:border-indigo-300"
                }`}
              >
                {track === "combined" ? "Combined Science" : "Triple Science"}
              </button>
            ))}
          </div>
        </section>
      )}

      {stageId && subjectId && (!showBoards || board) && (!needsScienceTrack || scienceTrack) && (
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              {stepTopic} · Choose a topic
            </h2>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search topics…"
                className="pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
          </div>
          {strands.length === 0 ? (
            <p className="text-sm text-gray-500">No topics found for this selection.</p>
          ) : (
            <div className="space-y-3">
              {strands.map((group) => (
                <StrandGroup
                  key={group.strand}
                  strand={group.strand}
                  topics={group.topics}
                  board={board}
                  studentId={activeStudentId}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
