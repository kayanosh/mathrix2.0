"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Loader2, RotateCcw, Sparkles, Presentation, CheckCircle2 } from "lucide-react";
import InlineMath from "@/components/InlineMath";
import WhiteboardTutor from "@/components/WhiteboardTutor";
import { ks2ExplanationToWhiteboard, type KS2Explanation } from "@/lib/ks2-explanation";

interface Props {
  subjectName: string;
  topicName: string;
  question: string;
  onClose: () => void;
}

/**
 * Kid-friendly "Ask AI" explanation popup for non-maths subjects
 * (English / Arabic / Science). Renders a clean step-by-step flow and can
 * play the explanation on the speaking whiteboard. Maths uses the richer
 * CAS whiteboard modal instead.
 */
export default function KS2ExplainModal({ subjectName, topicName, question, onClose }: Props) {
  const [explanation, setExplanation] = useState<KS2Explanation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false);

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
      const data = (await res.json()) as { explanation: KS2Explanation };
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

  const whiteboardData = useMemo(
    () => (explanation ? ks2ExplanationToWhiteboard(explanation, subjectName, topicName) : null),
    [explanation, subjectName, topicName]
  );

  if (showWhiteboard && whiteboardData) {
    return <WhiteboardTutor data={whiteboardData} onClose={() => setShowWhiteboard(false)} />;
  }

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
          ) : error || !explanation ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-3">Sorry, I couldn&rsquo;t explain that one.</p>
              <button onClick={load} className="inline-flex items-center gap-2 text-indigo-600 font-medium">
                <RotateCcw size={15} /> Try again
              </button>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key="explanation"
                initial="hidden"
                animate="show"
                variants={{ show: { transition: { staggerChildren: 0.08 } } }}
                className="space-y-3"
              >
                {explanation.intro && (
                  <motion.p
                    variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
                    className="text-gray-700 leading-relaxed"
                  >
                    <InlineMath text={explanation.intro} />
                  </motion.p>
                )}

                {explanation.steps.map((step, i) => (
                  <motion.div
                    key={i}
                    variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                    className="flex gap-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                      {step.emoji || i + 1}
                    </span>
                    <p className="text-gray-700 leading-relaxed pt-0.5">
                      <InlineMath text={step.text} />
                    </p>
                  </motion.div>
                ))}

                {explanation.table && explanation.table.headers.length > 0 && (
                  <motion.div
                    variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                    className="overflow-x-auto rounded-2xl border border-gray-200"
                  >
                    {explanation.table.caption && (
                      <p className="px-3 pt-2 text-[12px] font-semibold text-gray-500">{explanation.table.caption}</p>
                    )}
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          {explanation.table.headers.map((h, hi) => (
                            <th key={hi} className="px-3 py-2 text-left font-semibold text-gray-700">
                              <InlineMath text={h} />
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {explanation.table.rows.map((row, ri) => (
                          <tr key={ri} className="border-t border-gray-100">
                            {row.map((cell, ci) => (
                              <td key={ci} className="px-3 py-2 text-gray-600">
                                <InlineMath text={cell} />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </motion.div>
                )}

                {explanation.conclusion && (
                  <motion.p
                    variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
                    className="text-gray-700 leading-relaxed"
                  >
                    <InlineMath text={explanation.conclusion} />
                  </motion.p>
                )}

                {explanation.answer && (
                  <motion.div
                    variants={{ hidden: { opacity: 0, scale: 0.96 }, show: { opacity: 1, scale: 1 } }}
                    className="flex items-center gap-2 rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-3 font-semibold text-emerald-800"
                  >
                    <CheckCircle2 size={18} className="shrink-0" />
                    <span>
                      <InlineMath text={explanation.answer} />
                    </span>
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {!loading && !error && explanation && (
          <div className="flex items-center gap-2 border-t border-gray-100 p-4">
            <button
              onClick={() => setShowWhiteboard(true)}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              <Presentation size={16} /> Show on whiteboard
            </button>
            <button
              onClick={load}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-gray-100 px-3 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-200"
            >
              <RotateCcw size={15} />
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
