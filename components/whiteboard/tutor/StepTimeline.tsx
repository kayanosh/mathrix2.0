"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import type { TutorStepModel } from "@/lib/tutor-steps";
import ActiveStepCard from "./ActiveStepCard";
import type { WhiteboardResponse } from "@/types/whiteboard";

interface Props {
  steps: TutorStepModel[];
  activeIndex: number;
  justCompletedIndex: number | null;
  data: WhiteboardResponse;
  runId: number;
  setActiveStepRef: (el: HTMLDivElement | null) => void;
  onSelectStep?: (index: number) => void;
}

/**
 * Timeline: past steps collapse to green check rows;
 * future steps stay hidden; only the active step is expanded.
 */
export default function StepTimeline({
  steps,
  activeIndex,
  justCompletedIndex,
  data,
  runId,
  setActiveStepRef,
  onSelectStep,
}: Props) {
  const past = steps.slice(0, activeIndex);
  const active = steps[activeIndex];

  return (
    <div className="flex flex-col gap-3 w-full max-w-2xl mx-auto">
      {/* Collapsed completed steps */}
      <AnimatePresence initial={false}>
        {past.map((s) => {
          const celebrating = justCompletedIndex === s.cueIndex;
          return (
            <motion.button
              key={`past-${s.cueIndex}`}
              type="button"
              layout
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              onClick={() => onSelectStep?.(s.cueIndex)}
              className="group flex w-full items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-left hover:bg-emerald-50 transition-colors"
            >
              <motion.span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm shadow-emerald-200"
                initial={celebrating ? { scale: 0.4 } : false}
                animate={{ scale: celebrating ? [0.4, 1.25, 1] : 1 }}
                transition={{ type: "spring", stiffness: 420, damping: 16 }}
              >
                <Check size={14} strokeWidth={3} />
              </motion.span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-emerald-900 truncate">
                  {s.title}
                </p>
                <p className="text-[12px] text-emerald-700/70 truncate">
                  {s.explanation}
                </p>
              </div>
              {celebrating && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: [0, 1, 0], scale: [0.6, 1.2, 1.4] }}
                  transition={{ duration: 0.9 }}
                  className="text-emerald-500 text-lg"
                  aria-hidden
                >
                  ✦
                </motion.span>
              )}
            </motion.button>
          );
        })}
      </AnimatePresence>

      {/* Active step only — future hidden */}
      <AnimatePresence mode="wait">
        {active && (
          <ActiveStepCard
            key={`active-${active.cueIndex}-${runId}`}
            step={active}
            data={data}
            runId={runId}
            setStepRef={setActiveStepRef}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
