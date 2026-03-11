"use client";

import { useEffect, useRef } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

interface MathRendererProps {
  latex: string;
  display?: boolean;
  className?: string;
}

export default function MathRenderer({
  latex,
  display = false,
  className = "",
}: MathRendererProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (ref.current && latex) {
      try {
        katex.render(latex, ref.current, {
          displayMode: display,
          throwOnError: false,
          errorColor: "#ef4444",
          trust: (ctx: { command: string }) =>
            ctx.command === "\\htmlId" ||
            ctx.command === "\\htmlClass" ||
            ctx.command === "\\textcolor",
          strict: false,
          output: "htmlAndMathml",
        });
      } catch (e) {
        if (ref.current) {
          ref.current.textContent = latex;
        }
      }
    }
  }, [latex, display]);

  return (
    <span
      ref={ref}
      className={`${display ? "block text-center" : "inline"} ${className}`}
    />
  );
}
