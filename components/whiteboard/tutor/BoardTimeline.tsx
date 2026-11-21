"use client";

import { useMemo, useRef } from "react";
import type { TutorStepModel } from "@/lib/tutor-steps";
import type { WhiteboardResponse } from "@/types/whiteboard";
import { phaseHasReached, type PlaybackPhase } from "@/lib/whiteboard-playback";
import { buildBoardItems, equationLineLatex, lineAboveLatex } from "@/lib/board-items";
import TermTransferArrow from "@/components/whiteboard/TermTransferArrow";
import BoardLine from "./BoardLine";

interface Props {
  steps: TutorStepModel[];
  activeIndex: number;
  justCompletedIndex: number | null;
  data: WhiteboardResponse;
  runId: number;
  playbackPhase: PlaybackPhase;
  isPlaying: boolean;
  /** How long the active line takes to write, so arrows wait for the ink. */
  writeMs: number;
  setActiveStepRef: (el: HTMLElement | null) => void;
  /** The line directly above the active one — the pen can point back to it. */
  setLineAboveRef: (el: HTMLElement | null) => void;
  onSelectStep?: (index: number) => void;
}

const MARKER_RED = "#dc2626";

/**
 * The board. Every line of working written so far stays where it was put, and
 * the line being worked on goes underneath — so when the teacher says "this 7",
 * the 7 is still there to be pointed at.
 *
 * It replaces a layout that showed one step at a time in a card and collapsed
 * the earlier steps into chips.
 */
export default function BoardTimeline({
  steps,
  activeIndex,
  justCompletedIndex,
  data,
  runId,
  playbackPhase,
  isPlaying,
  writeMs,
  setActiveStepRef,
  setLineAboveRef,
  onSelectStep,
}: Props) {
  const boardRef = useRef<HTMLDivElement>(null);
  const items = useMemo(() => buildBoardItems(steps, activeIndex), [steps, activeIndex]);

  const activeStep = steps[activeIndex];
  const above = items.length > 1 ? items[items.length - 2] : null;
  const aboveStep = above ? steps[above.stepIndex] : undefined;
  const aboveLatex = lineAboveLatex(aboveStep ? equationLineLatex(aboveStep) : null, activeStep);

  // Arrows carry a term from the line above down into the new line. They are
  // drawn over the whole board, between the two real lines, and only once the
  // new line has been written — a teacher draws the arrow after the working.
  const arrows =
    activeStep?.visual.type === "equation" &&
    !activeStep.visual.isFirst &&
    aboveStep?.visual.type === "equation"
      ? activeStep.visual.step.arrows || []
      : [];
  const showArrows = arrows.length > 0 && phaseHasReached(playbackPhase, "write");
  const inkSeconds = isPlaying ? writeMs / 1000 : 0;

  return (
    <div
      ref={boardRef}
      data-board
      className="relative mx-auto w-full max-w-3xl rounded-3xl border border-slate-200/80 bg-white px-2 py-3 shadow-[0_8px_40px_-16px_rgba(15,23,42,0.14)] sm:px-5 sm:py-5"
    >
      {items.map((item, position) => {
        const role = item.isActive ? "active" : item === above ? "above" : "older";
        return (
          <BoardLine
            key={item.key}
            step={steps[item.stepIndex]}
            data={data}
            runId={runId}
            number={position + 1}
            role={role}
            playbackPhase={item.isActive ? playbackPhase : "complete"}
            isPlaying={isPlaying}
            lineLatex={role === "above" ? aboveLatex : null}
            setLineRef={
              role === "active" ? setActiveStepRef : role === "above" ? setLineAboveRef : undefined
            }
            onSelect={() => onSelectStep?.(item.stepIndex)}
            justCompleted={justCompletedIndex === item.stepIndex}
          />
        );
      })}

      {showArrows &&
        arrows.map((arrow, index) => (
          <TermTransferArrow
            key={`${activeIndex}-${runId}-${arrow.id || index}`}
            containerRef={boardRef}
            fromId={`${arrow.id}-from`}
            toId={`${arrow.id}-to`}
            fromTerm={arrow.fromTerm}
            toTerm={arrow.toTerm}
            signRule={arrow.signRule}
            label={arrow.label}
            delay={inkSeconds + 0.15 + index * 0.2}
            color={arrow.color || MARKER_RED}
          />
        ))}
    </div>
  );
}
