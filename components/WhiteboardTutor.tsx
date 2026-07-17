"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import {
  X,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import type { WhiteboardResponse } from "@/types/whiteboard";
import { buildNarrationPlan } from "@/lib/narration";
import { buildColumnRevealTimeline } from "@/lib/column-reveal";
import {
  estimateColumnStepWriteMs,
  estimateMathWriteMs,
  estimateTextWriteMs,
} from "@/lib/handwriting";
import { getVerificationBadge } from "@/lib/verification-badge";
import { buildTutorSteps } from "@/lib/tutor-steps";
import { useWhiteboardSpeech } from "@/lib/hooks/useWhiteboardSpeech";
import {
  buildTeacherSpeechParts,
  FOCUS_SETTLE_MS,
  nextPlaybackPhase,
  playbackPhaseLabel,
  POINTER_SETTLE_MS,
  pupilPauseDurationMs,
  type PlaybackPhase,
} from "@/lib/whiteboard-playback";
import WhiteboardCanvas from "@/components/whiteboard/tutor/WhiteboardCanvas";
import StepTimeline from "@/components/whiteboard/tutor/StepTimeline";
import TeacherPointer from "@/components/whiteboard/tutor/TeacherPointer";
import ProgressRail from "@/components/whiteboard/tutor/ProgressRail";
import SpeechHighlighter, {
  wordIndexAtProgress,
  countWords,
} from "@/components/whiteboard/tutor/SpeechHighlighter";
import InlineMath from "@/components/InlineMath";
import {
  teacherPointerPoint,
  teacherSpeechProgress,
  teacherTargetIndex,
  type PointerTargetDescriptor,
} from "@/lib/teacher-pointer";

interface Props {
  data: WhiteboardResponse;
  onClose: () => void;
}

const WRITE_MS = 900;

// ── Main tutor ────────────────────────────────────────────────────────────────

export default function WhiteboardTutor({ data, onClose }: Props) {
  const plan = useMemo(() => buildNarrationPlan(data), [data]);
  const steps = useMemo(() => buildTutorSteps(data, plan), [data, plan]);
  const totalCues = plan.length;

  const writeMsPlan = useMemo(() => {
    const columnTimelines = new Map<
      number,
      ReturnType<typeof buildColumnRevealTimeline>
    >();
    data.blocks.forEach((b, bi) => {
      if (b.type === "column_method") {
        columnTimelines.set(bi, buildColumnRevealTimeline(b));
      }
    });

    return plan.map((cue) => {
      switch (cue.kind) {
        case "intro":
          return estimateTextWriteMs(data.intro || "");
        case "conclusion":
          return estimateTextWriteMs(data.conclusion || "");
        case "text": {
          const b = data.blocks[cue.blockIndex];
          return b?.type === "text" ? estimateTextWriteMs(b.content) : WRITE_MS;
        }
        case "equation_step": {
          const b = data.blocks[cue.blockIndex];
          if (b?.type !== "equation_steps") return WRITE_MS;
          const step = b.steps[cue.subIndex ?? 0];
          if (!step) return WRITE_MS;
          const latex =
            (cue.subIndex === 0
              ? step.latexBefore || step.latexAfter
              : step.latexAfter) || "";
          return latex
            ? estimateMathWriteMs(latex)
            : estimateTextWriteMs(step.explanation || "");
        }
        case "column": {
          const step = columnTimelines.get(cue.blockIndex)?.[cue.subIndex ?? 0];
          if (!step) return WRITE_MS;
          return estimateColumnStepWriteMs(
            step.cellKeys.length + step.carryKeys.length + step.noteKeys.length,
          );
        }
        case "teaching_step": {
          const b = data.blocks[cue.blockIndex];
          if (b?.type === "column_method") {
            const step = columnTimelines.get(cue.blockIndex)?.[cue.subIndex ?? 0];
            if (step) {
              return estimateColumnStepWriteMs(
                step.cellKeys.length + step.carryKeys.length + step.noteKeys.length,
              );
            }
          }
          if (b?.type === "equation_steps" && b.steps.length > 0) {
            const step = b.steps[Math.min(cue.subIndex ?? 0, b.steps.length - 1)];
            const latex = step?.latexAfter || step?.latexBefore || "";
            if (latex) return estimateMathWriteMs(latex);
          }
          const teacherStep = data.teachingSteps?.[cue.subIndex ?? 0];
          return estimateTextWriteMs(
            teacherStep?.explanation || teacherStep?.narration || "",
          );
        }
        default:
          return WRITE_MS;
      }
    });
  }, [plan, data]);

  const [activeCue, setActiveCue] = useState(0);
  const [runId, setRunId] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [speed, setSpeed] = useState<1 | 1.5 | 2>(1);
  const [phase, setPhase] = useState<PlaybackPhase>("focus");
  const [activeWord, setActiveWord] = useState(-1);
  const [justCompleted, setJustCompleted] = useState<number | null>(null);
  const [pointerPos, setPointerPos] = useState({ x: 0, y: 0 });
  const [pointerVisible, setPointerVisible] = useState(false);
  const [focusEl, setFocusEl] = useState<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const currentStep = steps[activeCue];
  const speechParts = useMemo(
    () => buildTeacherSpeechParts(currentStep),
    [currentStep],
  );
  const nextSpeechParts = useMemo(
    () => buildTeacherSpeechParts(steps[activeCue + 1]),
    [activeCue, steps],
  );
  const pointerSpeechText =
    phase === "check" ? speechParts.check || "" : speechParts.explanation;
  const pointerPlaybackRef = useRef({
    phase,
    activeWord,
    narration: pointerSpeechText,
  });
  const schedulePointerPlaceRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    pointerPlaybackRef.current = {
      phase,
      activeWord,
      narration: pointerSpeechText,
    };
  }, [activeWord, phase, pointerSpeechText]);

  const { speak, prepare, cancel } = useWhiteboardSpeech();
  const phaseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mutedFrame = useRef<number | null>(null);
  const celebrateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (phaseTimer.current) {
      clearTimeout(phaseTimer.current);
      phaseTimer.current = null;
    }
    if (mutedFrame.current != null) {
      cancelAnimationFrame(mutedFrame.current);
      mutedFrame.current = null;
    }
  }, []);

  const setActiveStepRef = useCallback((el: HTMLElement | null) => {
    setFocusEl(el);
  }, []);

  // Pointer follows semantic anchors using the same word clock as narration.
  // It stays attached while the board scrolls and traces a larger visual when
  // a renderer has no smaller labelled anchors.
  useEffect(() => {
    if (!focusEl) {
      const hideFrame = requestAnimationFrame(() => setPointerVisible(false));
      return () => cancelAnimationFrame(hideFrame);
    }

    let frame = 0;

    const visibleTargets = (selector: string): HTMLElement[] =>
      Array.from(focusEl.querySelectorAll<HTMLElement>(selector)).filter((el) => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });

    const findTargets = (): HTMLElement[] => {
      const equationTargets = visibleTargets('[id$="-from"], [id$="-to"]');
      if (equationTargets.length > 0) {
        return equationTargets;
      }

      const primary = visibleTargets('[data-teacher-target="primary"]');
      if (primary.length > 0) return primary;
      const detail = visibleTargets('[data-teacher-target="detail"]');
      if (detail.length > 0) return detail;
      const visual = focusEl.querySelector<HTMLElement>(
        '[data-teacher-target="visual"]',
      );
      return visual ? [visual] : [];
    };

    const place = () => {
      frame = 0;
      const targets = findTargets();
      const playback = pointerPlaybackRef.current;
      const descriptors: PointerTargetDescriptor[] = targets.map((target, index) => ({
        label:
          target.dataset.teacherLabel ||
          target.getAttribute("aria-label") ||
          target.textContent ||
          target.id,
        sequence: (() => {
          const parsed = Number(
            target.dataset.teacherSequence ||
              getComputedStyle(target).getPropertyValue("--teacher-sequence"),
          );
          return Number.isFinite(parsed) ? parsed : index;
        })(),
      }));
      const ordered = targets
        .map((target, index) => ({ target, descriptor: descriptors[index], index }))
        .sort(
          (a, b) =>
            a.descriptor.sequence - b.descriptor.sequence || a.index - b.index,
        );
      const targetIndex = teacherTargetIndex(
        ordered.map(({ descriptor }) => descriptor),
        playback.narration,
        playback.activeWord,
        playback.phase,
      );
      const target = ordered[targetIndex]?.target;
      if (!target) {
        setPointerVisible(false);
        return;
      }
      const rect = target.getBoundingClientRect();
      const next = teacherPointerPoint(
        rect,
        teacherSpeechProgress(
          playback.narration,
          playback.activeWord,
          playback.phase,
        ),
      );
      setPointerPos((current) =>
        Math.abs(current.x - next.x) < 0.5 && Math.abs(current.y - next.y) < 0.5
          ? current
          : next,
      );
      setPointerVisible(true);
    };

    const schedulePlace = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(place);
    };

    schedulePointerPlaceRef.current = schedulePlace;

    schedulePlace();

    document.addEventListener("scroll", schedulePlace, true);
    window.addEventListener("resize", schedulePlace);
    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(schedulePlace)
        : null;
    observer?.observe(focusEl);

    return () => {
      schedulePointerPlaceRef.current = () => undefined;
      if (frame) cancelAnimationFrame(frame);
      observer?.disconnect();
      document.removeEventListener("scroll", schedulePlace, true);
      window.removeEventListener("resize", schedulePlace);
    };
  }, [focusEl, activeCue, runId]);

  // Word updates arrive from the cloud audio duration (or browser speech word
  // boundaries), so pointer movement and voice share one playback clock.
  useEffect(() => {
    if (isPlaying) schedulePointerPlaceRef.current();
  }, [activeWord, isPlaying, phase, pointerSpeechText]);

  const advance = useCallback(() => {
    const prev = activeCue;
    setJustCompleted(prev);
    if (celebrateTimer.current) clearTimeout(celebrateTimer.current);
    celebrateTimer.current = setTimeout(() => setJustCompleted(null), 900);

    const next = prev + 1;
    if (next >= totalCues) {
      setPhase("complete");
      setIsPlaying(false);
      return;
    }
    setPhase("focus");
    setActiveCue(next);
  }, [activeCue, totalCues]);

  // Start fetching both the current and following teacher lines while the
  // pupil is looking at the board. The explanation can then begin immediately
  // after the writing phase instead of waiting on a network round trip.
  useEffect(() => {
    [
      speechParts.explanation,
      speechParts.check,
      nextSpeechParts.explanation,
      nextSpeechParts.check,
    ].forEach((text) => {
      if (text) void prepare(text, speed);
    });
  }, [nextSpeechParts, prepare, speechParts, speed]);

  useEffect(() => {
    clearTimers();
    cancel();
    if (!isPlaying) return;

    let disposed = false;
    const moveTo = (next: PlaybackPhase) => {
      if (!disposed) {
        setActiveWord(-1);
        setPhase(next);
      }
    };
    const schedule = (next: PlaybackPhase, durationMs: number) => {
      phaseTimer.current = setTimeout(() => moveTo(next), durationMs);
    };

    if (phase === "focus") {
      schedule("point", FOCUS_SETTLE_MS / speed);
    } else if (phase === "point") {
      schedule("write", POINTER_SETTLE_MS / speed);
    } else if (phase === "write") {
      schedule(
        "explain",
        (writeMsPlan[activeCue] ?? WRITE_MS) / speed,
      );
    } else if (phase === "explain" || phase === "check") {
      const text =
        phase === "check" ? speechParts.check || "" : speechParts.explanation;
      const next = nextPlaybackPhase(phase, !!speechParts.check);

      if (!text) {
        schedule(next, 0);
      } else if (isMuted) {
        const durationMs = Math.max(1300, countWords(text) * 285) / speed;
        const startedAt = performance.now();

        const tick = () => {
          if (disposed) return;
          const elapsed = performance.now() - startedAt;
          setActiveWord(wordIndexAtProgress(text, elapsed, durationMs));
          if (elapsed < durationMs) {
            mutedFrame.current = requestAnimationFrame(tick);
          }
        };
        mutedFrame.current = requestAnimationFrame(tick);
        schedule(next, durationMs);
      } else {
        speak(
          text,
          speed,
          () => {
            if (disposed) return;
            setActiveWord(-1);
            moveTo(next);
          },
          setActiveWord,
        );
      }
    } else if (phase === "pupil_pause") {
      phaseTimer.current = setTimeout(advance, pupilPauseDurationMs(speed));
    }

    return () => {
      disposed = true;
      cancel();
      clearTimers();
    };
  }, [
    activeCue,
    advance,
    cancel,
    clearTimers,
    isMuted,
    isPlaying,
    phase,
    speak,
    speechParts,
    speed,
    writeMsPlan,
  ]);

  useEffect(() => {
    return () => {
      cancel();
      clearTimers();
      if (celebrateTimer.current) clearTimeout(celebrateTimer.current);
    };
  }, [cancel, clearTimers]);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [onClose]);

  const handlePlay = () => {
    if (phase === "complete") {
      setPhase("focus");
      setRunId((value) => value + 1);
    }
    setIsPlaying(true);
  };
  const handlePause = () => {
    setIsPlaying(false);
    cancel();
    clearTimers();
    setActiveWord(-1);
  };
  const handlePrev = () => {
    cancel();
    clearTimers();
    setActiveWord(-1);
    setIsPlaying(false);
    setPhase("focus");
    setActiveCue((i) => Math.max(0, i - 1));
  };
  const handleNext = () => {
    cancel();
    clearTimers();
    setActiveWord(-1);
    setIsPlaying(false);
    setPhase("focus");
    setActiveCue((i) => Math.min(totalCues - 1, i + 1));
  };
  const handleReplay = () => {
    cancel();
    clearTimers();
    setActiveWord(-1);
    setActiveCue(0);
    setPhase("focus");
    setJustCompleted(null);
    setRunId((n) => n + 1);
    setIsPlaying(true);
  };
  const handleSelectStep = (index: number) => {
    cancel();
    clearTimers();
    setActiveWord(-1);
    setIsPlaying(false);
    setPhase("focus");
    setRunId((value) => value + 1);
    setActiveCue(index);
  };

  const toggleMute = () => setIsMuted((m) => !m);
  const cycleSpeed = () =>
    setSpeed((s) => (s === 1 ? 1.5 : s === 1.5 ? 2 : 1) as 1 | 1.5 | 2);

  const isLast = activeCue === totalCues - 1;
  const isSpeaking =
    isPlaying && (phase === "explain" || phase === "check");
  const narrationText =
    phase === "check"
      ? speechParts.check || speechParts.explanation
      : phase === "pupil_pause"
        ? speechParts.check
          ? "Pause and answer the quick check before we move on."
          : "Pause and say this step back in your own words."
        : speechParts.explanation;
  const pointerMode =
    phase === "write"
      ? "write"
      : phase === "check" || phase === "pupil_pause"
        ? "check"
        : "point";
  const badge = getVerificationBadge(data);
  const showBadge =
    currentStep?.kind === "conclusion" || activeCue === totalCues - 1;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-50 flex flex-col bg-[#f4f6fa]"
      role="dialog"
      aria-modal="true"
      aria-label="Whiteboard Tutor"
      data-playback-phase={phase}
    >
      {/* Header */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-200/80 bg-white/80 backdrop-blur-md flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-blue-600 to-indigo-600 shadow-md shadow-blue-200">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
              <rect x="1" y="1" width="13" height="9" rx="1.5" stroke="white" strokeWidth="1.4" />
              <line x1="3.5" y1="13" x2="5.5" y2="10" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
              <line x1="11.5" y1="13" x2="9.5" y2="10" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
              <line x1="4" y1="13" x2="11" y2="13" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900 leading-tight truncate">
              Whiteboard Tutor
            </div>
            {(data.subject || data.topic) && (
              <div className="text-[11px] text-slate-400 truncate">
                {[data.subject, data.topic].filter(Boolean).join(" · ")}
              </div>
            )}
          </div>
        </div>
        <button
          ref={closeButtonRef}
          onClick={onClose}
          aria-label="Close tutor"
          className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
        >
          <X size={16} />
        </button>
      </header>

      {/* Board */}
      <WhiteboardCanvas focusEl={focusEl} focusKey={`${activeCue}-${runId}`}>
        {data.questionImageUrl && activeCue === 0 && (
          <div className="mb-5 mx-auto max-w-2xl rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm max-w-xs sm:max-w-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={data.questionImageUrl}
              alt="Uploaded question"
              className="w-full h-auto"
            />
          </div>
        )}

        <StepTimeline
          steps={steps}
          activeIndex={activeCue}
          justCompletedIndex={justCompleted}
          data={data}
          runId={runId}
          playbackPhase={phase}
          setActiveStepRef={setActiveStepRef}
          onSelectStep={handleSelectStep}
        />

        {showBadge && badge && (
          <div className="mt-5 flex justify-center">
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border ${
                badge.level === "verified" || badge.level === "checked"
                  ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                  : badge.level === "caution"
                    ? "text-amber-700 bg-amber-50 border-amber-200"
                    : "text-rose-700 bg-rose-50 border-rose-200"
              }`}
            >
              {badge.level === "verified" || badge.level === "checked" ? (
                <ShieldCheck size={13} />
              ) : (
                <AlertTriangle size={13} />
              )}
              <InlineMath text={badge.label} />
            </div>
          </div>
        )}

        <div className="h-8" />
      </WhiteboardCanvas>

      <TeacherPointer
        x={pointerPos.x}
        y={pointerPos.y}
        visible={pointerVisible}
        mode={isPlaying ? pointerMode : "point"}
      />

      {/* Controls */}
      <footer className="flex-shrink-0 border-t border-slate-200/80 bg-white/95 backdrop-blur-md px-4 sm:px-6 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-3 shadow-[0_-8px_30px_-12px_rgba(15,23,42,0.08)]">
        <div className="rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 min-h-[3.25rem] flex items-center gap-3">
          <div className="flex items-center gap-[3px] flex-shrink-0 h-5 w-5" aria-hidden>
            {isMuted ? (
              <VolumeX size={16} className="text-slate-400" />
            ) : isSpeaking ? (
              [0.5, 1, 0.7, 0.4].map((h, i) => (
                <motion.div
                  key={i}
                  className="w-[3px] rounded-full bg-blue-600"
                  animate={{ scaleY: [h, 1, h * 0.6, 1, h] }}
                  transition={{
                    duration: 0.65 + i * 0.04,
                    repeat: Infinity,
                    delay: i * 0.1,
                    ease: "easeInOut",
                  }}
                  style={{ height: 14, transformOrigin: "center" }}
                />
              ))
            ) : (
              <Volume2 size={16} className="text-slate-400" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p
              className={`mb-0.5 text-[10px] font-bold uppercase tracking-[0.14em] ${
                phase === "check" || phase === "pupil_pause"
                  ? "text-emerald-600"
                  : "text-blue-600"
              }`}
              aria-live="polite"
            >
              {isPlaying ? playbackPhaseLabel(phase) : "Paused"}
            </p>
            <SpeechHighlighter
              text={narrationText}
              activeWordIndex={activeWord}
              isSpeaking={isSpeaking}
            />
          </div>
        </div>

        <ProgressRail total={totalCues} current={activeCue} />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              onClick={toggleMute}
              aria-label={isMuted ? "Unmute" : "Mute"}
              className="w-10 h-10 flex items-center justify-center rounded-xl transition-all hover:bg-slate-100"
              style={{ color: isMuted ? "#94a3b8" : "#2563eb" }}
            >
              {isMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
            </button>
            <button
              onClick={cycleSpeed}
              aria-label={`Playback speed ${speed}x`}
              className="h-10 px-2.5 rounded-xl text-xs font-bold tabular-nums hover:bg-slate-100 transition-all"
              style={{ color: speed === 1 ? "#94a3b8" : "#2563eb", minWidth: 40 }}
            >
              {speed}×
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              disabled={activeCue === 0}
              aria-label="Previous step"
              className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all disabled:opacity-30"
            >
              <SkipBack size={17} />
            </button>
            <button
              onClick={isPlaying ? handlePause : handlePlay}
              aria-label={isPlaying ? "Pause" : "Play"}
              className="w-14 h-14 flex items-center justify-center rounded-full bg-blue-600 shadow-lg shadow-blue-200/80 hover:scale-[1.04] active:scale-95 transition-transform"
            >
              {isPlaying ? (
                <Pause size={20} className="text-white" />
              ) : (
                <Play size={20} className="text-white ml-0.5" />
              )}
            </button>
            <button
              onClick={handleNext}
              disabled={isLast}
              aria-label="Next step"
              className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all disabled:opacity-30"
            >
              <SkipForward size={17} />
            </button>
          </div>

          <button
            onClick={handleReplay}
            aria-label="Replay lesson"
            className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-all"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </footer>
    </motion.div>
  );
}
