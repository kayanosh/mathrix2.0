"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import MathRenderer from "./MathRenderer";
import InlineMath from "./InlineMath";
import StepConnector from "./StepConnector";
import { TutorResponse, TutorStep } from "@/types";
import { CheckCircle2, Lightbulb, RotateCcw, Hash } from "lucide-react";

const PALETTE = [
  { solid: "#818cf8", glow: "rgba(129,140,248,0.20)" },  // indigo
  { solid: "#22d3ee", glow: "rgba(34,211,238,0.18)"  },  // cyan
  { solid: "#fbbf24", glow: "rgba(251,191,36,0.18)"  },  // amber
  { solid: "#f472b6", glow: "rgba(244,114,182,0.18)" },  // pink
  { solid: "#a78bfa", glow: "rgba(167,139,250,0.18)" },  // violet
  { solid: "#34d399", glow: "rgba(52,211,153,0.18)"  },  // emerald
];

function EquationBox({
  step,
  index,
  total,
  delay,
}: {
  step: TutorStep;
  index: number;
  total: number;
  delay: number;
}) {
  const isFinal = index === total - 1;
  const isFirst = index === 0;
  const palette = isFinal
    ? { solid: "#34d399", glow: "rgba(52,211,153,0.22)" }
    : PALETTE[index % PALETTE.length];

  const latex = isFirst
    ? step.latex_before || step.latex_after
    : step.latex_after;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`relative rounded-2xl overflow-hidden ${isFinal ? "final-box" : ""}`}
      style={{
        background: `linear-gradient(135deg, ${palette.glow}, rgba(255,255,255,0.02))`,
        border: `1px solid ${palette.solid}28`,
        boxShadow: `0 4px 32px -8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05), -4px 0 20px -4px ${palette.solid}30`,
      }}
    >
      {/* left accent bar with glow */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl"
        style={{
          background: `linear-gradient(180deg, ${palette.solid}cc, ${palette.solid}55)`,
          boxShadow: `2px 0 12px ${palette.solid}60`,
        }}
      />

      <div className="pl-5 pr-4 pt-3 pb-4">
        {/* badge row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{
                background: `linear-gradient(135deg, ${palette.solid}, ${palette.solid}88)`,
                boxShadow: `0 2px 8px ${palette.solid}50`,
                color: "#07070e",
              }}
            >
              {isFinal ? <CheckCircle2 size={13} strokeWidth={2.5} /> : index + 1}
            </div>
            <span className="text-xs font-medium" style={{ color: `${palette.solid}cc` }}>
              {isFirst ? "Starting equation" : <InlineMath text={step.explanation} />}
            </span>
          </div>
          {isFinal && (
            <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full"
              style={{ color: "#34d399", backgroundColor: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.25)" }}>
              Solved
            </span>
          )}
        </div>

        {/* equation — large display */}
        <div
          className="eq-display flex items-center justify-center rounded-xl py-4 px-3 min-h-[64px]"
          style={{
            background: "rgba(0,0,0,0.25)",
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          {latex ? (
            <MathRenderer latex={latex} display />
          ) : (
            <span className="text-gray-500 text-sm italic"><InlineMath text={step.explanation} /></span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function EquationChain({ data }: { data: TutorResponse }) {
  const [replayKey, setReplayKey] = useState(0);
  const steps = data.steps ?? [];
  const STEP_GAP = 0.52;

  return (
    <div key={replayKey} className="w-full max-w-lg">
      {/* intro */}
      {data.intro && (
        <motion.p
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-gray-600 text-sm mb-4 leading-relaxed"
        >
          <InlineMath text={data.intro} />
        </motion.p>
      )}

      {/* topic badge */}
      {data.topic && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-4"
          style={{ background: "rgba(129,140,248,0.1)", border: "1px solid rgba(129,140,248,0.2)" }}
        >
          <Hash size={11} className="text-indigo-400" />
          <span className="text-[11px] text-indigo-300 font-medium">
            {data.subject}{data.topic ? ` · ${data.topic}` : ""}
          </span>
        </motion.div>
      )}

      {/* chain */}
      {steps.length > 0 && (
        <div className="flex flex-col">
          {steps.map((step, i) => (
            <div key={i} className="flex flex-col">
              <EquationBox
                step={step}
                index={i}
                total={steps.length}
                delay={i * STEP_GAP}
              />
              {i < steps.length - 1 && (
                <StepConnector
                  step={step}
                  color={PALETTE[(i + 1) % PALETTE.length].solid}
                  delay={i * STEP_GAP + 0.28}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* conclusion */}
      {data.conclusion && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: steps.length * STEP_GAP + 0.15 }}
          className="flex items-start gap-3 p-3.5 rounded-xl mt-3"
          style={{
            background: "rgba(52,211,153,0.08)",
            border: "1px solid rgba(52,211,153,0.22)",
          }}
        >
          <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
          <p className="text-emerald-200 text-sm leading-relaxed"><InlineMath text={data.conclusion} /></p>
        </motion.div>
      )}

      {/* hint */}
      {data.hint && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: steps.length * STEP_GAP + 0.3 }}
          className="flex items-start gap-2 p-3 rounded-xl mt-2"
          style={{
            background: "rgba(251,191,36,0.07)",
            border: "1px solid rgba(251,191,36,0.18)",
          }}
        >
          <Lightbulb size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-amber-200/80 text-xs leading-relaxed"><InlineMath text={data.hint} /></p>
        </motion.div>
      )}

      {/* replay */}
      {steps.length > 0 && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: steps.length * STEP_GAP + 0.4 }}
          onClick={() => setReplayKey((k) => k + 1)}
          className="flex items-center gap-1.5 text-[11px] text-gray-600 hover:text-indigo-400 transition-colors mt-2 group"
        >
          <RotateCcw size={11} className="group-hover:rotate-180 transition-transform duration-500" />
          Replay animation
        </motion.button>
      )}
    </div>
  );
}
