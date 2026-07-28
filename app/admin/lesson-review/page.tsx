"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, CheckCircle2, XCircle, ShieldCheck } from "lucide-react";

type Status = "unreviewed" | "approved" | "rejected";

interface ReviewItem {
  cacheKey: string;
  topicId: string;
  topicName: string | null;
  subject: string | null;
  target: string;
  tier: string;
  kind: string;
  hitCount: number;
  createdAt: string | null;
  skill: string | null;
  intro: string;
  workedExample: { question: string; steps: string[]; answer: string } | null;
  keyPoints: string[];
  tryThis: { question: string; answer: string } | null;
  lessonId: string | null;
  contentVersion: string | null;
  modelVersion: string | null;
  promptVersion: string | null;
}

const TABS: { value: Status; label: string }[] = [
  { value: "unreviewed", label: "Pending review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export default function LessonReviewPage() {
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [status, setStatus] = useState<Status>("unreviewed");
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function load(s: Status) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/lesson-review?status=${s}`);
      if (res.status === 401 || res.status === 403) {
        setForbidden(true);
        setLoading(false);
        return;
      }
      const data = await res.json();
      setItems(data.items || []);
    } catch {
      setError("Network error loading the review queue.");
    }
    setLoading(false);
  }

  useEffect(() => {
    queueMicrotask(() => void load(status));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function act(cacheKey: string, action: "approve" | "reject") {
    setBusyKey(cacheKey);
    try {
      const res = await fetch("/api/lesson-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cacheKey, action }),
      });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.cacheKey !== cacheKey));
      } else {
        setError("Could not update review status — try again.");
      }
    } catch {
      setError("Network error — try again.");
    }
    setBusyKey(null);
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <nav className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100">
        <Link href="/" className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium">
          <ArrowLeft size={16} /> Home
        </Link>
        <div className="flex items-center gap-2 text-gray-700 font-semibold">
          <ShieldCheck size={18} /> Lesson Review
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-8">
        {forbidden ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
            <p className="text-gray-700 font-medium mb-1">Admin access only</p>
            <p className="text-gray-500 text-sm">
              Your account needs the <span className="font-mono">admin</span> role to review lessons.
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4">
              The KS2 lesson cache is shared across every pupil and centre — approving or rejecting a
              lesson here affects everyone who is taught this skill, not just one class.
            </p>

            <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6 w-fit">
              {TABS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setStatus(t.value)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                    status === t.value ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-800"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-500 text-sm">
                No lessons in this queue.
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.cacheKey} className="rounded-2xl border border-gray-200 bg-white p-5">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {item.topicName || item.topicId} — {item.skill || "(no skill)"}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {item.subject} · {item.target} · {item.tier} · {item.kind} · served{" "}
                          {item.hitCount}x
                        </p>
                      </div>
                      {status === "unreviewed" && (
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => act(item.cacheKey, "reject")}
                            disabled={busyKey === item.cacheKey}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 text-sm font-medium disabled:opacity-50"
                          >
                            <XCircle size={14} /> Reject
                          </button>
                          <button
                            onClick={() => act(item.cacheKey, "approve")}
                            disabled={busyKey === item.cacheKey}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-sm font-medium disabled:opacity-50"
                          >
                            <CheckCircle2 size={14} /> Approve
                          </button>
                        </div>
                      )}
                    </div>

                    {item.workedExample && (
                      <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 mb-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                          Worked example
                        </p>
                        <p className="text-sm text-gray-900 mb-1">{item.workedExample.question}</p>
                        <ol className="text-sm text-gray-700 list-decimal list-inside space-y-0.5">
                          {item.workedExample.steps.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ol>
                        <p className="text-sm font-medium text-gray-900 mt-1">
                          Answer: {item.workedExample.answer}
                        </p>
                      </div>
                    )}

                    {item.tryThis && (
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Try this:</span> {item.tryThis.question} —{" "}
                        <span className="font-mono">{item.tryThis.answer}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
