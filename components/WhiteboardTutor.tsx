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
  ArrowRight,
  MessageCircleQuestion,
  PencilLine,
} from "lucide-react";
import type { WhiteboardResponse } from "@/types/whiteboard";
import { buildNarrationPlan } from "@/lib/narration";
import { boardReady } from "@/lib/board-ready";
import { buildColumnRevealTimeline } from "@/lib/column-reveal";
import {
  estimateColumnStepWriteMs,
  estimateMathWriteMs,
  estimateNoteWriteMs,
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
import BoardTimeline from "@/components/whiteboard/tutor/BoardTimeline";
import TeacherPointer, {
  type PointerHighlight,
} from "@/components/whiteboard/tutor/TeacherPointer";
import { visibleTerms, TERM_ATTRIBUTE } from "@/lib/board-terms";
import { spokenTermIndex } from "@/lib/spoken-terms";
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
  /** "Try one like this": the chat fetches a practice question on the topic. */
  onTryAnother?: (topic: string) => void;
  /** "Ask about a step": the chat opens with the step named, ready to send. */
  onAskAbout?: (step: string) => void;
}

const WRITE_MS = 900;

/**
 * The speed button's settings. 0.75× is for a pupil who wants the teacher to
 * slow right down: the voice and the writing both go at three-quarter pace.
 */
const PLAYBACK_SPEEDS = [1, 1.5, 2, 0.75] as const;
type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number];

// ── Main tutor ────────────────────────────────────────────────────────────────

export default function WhiteboardTutor({ data: given, onClose, onTryAnother, onAskAbout }: Props) {
  // An answer saved before a board fix existed is put right here.
  const data = useMemo(() => boardReady(given), [given]);
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
  const [speed, setSpeed] = useState<PlaybackSpeed>(1);
  const [phase, setPhase] = useState<PlaybackPhase>("focus");
  const [activeWord, setActiveWord] = useState(-1);
  const [justCompleted, setJustCompleted] = useState<number | null>(null);
  const [pointerPos, setPointerPos] = useState({ x: 0, y: 0 });
  const [pointerVisible, setPointerVisible] = useState(false);
  const [focusEl, setFocusEl] = useState<HTMLElement | null>(null);
  // The line directly above the one being written. The pen goes back to it:
  // "this 7" is up there, not on the line it is about to write.
  const [aboveEl, setAboveEl] = useState<HTMLElement | null>(null);
  const [highlight, setHighlight] = useState<PointerHighlight | null>(null);
  const [pointerSide, setPointerSide] = useState<"below" | "above">("below");
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const currentStep = steps[activeCue];
  // A rule is named the first time the lesson uses it, and not again.
  const namesRule = useMemo(() => {
    const said = new Set<string>();
    return steps.map((step) => {
      const rule = (step.rule ?? "").trim().toLowerCase();
      if (!rule) return true;
      if (said.has(rule)) return false;
      said.add(rule);
      return true;
    });
  }, [steps]);
  const speechParts = useMemo(
    () => buildTeacherSpeechParts(currentStep, namesRule[activeCue] ?? true),
    [currentStep, namesRule, activeCue],
  );
  const nextSpeechParts = useMemo(
    () => buildTeacherSpeechParts(steps[activeCue + 1], namesRule[activeCue + 1] ?? true),
    [activeCue, steps, namesRule],
  );
  const pointerSpeechText =
    phase === "check" ? speechParts.check || "" : speechParts.explanation;
  // DEF-004: anchors this step explicitly teaches, in order. Authored data
  // beats inference — see findTargets below.
  const pointerFocusIds = useMemo<string[] | undefined>(() => {
    const ids = currentStep?.focusTargetIds;
    return ids && ids.length > 0 ? ids : undefined;
  }, [currentStep]);
  // A line that is a sentence (the opening, the answer, the key idea, the
  // warning) and not maths or a drawing.
  const isProseLine =
    currentStep?.visual.type === "intro" ||
    currentStep?.visual.type === "conclusion" ||
    currentStep?.visual.type === "hint" ||
    (currentStep?.visual.type === "text" && !currentStep.visual.latex);
  const pointerPlaybackRef = useRef<{
    phase: typeof phase;
    activeWord: number;
    narration: string;
    focusTargetIds?: string[];
    prose?: boolean;
  }>({
    phase,
    activeWord,
    narration: pointerSpeechText,
    focusTargetIds: pointerFocusIds,
    prose: isProseLine,
  });
  const schedulePointerPlaceRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    pointerPlaybackRef.current = {
      phase,
      activeWord,
      narration: pointerSpeechText,
      focusTargetIds: pointerFocusIds,
      prose: isProseLine,
    };
  }, [activeWord, phase, pointerSpeechText, pointerFocusIds, isProseLine]);

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

    const findTargets = (): { targets: HTMLElement[]; authored: boolean } => {
      // DEF-004: an authored path wins over anything inferred from the board.
      // The step names the anchors it teaches, in order; we resolve each by
      // `data-teacher-id`. Ids that match nothing are skipped rather than
      // freezing the cursor, so a stale id degrades to the inferred path
      // instead of breaking playback.
      const authored = pointerPlaybackRef.current.focusTargetIds;
      if (authored && authored.length > 0) {
        const resolved = authored
          .map((id) =>
            focusEl.querySelector<HTMLElement>(
              `[data-teacher-id="${CSS.escape(id)}"]`,
            ),
          )
          .filter((el): el is HTMLElement => {
            if (!el) return false;
            const rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          });
        if (resolved.length > 0) return { targets: resolved, authored: true };
      }

      const equationTargets = visibleTargets('[id$="-from"], [id$="-to"]');
      if (equationTargets.length > 0) {
        return { targets: equationTargets, authored: false };
      }

      const primary = visibleTargets('[data-teacher-target="primary"]');
      if (primary.length > 0) return { targets: primary, authored: false };
      const detail = visibleTargets('[data-teacher-target="detail"]');
      if (detail.length > 0) return { targets: detail, authored: false };
      const visual = focusEl.querySelector<HTMLElement>(
        '[data-teacher-target="visual"]',
      );
      return { targets: visual ? [visual] : [], authored: false };
    };

    /**
     * Put the pen's tip on an element and wash it with highlighter. On the line
     * being worked on the pen comes up from below, as a writing hand does. On
     * the line above it comes down from above instead — from below, its barrel
     * would lie across the very line being explained.
     */
    const pointAt = (el: HTMLElement) => {
      const rect = el.getBoundingClientRect();
      const fromAbove = !!aboveEl && aboveEl.contains(el);
      setPointerSide(fromAbove ? "above" : "below");
      const next = {
        x: rect.left + rect.width / 2,
        y: fromAbove ? rect.top - 3 : rect.bottom + 3,
      };
      setPointerPos((current) =>
        Math.abs(current.x - next.x) < 0.5 && Math.abs(current.y - next.y) < 0.5
          ? current
          : next,
      );
      setHighlight((current) =>
        current &&
        Math.abs(current.left - rect.left) < 0.5 &&
        Math.abs(current.top - rect.top) < 0.5 &&
        Math.abs(current.width - rect.width) < 0.5
          ? current
          : { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      );
      setPointerVisible(true);
    };

    const place = () => {
      frame = 0;
      const playback = pointerPlaybackRef.current;

      // Before writing a line, a teacher taps the thing they are about to act
      // on. If this step moves a term down from the line above, that term is
      // where the pen goes while the board settles.
      if ((playback.phase === "focus" || playback.phase === "point") && aboveEl) {
        const source = aboveEl.querySelector<HTMLElement>('[id$="-from"]');
        const sourceRect = source?.getBoundingClientRect();
        if (source && sourceRect && sourceRect.width > 0) {
          pointAt(source);
          return;
        }
      }

      // While explaining, the pen is on the term being said — on this line or
      // the one above. Only a term whose own value is spoken is ever chosen;
      // see lib/spoken-terms.ts for why this is not the anchor walk below.
      if (playback.phase === "explain" || playback.phase === "check") {
        const terms = [...visibleTerms(aboveEl), ...visibleTerms(focusEl)];
        if (terms.length > 0) {
          const index = spokenTermIndex(
            terms.map((el) => el.getAttribute(TERM_ATTRIBUTE) || ""),
            playback.narration,
            playback.activeWord,
          );
          if (index >= 0) {
            focusEl.dataset.teacherPath = "spoken";
            pointAt(terms[index]);
            return;
          }
        }
      }
      setHighlight(null);
      setPointerSide("below");

      const { targets, authored: authoredPath } = findTargets();
      // Which branch actually supplied the anchors. Read by the cursor audit
      // so it can tell "the authored path works" from "the authored path is
      // dormant and inference happened to agree".
      focusEl.dataset.teacherPath = authoredPath ? "authored" : "inferred";
      focusEl.dataset.teacherResolved = `${targets.length}/${
        playback.focusTargetIds?.length ?? 0
      }`;
      // The anchors this step actually teaches. The cursor audit needs these to
      // ask the only question with an objective answer: when the tutor speaks a
      // digit that IS one of this step's anchors, is the cursor on it? A digit
      // belonging to an earlier step is not a miss — the cursor is meant to rest
      // on what it is about to write.
      focusEl.dataset.teacherAnchors = targets
        .map((el) => el.dataset.teacherId ?? "")
        .join("|");
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
      // An authored path is already in teaching order; re-sorting it by the
      // renderer's own sequence would scramble the author's intent. This must
      // key off whether the authored ids RESOLVED, not merely whether they
      // exist: when authored ids all fail to resolve we fall back to inferred
      // anchors, and those still need the sequence sort to be in pen order.
      const paired = targets.map((target, index) => ({
        target,
        descriptor: descriptors[index],
        index,
      }));
      const ordered = authoredPath
        ? paired
        : paired.sort(
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
      const progress = teacherSpeechProgress(
        playback.narration,
        playback.activeWord,
        playback.phase,
      );
      // A sentence is underlined as it is read. The pen used to travel through
      // the middle of the writing, so its barrel lay across the words being
      // read out. Now its tip runs along underneath the row it has reached.
      if (playback.prose && targets.length === 1) {
        const lineHeight = parseFloat(getComputedStyle(target).lineHeight) || 34;
        const rows = Math.max(1, Math.round(rect.height / lineHeight));
        const scaled = Math.min(0.9999, Math.max(0, progress)) * rows;
        const row = Math.min(rows - 1, Math.floor(scaled));
        const next = {
          x: rect.left + rect.width * (0.02 + (scaled - row) * 0.96),
          y: rect.top + ((row + 1) * rect.height) / rows + 2,
        };
        setPointerSide("below");
        setPointerPos((current) =>
          Math.abs(current.x - next.x) < 0.5 && Math.abs(current.y - next.y) < 0.5 ? current : next,
        );
        setPointerVisible(true);
        return;
      }
      const swept = teacherPointerPoint(rect, progress);
      // A small target (a digit in a column, a single term) is touched at its
      // lower edge, not its middle: the nib of a pen held from below would
      // otherwise sit on top of the very digit being pointed at.
      const compact = rect.width <= 90 && rect.height <= 90;
      // A label on a drawing (a corner letter, a side length) is pointed at from
      // outside the drawing. The pen used to sit on the label itself, so the
      // corner being named was the one thing that could not be read, and its
      // barrel lay across the shape. A label in the top half is touched from
      // above with the barrel going up; one in the bottom half from below.
      const drawing = target.closest("svg");
      const onDrawing = compact && !!drawing;
      let next = compact ? { x: rect.left + rect.width / 2, y: rect.bottom - 2 } : swept;
      if (onDrawing && drawing) {
        const box = drawing.getBoundingClientRect();
        const inTopHalf = rect.top + rect.height / 2 < box.top + box.height / 2;
        setPointerSide(inTopHalf ? "above" : "below");
        next = {
          x: rect.left + rect.width / 2,
          y: inTopHalf ? rect.top - 5 : rect.bottom + 5,
        };
      }
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
  }, [focusEl, aboveEl, activeCue, runId]);

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
      if (text) void prepare(text);
    });
  }, [nextSpeechParts, prepare, speechParts]);

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
      // A line of working is followed by the note beside it, written with the
      // same pen — so the explanation waits for both, or the pen would still be
      // writing the note when it should be pointing.
      const noteMs =
        currentStep?.visual.type === "equation"
          ? estimateNoteWriteMs(currentStep.title)
          : 0;
      schedule(
        "explain",
        ((writeMsPlan[activeCue] ?? WRITE_MS) + noteMs) / speed,
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
      // Thinking time only after a question. Otherwise a breath, then on.
      phaseTimer.current = setTimeout(
        advance,
        pupilPauseDurationMs(speed, speechParts.asksPupil === true),
      );
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
    currentStep,
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

  // Space pauses and plays, the arrows step back and forward, as on any video.
  const keysRef = useRef({ toggle: () => {}, prev: () => {}, next: () => {} });
  useEffect(() => {
    keysRef.current = {
      toggle: isPlaying ? handlePause : handlePlay,
      prev: handlePrev,
      next: handleNext,
    };
  });
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const el = event.target as HTMLElement | null;
      if (el && /^(?:INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === " " || event.code === "Space") {
        // On a button, space already presses it.
        if (el?.tagName === "BUTTON") return;
        event.preventDefault();
        keysRef.current.toggle();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        keysRef.current.prev();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        keysRef.current.next();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const toggleMute = () => setIsMuted((m) => !m);
  const cycleSpeed = () =>
    setSpeed((s) => PLAYBACK_SPEEDS[(PLAYBACK_SPEEDS.indexOf(s) + 1) % PLAYBACK_SPEEDS.length]);

  const isLast = activeCue === totalCues - 1;
  const isSpeaking =
    isPlaying && (phase === "explain" || phase === "check");
  const narrationText =
    phase === "check"
      ? speechParts.check || speechParts.explanation
      : phase === "pupil_pause"
        ? speechParts.asksPupil
          ? speechParts.check || "Have a go before we move on."
          : // Between two steps the last thing said stays up. It used to be
            // swapped for "Pause and say this step back in your own words"
            // after every line.
            speechParts.check || speechParts.explanation
        : speechParts.explanation;
  const pointerMode =
    phase === "write"
      ? "write"
      : phase === "check" || phase === "pupil_pause"
        ? "check"
        : "point";
  const isThinkingTime = isPlaying && phase === "pupil_pause" && speechParts.asksPupil === true;
  const thinkingMs = pupilPauseDurationMs(speed, true);
  const finished = phase === "complete";
  // The step the pupil was last on, for "ask about a step".
  const stepToAskAbout = (() => {
    const working = steps.filter((step) => step.kind === "equation_step" || step.kind === "teaching_step");
    return working.length > 0 ? working[working.length - 1].title : "";
  })();
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
        {/* The photo stays at the top of the board for the whole lesson. It
            used to vanish after the first step, which was just before the
            tutor's own drawing of the shape appeared, so the pupil could never
            hold the two side by side. A drawing made from a photo can be
            misread, and the pupil is the only one who can see that. */}
        {data.questionImageUrl && (
          <figure className="mb-5 mx-auto max-w-xs sm:max-w-sm">
            <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={data.questionImageUrl}
                alt="Your photo of the question"
                className="w-full h-auto"
              />
            </div>
            <figcaption className="mt-2 text-center text-xs text-slate-500">
              Your photo. Check the numbers I use match the ones in it.
            </figcaption>
          </figure>
        )}

        <BoardTimeline
          steps={steps}
          activeIndex={activeCue}
          justCompletedIndex={justCompleted}
          data={data}
          runId={runId}
          playbackPhase={phase}
          isPlaying={isPlaying}
          writeMs={(writeMsPlan[activeCue] ?? WRITE_MS) / speed}
          setActiveStepRef={setActiveStepRef}
          setLineAboveRef={setAboveEl}
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

        {/* A teacher does not finish a worked example and walk out. They ask
            if it made sense and set one to try. The lesson used to end on its
            last line with the pause button showing. */}
        {finished && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-6 mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm"
            data-lesson-end
            // It appears below the last line, which may be the bottom of the
            // screen, so it is brought into view.
            ref={(el) => {
              if (el) requestAnimationFrame(() => el.scrollIntoView({ behavior: "smooth", block: "end" }));
            }}
          >
            <p className="text-base font-semibold text-slate-900">Did that make sense?</p>
            <p className="mt-1 text-sm text-slate-500">
              Tap any line on the board to hear that step again. The best way to check you have it is to try one yourself.
            </p>
            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              {onTryAnother && (
                <button
                  onClick={() => onTryAnother(data.topic || "")}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  <PencilLine size={15} />
                  Try one like this
                </button>
              )}
              {onAskAbout && (
                <button
                  onClick={() => onAskAbout(stepToAskAbout)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <MessageCircleQuestion size={15} />
                  I&apos;m stuck on a step
                </button>
              )}
              <button
                onClick={handleReplay}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <RotateCcw size={15} />
                Watch again
              </button>
            </div>
          </motion.div>
        )}

        <div className="h-8" />
      </WhiteboardCanvas>

      <TeacherPointer
        x={pointerPos.x}
        y={pointerPos.y}
        visible={pointerVisible}
        mode={isPlaying ? pointerMode : "point"}
        highlight={isPlaying ? highlight : null}
        side={pointerSide}
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
              {!isPlaying
                ? "Paused"
                : phase === "pupil_pause" && !speechParts.asksPupil
                  ? playbackPhaseLabel(speechParts.check ? "check" : "explain")
                  : phase === "check" && !speechParts.asksPupil
                    ? "Checking the answer"
                    : playbackPhaseLabel(phase)}
            </p>
            <SpeechHighlighter
              text={narrationText}
              activeWordIndex={activeWord}
              isSpeaking={isSpeaking}
            />
            {/* Thinking time runs down in view, so the wait reads as a wait
                and not as the lesson having stopped. */}
            {isThinkingTime && (
              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-emerald-100" aria-hidden>
                <motion.div
                  key={`think-${activeCue}-${runId}`}
                  className="h-full rounded-full bg-emerald-500"
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: thinkingMs / 1000, ease: "linear" }}
                />
              </div>
            )}
          </div>
          {isThinkingTime && (
            <button
              onClick={advance}
              className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
            >
              Show me
              <ArrowRight size={14} />
            </button>
          )}
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
              title={speed === 0.75 ? "Slow" : speed === 1 ? "Normal speed" : "Faster"}
              className="h-10 px-2.5 rounded-xl text-xs font-bold tabular-nums hover:bg-slate-100 transition-all"
              style={{ color: speed === 1 ? "#94a3b8" : "#2563eb", minWidth: 48 }}
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
