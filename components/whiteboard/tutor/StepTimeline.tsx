"use client";

import { AnimatePresence } from "framer-motion";
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
 * Timeline: previous steps stay fully visible (with green checks);
 * future steps stay hidden; the active step is highlighted.
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
      {past.map((s) => (
        <ActiveStepCard
          key={`past-${s.cueIndex}`}
          step={s}
          data={data}
          runId={runId}
          variant="completed"
          celebrating={justCompletedIndex === s.cueIndex}
          onSelect={() => onSelectStep?.(s.cueIndex)}
        />
      ))}

      <AnimatePresence mode="wait">
        {active && (
          <ActiveStepCard
            key={`active-${active.cueIndex}-${runId}`}
            step={active}
            data={data}
            runId={runId}
            variant="active"
            setStepRef={setActiveStepRef}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
