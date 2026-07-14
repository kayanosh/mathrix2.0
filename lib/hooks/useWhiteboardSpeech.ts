"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  countWords,
  wordIndexAtProgress,
} from "@/components/whiteboard/tutor/SpeechHighlighter";

const audioBlobCache = new Map<string, Blob>();
const pendingAudio = new Map<string, Promise<Blob>>();
const MAX_AUDIO_CACHE = 100;

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
    ) => {
      clearProgress();
      const start = performance.now();
      progressTimer.current = setInterval(() => {
        if (generation !== generationRef.current) {
          clearProgress();
          return;
        }
        const elapsed = performance.now() - start;
        onWord(wordIndexAtProgress(text, elapsed, durationMs));
        if (elapsed >= durationMs) clearProgress();
      }, 80);
    },
    [clearProgress],
  );

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
      } catch {
        // The live speak call will use the browser voice if cloud TTS is down.
      }
    },
    [loadCloudAudio],
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

          startWordProgress(text, durationMs, generation, onWord);
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
    [clearProgress, getAudio, loadCloudAudio, speakBrowser, startWordProgress],
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
