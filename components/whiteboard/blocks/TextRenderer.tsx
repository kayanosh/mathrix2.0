"use client";

import type { TextBlock } from "@/types/whiteboard";
import MathRenderer from "@/components/MathRenderer";
import InlineMath from "@/components/InlineMath";
import HandwrittenInline from "@/components/whiteboard/HandwrittenInline";
import MathWriteIn from "@/components/whiteboard/MathWriteIn";
import { estimateTextWriteMs } from "@/lib/handwriting";

interface Props {
  block: TextBlock;
  /** true = write the content letter by letter (tutor overlay mode). */
  writeIn?: boolean;
}

export default function TextRenderer({ block, writeIn = false }: Props) {
  const isSection = !!block.section;
  return (
    <div
      className="rounded-xl p-5"
      style={
        isSection
          ? {
              background: "rgba(238,242,255,0.7)",
              border: "1px solid rgba(129,140,248,0.35)",
              borderLeft: "4px solid #6366f1",
            }
          : {
              background: "rgba(241,245,249,0.6)",
              border: "1px solid rgba(148,163,184,0.2)",
            }
      }
    >
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
