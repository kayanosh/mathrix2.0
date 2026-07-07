"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, Printer, Sparkles, Loader2, FileText, NotebookPen } from "lucide-react";
import PortalShell from "@/components/portal/PortalShell";
import TutorLessonView from "@/components/portal/TutorLessonView";
import TutorWorksheetView from "@/components/portal/TutorWorksheetView";
import SessionLogger from "@/components/portal/SessionLogger";
import {
  getTopicById,
  getStage,
  getSubject,
  getSubtopicsForTopic,
  type ExamBoardId,
  type GcseTier,
} from "@/lib/curriculum";
import type { TutorLesson, TutorWorksheet } from "@/types";

function levelOptions(stageId: string): string[] {
  if (stageId === "gcse") return ["Foundation", "Higher"];
  if (stageId === "a-level") return ["AS", "A2"];
  return ["Working towards", "Expected", "Greater depth"];
}

function tierFromLevel(stageId: string, level: string): GcseTier | null {
  if (stageId !== "gcse" || !level) return null;
  if (level.toLowerCase() === "foundation") return "foundation";
  if (level.toLowerCase() === "higher") return "higher";
  return null;
}

function TeachTopic({ topicId, board }: { topicId: string; board: ExamBoardId | null }) {
  const topic = getTopicById(topicId);
  const stage = topic ? getStage(topic.stageId) : undefined;
  const subject = topic ? getSubject(topic.subjectId) : undefined;

  const levels = useMemo(() => (topic ? levelOptions(topic.stageId) : []), [topic]);
  const [level, setLevel] = useState<string>("");
  const [count, setCount] = useState(8);

  const activeSubtopics = useMemo(() => {
    if (!topic) return [];
    return getSubtopicsForTopic(topic, tierFromLevel(topic.stageId, level));
  }, [topic, level]);

  const [lesson, setLesson] = useState<TutorLesson | null>(null);
  const [worksheet, setWorksheet] = useState<TutorWorksheet | null>(null);
  const [loadingLesson, setLoadingLesson] = useState(false);
  const [loadingWorksheet, setLoadingWorksheet] = useState(false);
  const [error, setError] = useState("");

  if (!topic || !stage || !subject) {
    return (
      <main className="max-w-3xl mx-auto px-6 py-16 text-center">
        <p className="text-gray-600">Topic not found.</p>
        <Link href="/portal/teach" className="text-indigo-600 hover:underline mt-2 inline-block">
          Back to Teach
        </Link>
      </main>
    );
  }

  const isMaths = subject.id === "maths";
  const meta = [
    stage.label,
    subject.name,
    board,
    topic.scienceTrack === "combined" ? "Combined Science" : topic.scienceTrack === "triple" ? "Triple Science" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const genBody = {
    stageId: stage.id,
    stageLabel: stage.label,
    subjectId: subject.id,
    subjectName: subject.name,
    examBoard: board,
    scienceTrack: topic.scienceTrack || null,
    topicId: topic.id,
    topicName: topic.name,
    subtopics: activeSubtopics,
    level: level || null,
  };

  async function generateLesson() {
    setLoadingLesson(true);
    setError("");
    try {
      const res = await fetch("/api/tutor-lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(genBody),
      });
      const data = await res.json();
      if (data.lesson) setLesson(data.lesson);
      else setError(data.error || "Could not generate lesson");
    } catch {
      setError("Could not generate lesson");
    }
    setLoadingLesson(false);
  }

  async function generateWorksheet() {
    setLoadingWorksheet(true);
    setError("");
    try {
      const res = await fetch("/api/tutor-worksheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...genBody, count }),
      });
      const data = await res.json();
      if (data.questions) setWorksheet(data as TutorWorksheet);
      else setError(data.error || "Could not generate worksheet");
    } catch {
      setError("Could not generate worksheet");
    }
    setLoadingWorksheet(false);
  }

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="print-hide">
        <Link href="/portal/teach" className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 mb-3">
          <ArrowLeft size={15} /> Teach
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{topic.name}</h1>
            <p className="text-sm text-gray-500">
              {meta} · {topic.strand}
            </p>
          </div>
          <button
            onClick={() => window.print()}
            disabled={!lesson && !worksheet}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          >
            <Printer size={16} /> Print pack
          </button>
        </div>

        {/* Subtopics */}
        <div className="mt-3">
          <p className="text-xs font-medium text-gray-400 mb-1.5">
            Objectives covered ({activeSubtopics.length})
            {level && stage.id === "gcse" && subject.id === "maths" ? ` · ${level} tier` : ""}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {activeSubtopics.map((st) => (
              <span key={st} className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600">
                {st}
              </span>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="mt-5 grid gap-4 md:grid-cols-[1fr_320px]">
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="flex flex-wrap items-center gap-3">
              {levels.length > 0 && (
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  Level
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  >
                    <option value="">Any</option>
                    {levels.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="flex items-center gap-2 text-sm text-gray-600">
                Questions
                <select
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                >
                  {[6, 8, 10, 12, 16].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={generateLesson}
                disabled={loadingLesson}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 text-white px-4 py-2 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
              >
                {loadingLesson ? <Loader2 size={16} className="animate-spin" /> : <NotebookPen size={16} />}
                {lesson ? "Regenerate lesson" : "Generate lesson"}
              </button>
              <button
                onClick={generateWorksheet}
                disabled={loadingWorksheet}
                className="inline-flex items-center gap-2 rounded-xl bg-white border border-indigo-200 text-indigo-700 px-4 py-2 text-sm font-semibold hover:bg-indigo-50 disabled:opacity-50"
              >
                {loadingWorksheet ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                {worksheet ? "Regenerate worksheet" : "Generate worksheet"}
              </button>
            </div>
            {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
            {!lesson && !worksheet && !loadingLesson && !loadingWorksheet && (
              <p className="mt-3 flex items-center gap-1.5 text-sm text-gray-400">
                <Sparkles size={14} /> Generate a lesson and worksheet, then print the whole pack.
              </p>
            )}
          </div>

          <SessionLogger
            payload={{
              stageId: stage.id,
              subjectId: subject.id,
              topicId: topic.id,
              topicName: topic.name,
              examBoard: board,
              level: level || null,
            }}
          />
        </div>
      </div>

      {/* Printable pack */}
      {(lesson || worksheet) && (
        <div className="tutor-print-root mt-6 space-y-6">
          {lesson && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5 print:border-0 print:p-0">
              <TutorLessonView lesson={lesson} topicName={topic.name} meta={meta} />
            </div>
          )}
          {lesson && worksheet && <div className="print-break" />}
          {worksheet && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5 print:border-0 print:p-0">
              <TutorWorksheetView worksheet={worksheet} isMaths={isMaths} />
            </div>
          )}
        </div>
      )}
    </main>
  );
}

export default function TeachTopicPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const topicId = String(params.topicId || "");
  const board = (searchParams.get("board") as ExamBoardId | null) || null;

  return <PortalShell>{() => <TeachTopic topicId={topicId} board={board} />}</PortalShell>;
}
