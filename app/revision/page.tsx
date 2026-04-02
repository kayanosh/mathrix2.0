"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  BookOpen,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  FileText,
  HelpCircle,
  ChevronLeft,
} from "lucide-react";
import { REVISION_TOPICS } from "@/lib/revision-data";
import type { RevisionTopic, RevisionSubtopic } from "@/lib/revision-data";
import { REVISION_CONTENT } from "@/lib/revision-content";
import RevisionContentRenderer from "@/components/RevisionContentRenderer";

export default function RevisionPage() {
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [viewing, setViewing] = useState<{
    topicId: string;
    topic: string;
    subtopic?: string;
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
    topicId: string,
    topicName: string,
    subtopicName?: string,
  ) {
    setViewing({
      topicId,
      topic: topicName,
      subtopic: subtopicName,
    });
  }

  // ── Styled Topic Viewer ─────────────────────────────────────────────────
  if (viewing) {
    const title = viewing.subtopic
      ? `${viewing.topic} — ${viewing.subtopic}`
      : viewing.topic;

    // If a specific subtopic is selected, show just that note; otherwise show all notes for the topic
    const notes = viewing.subtopic
      ? REVISION_CONTENT.filter(
          (n) => n.topicId === viewing.topicId && n.subtopic === viewing.subtopic,
        )
      : REVISION_CONTENT.filter((n) => n.topicId === viewing.topicId);

    return (
      <div className="min-h-screen bg-[#0a0a0f] text-gray-100">
        {/* Top bar */}
        <div className="sticky top-0 z-30 flex items-center justify-between px-5 py-3 border-b border-gray-800 bg-[#0a0a0f]/95 backdrop-blur-sm">
          <button
            onClick={() => setViewing(null)}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} /> Topics
          </button>
          <div className="text-center flex-1 min-w-0 mx-4">
            <h2 className="text-sm font-semibold text-white truncate">{title}</h2>
            <p className="text-[11px] text-gray-500">
              {notes.length} {notes.length === 1 ? "section" : "sections"}
            </p>
          </div>
          <Link
            href={`/chat?q=${encodeURIComponent(`Explain: ${viewing.subtopic || viewing.topic}`)}&autoSend=true&fromPractice=true`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 text-xs font-medium transition-colors"
          >
            <HelpCircle size={13} /> Ask AI Tutor
          </Link>
        </div>

        {/* Content */}
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
          {notes.length === 0 ? (
            <div className="rounded-2xl border border-gray-800 bg-[#111118] p-6 text-center">
              <p className="text-gray-400">Notes coming soon for this topic.</p>
            </div>
          ) : (
            notes.map((note) => (
              <div key={note.subtopic}>
                {/* Section heading (when showing all subtopics for a topic) */}
                {!viewing.subtopic && (
                  <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <BookOpen size={16} className="text-indigo-400" />
                    {note.subtopic}
                  </h2>
                )}
                <RevisionContentRenderer note={note} />
              </div>
            ))
          )}

          {/* Bottom actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 pb-8">
            <button
              onClick={() => setViewing(null)}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-gray-800 bg-[#111118] hover:bg-[#15151f] text-sm text-gray-300 transition-colors"
            >
              <ChevronLeft size={16} /> Back to Topics
            </button>
            <Link
              href={`/subjects`}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm text-white transition-colors"
            >
              <Sparkles size={14} /> Practice This Topic
            </Link>
          </div>
        </div>
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
            Practice
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

      {/* Quick-open: expand all topics */}
      <div className="max-w-4xl mx-auto px-6 mb-6">
        <button
          onClick={() => {
            const allIds = REVISION_TOPICS.map((t) => t.id);
            setExpandedTopics((prev) =>
              prev.size === allIds.length ? new Set() : new Set(allIds)
            );
          }}
          className="w-full flex items-center gap-3 px-5 py-4 rounded-xl border border-gray-800 bg-[#111118] hover:border-indigo-500/50 hover:bg-[#15151f] transition-all group"
        >
          <FileText size={20} className="text-indigo-400 group-hover:text-indigo-300" />
          <div className="text-left flex-1">
            <p className="text-sm font-medium text-white">
              {expandedTopics.size === REVISION_TOPICS.length ? "Collapse All Topics" : "Expand All Topics"}
            </p>
            <p className="text-xs text-gray-500">{REVISION_TOPICS.reduce((sum, t) => sum + t.subtopics.length, 0)} subtopics across {REVISION_TOPICS.length} topics</p>
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
    topicId: string,
    topicName: string,
    subtopicName?: string,
  ) => void;
}) {
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
            {topic.subtopics.length} subtopics
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpen(topic.id, topic.name);
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
              topicId={topic.id}
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
  topicId,
  topicName,
  onOpen,
}: {
  sub: RevisionSubtopic;
  topicId: string;
  topicName: string;
  onOpen: (
    topicId: string,
    topicName: string,
    subtopicName?: string,
  ) => void;
}) {
  return (
    <button
      onClick={() => onOpen(topicId, topicName, sub.name)}
      className="w-full flex items-center gap-3 px-5 py-3 hover:bg-[#15151f] transition-colors text-left border-b border-gray-800/30 last:border-b-0"
    >
      <BookOpen size={14} className="text-gray-600 shrink-0" />
      <span className="flex-1 text-sm text-gray-300">{sub.name}</span>
      {sub.higherOnly && (
        <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">
          H
        </span>
      )}
      <ChevronRight size={14} className="text-gray-700" />
    </button>
  );
}
