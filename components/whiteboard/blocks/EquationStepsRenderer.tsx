"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import type { EquationStepBlock, EquationStep } from "@/types/whiteboard";
import MathRenderer from "@/components/MathRenderer";
import InlineMath from "@/components/InlineMath";
import TermTransferArrow from "../TermTransferArrow";
import WhyExpander from "./WhyExpander";

const MARKER = {
  blue: "#1d4ed8",
  red: "#dc2626",
  green: "#16a34a",
  gray: "#6b7280",
};

const WRITE_DELAY = 0.65; // gap between each "written" step

interface Props {
  block: EquationStepBlock;
  baseDelay: number;
}

export default function EquationStepsRenderer({ block, baseDelay }: Props) {
  const { steps } = block;

  return (
    <div className="wb-equations flex flex-col gap-1 w-full">
      {steps.map((step, i) => {
        const stepDelay = baseDelay + i * WRITE_DELAY;
        const isFinal = i === steps.length - 1;
        const isFirst = i === 0;
        const hasArrows = !!(step.arrows && step.arrows.length > 0);
        const hasBeforeEq = !!step.latexBefore;

        return (
          <div key={i} className="flex flex-col">
            {/* ── Teacher annotation (what we're about to do) ── */}
            {!isFirst && step.operationLabel && (
              <motion.div
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: stepDelay - 0.15, duration: 0.3 }}
                className="wb-annotation font-[family-name:var(--font-caveat)] text-lg sm:text-xl ml-1 mb-1 flex items-center flex-wrap gap-2"
              >
                <InlineMath text={step.operationLabel} />
                {/* Rule badge — formal theorem/rule name */}
                {step.rule && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: stepDelay - 0.05, duration: 0.2 }}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 font-sans"
                  >
                    {step.rule}
                  </motion.span>
                )}
              </motion.div>
            )}

            {/* ── Step pair: before + arrow overlay + after ── */}
            {!isFirst && hasArrows && hasBeforeEq ? (
              <StepPairCard
                step={step}
                delay={stepDelay}
                isFinal={isFinal}
              />
            ) : (
              <>
                {/* ── Balance notation (both-sides operation) ── */}
                {step.balanceNotation && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: stepDelay + 0.05, duration: 0.25 }}
                    className="wb-balance font-[family-name:var(--font-caveat)] text-base ml-6 mb-0.5"
                  >
                    <MathRenderer latex={step.balanceNotation} />
                  </motion.div>
                )}

                {/* Single equation line (step 1 or steps without arrows) */}
                <WrittenEquation
                  step={step}
                  delay={stepDelay + 0.12}
                  isFinal={isFinal}
                  isFirst={isFirst}
                />
              </>
            )}

            {/* ── Explanation — like margin notes ── */}
            {step.explanation && !isFirst && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: stepDelay + 0.3, duration: 0.3 }}
                className="wb-explanation font-[family-name:var(--font-caveat)] text-base sm:text-lg ml-6 mb-1"
              >
                ↳ <InlineMath text={step.explanation} />
              </motion.div>
            )}

            {/* ── Why expander — builds mathematical intuition ── */}
            {step.why && !isFirst && (
              <WhyExpander text={step.why} delay={stepDelay + 0.35} />
            )}

            {/* ── Self-check — green verification callout ── */}
            {step.selfCheck && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: stepDelay + 0.45, duration: 0.3 }}
                className="ml-6 mt-1 mb-3 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 font-[family-name:var(--font-caveat)] text-base text-emerald-800"
              >
                <InlineMath text={step.selfCheck} />
              </motion.div>
            )}

            {/* Spacer when no self-check */}
            {!step.selfCheck && (isFirst || step.explanation || step.why) && (
              <div className="mb-2" />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Step pair card: shows before (dimmed) → arrow → after (bright) ──── */
function StepPairCard({
  step,
  delay,
  isFinal,
}: {
  step: EquationStep;
  delay: number;
  isFinal: boolean;
}) {
  const pairRef = useRef<HTMLDivElement>(null);

  return (
    <motion.div
      ref={pairRef}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      className={`wb-step-pair ${isFinal ? "wb-final-answer" : ""}`}
    >
      {/* Previous equation (dimmed) */}
      <div className="wb-step-before flex items-center gap-3 py-1 px-2">
        <span className="wb-step-num font-[family-name:var(--font-caveat)] text-sm flex-shrink-0 opacity-50">
          {step.stepNumber > 1 ? step.stepNumber - 1 : step.stepNumber})
        </span>
        <div className="wb-equation">
          <MathRenderer latex={step.latexBefore} display />
        </div>
      </div>

      {/* Divider */}
      <div className="wb-step-divider" />

      {/* Balance notation */}
      {step.balanceNotation && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: delay + 0.05, duration: 0.25 }}
          className="wb-balance font-[family-name:var(--font-caveat)] text-base ml-6 my-0.5"
        >
          <MathRenderer latex={step.balanceNotation} />
        </motion.div>
      )}

      {/* Current equation (bright) */}
      <div
        className={`wb-step-after flex items-center gap-3 py-1.5 px-2 ${isFinal ? "wb-equation-final" : ""}`}
      >
        <span className="wb-step-num font-[family-name:var(--font-caveat)] text-base flex-shrink-0">
          {step.stepNumber})
        </span>
        <div className={`wb-equation ${isFinal ? "wb-equation-final" : ""}`}>
          <MathRenderer latex={step.latexAfter} display />
        </div>
        {isFinal && (
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: delay + 0.3, type: "spring", stiffness: 300 }}
            className="wb-checkmark font-[family-name:var(--font-caveat)] text-lg flex-shrink-0"
          >
            ✓
          </motion.span>
        )}
      </div>

      {/* Arrow overlays connecting terms between before and after equations */}
      {step.arrows?.map((arrow, ai) => (
        <TermTransferArrow
          key={arrow.id || ai}
          containerRef={pairRef}
          fromId={`${arrow.id}-from`}
          toId={`${arrow.id}-to`}
          fromTerm={arrow.fromTerm}
          toTerm={arrow.toTerm}
          signRule={arrow.signRule}
          label={arrow.label}
          delay={delay + 0.15 + ai * 0.2}
          color={arrow.color || MARKER.red}
        />
      ))}
    </motion.div>
  );
}

/* ── A single equation line, written by the teacher ──── */
function WrittenEquation({
  step,
  delay,
  isFinal,
  isFirst,
}: {
  step: EquationStep;
  delay: number;
  isFinal: boolean;
  isFirst: boolean;
}) {
  const latex = isFirst
    ? step.latexBefore || step.latexAfter
    : step.latexAfter;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.35, ease: "easeOut" }}
      className={`wb-equation-line flex items-center gap-3 py-1.5 px-2 rounded-lg ${
        isFinal ? "wb-final-answer" : ""
      }`}
    >
      <span className="wb-step-num font-[family-name:var(--font-caveat)] text-base flex-shrink-0">
        {step.stepNumber})
      </span>
      <div className={`wb-equation ${isFinal ? "wb-equation-final" : ""}`}>
        {latex ? (
          <MathRenderer latex={latex} display />
        ) : (
          <span className="font-[family-name:var(--font-caveat)] text-lg">
            <InlineMath text={step.explanation} />
          </span>
        )}
      </div>
      {isFinal && (
        <motion.span
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: delay + 0.3, type: "spring", stiffness: 300 }}
          className="wb-checkmark font-[family-name:var(--font-caveat)] text-lg flex-shrink-0"
        >
          ✓
        </motion.span>
      )}
    </motion.div>
  );
}
