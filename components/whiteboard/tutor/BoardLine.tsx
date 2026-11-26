"use client";

import { useEffect, useRef } from "react";
import { Check, CircleHelp, Lightbulb, Sparkles } from "lucide-react";
import type { TutorStepModel } from "@/lib/tutor-steps";
import type { WhiteboardResponse } from "@/types/whiteboard";
import InlineMath from "@/components/InlineMath";
import HandwrittenInline from "@/components/whiteboard/HandwrittenInline";
import { StepVisual } from "@/components/whiteboard/tutor/ActiveStepCard";
import { phaseHasReached, type PlaybackPhase } from "@/lib/whiteboard-playback";
import { equationLineLatex, stripHtmlIds } from "@/lib/board-items";
import { tagMathTerms } from "@/lib/board-terms";
import { estimateMathWriteMs, NOTE_GAP_MS } from "@/lib/handwriting";

interface Props {
  step: TutorStepModel;
  data: WhiteboardResponse;
  runId: number;
  /** 1-based number shown in the margin. */
  number: number;
  /**
   * "active" is the line being written. "above" is the one directly over it,
   * which the active line's arrows start from. "older" is everything else.
   */
  role: "active" | "above" | "older";
  playbackPhase: PlaybackPhase;
  isPlaying: boolean;
  /** For "above": the copy of this line that carries the arrows' start ids. */
  lineLatex?: string | null;
  setLineRef?: (el: HTMLElement | null) => void;
  onSelect?: () => void;
  justCompleted?: boolean;
}

/**
 * One line of working on the board, with the teacher's note beside it.
 *
 * Deliberately not a card. The maths is the board; the step's name is written
 * next to it in the teacher's hand, the way "− 7 from both sides" gets jotted
 * in the margin. The spoken explanation is not repeated here — it is in the
 * caption strip under the board, where it follows the voice.
 */
export default function BoardLine({
  step,
  data,
  runId,
  number,
  role,
  playbackPhase,
  isPlaying,
  lineLatex,
  setLineRef,
  onSelect,
  justCompleted = false,
}: Props) {
  const isActive = role === "active";
  const visualRef = useRef<HTMLDivElement>(null);

  const writingStarted = phaseHasReached(playbackPhase, "write");
  const explanationVisible = phaseHasReached(playbackPhase, "explain");
  const checkVisible = phaseHasReached(playbackPhase, "check");

  const kind = step.visual.type;
  // A column method or diagram is one drawing built up over several steps: it
  // must never be blanked, or everything written so far would vanish each time
  // the next step began.
  const builtUpInPlace = kind === "column" || kind === "block";

  // While the lesson is playing, a line is blank until the pen writes it. While
  // it is paused (someone stepping through by hand) it is simply there.
  const notYetWritten = isActive && isPlaying && !writingStarted && !builtUpInPlace;
  const animateWrite = isActive && isPlaying && writingStarted;

  // The stylesheet dims a step's content until its turn ("focus" = 28% ink).
  // That is how a column's digits appear in order, so it is kept while playing.
  // Paused, it left the line someone had just stepped to almost invisible.
  const stylePhase = isActive && isPlaying ? playbackPhase : "complete";

  const ownLatex = equationLineLatex(step);
  const shownLatex =
    ownLatex === null
      ? null
      : role === "above" && lineLatex
        ? lineLatex
        : role === "older"
          ? // Only the two lines an arrow joins keep their ids; see stripHtmlIds.
            stripHtmlIds(ownLatex)
          : ownLatex;

  // Every number and unknown on the line becomes something the pen can touch.
  useEffect(() => {
    tagMathTerms(visualRef.current);
  });

  const isEquation = kind === "equation";
  const isAnswer = kind === "conclusion";

  // A line of working that is wider than the board is written smaller until it
  // fits, the way a teacher writes a long line smaller rather than off the edge.
  // On a phone a line such as "Area = ½ × (10 + 6) × 4" ran off the right and
  // had to be dragged sideways to be read. Never below 60% of the normal size:
  // past that it is better to scroll than to squint.
  useEffect(() => {
    const el = visualRef.current;
    if (!el || !isEquation) return;
    const fit = () => {
      el.style.fontSize = "";
      const clipped = Array.from(el.querySelectorAll<HTMLElement>("*")).find(
        (node) => node.scrollWidth > node.clientWidth + 2 && getComputedStyle(node).overflowX !== "visible",
      );
      const box = clipped ?? el;
      if (box.clientWidth <= 0 || box.scrollWidth <= box.clientWidth + 2) return;
      const normal = parseFloat(getComputedStyle(el).fontSize);
      const fitted = normal * (box.clientWidth / box.scrollWidth) * 0.97;
      el.style.fontSize = `${Math.max(normal * 0.6, fitted)}px`;
    };
    fit();
    // While a lesson plays, the line is written a moment after this runs, so
    // there was nothing to measure and the line stayed full size and ran off a
    // phone screen. Fit again whenever its contents change.
    let queued = 0;
    const refit = () => {
      if (queued) return;
      queued = requestAnimationFrame(() => {
        queued = 0;
        fit();
      });
    };
    const mutations =
      typeof MutationObserver !== "undefined" ? new MutationObserver(refit) : null;
    mutations?.observe(el, { childList: true, subtree: true });
    // Only the width matters: fitting changes the height, which must not
    // start another round.
    let lastWidth = el.clientWidth;
    const resize =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            if (Math.abs(el.clientWidth - lastWidth) < 2) return;
            lastWidth = el.clientWidth;
            fit();
          })
        : null;
    resize?.observe(el);
    return () => {
      if (queued) cancelAnimationFrame(queued);
      mutations?.disconnect();
      resize?.disconnect();
    };
  }, [isEquation, shownLatex, role, playbackPhase]);
  const showNote = kind !== "intro" && kind !== "conclusion" && kind !== "hint";
  const hidden = { visibility: notYetWritten ? ("hidden" as const) : ("visible" as const) };

  const visual = (
    <div
      ref={visualRef}
      data-teacher-target="visual"
      data-teacher-phase={stylePhase}
      className={[
        "min-w-0",
        isEquation ? "text-[1.3rem] sm:text-[1.55rem]" : "",
        isAnswer
          ? "rounded-2xl border-2 border-emerald-300 bg-emerald-50/60 px-4 py-3 [&_p[data-teacher-target]]:text-3xl"
          : "",
      ].join(" ")}
      style={hidden}
    >
      {isAnswer && (
        <p className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700">
          <Check size={13} strokeWidth={3} /> Answer
        </p>
      )}
      <StepVisual
        step={step}
        data={data}
        runId={runId}
        animateWrite={animateWrite}
        equationLayout="line"
        lineLatex={shownLatex}
      />
    </div>
  );

  // The note is written AFTER the line it describes, with the same pen — so it
  // waits for the line's ink. Started together, the two fought over the pen and
  // it wrote the margin note while the equation appeared on its own.
  const noteDelay = isEquation && shownLatex ? estimateMathWriteMs(shownLatex) + NOTE_GAP_MS : 0;

  const note = showNote && (
    <p
      className={`font-[family-name:var(--font-caveat)] text-2xl leading-tight ${
        isActive ? "text-blue-700" : "text-slate-500"
      }`}
      style={hidden}
    >
      {animateWrite && isEquation ? (
        <HandwrittenInline key={runId} text={step.title} startDelay={noteDelay} />
      ) : (
        <InlineMath text={step.title} />
      )}
      {step.rule && isActive && (
        <span className="ml-2 inline-flex -translate-y-0.5 items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 font-sans text-[10px] font-semibold text-indigo-700 ring-1 ring-indigo-100">
          <Sparkles size={10} /> <InlineMath text={step.rule} />
        </span>
      )}
    </p>
  );

  const margin = (
    <span
      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
        isActive
          ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
          : justCompleted
            ? "bg-emerald-500 text-white"
            : "bg-slate-100 text-slate-400"
      }`}
    >
      {!isActive && justCompleted ? <Check size={13} strokeWidth={3} /> : number}
    </span>
  );

  const body = (
    <>
      {margin}
      <div className="min-w-0 flex-1">
        {isEquation ? (
          // The line, with the teacher's note in the margin beside it.
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-5">
            <div className="min-w-0 flex-1">{visual}</div>
            <div className="shrink-0 sm:w-48">{note}</div>
          </div>
        ) : (
          <div className="space-y-1.5">
            {note}
            {visual}
          </div>
        )}

        {isActive && step.why && (
          <div
            aria-hidden={!explanationVisible}
            className={`mt-2 rounded-2xl border border-amber-100 bg-amber-50/90 px-4 py-2.5 transition-opacity duration-300 ${
              explanationVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            <p className="mb-0.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-700">
              <Lightbulb size={12} /> Why this works
            </p>
            <p className="text-sm leading-relaxed text-amber-900/90">
              <InlineMath text={step.why} />
            </p>
          </div>
        )}

        {isActive && step.check && (
          <div
            aria-hidden={!checkVisible}
            className={`mt-2 rounded-2xl border border-emerald-100 bg-emerald-50/90 px-4 py-2.5 transition-opacity duration-300 ${
              checkVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            <p className="mb-0.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              <CircleHelp size={13} /> Quick check
            </p>
            <p className="text-sm leading-relaxed text-emerald-950/90">
              <InlineMath text={step.check} />
            </p>
          </div>
        )}
      </div>
    </>
  );

  const shell = "relative flex items-start gap-3 rounded-2xl px-2 py-3 sm:px-3";

  if (isActive) {
    return (
      <article
        ref={setLineRef}
        data-board-line="active"
        data-teacher-phase={stylePhase}
        className={shell}
      >
        {body}
      </article>
    );
  }

  return (
    <div
      ref={setLineRef}
      role="button"
      tabIndex={0}
      data-board-line={role}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect?.();
        }
      }}
      aria-label={`Go back to step ${number}`}
      className={`${shell} cursor-pointer text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300`}
    >
      {body}
    </div>
  );
}
