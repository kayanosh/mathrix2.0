"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  countWords,
  wordIndexAtProgress,
  wordIndexAtProgressWithSegments,
  type TranscriptSegment,
} from "@/components/whiteboard/tutor/SpeechHighlighter";

const audioBlobCache = new Map<string, Blob>();
const pendingAudio = new Map<string, Promise<Blob>>();
const MAX_AUDIO_CACHE = 100;

// DEF-002: real per-sentence timestamps, fetched alongside (never blocking)
// the audio itself. A miss/error just means the linear-estimate fallback in
// wordIndexAtProgressWithSegments keeps doing what this hook always did.
const segmentsCache = new Map<string, TranscriptSegment[]>();
const pendingSegments = new Map<string, Promise<TranscriptSegment[]>>();

function audioKey(text: string, rate: number): string {
  return `${rate}|${text}`;
}

/** Cloud narration with browser speech fallback and ahead-of-time preloading. */
export function useWhiteboardSpeech() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const fallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generationRef = useRef(0);

  const getAudio = useCallback((): HTMLAudioElement => {
    if (!audioRef.current) audioRef.current = new Audio();
    return audioRef.current;
  }, []);

  const clearProgress = useCallback(() => {
    if (progressTimer.current) {
      clearInterval(progressTimer.current);
      progressTimer.current = null;
    }
    if (fallbackTimer.current) {
      clearTimeout(fallbackTimer.current);
      fallbackTimer.current = null;
    }
  }, []);

  const startWordProgress = useCallback(
    (
      text: string,
      durationMs: number,
      generation: number,
      onWord: (idx: number) => void,
      options?: {
        // Reads true elapsed ms from an actual <audio> element's
        // currentTime when one exists, instead of an independent JS timer —
        // removes drift from setInterval throttling (e.g. a backgrounded
        // tab) as well as from linear word-position estimation.
        getElapsedMs?: () => number;
        segments?: TranscriptSegment[] | null;
      },
    ) => {
      clearProgress();
      const start = performance.now();
      const getElapsed = options?.getElapsedMs ?? (() => performance.now() - start);
      const segments = options?.segments ?? null;
      progressTimer.current = setInterval(() => {
        if (generation !== generationRef.current) {
          clearProgress();
          return;
        }
        const elapsed = getElapsed();
        onWord(
          segments
            ? wordIndexAtProgressWithSegments(text, elapsed, durationMs, segments)
            : wordIndexAtProgress(text, elapsed, durationMs),
        );
        if (elapsed >= durationMs) clearProgress();
      }, 80);
    },
    [clearProgress],
  );

  const loadTiming = useCallback(async (text: string, rate: number) => {
    const key = audioKey(text, rate);
    const cached = segmentsCache.get(key);
    if (cached) return cached;

    const existing = pendingSegments.get(key);
    if (existing) return existing;

    const request = fetch("/api/tts-timing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, speed: rate * 1.1 }),
    })
      .then(async (res) => {
        if (!res.ok) return [];
        const data = (await res.json()) as { segments?: TranscriptSegment[] };
        const segments = data.segments || [];
        segmentsCache.set(key, segments);
        return segments;
      })
      .catch(() => [])
      .finally(() => pendingSegments.delete(key));

    pendingSegments.set(key, request);
    return request;
  }, []);

  const loadCloudAudio = useCallback(async (text: string, rate: number) => {
    const key = audioKey(text, rate);
    const cached = audioBlobCache.get(key);
    if (cached) return cached;

    const existing = pendingAudio.get(key);
    if (existing) return existing;

    const request = fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, speed: rate * 1.1 }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("TTS API error");
        const blob = await res.blob();
        if (audioBlobCache.size >= MAX_AUDIO_CACHE) {
          const oldest = audioBlobCache.keys().next().value;
          if (oldest) audioBlobCache.delete(oldest);
        }
        audioBlobCache.set(key, blob);
        return blob;
      })
      .finally(() => pendingAudio.delete(key));

    pendingAudio.set(key, request);
    return request;
  }, []);

  const prepare = useCallback(
    async (text: string, rate: number): Promise<void> => {
      if (!text.trim()) return;
      try {
        await loadCloudAudio(text, rate);
        // Best-effort: timing isn't required for playback to start, only for
        // the improved (segment-aware) sync once it's ready.
        void loadTiming(text, rate);
      } catch {
        // The live speak call will use the browser voice if cloud TTS is down.
      }
    },
    [loadCloudAudio, loadTiming],
  );

  const speakBrowser = useCallback(
    (
      text: string,
      rate: number,
      generation: number,
      onEnd: () => void,
      onWord: (idx: number) => void,
    ) => {
      const finish = () => {
        if (generation !== generationRef.current) return;
        clearProgress();
        onEnd();
      };

      if (typeof window === "undefined" || !window.speechSynthesis) {
        const durationMs = Math.max(1200, countWords(text) * 280) / rate;
        startWordProgress(text, durationMs, generation, onWord);
        fallbackTimer.current = setTimeout(finish, durationMs);
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = rate * 0.88;
      utterance.pitch = 0.85;
      utterance.volume = 1;

      const estimatedMs = Math.max(1400, countWords(text) * 320) / rate;
      startWordProgress(text, estimatedMs, generation, onWord);
      utterance.onend = finish;
      utterance.onerror = finish;
      utterance.onboundary = (event) => {
        if (
          generation === generationRef.current &&
          event.name === "word" &&
          typeof event.charIndex === "number"
        ) {
          const before = text.slice(0, event.charIndex);
          onWord(
            countWords(before) -
              (before.endsWith(" ") || before.length === 0 ? 0 : 1),
          );
        }
      };

      const start = () => {
        if (generation !== generationRef.current) return;
        const voices = window.speechSynthesis.getVoices();
        const voice =
          voices.find((item) => item.name === "Daniel (Premium)") ||
          voices.find((item) => item.name.includes("Google UK English Male")) ||
          voices.find((item) => item.lang === "en-GB") ||
          voices.find((item) => item.lang.startsWith("en"));
        if (voice) utterance.voice = voice;
        window.speechSynthesis.speak(utterance);
      };

      if (window.speechSynthesis.getVoices().length > 0) start();
      else window.speechSynthesis.onvoiceschanged = start;
    },
    [clearProgress, startWordProgress],
  );

  const speak = useCallback(
    (
      text: string,
      rate: number,
      onEnd: () => void,
      onWord: (idx: number) => void,
    ) => {
      const generation = ++generationRef.current;

      void (async () => {
        try {
          const blob = await loadCloudAudio(text, rate);
          if (generation !== generationRef.current) return;

          if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
          const url = URL.createObjectURL(blob);
          blobUrlRef.current = url;

          const audio = getAudio();
          audio.pause();
          audio.src = url;

          await new Promise<void>((resolve, reject) => {
            let settled = false;
            const finish = (callback: () => void) => {
              if (settled) return;
              settled = true;
              audio.removeEventListener("loadedmetadata", onLoaded);
              audio.removeEventListener("error", onError);
              clearTimeout(timeout);
              callback();
            };
            const onLoaded = () => finish(resolve);
            const onError = () => finish(() => reject(new Error("audio load")));
            const timeout = setTimeout(() => finish(resolve), 1500);
            audio.addEventListener("loadedmetadata", onLoaded);
            audio.addEventListener("error", onError);
            if (audio.readyState >= 1) finish(resolve);
          });

          if (generation !== generationRef.current) return;
          const durationMs =
            Number.isFinite(audio.duration) && audio.duration > 0
              ? audio.duration * 1000
              : Math.max(1400, countWords(text) * 300) / rate;

          const getElapsedMs = () => audio.currentTime * 1000;
          startWordProgress(text, durationMs, generation, onWord, { getElapsedMs });
          // Segments usually arrive well before this (prepare() fetches them
          // ahead of time for the current AND next step); when they land,
          // swap to segment-aware tracking without losing playback position —
          // getElapsedMs reads the real <audio> position, not a restarted timer.
          void loadTiming(text, rate).then((segments) => {
            if (generation !== generationRef.current || !segments.length) return;
            startWordProgress(text, durationMs, generation, onWord, {
              getElapsedMs,
              segments,
            });
          });

          audio.onended = () => {
            if (generation !== generationRef.current) return;
            clearProgress();
            onEnd();
          };
          audio.onerror = () => {
            if (generation !== generationRef.current) return;
            clearProgress();
            onEnd();
          };
          await audio.play();
        } catch {
          if (generation !== generationRef.current) return;
          speakBrowser(text, rate, generation, onEnd, onWord);
        }
      })();
    },
    [clearProgress, getAudio, loadCloudAudio, loadTiming, speakBrowser, startWordProgress],
  );

  const cancel = useCallback(() => {
    generationRef.current += 1;
    clearProgress();
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.onended = null;
      audio.onerror = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      window.speechSynthesis.onvoiceschanged = null;
    }
  }, [clearProgress]);

  useEffect(
    () => () => {
      cancel();
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    },
    [cancel],
  );

  return { speak, prepare, cancel };
}
