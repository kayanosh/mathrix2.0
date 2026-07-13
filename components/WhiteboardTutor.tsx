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
import WhiteboardCanvas from "@/components/whiteboard/tutor/WhiteboardCanvas";
import StepTimeline from "@/components/whiteboard/tutor/StepTimeline";
import TeacherPointer from "@/components/whiteboard/tutor/TeacherPointer";
import ProgressRail from "@/components/whiteboard/tutor/ProgressRail";
import SpeechHighlighter, {
  wordIndexAtProgress,
  countWords,
} from "@/components/whiteboard/tutor/SpeechHighlighter";

interface Props {
  data: WhiteboardResponse;
  onClose: () => void;
}

const WRITE_MS = 900;
/** Pause after a step finishes speaking so the pupil can absorb it. */
const STEP_PAUSE_MS = 1100;
const audioBlobCache = new Map<string, Blob>();

// ── Speech (cloud TTS + word-progress estimates) ─────────────────────────────

function useSpeech() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const getAudio = useCallback((): HTMLAudioElement => {
    if (!audioRef.current) audioRef.current = new Audio();
    return audioRef.current;
  }, []);

  const clearProgress = useCallback(() => {
    if (progressTimer.current) {
      clearInterval(progressTimer.current);
      progressTimer.current = null;
    }
  }, []);

  const startWordProgress = useCallback(
    (
      text: string,
      durationMs: number,
      onWord: (idx: number) => void,
    ) => {
      clearProgress();
      const start = performance.now();
      progressTimer.current = setInterval(() => {
        const elapsed = performance.now() - start;
        onWord(wordIndexAtProgress(text, elapsed, durationMs));
        if (elapsed >= durationMs) clearProgress();
      }, 80);
    },
    [clearProgress],
  );

  const speakBrowser = useCallback(
    (
      text: string,
      rate: number,
      onEnd: () => void,
      onWord: (idx: number) => void,
    ) => {
      if (typeof window === "undefined" || !window.speechSynthesis) {
        const dur = Math.max(1200, countWords(text) * 280);
        startWordProgress(text, dur / rate, onWord);
        setTimeout(onEnd, dur / rate);
        return;
      }
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(text);
      utt.rate = rate * 0.88;
      utt.pitch = 0.85;
      utt.volume = 1;

      const estMs = Math.max(1400, countWords(text) * 320) / rate;
      startWordProgress(text, estMs, onWord);

      utt.onend = () => {
        clearProgress();
        onEnd();
      };
      utt.onerror = () => {
        clearProgress();
        onEnd();
      };

      // Prefer boundary events when the browser provides them
      utt.onboundary = (ev) => {
        if (ev.name === "word" && typeof ev.charIndex === "number") {
          const before = text.slice(0, ev.charIndex);
          onWord(countWords(before) - (before.endsWith(" ") || before.length === 0 ? 0 : 1));
        }
      };

      const trySpeak = () => {
        const voices = window.speechSynthesis.getVoices();
        const voice =
          voices.find((v) => v.name === "Daniel (Premium)") ||
          voices.find((v) => v.name.includes("Google UK English Male")) ||
          voices.find((v) => v.lang === "en-GB") ||
          voices.find((v) => v.lang.startsWith("en"));
        if (voice) utt.voice = voice;
        window.speechSynthesis.speak(utt);
      };

      if (window.speechSynthesis.getVoices().length > 0) trySpeak();
      else window.speechSynthesis.onvoiceschanged = trySpeak;
    },
    [clearProgress, startWordProgress],
  );

  const speakCloud = useCallback(
    async (
      text: string,
      rate: number,
      onEnd: () => void,
      onWord: (idx: number) => void,
    ) => {
      try {
        abortRef.current?.abort();
        abortRef.current = new AbortController();

        const cacheKey = `${rate}|${text}`;
        let blob = audioBlobCache.get(cacheKey);
        if (!blob) {
          const res = await fetch("/api/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, speed: rate * 1.1 }),
            signal: abortRef.current.signal,
          });
          if (!res.ok) throw new Error("TTS API error");
          blob = await res.blob();
          if (audioBlobCache.size >= 100) {
            const oldest = audioBlobCache.keys().next().value;
            if (oldest) audioBlobCache.delete(oldest);
          }
          audioBlobCache.set(cacheKey, blob);
        }
        if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;

        const audio = getAudio();
        audio.onended = null;
        audio.onerror = null;
        audio.src = url;

        await new Promise<void>((resolve, reject) => {
          audio.onloadedmetadata = () => resolve();
          audio.onerror = () => reject(new Error("audio load"));
          // Some browsers fire loadedmetadata sync after src set
          if (audio.readyState >= 1) resolve();
        });

        const durationMs =
          Number.isFinite(audio.duration) && audio.duration > 0
            ? audio.duration * 1000
            : Math.max(1400, countWords(text) * 300) / rate;

        startWordProgress(text, durationMs, onWord);

        audio.onended = () => {
          clearProgress();
          onEnd();
        };
        audio.onerror = () => {
          clearProgress();
          onEnd();
        };
        await audio.play();
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        speakBrowser(text, rate, onEnd, onWord);
      }
    },
    [getAudio, speakBrowser, startWordProgress, clearProgress],
  );

  const speak = useCallback(
    (
      text: string,
      rate: number,
      onEnd: () => void,
      onWord: (idx: number) => void,
    ) => {
      speakCloud(text, rate, onEnd, onWord);
    },
    [speakCloud],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    clearProgress();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, [clearProgress]);

  return { speak, cancel };
}

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
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeWord, setActiveWord] = useState(-1);
  const [justCompleted, setJustCompleted] = useState<number | null>(null);
  const [pointerPos, setPointerPos] = useState({ x: 0, y: 0 });
  const [pointerVisible, setPointerVisible] = useState(false);
  const [pointerMode, setPointerMode] = useState<"point" | "write">("point");
  const [focusEl, setFocusEl] = useState<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const { speak, cancel } = useSpeech();
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const writeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const celebrateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const setActiveStepRef = useCallback((el: HTMLDivElement | null) => {
    setFocusEl(el);
  }, []);

  // Pointer follows active card
  useEffect(() => {
    if (!focusEl) {
      setPointerVisible(false);
      return;
    }
    const place = () => {
      const rect = focusEl.getBoundingClientRect();
      setPointerPos({ x: rect.left + 28, y: rect.top + Math.min(rect.height * 0.35, 120) });
      setPointerVisible(true);
    };
    place();
    setPointerMode("write");
    const writeMs = writeMsPlan[activeCue] ?? WRITE_MS;
    const sweep = setTimeout(() => {
      const rect = focusEl.getBoundingClientRect();
      setPointerPos({
        x: rect.left + Math.min(Math.max(rect.width - 40, 80), 320),
        y: rect.top + Math.min(rect.height * 0.55, 200),
      });
      setPointerMode("point");
    }, Math.max(280, writeMs * 0.5));
    return () => clearTimeout(sweep);
  }, [focusEl, activeCue, writeMsPlan]);

  const advance = useCallback(() => {
    const prev = activeCueRef.current;
    setJustCompleted(prev);
    if (celebrateTimer.current) clearTimeout(celebrateTimer.current);
    celebrateTimer.current = setTimeout(() => setJustCompleted(null), 900);

    const next = prev + 1;
    if (next >= totalCues) {
      setIsPlaying(false);
      return;
    }
    setActiveCue(next);
  }, [totalCues]);

  const startNarration = useCallback(
    (idx: number) => {
      if (!isPlayingRef.current) return;
      const cue = plan[idx];
      if (!cue) return;
      const text = cue.text;

      const onEnd = () => {
        setIsSpeaking(false);
        setActiveWord(-1);
        if (!isPlayingRef.current) return;
        advanceTimer.current = setTimeout(
          advance,
          STEP_PAUSE_MS / speedRef.current,
        );
      };

      if (isMutedRef.current) {
        const pause =
          Math.max(STEP_PAUSE_MS, Math.max(1200, text.length * 55)) /
          speedRef.current;
        const start = performance.now();
        const tick = () => {
          if (!isPlayingRef.current) return;
          const elapsed = performance.now() - start;
          setActiveWord(wordIndexAtProgress(text, elapsed, pause * 0.85));
          if (elapsed < pause * 0.85) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        advanceTimer.current = setTimeout(advance, pause);
      } else {
        setIsSpeaking(true);
        speak(text, speedRef.current, onEnd, setActiveWord);
      }
    },
    [plan, speak, advance],
  );

  useEffect(() => {
    clearTimers();
    cancel();
    setIsSpeaking(false);
    setActiveWord(-1);
    if (!isPlaying) return;

    const writeMs = (writeMsPlan[activeCue] ?? WRITE_MS) / speedRef.current;
    writeTimer.current = setTimeout(() => {
      startNarration(activeCue);
    }, writeMs + 180);

    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCue, isPlaying]);

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

  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => {
    setIsPlaying(false);
    cancel();
    clearTimers();
    setIsSpeaking(false);
    setActiveWord(-1);
  };
  const handlePrev = () => {
    cancel();
    clearTimers();
    setIsSpeaking(false);
    setActiveWord(-1);
    setIsPlaying(false);
    setActiveCue((i) => Math.max(0, i - 1));
  };
  const handleNext = () => {
    cancel();
    clearTimers();
    setIsSpeaking(false);
    setActiveWord(-1);
    setIsPlaying(false);
    setActiveCue((i) => Math.min(totalCues - 1, i + 1));
  };
  const handleReplay = () => {
    cancel();
    clearTimers();
    setIsSpeaking(false);
    setActiveWord(-1);
    setActiveCue(0);
    setJustCompleted(null);
    setRunId((n) => n + 1);
    setIsPlaying(true);
  };
  const handleSelectStep = (index: number) => {
    cancel();
    clearTimers();
    setIsSpeaking(false);
    setActiveWord(-1);
    setIsPlaying(false);
    setActiveCue(index);
  };

  const toggleMute = () => setIsMuted((m) => !m);
  const cycleSpeed = () =>
    setSpeed((s) => (s === 1 ? 1.5 : s === 1.5 ? 2 : 1) as 1 | 1.5 | 2);

  const isLast = activeCue === totalCues - 1;
  const currentStep = steps[activeCue];
  const narrationText = currentStep?.narration || "";
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
      <WhiteboardCanvas focusEl={focusEl}>
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
              {badge.label}
            </div>
          </div>
        )}

        <div className="h-8" />
      </WhiteboardCanvas>

      <TeacherPointer
        x={pointerPos.x}
        y={pointerPos.y}
        visible={pointerVisible && isPlaying}
        mode={pointerMode}
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
          <SpeechHighlighter
            text={narrationText}
            activeWordIndex={activeWord}
            isSpeaking={isSpeaking || (isMuted && isPlaying)}
            className="flex-1"
          />
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
