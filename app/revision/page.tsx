"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles, BookOpen, ChevronDown, ChevronRight, CheckCircle2, Circle, Search } from "lucide-react";
import { REVISION_TOPICS } from "@/lib/revision-data";
import type { RevisionTopic, RevisionSubtopic } from "@/lib/revision-data";
import { findSubtopic, revisionHref } from "@/lib/revision-sets";
import TopicLesson, { readResults, type RevisionResult } from "@/components/revision/TopicLesson";

const CHECKLIST_KEY = "mathrix-revision-checklist";
/** A topic is ticked off for the pupil when they get this many of a set right. */
const MASTERED_AT = 5 / 6;

const keyOf = (topicId: string, subtopic: string) => `${topicId}::${subtopic}`;

function useChecklist() {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let stored: Set<string> | null = null;
    try {
      const raw = localStorage.getItem(CHECKLIST_KEY);
      if (raw) stored = new Set(JSON.parse(raw));
    } catch { /* ignore */ }
    queueMicrotask(() => {
      if (stored) setChecked(stored);
      setLoaded(true);
    });
  }, []);

  const save = (next: Set<string>) => {
    try {
      localStorage.setItem(CHECKLIST_KEY, JSON.stringify([...next]));
    } catch { /* private browsing */ }
  };

  const toggle = useCallback((key: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      save(next);
      return next;
    });
  }, []);

  const tick = useCallback((key: string) => {
    setChecked((prev) => {
      if (prev.has(key)) return prev;
      const next = new Set(prev).add(key);
      save(next);
      return next;
    });
  }, []);

  const total = REVISION_TOPICS.reduce((s, t) => s + t.subtopics.length, 0);
  const done = checked.size;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return { checked, toggle, tick, total, done, pct, loaded };
}

/** Every subtopic in order, for "next topic". */
const IN_ORDER = REVISION_TOPICS.flatMap((topic) => topic.subtopics.map((subtopic) => ({ topic, subtopic })));

export default function RevisionPage() {
  // The address says which topic is open, so a topic can be bookmarked or
  // shared and the back button goes back to the list. It used to be held in
  // the page, and "back" left the site.
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <Revision />
    </Suspense>
  );
}

function Revision() {
  const router = useRouter();
  const params = useSearchParams();
  const open = findSubtopic(params.get("topic"), params.get("sub"));

  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [showChecklist, setShowChecklist] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Record<string, RevisionResult>>({});
  const checklist = useChecklist();

  // Scores are kept on the device. Read again whenever the list is shown.
  const viewingList = open === null;
  useEffect(() => {
    if (!viewingList) return;
    const stored = readResults();
    queueMicrotask(() => setResults(stored));
  }, [viewingList]);

  const openTopic = useCallback(
    (topicId: string, subtopicName: string) => {
      router.push(revisionHref(topicId, subtopicName));
      window.scrollTo({ top: 0 });
    },
    [router],
  );

  const matches = useMemo(() => {
    const wanted = query.trim().toLowerCase();
    if (!wanted) return null;
    return IN_ORDER.filter(({ subtopic }) => subtopic.name.toLowerCase().includes(wanted));
  }, [query]);

  function toggleTopic(id: string) {
    setExpandedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ── One topic ───────────────────────────────────────────────────────────
  if (open) {
    const at = IN_ORDER.findIndex((entry) => entry.topic.id === open.topic.id && entry.subtopic.name === open.subtopic.name);
    const after = at >= 0 ? IN_ORDER[at + 1] : undefined;
    return (
      <TopicLesson
        // A new topic starts from scratch: no answers left open from the last one.
        key={keyOf(open.topic.id, open.subtopic.name)}
        topic={open.topic}
        subtopic={open.subtopic}
        onBack={() => router.push("/revision")}
        next={after ? { name: after.subtopic.name, go: () => openTopic(after.topic.id, after.subtopic.name) } : undefined}
        onScored={(got, of) => {
          if (got / of >= MASTERED_AT - 1e-9) checklist.tick(keyOf(open.topic.id, open.subtopic.name));
        }}
      />
    );
  }

  // ── The list of topics ──────────────────────────────────────────────────
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
          <Link href="/subjects" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            Practice
          </Link>
          <Link href="/syllabus" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
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
          Pick a topic. You get its main idea, then six questions that teach it: five that build up a step at a time, and an
          exam question. Every question has a hint and a worked answer, and you can print them or ask for new ones.
        </p>
      </div>

      {/* Find a topic */}
      <div className="max-w-4xl mx-auto px-6 mb-6">
        <label className="relative block">
          <span className="sr-only">Find a topic</span>
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a topic, for example fractions or Pythagoras"
            className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </label>
      </div>

      {matches ? (
        <div className="max-w-4xl mx-auto px-6 pb-16">
          {matches.length === 0 ? (
            <p className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
              No topic with that name. Try a shorter word.
            </p>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              {matches.map(({ topic, subtopic }) => (
                <SubtopicRow
                  key={keyOf(topic.id, subtopic.name)}
                  sub={subtopic}
                  topic={topic}
                  showTopic
                  result={results[keyOf(topic.id, subtopic.name)]}
                  done={checklist.checked.has(keyOf(topic.id, subtopic.name))}
                  onOpen={openTopic}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Progress bar + Checklist toggle */}
          {checklist.loaded && (
            <div className="max-w-4xl mx-auto px-6 mb-6">
              <button
                onClick={() => setShowChecklist((p) => !p)}
                aria-expanded={showChecklist}
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
                <p className="text-[11px] text-gray-600 mt-1.5 text-left">
                  {checklist.done} of {checklist.total} topics done &middot; a topic is ticked when you get 5 of its 6 questions
                  right &middot; {showChecklist ? "Hide" : "Show"} checklist
                </p>
              </button>

              {showChecklist && (
                <div className="mt-3 rounded-xl border border-gray-200 bg-white divide-y divide-gray-100 overflow-hidden">
                  {REVISION_TOPICS.map((topic) => (
                    <div key={topic.id} className="px-5 py-3">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                        {topic.icon} {topic.name}
                      </p>
                      <div className="space-y-1">
                        {topic.subtopics.map((sub) => {
                          const key = keyOf(topic.id, sub.name);
                          const done = checklist.checked.has(key);
                          return (
                            <button
                              key={key}
                              onClick={() => checklist.toggle(key)}
                              aria-pressed={done}
                              className="w-full flex items-center gap-2 py-1 text-left group"
                            >
                              {done ? (
                                <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                              ) : (
                                <Circle size={16} className="text-gray-300 group-hover:text-indigo-400 shrink-0" />
                              )}
                              <span className={`text-sm ${done ? "text-gray-600 line-through" : "text-gray-700"}`}>{sub.name}</span>
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
            <div className="flex justify-end">
              <button
                onClick={() => {
                  const allIds = REVISION_TOPICS.map((t) => t.id);
                  setExpandedTopics((prev) => (prev.size === allIds.length ? new Set() : new Set(allIds)));
                }}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-500"
              >
                {expandedTopics.size === REVISION_TOPICS.length ? "Close all" : "Open all"}
              </button>
            </div>
            {REVISION_TOPICS.map((topic) => (
              <TopicCard
                key={topic.id}
                topic={topic}
                expanded={expandedTopics.has(topic.id)}
                onToggle={() => toggleTopic(topic.id)}
                onOpen={openTopic}
                results={results}
                checked={checklist.checked}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Topic Card Component ─────────────────────────────────────────────────── */

function TopicCard({
  topic,
  expanded,
  onToggle,
  onOpen,
  results,
  checked,
}: {
  topic: RevisionTopic;
  expanded: boolean;
  onToggle: () => void;
  onOpen: (topicId: string, subtopicName: string) => void;
  results: Record<string, RevisionResult>;
  checked: Set<string>;
}) {
  const done = topic.subtopics.filter((sub) => checked.has(keyOf(topic.id, sub.name))).length;
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <button
        onClick={onToggle}
        aria-expanded={expanded}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors text-left"
      >
        <span className="text-2xl" aria-hidden>
          {topic.icon}
        </span>
        <span className="flex-1">
          <span className="block text-base font-semibold text-gray-900">{topic.name}</span>
          <span className="block text-xs text-gray-600 mt-0.5">
            {topic.subtopics.length} topics{done > 0 ? ` · ${done} done` : ""}
          </span>
        </span>
        {expanded ? <ChevronDown size={18} className="text-gray-500" /> : <ChevronRight size={18} className="text-gray-500" />}
      </button>

      {expanded && (
        <div className="border-t border-gray-100">
          {topic.subtopics.map((sub) => (
            <SubtopicRow
              key={sub.name}
              sub={sub}
              topic={topic}
              result={results[keyOf(topic.id, sub.name)]}
              done={checked.has(keyOf(topic.id, sub.name))}
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
  topic,
  showTopic,
  result,
  done,
  onOpen,
}: {
  sub: RevisionSubtopic;
  topic: RevisionTopic;
  showTopic?: boolean;
  result?: RevisionResult;
  done: boolean;
  onOpen: (topicId: string, subtopicName: string) => void;
}) {
  return (
    <button
      onClick={() => onOpen(topic.id, sub.name)}
      className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-100 last:border-b-0"
    >
      {done ? <CheckCircle2 size={15} className="text-green-500 shrink-0" /> : <BookOpen size={14} className="text-gray-400 shrink-0" />}
      <span className="flex-1 text-sm text-gray-700">
        {sub.name}
        {showTopic && <span className="block text-[11px] text-gray-400">{topic.name}</span>}
      </span>
      {result && (
        <span
          className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${
            result.best / result.of >= MASTERED_AT - 1e-9 ? "text-green-700 bg-green-100" : "text-gray-600 bg-gray-100"
          }`}
          title="Your best score on this topic"
        >
          {result.best}/{result.of}
        </span>
      )}
      {sub.higherOnly && <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">H</span>}
      <ChevronRight size={14} className="text-gray-300" />
    </button>
  );
}
