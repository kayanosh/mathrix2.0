"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { lessonContentKey } from "@/lib/lesson-progress-key";

interface LessonDataLike {
  topic?: string;
  subject?: string;
  intro?: string;
  conclusion?: string;
  blocks?: Array<{ type: string }>;
}

interface UseLessonProgressParams {
  /** When false the hook is inert (no network calls). */
  enabled: boolean;
  data: LessonDataLike | null | undefined;
  /** Total number of steps/cards in the player. */
  totalSteps: number;
  kind?: string;
  title?: string | null;
  level?: string | null;
  tier?: string | null;
  /** Called once with a saved position (>0) when a resumable session is found. */
  onResume?: (position: number) => void;
}

/**
 * Persist and restore a lesson/solution playback position for signed-in users.
 * Everything fails soft: anonymous users and network errors are ignored so the
 * player never breaks because progress couldn't be saved or loaded.
 */
export function useLessonProgress({
  enabled,
  data,
  totalSteps,
  kind = "solve",
  title = null,
  level = null,
  tier = null,
  onResume,
}: UseLessonProgressParams) {
  const contentKey = useMemo(
    () => (data ? lessonContentKey(data) : ""),
    [data],
  );

  // Keep the latest onResume / metadata without re-triggering the load effect.
  const onResumeRef = useRef(onResume);
  const metaRef = useRef({
    kind,
    title,
    topic: data?.topic,
    subject: data?.subject,
    level,
    tier,
  });
  const resumedKeyRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refresh the mutable refs after each render (never during render).
  useEffect(() => {
    onResumeRef.current = onResume;
    metaRef.current = { kind, title, topic: data?.topic, subject: data?.subject, level, tier };
  });

  // Load a saved position once per content key.
  useEffect(() => {
    if (!enabled || !contentKey) return;
    let cancelled = false;

    fetch(`/api/lesson-progress?key=${encodeURIComponent(contentKey)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (cancelled || !json?.session) return;
        const pos = Number(json.session.last_position) || 0;
        if (pos > 0 && !json.session.completed && resumedKeyRef.current !== contentKey) {
          resumedKeyRef.current = contentKey;
          onResumeRef.current?.(pos);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [enabled, contentKey]);

  // Flush any pending save on unmount.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const save = useCallback(
    (position: number, completed: boolean) => {
      if (!enabled || !contentKey) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const meta = metaRef.current;
        fetch("/api/lesson-progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contentKey,
            position,
            completed,
            totalSteps,
            kind: meta.kind,
            title: meta.title || meta.topic || null,
            topic: meta.topic || null,
            subject: meta.subject || null,
            level: meta.level,
            tier: meta.tier,
          }),
        }).catch(() => {});
      }, 700);
    },
    [enabled, contentKey, totalSteps],
  );

  return { save, contentKey };
}
