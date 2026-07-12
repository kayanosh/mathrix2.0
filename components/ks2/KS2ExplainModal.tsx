"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { X, Loader2, RotateCcw, MonitorPlay } from "lucide-react";
import WhiteboardTutor from "@/components/WhiteboardTutor";
import { ks2ExplanationToWhiteboard, type KS2Explanation } from "@/lib/ks2-explanation";

interface Props {
  subjectName: string;
  topicName: string;
  subtopics: string[];
  question: string;
  onClose: () => void;
}

/**
 * KS2 non-maths Ask AI — opens the same WhiteboardTutor used across Mathrix
 * so teaching UX stays consistent with maths practice and main chat.
 */
export default function KS2ExplainModal({
  subjectName,
  topicName,
  subtopics,
  question,
  onClose,
}: Props) {
  const [explanation, setExplanation] = useState<KS2Explanation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    setShowWhiteboard(false);
    try {
      const res = await fetch("/api/ks2-lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subjectName,
          topic: topicName,
          subtopics,
          kind: "explain",
          question,
        }),
      });
      if (!res.ok) throw new Error("failed");
      const data = (await res.json()) as { explanation: KS2Explanation };
      setExplanation(data.explanation);
      setShowWhiteboard(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [subjectName, topicName, subtopics, question]);

  useEffect(() => {
    load();
  }, [load]);

  const whiteboardData = useMemo(
    () => (explanation ? ks2ExplanationToWhiteboard(explanation, subjectName, topicName) : null),
    [explanation, subjectName, topicName],
  );

  if (showWhiteboard && whiteboardData) {
    return <WhiteboardTutor data={whiteboardData} onClose={onClose} />;
  }

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
          <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
          <p className="text-sm font-medium text-slate-600">Getting your teacher ready…</p>
        </div>
      )}

      {(error || (!loading && !explanation)) && (
        <div className="text-center">
          <p className="text-slate-600 mb-3">Sorry, I couldn&rsquo;t explain that one.</p>
          <button
            onClick={load}
            className="inline-flex items-center gap-2 text-blue-600 font-semibold"
          >
            <RotateCcw size={15} /> Try again
          </button>
        </div>
      )}

      {!loading && !error && explanation && whiteboardData && !showWhiteboard && (
        <button
          onClick={() => setShowWhiteboard(true)}
          className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-200"
        >
          <MonitorPlay size={16} /> Watch the teacher
        </button>
      )}
    </motion.div>
  );
}
