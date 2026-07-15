"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { Check, CircleHelp, Lightbulb, Sparkles } from "lucide-react";
import type { TutorStepModel } from "@/lib/tutor-steps";
import type { ColumnMethodBlock, EquationStep } from "@/types/whiteboard";
import MathWriteIn from "@/components/whiteboard/MathWriteIn";
import HandwrittenInline from "@/components/whiteboard/HandwrittenInline";
import InlineMath from "@/components/InlineMath";
import MathRenderer from "@/components/MathRenderer";
import TeacherMarkOverlay from "@/components/whiteboard/TeacherMarkOverlay";
import TermTransferArrow from "@/components/whiteboard/TermTransferArrow";
import ColumnMethodRenderer from "@/components/whiteboard/blocks/ColumnMethodRenderer";
import BlockRenderer from "@/components/whiteboard/BlockRenderer";
import TextRenderer from "@/components/whiteboard/blocks/TextRenderer";
import { estimateMathWriteMs } from "@/lib/handwriting";
import type { WhiteboardResponse } from "@/types/whiteboard";
import {
  phaseHasReached,
  type PlaybackPhase,
} from "@/lib/whiteboard-playback";

interface Props {
  step: TutorStepModel;
  data: WhiteboardResponse;
  runId: number;
  playbackPhase?: PlaybackPhase;
  setStepRef?: (el: HTMLElement | null) => void;
  /** Active = highlighted current; completed = still fully visible with check */
  variant?: "active" | "completed";
  celebrating?: boolean;
  onSelect?: () => void;
}

const MARKER_RED = "#dc2626";

/** Teaching card: title · working · explanation · why. */
export default function ActiveStepCard({
  step,
  data,
  runId,
  playbackPhase = "complete",
  setStepRef,
  variant = "active",
  celebrating = false,
  onSelect,
}: Props) {
  const isActive = variant === "active";
  const isCompleted = variant === "completed";
  const writingStarted = phaseHasReached(playbackPhase, "write");
  const explanationVisible = phaseHasReached(playbackPhase, "explain");
  const checkVisible = phaseHasReached(playbackPhase, "check");

  const body = (
    <>
      {isActive && (
        <div
          className="absolute inset-0 rounded-3xl ring-2 ring-blue-400/30 pointer-events-none"
        />
      )}

      <div className={`relative space-y-3 ${isActive ? "p-5 sm:p-7 space-y-4" : "p-4 sm:p-5"}`}>
        <div className="flex items-start gap-3">
          {isCompleted ? (
            <motion.span
              className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm shadow-emerald-200"
              initial={celebrating ? { scale: 0.4 } : false}
              animate={{ scale: celebrating ? [0.4, 1.25, 1] : 1 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
            >
              <Check size={15} strokeWidth={3} />
            </motion.span>
          ) : (
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[13px] font-bold text-white shadow-md shadow-blue-200">
              {step.cueIndex + 1}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h2
              className={`font-semibold tracking-tight leading-snug ${
                isCompleted
                  ? "text-base sm:text-lg text-emerald-950"
                  : "text-lg sm:text-xl text-slate-900"
              }`}
            >
              <InlineMath text={step.title} />
            </h2>
            {step.rule && isActive && (
              <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700 ring-1 ring-indigo-100">
                <Sparkles size={11} /> <InlineMath text={step.rule} />
              </span>
            )}
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
        </div>

        <div
          data-teacher-target="visual"
          data-teacher-phase={playbackPhase}
          className={`rounded-2xl border px-4 py-4 sm:px-5 ${
            isCompleted
              ? "bg-white/70 border-emerald-100/80"
              : "bg-slate-50/80 border-slate-100 py-5 sm:px-6"
          }`}
        >
          <StepVisual
            step={step}
            data={data}
            runId={runId}
            animateWrite={isActive && writingStarted}
          />
        </div>

        <div
          aria-hidden={isActive && !explanationVisible}
          className={`transition-opacity duration-300 ${
            isActive && !explanationVisible ? "opacity-0" : "opacity-100"
          }`}
        >
          {isActive && (
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Explanation
            </p>
          )}
          <p
            className={`leading-relaxed ${
              isCompleted
                ? "text-[13px] sm:text-sm text-slate-600"
                : "text-[15px] sm:text-base text-slate-700"
            }`}
          >
            <InlineMath text={step.explanation} />
          </p>
        </div>

        {step.why && isActive && (
          <div
            aria-hidden={!explanationVisible}
            className={`rounded-2xl bg-amber-50/90 border border-amber-100 px-4 py-3 transition-opacity duration-300 ${
              explanationVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-700 mb-1">
              <Lightbulb size={12} /> Why this works
            </p>
            <p className="text-sm leading-relaxed text-amber-900/90">
              <InlineMath text={step.why} />
            </p>
          </div>
        )}

        {step.why && isCompleted && (
          <p className="text-[12px] text-slate-500 leading-snug">
            <span className="font-semibold text-slate-600">Why: </span>
            <InlineMath text={step.why} />
          </p>
        )}

        {step.check && isActive && (
          <div
            aria-hidden={!checkVisible}
            className={`rounded-2xl border border-emerald-100 bg-emerald-50/90 px-4 py-3 transition-opacity duration-300 ${
              checkVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            <p className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700">
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

  const className = isActive
    ? "relative rounded-3xl bg-white border border-slate-200/80 shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)] overflow-hidden"
    : "relative w-full text-left rounded-2xl bg-emerald-50/40 border border-emerald-100/90 overflow-hidden hover:bg-emerald-50/70 transition-colors";

  if (isCompleted) {
    return (
      <motion.button
        type="button"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        onClick={onSelect}
        className={className}
      >
        {body}
      </motion.button>
    );
  }

  return (
    <article
      ref={setStepRef}
      className={className}
      data-teacher-phase={playbackPhase}
    >
      {body}
    </article>
  );
}

function StepVisual({
  step,
  data,
  runId,
  animateWrite,
}: {
  step: TutorStepModel;
  data: WhiteboardResponse;
  runId: number;
  animateWrite: boolean;
}) {
  const v = step.visual;

  if (v.type === "intro" || v.type === "conclusion" || v.type === "hint") {
    return (
      <p
        data-teacher-target="primary"
        className={`font-[family-name:var(--font-caveat)] leading-snug ${
          animateWrite ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl"
        } ${
          v.type === "conclusion"
            ? "text-emerald-700"
            : v.type === "hint"
              ? "text-amber-800"
              : "text-slate-800"
        }`}
      >
        {animateWrite ? (
          <HandwrittenInline key={runId} text={v.text} />
        ) : (
          <InlineMath text={v.text} />
        )}
      </p>
    );
  }

  if (v.type === "equation") {
    return (
      <EquationVisual
        step={v.step}
        isFirst={v.isFirst}
        isFinal={v.isFinal}
        animateWrite={animateWrite}
      />
    );
  }

  if (v.type === "column") {
    const block = data.blocks[v.blockIndex];
    if (block?.type !== "column_method") return null;
    return (
      <ColumnMethodRenderer
        block={block as ColumnMethodBlock}
        baseDelay={0}
        revealStep={v.revealStep}
      />
    );
  }

  if (v.type === "text") {
    return (
      <div data-teacher-target="primary">
        <TextRenderer
          block={{ type: "text", content: v.content, latex: v.latex }}
          writeIn={animateWrite}
        />
      </div>
    );
  }

  if (v.type === "block") {
    return (
      <div data-teacher-reveal="visual">
        <BlockRenderer block={v.block} index={v.blockIndex} baseDelay={0} />
      </div>
    );
  }

  return null;
}

function EquationVisual({
  step,
  isFirst,
  isFinal,
  animateWrite,
}: {
  step: EquationStep;
  isFirst: boolean;
  isFinal: boolean;
  animateWrite: boolean;
}) {
  const lineRef = useRef<HTMLDivElement>(null);
  const pairRef = useRef<HTMLDivElement>(null);
  const latex = isFirst ? step.latexBefore || step.latexAfter : step.latexAfter;
  const markDelay = latex ? estimateMathWriteMs(latex) / 1000 + 0.2 : 0.4;
  const hasArrows = !!(step.arrows && step.arrows.length > 0);
  const hasBefore = !!step.latexBefore && !isFirst;

  if (hasArrows && hasBefore) {
    return (
      <div ref={pairRef} data-teacher-target="primary" className="relative space-y-2">
        <div className="opacity-45">
          <MathRenderer latex={step.latexBefore} display />
        </div>
        {step.balanceNotation && (
          <div className="font-[family-name:var(--font-caveat)] text-lg text-blue-700 ml-2">
            <MathRenderer latex={step.balanceNotation} />
          </div>
        )}
        <div className={`flex items-center gap-2 ${isFinal ? "text-emerald-700" : ""}`}>
          <EquationLatex tex={step.latexAfter} animateWrite={animateWrite} />
        </div>
        {animateWrite &&
          step.arrows?.map((arrow, ai) => (
            <TermTransferArrow
              key={arrow.id || ai}
              containerRef={pairRef}
              fromId={`${arrow.id}-from`}
              toId={`${arrow.id}-to`}
              fromTerm={arrow.fromTerm}
              toTerm={arrow.toTerm}
              signRule={arrow.signRule}
              label={arrow.label}
              delay={0.15 + ai * 0.2}
              color={arrow.color || MARKER_RED}
            />
          ))}
        {animateWrite &&
          step.marks?.map((mark, mi) => (
            <TeacherMarkOverlay
              key={mark.targetId || mi}
              containerRef={pairRef}
              mark={mark}
              delay={estimateMathWriteMs(step.latexAfter) / 1000 + 0.25 + mi * 0.4}
            />
          ))}
      </div>
    );
  }

  return (
    <div ref={lineRef} data-teacher-target="primary" className="relative">
      {step.balanceNotation && (
        <div className="font-[family-name:var(--font-caveat)] text-lg text-blue-700 mb-2 ml-1">
          <MathRenderer latex={step.balanceNotation} />
        </div>
      )}
      <div className={isFinal ? "text-emerald-700" : ""}>
        {latex ? (
          <EquationLatex tex={latex} animateWrite={animateWrite} />
        ) : animateWrite ? (
          <HandwrittenInline text={step.explanation} />
        ) : (
          <InlineMath text={step.explanation} />
        )}
      </div>
      {animateWrite &&
        step.marks?.map((mark, mi) => (
          <TeacherMarkOverlay
            key={mark.targetId || mi}
            containerRef={lineRef}
            mark={mark}
            delay={markDelay + mi * 0.4}
          />
        ))}
    </div>
  );
}

function EquationLatex({
  tex,
  animateWrite,
}: {
  tex: string;
  animateWrite: boolean;
}) {
  return animateWrite ? (
    <MathWriteIn latex={tex} display />
  ) : (
    <MathRenderer latex={tex} display />
  );
}
