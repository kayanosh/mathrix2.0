"use client";

import { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Lightbulb, Sparkles } from "lucide-react";
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

interface Props {
  step: TutorStepModel;
  data: WhiteboardResponse;
  runId: number;
  setStepRef?: (el: HTMLDivElement | null) => void;
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
  setStepRef,
  variant = "active",
  celebrating = false,
  onSelect,
}: Props) {
  const isActive = variant === "active";
  const isCompleted = variant === "completed";

  const body = (
    <>
      {isActive && (
        <motion.div
          className="absolute inset-0 rounded-3xl ring-2 ring-blue-400/30 pointer-events-none"
          animate={{ opacity: [0.35, 0.7, 0.35] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      <div className={`relative space-y-3 ${isActive ? "p-5 sm:p-7 space-y-4" : "p-4 sm:p-5"}`}>
        <div className="flex items-start gap-3">
          {isCompleted ? (
            <motion.span
              className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm shadow-emerald-200"
              initial={celebrating ? { scale: 0.4 } : false}
              animate={{ scale: celebrating ? [0.4, 1.25, 1] : 1 }}
              transition={{ type: "spring", stiffness: 420, damping: 16 }}
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
              {step.title}
            </h2>
            {step.rule && isActive && (
              <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700 ring-1 ring-indigo-100">
                <Sparkles size={11} /> {step.rule}
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
            animateWrite={isActive}
          />
        </div>

        <div>
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
            {isActive ? (
              <HandwrittenInline text={step.explanation} startDelay={120} />
            ) : (
              <InlineMath text={step.explanation} />
            )}
          </p>
        </div>

        <AnimatePresence>
          {step.why && isActive && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-2xl bg-amber-50/90 border border-amber-100 px-4 py-3"
            >
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-700 mb-1">
                <Lightbulb size={12} /> Why this works
              </p>
              <p className="text-sm leading-relaxed text-amber-900/90">{step.why}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {step.why && isCompleted && (
          <p className="text-[12px] text-slate-500 leading-snug">
            <span className="font-semibold text-slate-600">Why: </span>
            {step.why}
          </p>
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
        layout
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
    <motion.article
      ref={setStepRef}
      key={`${step.cueIndex}-${runId}`}
      layout
      initial={{ opacity: 0, y: 28, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 320, damping: 28 }}
      className={className}
    >
      {body}
    </motion.article>
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
      <TextRenderer
        block={{ type: "text", content: v.content, latex: v.latex }}
        writeIn={animateWrite}
      />
    );
  }

  if (v.type === "block") {
    return <BlockRenderer block={v.block} index={v.blockIndex} baseDelay={0} />;
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

  const Latex = ({ tex }: { tex: string }) =>
    animateWrite ? (
      <MathWriteIn latex={tex} display />
    ) : (
      <MathRenderer latex={tex} display />
    );

  if (hasArrows && hasBefore) {
    return (
      <div ref={pairRef} className="relative space-y-2">
        <div className="opacity-45">
          <MathRenderer latex={step.latexBefore} display />
        </div>
        {step.balanceNotation && (
          <div className="font-[family-name:var(--font-caveat)] text-lg text-blue-700 ml-2">
            <MathRenderer latex={step.balanceNotation} />
          </div>
        )}
        <div className={`flex items-center gap-2 ${isFinal ? "text-emerald-700" : ""}`}>
          <Latex tex={step.latexAfter} />
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
    <div ref={lineRef} className="relative">
      {step.balanceNotation && (
        <div className="font-[family-name:var(--font-caveat)] text-lg text-blue-700 mb-2 ml-1">
          <MathRenderer latex={step.balanceNotation} />
        </div>
      )}
      <div className={isFinal ? "text-emerald-700" : ""}>
        {latex ? (
          <Latex tex={latex} />
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
