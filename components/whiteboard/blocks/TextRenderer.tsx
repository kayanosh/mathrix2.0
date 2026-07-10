"use client";

import type { TextBlock } from "@/types/whiteboard";
import MathRenderer from "@/components/MathRenderer";
import InlineMath from "@/components/InlineMath";

interface Props {
  block: TextBlock;
}

export default function TextRenderer({ block }: Props) {
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
        <InlineMath text={block.content} />
      </p>
      {block.latex && (
        <div className="mt-2 flex justify-center">
          <MathRenderer latex={block.latex} display />
        </div>
      )}
    </div>
  );
}
