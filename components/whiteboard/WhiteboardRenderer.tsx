"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, ShieldCheck } from "lucide-react";
import type { WhiteboardResponse } from "@/types/whiteboard";
import BlockRenderer from "./BlockRenderer";
import InlineMath from "@/components/InlineMath";

interface Props {
  data: WhiteboardResponse;
}

const STEP_GAP = 0.55; // seconds between block "write" animations

export default function WhiteboardRenderer({ data }: Props) {
  const [replayKey, setReplayKey] = useState(0);

  return (
    <div key={replayKey} className="w-full whiteboard-surface">
      {/* ── Whiteboard surface ─────────────────────────────── */}
      <div className="wb-board rounded-2xl px-7 py-6 sm:px-10 sm:py-8 relative overflow-hidden">
        {/* Faint ruled lines */}
        <div className="wb-rules pointer-events-none absolute inset-0" />

        {/* Intro — teacher's opening remark */}
        {data.intro && (
          <motion.p
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="wb-intro font-[family-name:var(--font-caveat)] text-2xl sm:text-3xl leading-snug mb-6"
          >
            <InlineMath text={data.intro} />
          </motion.p>
        )}

        {/* Uploaded question image — shown inline below the intro */}
        {data.questionImageUrl && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mb-6 rounded-xl overflow-hidden border border-gray-200 bg-white inline-block max-w-xs sm:max-w-sm"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={data.questionImageUrl}
              alt="Uploaded question diagram"
              className="w-full h-auto"
            />
            <p className="text-[11px] text-gray-400 px-3 py-1.5 text-center">
              📎 Uploaded question
            </p>
          </motion.div>
        )}

        {/* Topic label — small underline like a teacher writes the title */}
        {data.topic && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="wb-topic font-[family-name:var(--font-caveat)] text-lg mb-5 pb-1"
          >
            {data.subject && <span className="wb-topic-subject">{data.subject}</span>}
            {data.topic && (
              <span className="wb-topic-sep"> — {data.topic}</span>
            )}
          </motion.div>
        )}

        {/* Blocks — the working-out */}
        <div className="flex flex-col gap-3">
          <AnimatePresence mode="wait">
            {data.blocks.map((block, i) => (
              <motion.div
                key={`${block.type}-${i}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: i * STEP_GAP + 0.2,
                  duration: 0.35,
                  ease: "easeOut",
                }}
              >
                <BlockRenderer
                  block={block}
                  index={i}
                  baseDelay={i * STEP_GAP + 0.2}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Conclusion — underlined final answer */}
        {data.conclusion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: data.blocks.length * STEP_GAP + 0.35 }}
            className="wb-conclusion mt-5 pt-3"
          >
            <span className="font-[family-name:var(--font-caveat)] text-xl sm:text-2xl">
              <InlineMath text={data.conclusion} />
            </span>
          </motion.div>
        )}

        {/* Verification badge — shows source + agreement count */}
        {data.casVerified && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: data.blocks.length * STEP_GAP + 0.42 }}
            className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200"
          >
            <ShieldCheck size={13} className="text-emerald-600" />
            {data.groundTruthSource === "sympy"
              ? "Verified by SymPy"
              : data.groundTruthSource === "both"
              ? "Verified by SymPy + Nerdamer"
              : "Verified by CAS"}
            {data.verification?.agreementCount !== undefined &&
              data.verification.agreementCount > 0 && (
                <span className="ml-0.5 opacity-70">
                  ({data.verification.agreementCount}/4 checks)
                </span>
              )}
          </motion.div>
        )}

        {/* Key takeaway — memorable sentence */}
        {data.keyTakeaway && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: data.blocks.length * STEP_GAP + 0.48 }}
            className="mt-3 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 font-[family-name:var(--font-caveat)] text-base text-amber-900"
          >
            <span className="font-semibold">Key idea:</span>{" "}
            <InlineMath text={data.keyTakeaway} />
          </motion.div>
        )}

        {/* Hint — teacher aside */}
        {data.hint && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: data.blocks.length * STEP_GAP + 0.5 }}
            className="wb-hint mt-4 font-[family-name:var(--font-caveat)] text-lg"
          >
            💡 <InlineMath text={data.hint} />
          </motion.div>
        )}

        {/* Exam tip */}
        {data.examTip && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: data.blocks.length * STEP_GAP + 0.58 }}
            className="mt-3 px-3 py-2 rounded-lg bg-sky-50 border border-sky-200 font-[family-name:var(--font-caveat)] text-base text-sky-900"
          >
            <span className="font-semibold">Exam tip:</span>{" "}
            <InlineMath text={data.examTip} />
          </motion.div>
        )}
      </div>

      {/* Replay — outside the board */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: data.blocks.length * STEP_GAP + 0.6 }}
        onClick={() => setReplayKey((k) => k + 1)}
        className="flex items-center gap-1.5 text-[11px] text-gray-600 hover:text-indigo-400 transition-colors mt-2.5 group"
      >
        <RotateCcw
          size={11}
          className="group-hover:rotate-180 transition-transform duration-500"
        />
        Replay
      </motion.button>
    </div>
  );
}
