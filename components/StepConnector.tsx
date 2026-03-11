"use client";

import { motion } from "framer-motion";
import MathRenderer from "./MathRenderer";
import { TutorStep } from "@/types";

interface StepConnectorProps {
  step: TutorStep;
  color: string;
  delay: number;
}

export default function StepConnector({ step, color, delay }: StepConnectorProps) {
  const { term_transfer, balance_notation, operation_label } = step;
  const hasTransfer = !!term_transfer;
  const baseDelay = delay;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: baseDelay, duration: 0.2 }}
      className="flex flex-col items-stretch mx-1 my-0.5 gap-0"
    >
      {/* ── Term crossing the = sign ─────────────────────────── */}
      {hasTransfer && term_transfer && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: baseDelay + 0.05, duration: 0.3 }}
          className="rounded-xl px-3 py-2.5 mb-1"
          style={{
            background: `linear-gradient(135deg, ${color}10, ${color}06)`,
            border: `1px solid ${color}25`,
          }}
        >
          {/* header label */}
          <div className="flex items-center gap-1.5 mb-2">
            <motion.div
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: color }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: baseDelay + 0.1, type: "spring" }}
            />
            <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: `${color}aa` }}>
              term crosses  =  sign
            </span>
          </div>

          {/* from ─────→ to */}
          <div className="flex items-center gap-2">
            {/* from pill */}
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: baseDelay + 0.12, type: "spring", stiffness: 320 }}
              className="flex-shrink-0 rounded-lg px-2.5 py-1 font-mono font-bold text-sm"
              style={{
                backgroundColor: `${color}18`,
                border: `1px solid ${color}40`,
                color,
              }}
            >
              <MathRenderer latex={term_transfer.from_term} />
            </motion.div>

            {/* animated dashed line */}
            <div className="flex-1 relative flex items-center h-6 min-w-0 overflow-hidden">
              {/* solid underline that grows */}
              <motion.div
                className="absolute inset-y-1/2 left-0 h-[2px] rounded-full"
                style={{ backgroundColor: color, top: "50%", transform: "translateY(-50%)" }}
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ delay: baseDelay + 0.2, duration: 0.45, ease: "easeOut" }}
              />
              {/* dash overlay */}
              <div
                className="absolute inset-0 flex items-center"
                style={{
                  backgroundImage: `repeating-linear-gradient(90deg, transparent 0px, transparent 4px, ${color}50 4px, ${color}50 9px)`,
                  backgroundSize: "13px 2px",
                  backgroundRepeat: "repeat-x",
                  backgroundPosition: "center",
                }}
              />
            </div>

            {/* arrowhead */}
            <motion.svg
              width="16" height="16" viewBox="0 0 16 16"
              className="flex-shrink-0"
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: baseDelay + 0.6, type: "spring", stiffness: 400 }}
            >
              <polygon points="0,2 16,8 0,14" fill={color} />
            </motion.svg>

            {/* to pill */}
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: baseDelay + 0.65, type: "spring", stiffness: 320 }}
              className="flex-shrink-0 rounded-lg px-2.5 py-1 font-mono font-bold text-sm"
              style={{
                backgroundColor: `${color}18`,
                border: `1px solid ${color}40`,
                color,
              }}
            >
              <MathRenderer latex={term_transfer.to_term} />
            </motion.div>
          </div>

          {/* sign rule */}
          {term_transfer.sign_rule && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: baseDelay + 0.7 }}
              className="text-[11px] italic mt-1.5 text-center"
              style={{ color: `${color}88` }}
            >
              {term_transfer.sign_rule}
            </motion.p>
          )}
        </motion.div>
      )}

      {/* ── Balance notation  | op … op | ───────────────────── */}
      {balance_notation && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: baseDelay + (hasTransfer ? 0.72 : 0.08) }}
          className="flex items-center justify-between px-3 py-1"
        >
          {/* left  | */}
          <span className="flex items-center gap-1.5 font-mono text-xs font-medium" style={{ color }}>
            <span className="text-gray-600 select-none">│</span>
            <MathRenderer latex={balance_notation} />
          </span>

          {/* centre label */}
          <span className="text-[10px] text-gray-600 italic truncate mx-2 max-w-[140px] hidden sm:block">
            {operation_label}
          </span>

          {/* right | */}
          <span className="flex items-center gap-1.5 font-mono text-xs font-medium" style={{ color }}>
            <MathRenderer latex={balance_notation} />
            <span className="text-gray-600 select-none">│</span>
          </span>
        </motion.div>
      )}

      {/* ── Separator ────────────────────────────────────────── */}
      <motion.div
        className="h-px mx-2"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${color}45 30%, ${color}45 70%, transparent 100%)`,
        }}
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{
          delay: baseDelay + (hasTransfer ? 0.75 : 0.12),
          duration: 0.35,
          ease: "easeOut",
        }}
      />

      {/* ── Operation pill (when no balance notation) ─────────── */}
      {!balance_notation && (
        <motion.div
          className="flex justify-center mt-1"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: baseDelay + 0.1, type: "spring" }}
        >
          <span
            className="text-[11px] font-semibold px-3 py-0.5 rounded-full border"
            style={{ color, borderColor: `${color}40`, backgroundColor: `${color}12` }}
          >
            {operation_label}
          </span>
        </motion.div>
      )}

      {/* ── Down arrow ───────────────────────────────────────── */}
      <motion.div
        className="flex justify-center pt-0.5 pb-0.5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: baseDelay + (hasTransfer ? 0.8 : 0.18) }}
      >
        <svg width="18" height="20" viewBox="0 0 18 20">
          <motion.line
            x1="9" y1="1" x2="9" y2="14"
            stroke={color} strokeWidth="2" strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: baseDelay + (hasTransfer ? 0.82 : 0.2), duration: 0.2 }}
          />
          <motion.polygon
            points="9,20 4,12 14,12"
            fill={color}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: baseDelay + (hasTransfer ? 0.95 : 0.32) }}
          />
        </svg>
      </motion.div>
    </motion.div>
  );
}
