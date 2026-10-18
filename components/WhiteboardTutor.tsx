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
  Maximize2,
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
import {
  cardIndexForStep,
  groupTeachingStepsIntoCards,
} from "@/lib/teaching-cards";
import { useWhiteboardSpeech } from "@/lib/hooks/useWhiteboardSpeech";
import {
  buildTeacherSpeechParts,
  nextPlaybackPhase,
  pacingForTier,
  playbackPhaseLabel,
  pupilPauseDurationMs,
  type PlaybackPhase,
} from "@/lib/whiteboard-playback";
import type { KS2Tier } from "@/lib/ks2-pathway";
import WhiteboardCanvas from "@/components/whiteboard/tutor/WhiteboardCanvas";
import StepTimeline from "@/components/whiteboard/tutor/StepTimeline";
import PenOverlay from "@/components/whiteboard/tutor/PenOverlay";
import InkFilterDefs from "@/components/whiteboard/InkFilterDefs";
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
  /** Required for the fullscreen overlay; meaningless inline. */
  onClose?: () => void;
  /**
   * Attainment tier, which sets the teaching pace. Omitted callers get the
   * `secure` profile, i.e. exactly the timings this player has always used.
   */
  tier?: KS2Tier;
  /**
   * `fullscreen` is the modal overlay this component has always been: it owns
   * the viewport, locks body scroll, traps focus and closes on Escape.
   *
   * `inline` embeds the same player inside a page. Every one of those modal
   * behaviours is wrong there — locking scroll freezes the lesson around it,
   * autofocusing the close button steals focus from whatever the pupil was
   * reading, and a global Escape handler hijacks a key the page may own. They
   * are gated rather than removed so the overlay keeps behaving correctly.
   */
  variant?: "inline" | "fullscreen";
  /** Inline only: swap to the fullscreen overlay. */
  onExpand?: () => void;
}

const WRITE_MS = 900;

// ── Main tutor ────────────────────────────────────────────────────────────────

export default function WhiteboardTutor({
  data,
  onClose,
  tier,
  variant = "fullscreen",
  onExpand,
}: Props) {
  const isFullscreen = variant === "fullscreen";
  const pacing = useMemo(() => pacingForTier(tier), [tier]);
  const plan = useMemo(() => buildNarrationPlan(data), [data]);
  const steps = useMemo(() => buildTutorSteps(data, plan), [data, plan]);
  const totalCues = plan.length;
  /**
   * Navigable stops. Autoplay walks every cue so the pen writes one mark per
   * spoken phrase; prev/next and the timeline move between CARDS, so a pupil is
   * not clicking through a dozen stops to re-read a method. Derived rather than
   * stored, so the two can never disagree.
   */
  const cards = useMemo(() => groupTeachingStepsIntoCards(steps), [steps]);

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
  /**
   * Inline starts paused; the overlay starts playing.
   *
   * Not a stylistic choice — a browser blocks audio that no user gesture asked
   * for, so an inline player that "autoplays" on page load would silently fail
   * and then narrate the wrong step later. Opening the overlay IS a gesture, so
   * it can start immediately. This is also what WCAG 2.2.2 wants of
   * auto-playing content. "Autoplay" here means continuous playback after one
   * press, not playback without one.
   */
  const [isPlaying, setIsPlaying] = useState(isFullscreen);
  const [isMuted, setIsMuted] = useState(false);
  const [speed, setSpeed] = useState<1 | 1.5 | 2>(1);
  const [phase, setPhase] = useState<PlaybackPhase>("focus");
  const [activeWord, setActiveWord] = useState(-1);
  const [justCompleted, setJustCompleted] = useState<number | null>(null);
  const [pointerPos, setPointerPos] = useState({ x: 0, y: 0 });
  const [pointerVisible, setPointerVisible] = useState(false);
  /**
   * Which mark of the current step's pen order is being written right now,
   * tagged with the step it belongs to. Shared with the pointer so the ink and
   * the pen can never disagree.
   *
   * Tagged rather than reset in an effect: a value left over from the previous
   * step is simply not read, so there is no render in which a new step briefly
   * shows the old step's ink.
   */
  const [ink, setInk] = useState({ cue: 0, run: 0, index: 0 });
  const [focusEl, setFocusEl] = useState<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  /** The board's content element — the pen's coordinate space. */
  const contentElRef = useRef<HTMLDivElement | null>(null);

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
  // DEF-004: anchors this step explicitly teaches, in order. Authored data
  // beats inference — see findTargets below.
  const pointerFocusIds = useMemo<string[] | undefined>(() => {
    const ids = currentStep?.focusTargetIds;
    return ids && ids.length > 0 ? ids : undefined;
  }, [currentStep]);
  const pointerPlaybackRef = useRef<{
    phase: typeof phase;
    activeWord: number;
    narration: string;
    focusTargetIds?: string[];
    cue: number;
    run: number;
  }>({
    phase,
    activeWord,
    narration: pointerSpeechText,
    focusTargetIds: pointerFocusIds,
    cue: activeCue,
    run: runId,
  });
  const schedulePointerPlaceRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    pointerPlaybackRef.current = {
      phase,
      activeWord,
      narration: pointerSpeechText,
      focusTargetIds: pointerFocusIds,
      cue: activeCue,
      run: runId,
    };
  }, [activeWord, phase, pointerSpeechText, pointerFocusIds, activeCue, runId]);

  const { speak, prepare, cancel, pause, resume } = useWhiteboardSpeech();
  /** True while a clip is paused part-way through and should be resumed, not respoken. */
  const resumeMidClip = useRef(false);
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

    const place = () => {
      frame = 0;
      const { targets, authored: authoredPath } = findTargets();
      const playback = pointerPlaybackRef.current;
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
      // The ink follows the SAME resolved index as the pen, deliberately. Any
      // second derivation (a separate progress calculation, say) would let the
      // pen point at a digit that has not been written, or a digit appear
      // somewhere the pen is not — the two must agree by construction.
      setInk({ cue: playback.cue, run: playback.run, index: targetIndex });

      const target = ordered[targetIndex]?.target;
      if (!target) {
        setPointerVisible(false);
        return;
      }
      const rect = target.getBoundingClientRect();

      // The pointer is positioned in viewport coordinates, which is fine for an
      // overlay that owns the viewport. Inline it is not: once the board
      // scrolls past, a fixed pointer would keep tracking a target that is no
      const viewportPoint = teacherPointerPoint(
        rect,
        teacherSpeechProgress(
          playback.narration,
          playback.activeWord,
          playback.phase,
        ),
      );

      // Convert into the BOARD's coordinate space. The pen lives inside the
      // scrolling content now, so it shares one space with the ink it draws and
      // scrolls with the board rather than needing to be re-placed. This also
      // retires the bounds guard the inline variant needed: a pen positioned
      // inside the board simply cannot float over the page's own chrome.
      const content = contentElRef.current;
      if (!content) {
        setPointerVisible(false);
        return;
      }
      const contentRect = content.getBoundingClientRect();
      const next = {
        x: viewportPoint.x - contentRect.left,
        y: viewportPoint.y - contentRect.top,
      };
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
      // No speed argument: narration is generated once and played back at the
      // chosen rate, so the prefetch is speed-independent and a speed change
      // no longer invalidates everything already fetched.
      if (text) void prepare(text);
    });
  }, [nextSpeechParts, prepare, speechParts]);

  useEffect(() => {
    clearTimers();

    // Pausing must hold the teacher's place, not tear the clip down. Calling
    // cancel() here (as this effect used to, unconditionally) bumped the
    // speech generation, so resuming had to speak() again and the sentence
    // restarted from its first word.
    const isSpeakingPhase = phase === "perform" || phase === "check";
    if (!isPlaying) {
      if (isSpeakingPhase && !isMuted) {
        pause();
        resumeMidClip.current = true;
      } else {
        cancel();
      }
      // Deliberately no teardown: the audio must survive until resume.
      return;
    }

    if (resumeMidClip.current) {
      resumeMidClip.current = false;
      resume();
      return () => {
        cancel();
        clearTimers();
      };
    }

    cancel();
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
      schedule("point", pacing.focusSettleMs / speed);
    } else if (phase === "point") {
      schedule("perform", pacing.pointerSettleMs / speed);
    } else if (phase === "perform" || phase === "check") {
      // Speech starts the moment the phase does. There is no silent write
      // timer any more: the ink is driven from this clip's word clock (see the
      // `revealProgress` effect below), so the teacher writes while talking.
      const text =
        phase === "check" ? speechParts.check || "" : speechParts.explanation;
      const next = nextPlaybackPhase(phase, !!speechParts.check);
      // A beat after the step lands, so micro-steps do not run together. Only
      // the developing tier asks for one.
      const gapMs = phase === "perform" ? pacing.microBeatGapMs / speed : 0;

      if (!text) {
        schedule(next, gapMs);
      } else if (isMuted) {
        // With no audio there is no real clock, so fall back to the word-count
        // estimate — but never finish before the ink has had time to appear,
        // or a muted pupil sees the step cut off mid-write.
        const spokenMs = Math.max(1300, countWords(text) * 285);
        const inkMs = phase === "perform" ? (writeMsPlan[activeCue] ?? WRITE_MS) : 0;
        const durationMs = Math.max(spokenMs, inkMs) / speed;
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
        schedule(next, durationMs + gapMs);
      } else {
        speak(
          text,
          speed,
          () => {
            if (disposed) return;
            setActiveWord(-1);
            if (gapMs > 0) schedule(next, gapMs);
            else moveTo(next);
          },
          setActiveWord,
        );
      }
    } else if (phase === "pupil_pause") {
      phaseTimer.current = setTimeout(
        advance,
        pupilPauseDurationMs(speed, pacing),
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
    isMuted,
    isPlaying,
    pacing,
    pause,
    phase,
    resume,
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

  // Modal-only: scroll lock, focus trap and Escape. All three are actively
  // harmful inline — see the `variant` docs on Props.
  useEffect(() => {
    if (!isFullscreen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [isFullscreen, onClose]);

  const handlePlay = () => {
    if (phase === "complete") {
      setPhase("focus");
      setRunId((value) => value + 1);
    }
    setIsPlaying(true);
  };
  const handlePause = () => {
    // The phase effect decides whether to hold the clip or cancel it; keeping
    // the active word means the karaoke line stays where the teacher stopped
    // instead of blanking.
    setIsPlaying(false);
  };
  const handlePrev = () => {
    cancel();
    clearTimers();
    setActiveWord(-1);
    setIsPlaying(false);
    setPhase("focus");
    setActiveCue((i) => {
      const card = cardIndexForStep(cards, i);
      // Part-way through a card, the first press returns to its start — the
      // same "back to the beginning of this bit" a pupil expects.
      if (card > 0 && i > cards[card].stepRange[0]) return cards[card].stepRange[0];
      return card > 0 ? cards[card - 1].stepRange[0] : 0;
    });
  };
  const handleNext = () => {
    cancel();
    clearTimers();
    setActiveWord(-1);
    setIsPlaying(false);
    setPhase("focus");
    setActiveCue((i) => {
      const card = cardIndexForStep(cards, i);
      if (card < 0) return Math.min(totalCues - 1, i + 1);
      const next = cards[card + 1];
      return next ? next.stepRange[0] : totalCues - 1;
    });
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

  // Only trust the ink position if it belongs to the step on screen.
  const inkIndex =
    ink.cue === activeCue && ink.run === runId ? ink.index : 0;

  const isLast = activeCue === totalCues - 1;
  const isSpeaking =
    isPlaying && (phase === "perform" || phase === "check");
  const narrationText =
    phase === "check"
      ? speechParts.check || speechParts.explanation
      : phase === "pupil_pause"
        ? speechParts.check
          ? "Pause and answer the quick check before we move on."
          : "Pause and say this step back in your own words."
        : speechParts.explanation;
  // The pen is "writing" throughout `perform` now, because that is exactly when
  // ink is appearing — previously this only lit up during the silent write
  // phase, so the mode was never on while anything was actually being written.
  const pointerMode =
    phase === "perform"
      ? "write"
      : phase === "check" || phase === "pupil_pause"
        ? "check"
        : "point";
  const badge = getVerificationBadge(data);
  const showBadge =
    currentStep?.kind === "conclusion" || activeCue === totalCues - 1;

  return (
    <motion.div
      ref={rootRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className={
        isFullscreen
          ? "fixed inset-0 z-50 flex flex-col bg-[#f4f6fa]"
          : "relative flex flex-col rounded-3xl border border-slate-200 bg-[#f4f6fa] overflow-hidden"
      }
      // Inline is a region of the page, not a dialog. Claiming role="dialog"
      // and aria-modal there would tell a screen reader the rest of the lesson
      // is inert when it is not.
      role={isFullscreen ? "dialog" : "group"}
      aria-modal={isFullscreen ? "true" : undefined}
      aria-label={isFullscreen ? "Whiteboard Tutor" : "Worked example, taught step by step"}
      data-playback-phase={phase}
      data-variant={variant}
      style={isFullscreen ? undefined : { height: "min(78vh, 680px)" }}
    >
      <InkFilterDefs />

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
        {isFullscreen ? (
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Close tutor"
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
          >
            <X size={16} />
          </button>
        ) : onExpand ? (
          <button
            onClick={onExpand}
            aria-label="Expand to full screen"
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-600 hover:text-slate-900 hover:border-slate-300 transition-all"
          >
            <Maximize2 size={13} /> Full screen
          </button>
        ) : null}
      </header>

      {/* Board */}
      <WhiteboardCanvas
        focusEl={focusEl}
        focusKey={`${activeCue}-${runId}`}
        onContentRef={(el) => {
          contentElRef.current = el;
          // A late ref (first paint, or a variant switch) must re-place the
          // pen, or it sits at the origin until the next word tick.
          if (el) schedulePointerPlaceRef.current();
        }}
        overlay={
          <PenOverlay
            x={pointerPos.x}
            y={pointerPos.y}
            visible={pointerVisible}
            mode={isPlaying ? pointerMode : "point"}
            seedKey={`${activeCue}:${inkIndex}`}
          />
        }
      >
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
          // `inkIndex` is which mark is being written now, so the count
          // written is one more than that. Settling phases pass 0 so the step
          // starts blank; once the step is done everything is on the board.
          keysRevealed={
            phase === "focus" || phase === "point"
              ? 0
              : phase === "perform"
                ? inkIndex + 1
                : undefined
          }
          setActiveStepRef={setActiveStepRef}
          cards={cards}
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

        <ProgressRail
          total={cards.length || totalCues}
          current={Math.max(0, cardIndexForStep(cards, activeCue))}
        />

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
