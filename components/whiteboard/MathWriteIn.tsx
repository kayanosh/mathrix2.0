"use client";

import { useEffect, useRef } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { estimateMathWriteMs, prefersReducedMotion } from "@/lib/handwriting";

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
 * Renders LaTeX via KaTeX, then reveals it symbol by symbol from left to
 * right — a handwriting "ink sweep". KaTeX renders atomically, so after
 * rendering we walk its HTML output, collect the visible leaf elements,
 * sort them in reading order, and stagger their opacity with the Web
 * Animations API (layout-safe: opacity never reflows).
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

    ordered.forEach((item, i) => {
      const anim = item.n.animate(
        [
          { opacity: 0, transform: "translateY(1px)" },
          { opacity: 1, transform: "translateY(0)" },
        ],
        {
          delay: startDelay + i * perLeaf,
          duration: Math.min(180, perLeaf + 90),
          easing: "ease-out",
          fill: "backwards",
        },
      );
      animsRef.current.push(anim);
    });

    return () => {
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
