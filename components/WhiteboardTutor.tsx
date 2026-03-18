"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  RotateCcw,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import type {
  WhiteboardResponse,
  EquationStepBlock,
} from "@/types/whiteboard";
import BlockRenderer from "./whiteboard/BlockRenderer";
import MathRenderer from "./MathRenderer";
import InlineMath from "./InlineMath";
import TermTransferArrow from "./whiteboard/TermTransferArrow";
import { buildNarrationPlan, type NarrationCue } from "@/lib/narration";

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  data: WhiteboardResponse;
  onClose: () => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const WRITE_MS = 900;
const POINTER_SIZE = 36;

const MARKER = {
  blue: "#1d4ed8",
  red: "#dc2626",
  green: "#16a34a",
  gray: "#6b7280",
};

// ── Speech hook (cloud TTS with browser fallback) ─────────────────────────────

function useSpeech() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const speakCloud = useCallback(
    async (text: string, rate: number, onEnd: () => void) => {
      try {
        abortRef.current?.abort();
        abortRef.current = new AbortController();

        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, speed: rate * 0.92 }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) throw new Error("TTS API error");

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);

        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.removeAttribute("src");
        }
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => {
          URL.revokeObjectURL(url);
          onEnd();
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          onEnd();
        };
        await audio.play();
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        // Fall back to browser TTS
        speakBrowser(text, rate, onEnd);
      }
    },
    [],
  );

  const speakBrowser = useCallback(
    (text: string, rate: number, onEnd: () => void) => {
      if (typeof window === "undefined" || !window.speechSynthesis) {
        setTimeout(onEnd, 1200);
        return;
      }
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(text);
      utt.rate = rate * 0.88;
      utt.pitch = 0.85;
      utt.volume = 1;
      utt.onend = onEnd;
      utt.onerror = () => onEnd();

      const trySpeak = () => {
        const voices = window.speechSynthesis.getVoices();
        const voice =
          voices.find((v) => v.name === "Daniel (Premium)") ||
          voices.find((v) => v.name === "Daniel (Enhanced)") ||
          voices.find((v) => v.name === "Daniel") ||
          voices.find((v) => v.name.includes("Google UK English Male")) ||
          voices.find((v) => v.name.includes("Microsoft Ryan")) ||
          voices.find((v) => v.lang === "en-GB" && !/Samantha|Kate|Serena|Fiona|Moira/i.test(v.name)) ||
          voices.find((v) => v.lang === "en-GB") ||
          voices.find((v) => v.lang.startsWith("en"));
        if (voice) utt.voice = voice;
        window.speechSynthesis.speak(utt);
      };

      if (window.speechSynthesis.getVoices().length > 0) {
        trySpeak();
      } else {
        window.speechSynthesis.onvoiceschanged = trySpeak;
      }
    },
    [],
  );

  const speak = useCallback(
    (text: string, rate: number, onEnd: () => void) => {
      speakCloud(text, rate, onEnd);
    },
    [speakCloud],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute("src");
      audioRef.current = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, []);

  return { speak, cancel };
}

// ── Narration bar ─────────────────────────────────────────────────────────────

function NarrationBar({
  text,
  isMuted,
  isSpeaking,
}: {
  text: string;
  isMuted: boolean;
  isSpeaking: boolean;
}) {
  return (
    <div className="wb-overlay-narration flex items-center gap-3 px-4 py-2.5 rounded-xl">
      {/* Sound wave indicator */}
      <div className="flex items-center gap-[3px] flex-shrink-0 h-5 w-5">
        {isMuted ? (
          <VolumeX size={16} className="text-gray-400" />
        ) : isSpeaking ? (
          [0.5, 1, 0.7, 0.4].map((h, i) => (
            <motion.div
              key={i}
              className="w-[3px] rounded-full"
              animate={{ scaleY: [h, 1, h * 0.6, 1, h] }}
              transition={{
                duration: 0.65 + i * 0.04,
                repeat: Infinity,
                delay: i * 0.1,
                ease: "easeInOut",
              }}
              style={{ height: 14, transformOrigin: "center", background: "#1d4ed8" }}
            />
          ))
        ) : (
          <Volume2 size={16} className="text-gray-400" />
        )}
      </div>

      <AnimatePresence mode="wait">
        <motion.p
          key={text}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
          className="font-[family-name:var(--font-caveat)] text-base text-gray-700 leading-relaxed flex-1"
        >
          {text}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

// ── Hand Pointer ──────────────────────────────────────────────────────────────

function HandPointer({
  x,
  y,
  visible,
}: {
  x: number;
  y: number;
  visible: boolean;
}) {
  return (
    <motion.div
      className="pointer-events-none fixed z-[60]"
      initial={false}
      animate={{
        x: x - POINTER_SIZE / 2,
        y: y - POINTER_SIZE * 0.15,
        opacity: visible ? 1 : 0,
        scale: visible ? 1 : 0.7,
      }}
      transition={{ type: "spring", stiffness: 220, damping: 22, mass: 0.8 }}
      style={{ width: POINTER_SIZE, height: POINTER_SIZE }}
    >
      <svg
        width={POINTER_SIZE}
        height={POINTER_SIZE}
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Shadow */}
        <ellipse cx="18" cy="33" rx="8" ry="2" fill="rgba(0,0,0,0.12)" />
        {/* Hand body */}
        <path
          d="M12 16V8a2 2 0 0 1 4 0v6l1-1a2 2 0 0 1 3 0l1 1a2 2 0 0 1 3-1l1 2a2 2 0 0 1 3 0v4c0 5-3 9-8 9h-2c-4 0-7-3-7-7v-3a2 2 0 0 1 1-2z"
          fill="#FFD5A0"
          stroke="#D4915A"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        {/* Index finger highlight */}
        <path
          d="M14 8v8"
          stroke="#EDBA7A"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.5"
        />
      </svg>
    </motion.div>
  );
}

// ── Equation Steps Overlay (sub-stepping) ─────────────────────────────────────

function EquationStepsOverlay({
  block,
  blockIndex,
  revealedCount,
  activeSubIndex,
  setBlockRef,
}: {
  block: EquationStepBlock;
  blockIndex: number;
  revealedCount: number;
  activeSubIndex?: number;
  setBlockRef: (key: string) => (el: HTMLDivElement | null) => void;
}) {
  const { steps } = block;

  return (
    <div className="wb-equations flex flex-col gap-1 w-full">
      {steps.map((step, i) => {
        if (i >= revealedCount) return null;
        const isFinal = i === steps.length - 1;
        const isFirst = i === 0;
        const isActive = activeSubIndex === i;
        const hasArrows = !!(step.arrows && step.arrows.length > 0);
        const hasBeforeEq = !!step.latexBefore;

        return (
          <div
            key={i}
            ref={setBlockRef(`block-${blockIndex}-step-${i}`)}
            className="flex flex-col"
          >
            {/* Teacher annotation */}
            {!isFirst && step.operationLabel && (
              <motion.div
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: isActive ? 1 : 0.5, x: 0 }}
                transition={{ duration: 0.3 }}
                className="wb-annotation font-[family-name:var(--font-caveat)] text-lg sm:text-xl ml-1 mb-1"
              >
                <InlineMath text={step.operationLabel} />
              </motion.div>
            )}

            {/* Step pair: before + arrow overlay + after */}
            {!isFirst && hasArrows && hasBeforeEq ? (
              <OverlayStepPairCard
                step={step}
                isActive={isActive}
                isFinal={isFinal}
              />
            ) : (
              <>
                {/* Balance notation */}
                {isActive && step.balanceNotation && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.25 }}
                    className="wb-balance font-[family-name:var(--font-caveat)] text-lg ml-6 mb-1"
                  >
                    <MathRenderer latex={step.balanceNotation} />
                  </motion.div>
                )}

                {/* Single equation line */}
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{
                    opacity: isActive ? 1 : 0.5,
                    x: 0,
                  }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className={`wb-equation-line flex items-center gap-3 py-1.5 px-2 rounded-lg ${
                    isFinal ? "wb-final-answer" : ""
                  }`}
                >
                  <span className="wb-step-num font-[family-name:var(--font-caveat)] text-base flex-shrink-0">
                    {step.stepNumber})
                  </span>
                  <div
                    className={`wb-equation ${isFinal ? "wb-equation-final" : ""}`}
                  >
                    {(isFirst
                      ? step.latexBefore || step.latexAfter
                      : step.latexAfter) ? (
                      <MathRenderer
                        latex={
                          isFirst
                            ? step.latexBefore || step.latexAfter
                            : step.latexAfter
                        }
                        display
                      />
                    ) : (
                      <span className="font-[family-name:var(--font-caveat)] text-lg">
                        <InlineMath text={step.explanation} />
                      </span>
                    )}
                  </div>
                  {isFinal && isActive && (
                    <motion.span
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{
                        delay: 0.3,
                        type: "spring",
                        stiffness: 300,
                      }}
                      className="wb-checkmark font-[family-name:var(--font-caveat)] text-lg flex-shrink-0"
                    >
                      ✓
                    </motion.span>
                  )}
                </motion.div>
              </>
            )}

            {/* Explanation */}
            {isActive && step.explanation && !isFirst && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.3 }}
                className="wb-explanation font-[family-name:var(--font-caveat)] text-base sm:text-lg ml-6 mb-3 text-gray-600"
              >
                ↳ <InlineMath text={step.explanation} />
              </motion.div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Overlay step pair card (with ref for TermTransferArrow) ─── */
function OverlayStepPairCard({
  step,
  isActive,
  isFinal,
}: {
  step: import("@/types/whiteboard").EquationStep;
  isActive: boolean;
  isFinal: boolean;
}) {
  const pairRef = useRef<HTMLDivElement>(null);

  return (
    <motion.div
      ref={pairRef}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: isActive ? 1 : 0.55, y: 0 }}
      transition={{ duration: 0.35 }}
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

      <div className="wb-step-divider" />

      {/* Balance notation */}
      {step.balanceNotation && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
          className="wb-balance font-[family-name:var(--font-caveat)] text-lg ml-6 my-1"
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
        {isFinal && isActive && (
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
            className="wb-checkmark font-[family-name:var(--font-caveat)] text-lg flex-shrink-0"
          >
            ✓
          </motion.span>
        )}
      </div>

      {/* Arrow overlays */}
      {isActive &&
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
            color={arrow.color || MARKER.red}
          />
        ))}
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function WhiteboardTutor({ data, onClose }: Props) {
  // Build narration plan
  const plan = useMemo(() => buildNarrationPlan(data), [data]);
  const totalCues = plan.length;

  // Playback state
  const [activeCue, setActiveCue] = useState(0);
  const [revealedCue, setRevealedCue] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [speed, setSpeed] = useState<1 | 1.5 | 2>(1);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Pointer position
  const [pointerPos, setPointerPos] = useState({ x: 0, y: 0 });
  const [pointerVisible, setPointerVisible] = useState(false);

  // Refs
  const { speak, cancel } = useSpeech();
  const boardRef = useRef<HTMLDivElement>(null);
  const blockRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const writeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stale-closure refs
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const isMutedRef = useRef(isMuted);
  isMutedRef.current = isMuted;
  const speedRef = useRef(speed);
  speedRef.current = speed;
  const activeCueRef = useRef(activeCue);
  activeCueRef.current = activeCue;

  const clearTimers = useCallback(() => {
    if (writeTimer.current) clearTimeout(writeTimer.current);
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
  }, []);

  // ── Derive which blocks / sub-steps are visible ─────────────────────────

  const revealedBlocks = useMemo(() => {
    const set = new Set<number>();
    for (let i = 0; i <= revealedCue && i < totalCues; i++) {
      const cue = plan[i];
      if (cue.blockIndex >= 0) set.add(cue.blockIndex);
    }
    return set;
  }, [revealedCue, plan, totalCues]);

  const equationRevealMap = useMemo(() => {
    const map = new Map<number, number>();
    for (let i = 0; i <= revealedCue && i < totalCues; i++) {
      const cue = plan[i];
      if (cue.kind === "equation_step" && cue.subIndex !== undefined) {
        map.set(cue.blockIndex, (map.get(cue.blockIndex) ?? 0) + 1);
      }
    }
    return map;
  }, [revealedCue, plan, totalCues]);

  const activeEquationStep = useMemo(() => {
    const cue = plan[activeCue];
    if (cue?.kind === "equation_step")
      return { blockIndex: cue.blockIndex, subIndex: cue.subIndex ?? 0 };
    return null;
  }, [activeCue, plan]);

  // ── Pointer tracking ───────────────────────────────────────────────────

  const updatePointer = useCallback(() => {
    const cue = plan[activeCueRef.current];
    if (!cue || cue.blockIndex < 0) {
      setPointerVisible(false);
      return;
    }

    const refKey =
      cue.subIndex !== undefined
        ? `block-${cue.blockIndex}-step-${cue.subIndex}`
        : `block-${cue.blockIndex}`;

    const el =
      blockRefs.current.get(refKey) ||
      blockRefs.current.get(`block-${cue.blockIndex}`);

    if (!el) {
      setPointerVisible(false);
      return;
    }

    const rect = el.getBoundingClientRect();
    setPointerPos({ x: rect.left + 16, y: rect.top + rect.height / 2 });
    setPointerVisible(true);
  }, [plan]);

  useEffect(() => {
    const t = setTimeout(updatePointer, 150);
    return () => clearTimeout(t);
  }, [activeCue, updatePointer]);

  // ── Scroll board to active block ───────────────────────────────────────

  useEffect(() => {
    const cue = plan[activeCue];
    if (!cue || cue.blockIndex < 0) return;

    const refKey =
      cue.subIndex !== undefined
        ? `block-${cue.blockIndex}-step-${cue.subIndex}`
        : `block-${cue.blockIndex}`;

    const el =
      blockRefs.current.get(refKey) ||
      blockRefs.current.get(`block-${cue.blockIndex}`);

    if (el && boardRef.current) {
      const boardRect = boardRef.current.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const offset = elRect.top - boardRect.top - boardRect.height / 3;
      if (offset > 0 || offset < -boardRect.height / 2) {
        boardRef.current.scrollBy({ top: offset, behavior: "smooth" });
      }
    }
  }, [activeCue, plan]);

  // ── Advance to next cue ────────────────────────────────────────────────

  const advance = useCallback(() => {
    const next = activeCueRef.current + 1;
    if (next >= totalCues) {
      setIsPlaying(false);
      return;
    }
    setRevealedCue((r) => Math.max(r, next));
    setActiveCue(next);
  }, [totalCues]);

  // ── Narrate current cue then schedule advance ─────────────────────────

  const startNarration = useCallback(
    (idx: number) => {
      if (!isPlayingRef.current) return;
      const cue = plan[idx];
      if (!cue) return;
      const text = cue.text;

      const onEnd = () => {
        setIsSpeaking(false);
        if (!isPlayingRef.current) return;
        advanceTimer.current = setTimeout(advance, 500 / speedRef.current);
      };

      if (isMutedRef.current) {
        const pause = Math.max(1200, text.length * 55) / speedRef.current;
        advanceTimer.current = setTimeout(advance, pause);
      } else {
        setIsSpeaking(true);
        speak(text, speedRef.current, onEnd);
      }
    },
    [plan, speak, advance],
  );

  // ── Trigger narration after write animation ────────────────────────────

  useEffect(() => {
    clearTimers();
    cancel();
    setIsSpeaking(false);

    if (!isPlaying) return;

    writeTimer.current = setTimeout(() => {
      startNarration(activeCue);
    }, WRITE_MS + 150);

    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCue, isPlaying]);

  // ── Cleanup on unmount ─────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      cancel();
      clearTimers();
    };
  }, [cancel, clearTimers]);

  // ── Playback controls ──────────────────────────────────────────────────

  const handlePlay = () => setIsPlaying(true);

  const handlePause = () => {
    setIsPlaying(false);
    cancel();
    clearTimers();
    setIsSpeaking(false);
  };

  const handlePrev = () => {
    cancel();
    clearTimers();
    setIsSpeaking(false);
    setIsPlaying(false);
    setActiveCue((i) => Math.max(0, i - 1));
  };

  const handleNext = () => {
    cancel();
    clearTimers();
    setIsSpeaking(false);
    setIsPlaying(false);
    const next = Math.min(totalCues - 1, activeCue + 1);
    setRevealedCue((r) => Math.max(r, next));
    setActiveCue(next);
  };

  const handleReplay = () => {
    cancel();
    clearTimers();
    setIsSpeaking(false);
    setActiveCue(0);
    setRevealedCue(0);
    setIsPlaying(true);
  };

  const toggleMute = () => setIsMuted((m) => !m);
  const cycleSpeed = () =>
    setSpeed((s) => (s === 1 ? 1.5 : s === 1.5 ? 2 : 1) as 1 | 1.5 | 2);

  const isLast = activeCue === totalCues - 1;
  const currentCue = plan[activeCue];
  const narrationText = currentCue?.text || "";

  const showConclusion = plan
    .slice(0, revealedCue + 1)
    .some((c) => c.kind === "conclusion");
  const showHint = plan
    .slice(0, revealedCue + 1)
    .some((c) => c.kind === "hint");

  const setBlockRef = useCallback(
    (key: string) => (el: HTMLDivElement | null) => {
      if (el) blockRefs.current.set(key, el);
      else blockRefs.current.delete(key);
    },
    [],
  );

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-50 flex flex-col wb-overlay"
    >
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="wb-overlay-header flex items-center justify-between px-4 py-3 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 bg-blue-600">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <rect
                x="1"
                y="1"
                width="13"
                height="9"
                rx="1.5"
                stroke="white"
                strokeWidth="1.4"
              />
              <line
                x1="3.5"
                y1="13"
                x2="5.5"
                y2="10"
                stroke="white"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
              <line
                x1="11.5"
                y1="13"
                x2="9.5"
                y2="10"
                stroke="white"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
              <line
                x1="4"
                y1="13"
                x2="11"
                y2="13"
                stroke="white"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div>
            <div className="text-sm font-bold text-gray-800 leading-tight">
              Whiteboard Tutor
            </div>
            {(data.subject || data.topic) && (
              <div className="text-[10px] text-gray-400">
                {[data.subject, data.topic].filter(Boolean).join(" · ")}
              </div>
            )}
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
        >
          <X size={15} />
        </button>
      </div>

      {/* ── Board ───────────────────────────────────────────── */}
      <div ref={boardRef} className="flex-1 overflow-y-auto">
        <div className="wb-board wb-overlay-board rounded-none min-h-full px-6 py-6 sm:px-10 sm:py-8 relative">
          {/* Ruled lines */}
          <div className="wb-rules pointer-events-none absolute inset-0" />

          {/* Intro */}
          {data.intro && (
            <motion.p
              initial={{ opacity: 0, x: -8 }}
              animate={{
                opacity: currentCue?.kind === "intro" ? 1 : 0.5,
                x: 0,
              }}
              transition={{ duration: 0.4 }}
              className="wb-intro font-[family-name:var(--font-caveat)] text-2xl sm:text-3xl leading-snug mb-6 text-gray-700"
            >
              <InlineMath text={data.intro} />
            </motion.p>
          )}

          {/* Uploaded question image — inline reference diagram */}
          {data.questionImageUrl && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="mb-6 rounded-xl overflow-hidden border border-gray-200 bg-white inline-block max-w-xs sm:max-w-sm"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={data.questionImageUrl}
                alt="Uploaded question diagram"
                className="w-full h-auto"
              />
              <p className="text-[11px] text-gray-400 px-3 py-1.5 text-center">
                📎 Uploaded question
              </p>
            </motion.div>
          )}

          {/* Topic label */}
          {data.topic && (
            <div className="wb-topic font-[family-name:var(--font-caveat)] text-lg mb-5 pb-1 text-gray-400">
              {data.subject && <span>{data.subject}</span>}
              {data.topic && <span> — {data.topic}</span>}
            </div>
          )}

          {/* Blocks — rendered progressively */}
          <div className="flex flex-col gap-3">
            {data.blocks.map((block, bi) => {
              const isRevealed = revealedBlocks.has(bi);
              if (!isRevealed) return null;

              const isActiveBlock = currentCue?.blockIndex === bi;

              return (
                <motion.div
                  key={`block-${bi}`}
                  ref={setBlockRef(`block-${bi}`)}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{
                    opacity: isActiveBlock ? 1 : 0.55,
                    y: 0,
                  }}
                  transition={{ duration: 0.4 }}
                  className={`wb-overlay-block relative ${
                    isActiveBlock ? "wb-overlay-block-active" : ""
                  }`}
                >
                  {/* Active block indicator */}
                  {isActiveBlock && (
                    <motion.div
                      layoutId="activeBlockIndicator"
                      className="absolute -left-4 top-0 bottom-0 w-1 rounded-full bg-blue-500"
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 30,
                      }}
                    />
                  )}

                  {block.type === "equation_steps" ? (
                    <EquationStepsOverlay
                      block={block}
                      blockIndex={bi}
                      revealedCount={equationRevealMap.get(bi) ?? 0}
                      activeSubIndex={
                        activeEquationStep?.blockIndex === bi
                          ? activeEquationStep.subIndex
                          : undefined
                      }
                      setBlockRef={setBlockRef}
                    />
                  ) : (
                    <BlockRenderer block={block} index={bi} baseDelay={0} />
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Conclusion */}
          <AnimatePresence>
            {showConclusion && data.conclusion && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="wb-conclusion mt-5 pt-3 flex items-start gap-2.5"
              >
                <CheckCircle2
                  size={18}
                  className="text-green-600 flex-shrink-0 mt-0.5"
                />
                <span className="font-[family-name:var(--font-caveat)] text-xl sm:text-2xl text-green-700">
                  <InlineMath text={data.conclusion} />
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* CAS Verified badge */}
          {data.casVerified && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200"
            >
              <ShieldCheck size={13} className="text-emerald-600" />
              Verified by CAS
            </motion.div>
          )}

          {/* Hint */}
          <AnimatePresence>
            {showHint && data.hint && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="wb-hint mt-4 font-[family-name:var(--font-caveat)] text-lg text-amber-700"
              >
                💡 <InlineMath text={data.hint} />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="h-6" />
        </div>
      </div>

      {/* ── Hand pointer ────────────────────────────────────── */}
      <HandPointer
        x={pointerPos.x}
        y={pointerPos.y}
        visible={pointerVisible}
      />

      {/* ── Controls ────────────────────────────────────────── */}
      <div className="wb-overlay-controls flex-shrink-0 px-4 pb-4 pt-3 space-y-3">
        {/* Narration */}
        <NarrationBar
          text={narrationText}
          isMuted={isMuted}
          isSpeaking={isSpeaking}
        />

        {/* Progress bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-gray-200 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-blue-500"
              animate={{
                width: `${((activeCue + 1) / totalCues) * 100}%`,
              }}
              transition={{ duration: 0.35 }}
            />
          </div>
          <span className="text-[11px] text-gray-400 tabular-nums w-10 text-right">
            {activeCue + 1} / {totalCues}
          </span>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between">
          {/* Left: mute + speed */}
          <div className="flex items-center gap-1">
            <button
              onClick={toggleMute}
              className="w-9 h-9 flex items-center justify-center rounded-xl transition-all hover:bg-gray-100"
              style={{ color: isMuted ? "#9ca3af" : "#1d4ed8" }}
            >
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <button
              onClick={cycleSpeed}
              className="h-9 px-2 rounded-xl text-xs font-bold tabular-nums hover:bg-gray-100 transition-all"
              style={{
                color: speed === 1 ? "#9ca3af" : "#1d4ed8",
                minWidth: 36,
              }}
            >
              {speed}×
            </button>
          </div>

          {/* Centre: playback */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              disabled={activeCue === 0}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <SkipBack size={16} />
            </button>

            <button
              onClick={isPlaying ? handlePause : handlePlay}
              className="w-12 h-12 flex items-center justify-center rounded-full transition-all hover:scale-105 active:scale-95 bg-blue-600 shadow-lg shadow-blue-200"
            >
              {isPlaying ? (
                <Pause size={18} className="text-white" />
              ) : (
                <Play size={18} className="text-white ml-0.5" />
              )}
            </button>

            <button
              onClick={handleNext}
              disabled={isLast}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <SkipForward size={16} />
            </button>
          </div>

          {/* Right: replay */}
          <button
            onClick={handleReplay}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-blue-600 hover:bg-gray-100 transition-all"
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
