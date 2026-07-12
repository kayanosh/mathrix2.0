"use client";

import type { RefObject } from "react";
import TeacherMarkOverlay from "@/components/whiteboard/TeacherMarkOverlay";
import type { TeacherMark } from "@/types/whiteboard";
import { estimateMathWriteMs } from "@/lib/handwriting";

interface Props {
  containerRef: RefObject<HTMLDivElement | null>;
  marks?: TeacherMark[];
  /** LaTeX being written — used to delay marks until ink finishes */
  latexAfter?: string;
  active: boolean;
}

/**
 * Schedules teacher pen marks (circle / underline / box) after the
 * mathematical writing finishes — the "drawing" layer of the lesson.
 */
export default function DrawingEngine({
  containerRef,
  marks,
  latexAfter,
  active,
}: Props) {
  if (!active || !marks?.length) return null;

  const baseDelay = latexAfter
    ? estimateMathWriteMs(latexAfter) / 1000 + 0.25
    : 0.45;

  return (
    <>
      {marks.map((mark, mi) => (
        <TeacherMarkOverlay
          key={mark.targetId || mi}
          containerRef={containerRef}
          mark={mark}
          delay={baseDelay + mi * 0.4}
        />
      ))}
    </>
  );
}
