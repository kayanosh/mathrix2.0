"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  List,
  RotateCcw,
} from "lucide-react";
import InlineMath from "@/components/InlineMath";
import type { TeachingStep } from "@/lib/methods/types";

interface Props {
  steps: TeachingStep[];
  answer?: string;
  /** Accent for controls */
  accentClass?: string;
}

/**
 * Step-through controller for KS2 worked examples (next / prev / replay / show all).
 * Holds the final answer until the pupil reaches the last reasoning step (or Show all).
 */
export default function StepController({
  steps,
  answer,
  accentClass = "text-indigo-600",
}: Props) {
  const reasoning = useMemo(
    () => steps.filter((s) => s.title !== "Answer"),
    [steps],
  );
  const [index, setIndex] = useState(0);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setIndex(0);
      setShowAll(false);
    });
    return () => {
      active = false;
    };
  }, [steps]);

  if (reasoning.length === 0) return null;

  const atEnd = index >= reasoning.length - 1;
  const revealAnswer = showAll || atEnd;
  const visible = showAll ? reasoning : reasoning.slice(0, index + 1);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={showAll || index <= 0}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[12px] font-semibold text-gray-700 disabled:opacity-40"
        >
          <ChevronLeft size={14} /> Previous
        </button>
        <button
          type="button"
          disabled={showAll || atEnd}
          onClick={() => setIndex((i) => Math.min(reasoning.length - 1, i + 1))}
          className={`inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-[12px] font-semibold ${accentClass} disabled:opacity-40`}
        >
          Next step <ChevronRight size={14} />
        </button>
        <button
          type="button"
          onClick={() => {
            setShowAll(false);
            setIndex(0);
          }}
          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[12px] font-semibold text-gray-700"
        >
          <RotateCcw size={14} /> Replay
        </button>
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[12px] font-semibold text-amber-800"
        >
          <List size={14} /> Show all
        </button>
        <span
          role="status"
          aria-live="polite"
          className="ml-auto text-[11px] font-medium text-gray-500"
        >
          Step {showAll ? reasoning.length : index + 1} of {reasoning.length}
        </span>
      </div>

      <ol aria-live="polite" aria-label="Worked example steps" className="space-y-2.5">
        {visible.map((step, i) => (
          <motion.li
            key={`${step.title}-${i}`}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex gap-2 text-gray-700"
          >
            <span className="font-bold text-indigo-500 shrink-0">{i + 1}.</span>
            <div className="min-w-0 space-y-0.5">
              {step.title ? (
                <p className="font-semibold text-gray-900 text-[15px]">
                  <InlineMath text={step.title} />
                </p>
              ) : null}
              <p className="text-gray-700">
                <InlineMath text={step.explanation} />
              </p>
              {step.why ? (
                <p className="text-[13px] text-amber-800/90 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1">
                  <span className="font-semibold text-amber-700">Why: </span>
                  <InlineMath text={step.why} />
                </p>
              ) : null}
            </div>
          </motion.li>
        ))}
      </ol>

      {revealAnswer && answer ? (
        <p className="mt-1 flex items-center gap-2 font-semibold text-emerald-700">
          <CheckCircle2 size={16} /> <InlineMath text={answer} />
        </p>
      ) : (
        <p className="text-[12px] text-gray-500 italic">
          Keep going — the final answer appears after the method steps.
        </p>
      )}
    </div>
  );
}
