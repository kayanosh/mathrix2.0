"use client";

import type { TextBlock } from "@/types/whiteboard";
import MathRenderer from "@/components/MathRenderer";
import InlineMath from "@/components/InlineMath";

interface Props {
  block: TextBlock;
}

export default function TextRenderer({ block }: Props) {
  return (
    <div className="rounded-xl p-5" style={{
      background: "rgba(241,245,249,0.6)",
      border: "1px solid rgba(148,163,184,0.2)",
    }}>
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
