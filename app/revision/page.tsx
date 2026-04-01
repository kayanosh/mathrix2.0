"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  BookOpen,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  X,
  Star,
  FileText,
} from "lucide-react";
import { REVISION_TOPICS, PDF_PATH } from "@/lib/revision-data";
import type { RevisionTopic, RevisionSubtopic } from "@/lib/revision-data";

export default function RevisionPage() {
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [viewing, setViewing] = useState<{
    topic: string;
    subtopic?: string;
    startPage: number;
    endPage: number;
  } | null>(null);

  function toggleTopic(id: string) {
    setExpandedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openViewer(
    topicName: string,
    startPage: number,
    endPage: number,
    subtopicName?: string,
  ) {
    setViewing({
      topic: topicName,
      subtopic: subtopicName,
      startPage,
      endPage,
    });
  }

  // ── PDF Viewer ──────────────────────────────────────────────────────────
  if (viewing) {
    const pdfUrl = `${PDF_PATH}#page=${viewing.startPage}`;
    const title = viewing.subtopic
      ? `${viewing.topic} — ${viewing.subtopic}`
      : viewing.topic;
    const pageCount = viewing.endPage - viewing.startPage + 1;

    return (
      <div className="h-screen flex flex-col bg-[#0a0a0f] text-gray-100">
        {/* Viewer header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-[#111118] shrink-0">
          <button
            onClick={() => setViewing(null)}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} /> Back to Topics
          </button>
          <div className="text-center">
            <h2 className="text-sm font-semibold text-white truncate max-w-[300px] sm:max-w-none">
              {title}
            </h2>
            <p className="text-xs text-gray-500">
              Pages {viewing.startPage}–{viewing.endPage} ({pageCount}{" "}
              {pageCount === 1 ? "page" : "pages"})
            </p>
          </div>
          <button
            onClick={() => setViewing(null)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Embedded PDF */}
        <iframe
          src={pdfUrl}
          className="flex-1 w-full border-0"
          title={title}
        />
      </div>
    );
  }

  // ── Topic Browser ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-100">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Sparkles size={14} className="text-white" />
          </div>
          <span className="font-bold text-white">Mathrix</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/subjects"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Subjects
          </Link>
          <Link
            href="/syllabus"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Syllabus
          </Link>
          <Link
            href="/chat"
            className="text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-1"
          >
            <Sparkles size={14} /> Chat
          </Link>
        </div>
      </nav>

      {/* Header */}
      <div className="max-w-4xl mx-auto px-6 pt-10 pb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 flex items-center justify-center">
            <BookOpen size={20} className="text-indigo-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">GCSE Maths Revision</h1>
        </div>
        <p className="text-gray-400 text-sm ml-[52px]">
          Browse notes and worked examples for every GCSE Maths topic.
          Click a topic to expand, then choose a subtopic to start revising.
        </p>
      </div>

      {/* Quick‑open full PDF */}
      <div className="max-w-4xl mx-auto px-6 mb-6">
        <button
          onClick={() => openViewer("Full Revision Guide", 1, 374)}
          className="w-full flex items-center gap-3 px-5 py-4 rounded-xl border border-gray-800 bg-[#111118] hover:border-indigo-500/50 hover:bg-[#15151f] transition-all group"
        >
          <FileText size={20} className="text-indigo-400 group-hover:text-indigo-300" />
          <div className="text-left flex-1">
            <p className="text-sm font-medium text-white">
              Open Full Revision Guide
            </p>
            <p className="text-xs text-gray-500">374 pages — all topics</p>
          </div>
          <ChevronRight size={16} className="text-gray-600 group-hover:text-indigo-400 transition-colors" />
        </button>
      </div>

      {/* Topic Cards */}
      <div className="max-w-4xl mx-auto px-6 pb-16 space-y-4">
        {REVISION_TOPICS.map((topic) => (
          <TopicCard
            key={topic.id}
            topic={topic}
            expanded={expandedTopics.has(topic.id)}
            onToggle={() => toggleTopic(topic.id)}
            onOpen={openViewer}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Topic Card Component ─────────────────────────────────────────────────── */

function TopicCard({
  topic,
  expanded,
  onToggle,
  onOpen,
}: {
  topic: RevisionTopic;
  expanded: boolean;
  onToggle: () => void;
  onOpen: (
    topicName: string,
    startPage: number,
    endPage: number,
    subtopicName?: string,
  ) => void;
}) {
  const pageCount = topic.endPage - topic.startPage + 1;

  return (
    <div className="rounded-xl border border-gray-800 bg-[#111118] overflow-hidden">
      {/* Topic header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-[#15151f] transition-colors"
      >
        <span className="text-2xl" role="img" aria-label={topic.name}>
          {topic.icon}
        </span>
        <div className="flex-1 text-left">
          <h3 className="text-base font-semibold text-white">{topic.name}</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {topic.subtopics.length} subtopics · {pageCount} pages
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpen(topic.name, topic.startPage, topic.endPage);
          }}
          className="text-xs text-indigo-400 hover:text-indigo-300 font-medium px-3 py-1.5 rounded-lg border border-indigo-500/30 hover:border-indigo-500/60 transition-colors hidden sm:block"
        >
          View all
        </button>
        {expanded ? (
          <ChevronDown size={18} className="text-gray-500" />
        ) : (
          <ChevronRight size={18} className="text-gray-500" />
        )}
      </button>

      {/* Subtopics list */}
      {expanded && (
        <div className="border-t border-gray-800/50">
          {topic.subtopics.map((sub) => (
            <SubtopicRow
              key={sub.name}
              sub={sub}
              topicName={topic.name}
              onOpen={onOpen}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Subtopic Row ─────────────────────────────────────────────────────────── */

function SubtopicRow({
  sub,
  topicName,
  onOpen,
}: {
  sub: RevisionSubtopic;
  topicName: string;
  onOpen: (
    topicName: string,
    startPage: number,
    endPage: number,
    subtopicName?: string,
  ) => void;
}) {
  const pages = sub.endPage - sub.startPage + 1;

  return (
    <button
      onClick={() => onOpen(topicName, sub.startPage, sub.endPage, sub.name)}
      className="w-full flex items-center gap-3 px-5 py-3 hover:bg-[#15151f] transition-colors text-left border-b border-gray-800/30 last:border-b-0"
    >
      <BookOpen size={14} className="text-gray-600 shrink-0" />
      <span className="flex-1 text-sm text-gray-300">{sub.name}</span>
      {sub.higherOnly && (
        <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">
          H
        </span>
      )}
      <span className="text-xs text-gray-600">
        {pages} {pages === 1 ? "page" : "pages"}
      </span>
      <ChevronRight size={14} className="text-gray-700" />
    </button>
  );
}
