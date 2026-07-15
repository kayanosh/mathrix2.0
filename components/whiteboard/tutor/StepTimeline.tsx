"use client";

import { Check } from "lucide-react";
import InlineMath from "@/components/InlineMath";
import { inlineMathToPlainText } from "@/lib/inline-math";
import type { TutorStepModel } from "@/lib/tutor-steps";
import ActiveStepCard from "./ActiveStepCard";
import type { WhiteboardResponse } from "@/types/whiteboard";
import type { PlaybackPhase } from "@/lib/whiteboard-playback";

interface Props {
  steps: TutorStepModel[];
  activeIndex: number;
  justCompletedIndex: number | null;
  data: WhiteboardResponse;
  runId: number;
  playbackPhase: PlaybackPhase;
  setActiveStepRef: (el: HTMLElement | null) => void;
  onSelectStep?: (index: number) => void;
}

/**
 * Stable teaching stage. Completed steps live in a fixed-height compact rail,
 * so advancing never duplicates or remounts a second full-size solution card.
 */
export default function StepTimeline({
  steps,
  activeIndex,
  justCompletedIndex,
  data,
  runId,
  playbackPhase,
  setActiveStepRef,
  onSelectStep,
}: Props) {
  const past = steps.slice(0, activeIndex);
  const active = steps[activeIndex];

  return (
    <div className="flex w-full max-w-2xl flex-col gap-3 mx-auto">
      <div className="min-h-10" aria-label="Completed lesson steps">
        {past.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto pb-1 overscroll-x-contain">
            {past.map((s) => {
              const celebrating = justCompletedIndex === s.cueIndex;
              return (
                <button
                  key={s.cueIndex}
                  type="button"
                  onClick={() => onSelectStep?.(s.cueIndex)}
                  className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors ${
                    celebrating
                      ? "border-emerald-300 bg-emerald-100 text-emerald-800"
                      : "border-emerald-100 bg-white/80 text-emerald-700 hover:bg-emerald-50"
                  }`}
                  aria-label={`Review ${inlineMathToPlainText(s.title)}`}
                >
                  <Check size={13} strokeWidth={3} />
                  <span className="max-w-40 truncate"><InlineMath text={s.title} /></span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex h-9 items-center text-xs font-medium text-slate-400">
            Your completed steps will appear here
          </div>
        )}
      </div>

      {active && (
        <ActiveStepCard
          step={active}
          data={data}
          runId={runId}
          playbackPhase={playbackPhase}
          variant="active"
          setStepRef={setActiveStepRef}
        />
      )}
    </div>
  );
}
