"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import type { WhiteboardResponse } from "@/types/whiteboard";
import WhiteboardRenderer from "./whiteboard/WhiteboardRenderer";

interface Props {
  question: string;
  onClose: () => void;
}

export default function PracticeWhiteboardModal({ question, onClose }: Props) {
  const [whiteboardData, setWhiteboardData] = useState<WhiteboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchSolution = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    setWhiteboardData(null);

    try {
      const tier =
        typeof window !== "undefined"
          ? localStorage.getItem("mathrix_gcse_tier") || "higher"
          : "higher";

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: question }],
          level: "GCSE",
          tier,
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
  }, [question]);

  useEffect(() => {
    fetchSolution();
    return () => abortRef.current?.abort();
  }, [fetchSolution]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: 40, opacity: 0, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 40, opacity: 0, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <h3 className="font-bold text-gray-900 text-sm">AI Tutor — Worked Solution</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
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
              <button
                onClick={fetchSolution}
                className="text-sm text-indigo-600 hover:underline"
              >
                Try again
              </button>
            </div>
          )}

          {whiteboardData && (
            <div className="p-4">
              <WhiteboardRenderer data={whiteboardData} />
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
