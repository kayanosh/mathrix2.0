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
  return (
    <div className="rounded-xl p-5" style={{
      background: "rgba(241,245,249,0.6)",
      border: "1px solid rgba(148,163,184,0.2)",
    }}>
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
