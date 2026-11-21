"use client";

import { useEffect, useRef } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { estimateMathWriteMs, prefersReducedMotion } from "@/lib/handwriting";
import { tracePen } from "@/lib/ink-pen";

interface Props {
  latex: string;
  display?: boolean;
  className?: string;
  /** ms before the first symbol appears. */
  startDelay?: number;
  /** false = render instantly (static/card mode). */
  animate?: boolean;
}

/**
 * Renders LaTeX via KaTeX, then writes it on symbol by symbol from left to
 * right. KaTeX renders atomically, so after rendering we walk its HTML output,
 * collect the visible leaf elements, sort them in reading order, and uncover
 * each in turn with the Web Animations API (layout-safe: neither opacity nor
 * clip-path reflows). The teacher's pen is driven off the same schedule, so its
 * tip is on the glyph being drawn.
 */
export default function MathWriteIn({
  latex,
  display = false,
  className = "",
  startDelay = 0,
  animate = true,
}: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const animsRef = useRef<Animation[]>([]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !latex) return;

    try {
      katex.render(latex, el, {
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
    } catch {
      el.textContent = latex;
    }

    animsRef.current.forEach((a) => a.cancel());
    animsRef.current = [];

    if (!animate || prefersReducedMotion()) return;

    // Only the HTML output is visible (MathML is screen-reader only).
    const html = el.querySelector<HTMLElement>(".katex-html");
    if (!html || typeof html.animate !== "function") return;

    // Leaves = elements that actually draw ink: text-bearing spans, empty
    // rule spans (fraction bars, overlines) and whole SVGs (radical signs,
    // stretchy arrows — animated as one stroke).
    const leaves: Element[] = [];
    html.querySelectorAll("*").forEach((node) => {
      const tag = node.tagName.toLowerCase();
      if (tag === "svg") {
        leaves.push(node);
        return;
      }
      if (node.closest("svg")) return; // svg internals ride with their svg
      if (node.childElementCount === 0) leaves.push(node);
    });
    if (leaves.length === 0) return;

    // Reading order: bucket by row (display maths can stack lines), then x.
    const base = html.getBoundingClientRect();
    const ordered = leaves
      .map((n) => {
        const r = n.getBoundingClientRect();
        return { n, x: r.left - base.left, y: r.top - base.top };
      })
      .sort((a, b) => Math.round(a.y / 24) - Math.round(b.y / 24) || a.x - b.x);

    const totalMs = estimateMathWriteMs(latex);
    const perLeaf = totalMs / ordered.length;

    // Each glyph is uncovered from left to right, in step with the pen crossing
    // it, so the ink appears to come out of the nib. It used to fade in whole,
    // which reads as text appearing, not as writing. The insets are generous
    // above, below and to the left so an italic's overhang is never clipped;
    // only the right edge moves. Where a browser does not clip an inline box,
    // the glyph simply appears as the pen reaches it.
    ordered.forEach((item, i) => {
      const anim = item.n.animate(
        [
          { opacity: 0, clipPath: "inset(-30% 100% -30% -20%)" },
          { opacity: 1, clipPath: "inset(-30% 100% -30% -20%)", offset: 0.02 },
          { opacity: 1, clipPath: "inset(-30% -40% -30% -20%)" },
        ],
        {
          delay: startDelay + i * perLeaf,
          duration: Math.max(70, perLeaf),
          easing: "linear",
          fill: "backwards",
        },
      );
      animsRef.current.push(anim);
    });

    // The pen follows the same schedule, glyph for glyph.
    const stopPen = tracePen(
      ordered.map((item, i) => ({
        element: item.n,
        at: startDelay + i * perLeaf,
        duration: perLeaf,
      })),
    );

    return () => {
      stopPen();
      animsRef.current.forEach((a) => a.cancel());
      animsRef.current = [];
    };
  }, [latex, display, startDelay, animate]);

  return (
    <span
      ref={ref}
      className={`${display ? "block text-center" : "inline"} ${className}`}
    />
  );
}
