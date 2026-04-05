"use client";

import { useState, useEffect, useCallback } from "react";
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
  CheckCircle2,
  Circle,
} from "lucide-react";
import { REVISION_TOPICS } from "@/lib/revision-data";
import type { RevisionTopic, RevisionSubtopic } from "@/lib/revision-data";
import { REVISION_CONTENT } from "@/lib/revision-content";
import RevisionContentRenderer from "@/components/RevisionContentRenderer";

const CHECKLIST_KEY = "mathrix-revision-checklist";

function useChecklist() {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CHECKLIST_KEY);
      if (raw) setChecked(new Set(JSON.parse(raw)));
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);

  const toggle = useCallback((key: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      localStorage.setItem(CHECKLIST_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  const total = REVISION_TOPICS.reduce((s, t) => s + t.subtopics.length, 0);
  const done = checked.size;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return { checked, toggle, total, done, pct, loaded };
}

export default function RevisionPage() {
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [viewing, setViewing] = useState<{
    topicId: string;
    topic: string;
    subtopic?: string;
  } | null>(null);
  const [showChecklist, setShowChecklist] = useState(false);
  const checklist = useChecklist();

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
      <div className="min-h-screen bg-white text-gray-900">
        {/* Top bar */}
        <div className="sticky top-0 z-30 flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
          <button
            onClick={() => setViewing(null)}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={16} /> Topics
          </button>
          <div className="text-center flex-1 min-w-0 mx-4">
            <h2 className="text-sm font-semibold text-gray-900 truncate">{title}</h2>
            <p className="text-[11px] text-gray-400">
              {notes.length} {notes.length === 1 ? "section" : "sections"}
            </p>
          </div>
          <Link
            href={`/chat?q=${encodeURIComponent(`Explain: ${viewing.subtopic || viewing.topic}`)}&autoSend=true&fromPractice=true`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-medium transition-colors"
          >
            <HelpCircle size={13} /> Ask AI Tutor
          </Link>
        </div>

        {/* Content */}
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
          {notes.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 text-center">
              <p className="text-gray-500">Notes coming soon for this topic.</p>
            </div>
          ) : (
            notes.map((note) => (
              <div key={note.subtopic}>
                {/* Section heading (when showing all subtopics for a topic) */}
                {!viewing.subtopic && (
                  <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <BookOpen size={16} className="text-indigo-600" />
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
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm text-gray-600 transition-colors"
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
    <div className="min-h-screen bg-white text-gray-900">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Sparkles size={14} className="text-white" />
          </div>
          <span className="font-bold text-gray-900">Mathrix</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/subjects"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            Practice
          </Link>
          <Link
            href="/syllabus"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
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
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
            <BookOpen size={20} className="text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">GCSE Maths Revision</h1>
        </div>
        <p className="text-gray-500 text-sm ml-[52px]">
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
          className="w-full flex items-center gap-3 px-5 py-4 rounded-xl border border-gray-200 bg-white hover:border-indigo-300 hover:bg-gray-50 transition-all group"
        >
          <FileText size={20} className="text-indigo-600 group-hover:text-indigo-500" />
          <div className="text-left flex-1">
            <p className="text-sm font-medium text-gray-900">
              {expandedTopics.size === REVISION_TOPICS.length ? "Collapse All Topics" : "Expand All Topics"}
            </p>
            <p className="text-xs text-gray-400">{REVISION_TOPICS.reduce((sum, t) => sum + t.subtopics.length, 0)} subtopics across {REVISION_TOPICS.length} topics</p>
          </div>
          <ChevronRight size={16} className="text-gray-400 group-hover:text-indigo-500 transition-colors" />
        </button>
      </div>

      {/* Progress bar + Checklist toggle */}
      {checklist.loaded && (
        <div className="max-w-4xl mx-auto px-6 mb-6">
          <button
            onClick={() => setShowChecklist((p) => !p)}
            className="w-full rounded-xl border border-gray-200 bg-white px-5 py-4 hover:bg-gray-50 transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-green-600" />
                <span className="text-sm font-medium text-gray-900">Revision Checklist</span>
              </div>
              <span className="text-xs font-semibold text-indigo-600">{checklist.pct}%</span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-500"
                style={{ width: `${checklist.pct}%` }}
              />
            </div>
            <p className="text-[11px] text-gray-400 mt-1.5 text-left">
              {checklist.done} of {checklist.total} subtopics revised &middot; {showChecklist ? "Hide" : "Show"} checklist
            </p>
          </button>

          {showChecklist && (
            <div className="mt-3 rounded-xl border border-gray-200 bg-white divide-y divide-gray-100 overflow-hidden">
              {REVISION_TOPICS.map((topic) => (
                <div key={topic.id} className="px-5 py-3">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{topic.icon} {topic.name}</p>
                  <div className="space-y-1">
                    {topic.subtopics.map((sub) => {
                      const key = `${topic.id}::${sub.name}`;
                      const done = checklist.checked.has(key);
                      return (
                        <button
                          key={key}
                          onClick={(e) => { e.stopPropagation(); checklist.toggle(key); }}
                          className="w-full flex items-center gap-2 py-1 text-left group"
                        >
                          {done ? (
                            <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                          ) : (
                            <Circle size={16} className="text-gray-300 group-hover:text-indigo-400 shrink-0" />
                          )}
                          <span className={`text-sm ${done ? "text-gray-400 line-through" : "text-gray-700"}`}>
                            {sub.name}
                          </span>
                          {sub.higherOnly && (
                            <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-1 py-0.5 rounded">H</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      {/* Topic header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <span className="text-2xl" role="img" aria-label={topic.name}>
          {topic.icon}
        </span>
        <div className="flex-1 text-left">
          <h3 className="text-base font-semibold text-gray-900">{topic.name}</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {topic.subtopics.length} subtopics
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpen(topic.id, topic.name);
          }}
          className="text-xs text-indigo-600 hover:text-indigo-500 font-medium px-3 py-1.5 rounded-lg border border-indigo-200 hover:border-indigo-400 transition-colors hidden sm:block"
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
        <div className="border-t border-gray-100">
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
      className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-100 last:border-b-0"
    >
      <BookOpen size={14} className="text-gray-400 shrink-0" />
      <span className="flex-1 text-sm text-gray-700">{sub.name}</span>
      {sub.higherOnly && (
        <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">
          H
        </span>
      )}
      <ChevronRight size={14} className="text-gray-300" />
    </button>
  );
}
