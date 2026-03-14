"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, ChevronRight, RotateCcw, Sparkles } from "lucide-react";
import type { WhiteboardResponse, EquationStep, VisualBlock } from "@/types/whiteboard";
import BlockRenderer from "./BlockRenderer";
import InlineMath from "@/components/InlineMath";
import MathRenderer from "@/components/MathRenderer";
import WhyExpander from "./blocks/WhyExpander";

// ── Card types ────────────────────────────────────────────────────────────────

type Card =
  | { kind: "intro"; intro: string; topic?: string; subject?: string; image?: string }
  | { kind: "step"; step: EquationStep; index: number; total: number }
  | { kind: "visual"; block: VisualBlock; blockIndex: number }
  | { kind: "answer"; conclusion: string; casVerified?: boolean; groundTruth?: string; agreementCount?: number }
  | { kind: "insight"; hint?: string | null; keyTakeaway?: string; examTip?: string };

function buildCards(data: WhiteboardResponse): Card[] {
  const cards: Card[] = [];

  cards.push({
    kind: "intro",
    intro: data.intro,
    topic: data.topic,
    subject: data.subject,
    image: data.questionImageUrl,
  });

  let blockIndex = 0;
  for (const block of data.blocks) {
    if (block.type === "equation_steps") {
      block.steps.forEach((step, i) => {
        cards.push({ kind: "step", step, index: i, total: block.steps.length });
      });
    } else {
      cards.push({ kind: "visual", block, blockIndex });
    }
    blockIndex++;
  }

  cards.push({
    kind: "answer",
    conclusion: data.conclusion,
    casVerified: data.casVerified,
    groundTruth: data.sympyAnswer,
    agreementCount: data.verification?.agreementCount,
  });

  if (data.hint || data.keyTakeaway || data.examTip) {
    cards.push({
      kind: "insight",
      hint: data.hint,
      keyTakeaway: data.keyTakeaway,
      examTip: data.examTip,
    });
  }

  return cards;
}

// ── Main renderer ─────────────────────────────────────────────────────────────

interface Props {
  data: WhiteboardResponse;
}

export default function WhiteboardRenderer({ data }: Props) {
  const [sessionKey, setSessionKey] = useState(0);
  const [revealed, setRevealed] = useState(1);
  const [showCelebration, setShowCelebration] = useState(false);

  const cards = useMemo(() => buildCards(data), [data]);
  const answerIndex = cards.findIndex((c) => c.kind === "answer");
  const allRevealed = revealed >= cards.length;

  // Reset when data changes
  useEffect(() => {
    setRevealed(1);
    setShowCelebration(false);
    setSessionKey((k) => k + 1);
  }, [data]);

  const revealNext = useCallback(() => {
    setRevealed((r) => {
      const next = r + 1;
      if (next - 1 === answerIndex) {
        setTimeout(() => setShowCelebration(true), 400);
      }
      return next;
    });
  }, [answerIndex]);

  const restart = () => {
    setRevealed(1);
    setShowCelebration(false);
    setSessionKey((k) => k + 1);
  };

  const revealedCards = cards.slice(0, revealed);
  const nextCard = cards[revealed];
  const progressPct = Math.round((revealed / cards.length) * 100);

  return (
    <div key={sessionKey} className="w-full max-w-2xl mx-auto">
      {/* ── Progress bar ───────────────────────────────────────────── */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-indigo-400 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
        <span className="text-[11px] text-gray-400 tabular-nums w-9 text-right">
          {progressPct}%
        </span>
      </div>

      {/* ── Cards ──────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <AnimatePresence initial={false}>
          {revealedCards.map((card, i) => (
            <motion.div
              key={`card-${i}-${card.kind}`}
              initial={{ opacity: 0, y: 18, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
            >
              <CardShell card={card} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ── Reveal button ──────────────────────────────────────────── */}
      <AnimatePresence>
        {!allRevealed && (
          <motion.div
            key="reveal-btn"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
            className="mt-4"
          >
            <button
              onClick={revealNext}
              className="w-full flex items-center justify-between gap-2 px-5 py-3.5 rounded-2xl bg-indigo-500 hover:bg-indigo-600 active:scale-[0.98] text-white font-medium text-sm transition-all shadow-sm shadow-indigo-200"
            >
              <span>
                {nextCard?.kind === "answer"
                  ? "Show answer"
                  : nextCard?.kind === "insight"
                  ? "See the trick"
                  : nextCard?.kind === "step"
                  ? `Step ${nextCard.index + 1} of ${nextCard.total}`
                  : "Next"}
              </span>
              <ChevronRight size={17} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── All revealed: restart + try another ────────────────────── */}
      <AnimatePresence>
        {allRevealed && (
          <motion.div
            key="end-actions"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-5 flex items-center justify-between"
          >
            <button
              onClick={restart}
              className="flex items-center gap-1.5 text-[12px] text-gray-400 hover:text-indigo-500 transition-colors group"
            >
              <RotateCcw
                size={12}
                className="group-hover:rotate-180 transition-transform duration-500"
              />
              Restart
            </button>

            <button
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent("mathrix:practice", {
                    detail: { topic: data.topic },
                  })
                )
              }
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-[12px] font-medium transition-colors"
            >
              <Sparkles size={12} />
              Try a similar problem
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Celebration toast ──────────────────────────────────────── */}
      <AnimatePresence>
        {showCelebration && (
          <CelebrationToast
            topic={data.topic}
            onDone={() => setShowCelebration(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Card shell: routes to the right card type ─────────────────────────────────

function CardShell({ card }: { card: Card }) {
  switch (card.kind) {
    case "intro":
      return <IntroCard card={card} />;
    case "step":
      return <StepCard card={card} />;
    case "visual":
      return <VisualCard card={card} />;
    case "answer":
      return <AnswerCard card={card} />;
    case "insight":
      return <InsightCard card={card} />;
  }
}

// ── Card: Intro / Problem ─────────────────────────────────────────────────────

function IntroCard({ card }: { card: Extract<Card, { kind: "intro" }> }) {
  return (
    <div className="wb-board rounded-2xl px-6 py-5 relative overflow-hidden">
      <div className="wb-rules pointer-events-none absolute inset-0" />

      {card.topic && (
        <span className="inline-block mb-3 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-indigo-100 text-indigo-700 border border-indigo-200">
          {card.subject && `${card.subject} — `}{card.topic}
        </span>
      )}

      <p className="wb-intro font-[family-name:var(--font-caveat)] text-2xl sm:text-3xl leading-snug">
        <InlineMath text={card.intro} />
      </p>

      {card.image && (
        <div className="mt-4 rounded-xl overflow-hidden border border-gray-200 bg-white inline-block max-w-xs sm:max-w-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={card.image} alt="Question" className="w-full h-auto" />
          <p className="text-[11px] text-gray-400 px-3 py-1.5 text-center">📎 Your question</p>
        </div>
      )}
    </div>
  );
}

// ── Card: Equation Step ───────────────────────────────────────────────────────

function StepCard({ card }: { card: Extract<Card, { kind: "step" }> }) {
  const { step, index, total } = card;
  const isFirst = index === 0;
  const isFinal = index === total - 1;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      {/* Step header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-medium text-indigo-500 tabular-nums">
            Step {index + 1}/{total}
          </span>
          {!isFirst && (
            <span className="font-[family-name:var(--font-caveat)] text-base text-gray-700">
              <InlineMath text={step.operationLabel} />
            </span>
          )}
          {step.rule && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 text-indigo-600 border border-indigo-200">
              {step.rule}
            </span>
          )}
        </div>
        {isFinal && (
          <span className="text-emerald-500 text-xs font-medium">Final step</span>
        )}
      </div>

      {/* The maths — this is the star of the show */}
      <div
        className={`px-5 py-4 flex flex-col items-center ${
          isFinal ? "bg-emerald-50" : "bg-gray-50/60"
        }`}
      >
        {/* On the first step, show the original problem */}
        {isFirst && step.latexBefore && step.latexBefore !== step.latexAfter && (
          <div className="opacity-50 mb-3 text-center">
            <MathRenderer latex={step.latexBefore} display />
          </div>
        )}

        {/* Flow arrow between before/after */}
        {!isFirst && step.latexBefore && (
          <>
            <div className="opacity-40 text-center mb-1">
              <MathRenderer latex={step.latexBefore} display />
            </div>
            <div className="text-gray-300 text-lg my-1 select-none">↓</div>
          </>
        )}

        {/* The result — shown prominently */}
        <div
          className={`text-center ${
            isFinal ? "scale-110 origin-center" : ""
          }`}
        >
          <MathRenderer latex={step.latexAfter} display />
        </div>

        {isFinal && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 300 }}
            className="mt-2 text-emerald-500 text-xl"
          >
            ✓
          </motion.span>
        )}
      </div>

      {/* Explanation — typed text below the maths */}
      {step.explanation && !isFirst && (
        <div className="px-5 pt-3 pb-1 text-[13px] text-gray-600 leading-relaxed">
          <InlineMath text={step.explanation} />
        </div>
      )}

      {/* Balance notation — what was done to both sides */}
      {step.balanceNotation && !isFirst && (
        <div className="px-5 pb-2 font-[family-name:var(--font-caveat)] text-sm text-gray-400">
          Applied: <MathRenderer latex={step.balanceNotation} />
        </div>
      )}

      {/* Why expander */}
      {step.why && !isFirst && (
        <div className="px-4 pb-3">
          <WhyExpander text={step.why} />
        </div>
      )}

      {/* Self-check */}
      {step.selfCheck && (
        <div className="mx-5 mb-4 px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[13px] text-emerald-800">
          <InlineMath text={step.selfCheck} />
        </div>
      )}
    </div>
  );
}

// ── Card: Visual block (graph, shape, table, chart, etc.) ─────────────────────

function VisualCard({ card }: { card: Extract<Card, { kind: "visual" }> }) {
  const label = card.block.type.replace(/_/g, " ");
  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      <div className="px-5 pt-3 pb-1 text-[11px] font-medium text-gray-400 capitalize">
        {label}
      </div>
      <div className="px-4 pb-4">
        <BlockRenderer block={card.block} index={card.blockIndex} baseDelay={0} />
      </div>
    </div>
  );
}

// ── Card: Answer (celebration) ────────────────────────────────────────────────

function AnswerCard({ card }: { card: Extract<Card, { kind: "answer" }> }) {
  return (
    <motion.div
      className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-100 overflow-hidden"
      initial={{ scale: 0.95 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 280, damping: 22 }}
    >
      <div className="px-6 py-6 text-white">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.12, type: "spring", stiffness: 300 }}
            className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold"
          >
            ✓
          </motion.div>
          <span className="font-semibold text-sm opacity-90">Answer</span>
        </div>

        {/* Conclusion — large, handwritten feel */}
        <div className="font-[family-name:var(--font-caveat)] text-3xl sm:text-4xl leading-tight text-white">
          <InlineMath text={card.conclusion} />
        </div>

        {/* Verification */}
        {card.casVerified && (
          <div className="mt-4 flex items-center gap-1.5 text-[11px] text-white/70">
            <ShieldCheck size={12} />
            Independently verified
            {card.agreementCount !== undefined && card.agreementCount > 0 &&
              ` · ${card.agreementCount}/4 checks passed`}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Card: Insight (hint + key takeaway + exam tip) ────────────────────────────

function InsightCard({ card }: { card: Extract<Card, { kind: "insight" }> }) {
  return (
    <div className="flex flex-col gap-3">
      {card.keyTakeaway && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-[11px] font-medium text-amber-600 mb-1 uppercase tracking-wide">
            Key idea
          </p>
          <p className="font-[family-name:var(--font-caveat)] text-lg text-amber-900">
            <InlineMath text={card.keyTakeaway} />
          </p>
        </div>
      )}

      {card.hint && (
        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4">
          <p className="text-[11px] font-medium text-gray-400 mb-1 uppercase tracking-wide">
            Watch out
          </p>
          <p className="font-[family-name:var(--font-caveat)] text-lg text-gray-700">
            💡 <InlineMath text={card.hint} />
          </p>
        </div>
      )}

      {card.examTip && (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 px-5 py-4">
          <p className="text-[11px] font-medium text-sky-600 mb-1 uppercase tracking-wide">
            Exam tip
          </p>
          <p className="font-[family-name:var(--font-caveat)] text-lg text-sky-900">
            <InlineMath text={card.examTip} />
          </p>
        </div>
      )}
    </div>
  );
}

// ── Celebration toast ─────────────────────────────────────────────────────────

function CelebrationToast({
  topic,
  onDone,
}: {
  topic?: string;
  onDone: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, [onDone]);

  const skill = topic
    ? topic.split("—")[0]?.trim() || topic
    : "Maths";

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 280, damping: 22 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[min(90vw,340px)]"
    >
      <div className="rounded-2xl bg-gray-900 shadow-2xl px-5 py-4 text-white flex items-start gap-4">
        <div className="text-2xl mt-0.5">🎉</div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">Method learned!</p>
          <p className="text-[12px] text-gray-400 mt-0.5">{skill} skill unlocked</p>
          <div className="flex items-center gap-3 mt-2.5">
            <Pill color="indigo">+10 XP</Pill>
            <Pill color="amber">+5 coins</Pill>
            <Pill color="emerald">streak ↑</Pill>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function Pill({
  color,
  children,
}: {
  color: "indigo" | "amber" | "emerald";
  children: React.ReactNode;
}) {
  const cls = {
    indigo: "bg-indigo-500/20 text-indigo-300",
    amber: "bg-amber-500/20 text-amber-300",
    emerald: "bg-emerald-500/20 text-emerald-300",
  }[color];

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.15, type: "spring", stiffness: 260 }}
      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${cls}`}
    >
      {children}
    </motion.span>
  );
}
