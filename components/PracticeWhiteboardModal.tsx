"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { X, Loader2, MonitorPlay } from "lucide-react";
import type { WhiteboardResponse } from "@/types/whiteboard";
import WhiteboardRenderer from "./whiteboard/WhiteboardRenderer";
import WhiteboardTutor from "./WhiteboardTutor";

interface Props {
  question: string;
  onClose: () => void;
  /** Student level for the tutor prompt (e.g. "GCSE", "KS2"). Defaults to "GCSE". */
  level?: string;
  /** Difficulty tier. Defaults to the saved GCSE tier (or "higher"). */
  tier?: string;
  topic?: string;
  subtopics?: string[];
  subject?: string;
}

function buildQuestionWithContext(
  question: string,
  opts: { level?: string; subject?: string; topic?: string; subtopics?: string[] }
): string {
  const { level, subject, topic, subtopics } = opts;
  if (!level || level === "GCSE") return question;
  const parts = [level, subject, topic, ...(subtopics?.length ? [subtopics.join("; ")] : [])].filter(Boolean);
  return `[${parts.join(" — ")}]\n\n${question}`;
}

function primeSpeech() {
  try {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const _u = new SpeechSynthesisUtterance("");
      window.speechSynthesis.speak(_u);
      window.speechSynthesis.cancel();
    }
  } catch {
    /* ignore */
  }
}

export default function PracticeWhiteboardModal({
  question,
  onClose,
  level = "GCSE",
  tier: tierProp,
  topic,
  subtopics,
  subject,
}: Props) {
  const [whiteboardData, setWhiteboardData] = useState<WhiteboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [watchMode, setWatchMode] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const isKS2 = level === "KS2";

  const fetchSolution = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    setWhiteboardData(null);
    setWatchMode(false);

    try {
      const tier =
        tierProp ??
        (typeof window !== "undefined"
          ? level === "KS2"
            ? localStorage.getItem("ks2_tier") || "secure"
            : localStorage.getItem("mathrix_gcse_tier") || "higher"
          : level === "KS2"
            ? "secure"
            : "higher");

      const messageContent = buildQuestionWithContext(question, { level, subject, topic, subtopics });

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: messageContent }],
          level,
          tier,
          subject: subject || (level === "KS2" ? "Mathematics" : undefined),
          topic,
          subtopics,
        }),
        signal: controller.signal,
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";

        for (const part of parts) {
          let eventName = "message";
          let eventData = "";
          for (const line of part.split("\n")) {
            if (line.startsWith("event: ")) eventName = line.slice(7);
            else if (line.startsWith("data: ")) eventData = line.slice(6);
          }
          if (!eventData) continue;

          const parsed = JSON.parse(eventData);

          if (eventName === "error") {
            throw new Error(parsed.error || "Request failed");
          }

          if (eventName === "solver_done" && parsed.whiteboard) {
            setWhiteboardData(parsed.whiteboard as WhiteboardResponse);
            setLoading(false);
            // KS2: open the same premium tutor used site-wide
            if (isKS2) {
              primeSpeech();
              setWatchMode(true);
            }
          }

          if (eventName === "verification_done" && parsed.whiteboard) {
            setWhiteboardData(parsed.whiteboard as WhiteboardResponse);
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [question, level, tierProp, topic, subtopics, subject, isKS2]);

  useEffect(() => {
    fetchSolution();
    return () => abortRef.current?.abort();
  }, [fetchSolution]);

  // KS2: once ready, teach with WhiteboardTutor (same as main site chat)
  if (isKS2 && watchMode && whiteboardData) {
    return (
      <WhiteboardTutor
        data={whiteboardData}
        onClose={onClose}
      />
    );
  }

  // KS2 loading / error shell (before tutor opens)
  if (isKS2) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-[#f4f6fa] flex flex-col items-center justify-center p-6"
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:bg-white hover:text-slate-700"
        >
          <X size={16} />
        </button>
        {loading && (
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={28} className="animate-spin text-blue-600" />
            <p className="text-sm font-medium text-slate-600">Getting your teacher ready…</p>
            <p className="text-[12px] text-slate-400 text-center max-w-xs">
              Same whiteboard lesson as the rest of Mathrix — step by step.
            </p>
          </div>
        )}
        {error && (
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="text-sm text-red-500">{error}</p>
            <button
              onClick={fetchSolution}
              className="text-sm font-semibold text-blue-600 hover:underline"
            >
              Try again
            </button>
          </div>
        )}
        {!loading && !error && whiteboardData && !watchMode && (
          <button
            onClick={() => {
              primeSpeech();
              setWatchMode(true);
            }}
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-200"
          >
            <MonitorPlay size={16} /> Watch the teacher
          </button>
        )}
      </motion.div>
    );
  }

  // GCSE / other: modal with optional watch mode
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {watchMode && whiteboardData ? (
        <WhiteboardTutor data={whiteboardData} onClose={() => setWatchMode(false)} />
      ) : (
      <motion.div
        initial={{ y: 40, opacity: 0, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 40, opacity: 0, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <h3 className="font-bold text-gray-900 text-sm">AI Tutor — Worked Solution</h3>
          <div className="flex items-center gap-2">
            {whiteboardData && (
              <button
                onClick={() => {
                  primeSpeech();
                  setWatchMode(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-medium transition-colors"
              >
                <MonitorPlay size={14} /> Watch on Whiteboard
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 size={28} className="animate-spin text-indigo-500" />
              <p className="text-sm text-gray-500">Solving step by step…</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <p className="text-sm text-red-500">{error}</p>
              <button onClick={fetchSolution} className="text-sm text-indigo-600 hover:underline">
                Try again
              </button>
            </div>
          )}

          {whiteboardData && (
            <div className="p-4">
              <WhiteboardRenderer data={whiteboardData} revealAll />
            </div>
          )}
        </div>
      </motion.div>
      )}
    </motion.div>
  );
}
