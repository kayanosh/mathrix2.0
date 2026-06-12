"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { X, Loader2, RotateCcw, Sparkles } from "lucide-react";
import InlineMath from "@/components/InlineMath";

interface Props {
  subjectName: string;
  topicName: string;
  question: string;
  onClose: () => void;
}

/**
 * Lightweight, kid-friendly "Ask AI" explanation popup for non-maths subjects
 * (English / Arabic / Science). Maths uses the richer whiteboard modal instead.
 */
export default function KS2ExplainModal({ subjectName, topicName, question, onClose }: Props) {
  const [explanation, setExplanation] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/ks2-lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subjectName, topic: topicName, kind: "explain", question }),
      });
      if (!res.ok) throw new Error("failed");
      const data = (await res.json()) as { explanation: string };
      setExplanation(data.explanation);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [subjectName, topicName, question]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 50, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="flex items-center gap-2 font-bold text-gray-900 text-sm">
            <Sparkles size={16} className="text-indigo-600" /> Ask the AI
          </h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto">
          <div className="rounded-xl bg-gray-50 p-3 mb-4">
            <p className="text-[12px] font-semibold text-gray-400 mb-0.5">Question</p>
            <p className="text-gray-800">{<InlineMath text={question} />}</p>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              <p className="text-sm text-gray-500">Thinking it through…</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-3">Sorry, I couldn&rsquo;t explain that one.</p>
              <button onClick={load} className="inline-flex items-center gap-2 text-indigo-600 font-medium">
                <RotateCcw size={15} /> Try again
              </button>
            </div>
          ) : (
            <div className="text-gray-700 leading-relaxed whitespace-pre-line">
              <InlineMath text={explanation} />
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
