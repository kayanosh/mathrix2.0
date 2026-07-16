"use client";

import type { TextBlock } from "@/types/whiteboard";
import MathRenderer from "@/components/MathRenderer";
import InlineMath from "@/components/InlineMath";
import HandwrittenInline from "@/components/whiteboard/HandwrittenInline";
import MathWriteIn from "@/components/whiteboard/MathWriteIn";
import { estimateTextWriteMs } from "@/lib/handwriting";
import { looksLikeInternalPayload } from "@/lib/gcse-lesson-quality";
import type { LessonSection } from "@/types/whiteboard";

interface Props {
  block: TextBlock;
  /** true = write the content letter by letter (tutor overlay mode). */
  writeIn?: boolean;
}

const SECTION_META: Record<
  LessonSection,
  { stage: string; label: string; accent: string; background: string }
> = {
  objective: { stage: "Start", label: "Lesson goal", accent: "#4f46e5", background: "rgba(238,242,255,0.75)" },
  prerequisites: { stage: "Recall", label: "Get ready", accent: "#7c3aed", background: "rgba(245,243,255,0.75)" },
  vocabulary: { stage: "Language", label: "Key vocabulary", accent: "#0f766e", background: "rgba(240,253,250,0.75)" },
  rule: { stage: "Learn", label: "Core idea", accent: "#0369a1", background: "rgba(240,249,255,0.78)" },
  example: { stage: "I do", label: "Worked example", accent: "#4f46e5", background: "rgba(238,242,255,0.75)" },
  guided: { stage: "We do", label: "Guided practice", accent: "#c2410c", background: "rgba(255,247,237,0.78)" },
  practice: { stage: "You do", label: "Independent practice", accent: "#15803d", background: "rgba(240,253,244,0.78)" },
  check: { stage: "Check", label: "Check your understanding", accent: "#047857", background: "rgba(236,253,245,0.8)" },
  mistakes: { stage: "Watch out", label: "Common mistakes", accent: "#b91c1c", background: "rgba(254,242,242,0.78)" },
  recap: { stage: "Finish", label: "Quick recap", accent: "#4338ca", background: "rgba(238,242,255,0.75)" },
};

export default function TextRenderer({ block, writeIn = false }: Props) {
  const isSection = !!block.section;
  const meta = block.section ? SECTION_META[block.section] : null;

  if (looksLikeInternalPayload(block.content)) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5" role="alert">
        <h3 className="font-semibold text-amber-900">This lesson needs rebuilding</h3>
        <p className="mt-1 text-sm text-amber-800">
          The lesson format was not safe to display. Please try again so I can teach it clearly.
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl p-5"
      style={
        isSection
          ? {
              background: meta?.background || "rgba(238,242,255,0.7)",
              border: "1px solid rgba(129,140,248,0.35)",
              borderLeft: `4px solid ${meta?.accent || "#6366f1"}`,
            }
          : {
              background: "rgba(241,245,249,0.6)",
              border: "1px solid rgba(148,163,184,0.2)",
            }
      }
    >
      {meta && (
        <div className="mb-2 flex items-center gap-2">
          <span
            className="rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-white"
            style={{ background: meta.accent }}
          >
            {meta.stage}
          </span>
          <span className="text-xs font-semibold text-slate-500">{meta.label}</span>
        </div>
      )}
      {block.heading && (
        <h3 className="text-indigo-700 font-semibold text-[15px] mb-2 leading-snug">
          <InlineMath text={block.heading} />
        </h3>
      )}
      <p className="text-slate-700 text-base leading-relaxed whitespace-pre-wrap font-medium">
        {writeIn ? (
          <HandwrittenInline text={block.content} />
        ) : (
          <InlineMath text={block.content} />
        )}
      </p>
      {block.latex && (
        <div className="mt-2 flex justify-center">
          {writeIn ? (
            <MathWriteIn
              latex={block.latex}
              display
              startDelay={estimateTextWriteMs(block.content)}
            />
          ) : (
            <MathRenderer latex={block.latex} display />
          )}
        </div>
      )}
    </div>
  );
}
