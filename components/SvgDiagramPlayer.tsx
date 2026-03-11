"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, RotateCcw, Volume2 } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface AnimateInstruction {
  targetId: string;
  type: "moveAlongPath" | "fadeIn" | "fadeOut" | "pulse" | "colorTo";
  params: Record<string, unknown>;
  startMs: number;
  durationMs: number;
}

export interface DiagramStep {
  svg: string;
  narration: string;
  highlightIds: string[];
  animate: AnimateInstruction[];
}

export interface DiagramData {
  steps: DiagramStep[];
}

interface Props {
  data: DiagramData;
  /** Optional equation label shown at the top */
  equation?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Inject a glow filter into an SVG string and apply it to highlighted IDs.
 * Also ensures hidden elements (arrow_move, arrow_label) start invisible
 * so the animations can fade them in.
 */
function prepareSvg(
  rawSvg: string,
  highlightIds: string[],
  animateItems: AnimateInstruction[]
): string {
  // IDs that start with opacity:0 (will be faded in by animations)
  const fadeInIds = animateItems
    .filter((a) => a.type === "fadeIn")
    .map((a) => a.targetId);

  let svg = rawSvg;

  // Inject glow filter definition just after the opening <svg …>
  const filterDef = `
    <defs>
      <filter id="__glow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="6" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>`;

  svg = svg.replace(/(<svg[^>]*>)/, `$1${filterDef}`);

  // Apply glow filter to each highlighted element
  highlightIds.forEach((id) => {
    const regex = new RegExp(`(id=['"]${id}['"][^/]*)`, "g");
    svg = svg.replace(regex, `$1 filter="url(#__glow)"`);
  });

  // Set initial opacity:0 on elements that will be faded in
  fadeInIds.forEach((id) => {
    const regex = new RegExp(`(id=['"]${id}['"])`, "g");
    svg = svg.replace(regex, `$1 style="opacity:0"`);
  });

  return svg;
}

/** Run Web Animations API on SVG elements inside a container */
function runAnimations(
  container: HTMLElement,
  items: AnimateInstruction[]
): (() => void) {
  const timeouts: ReturnType<typeof setTimeout>[] = [];
  const webAnims: Animation[] = [];

  items.forEach((anim) => {
    const el = container.querySelector<SVGElement>(`#${anim.targetId}`);
    if (!el) return;

    const delay = anim.startMs;
    const duration = anim.durationMs;
    const opts: KeyframeAnimationOptions = {
      delay,
      duration,
      fill: "forwards",
      easing: "ease-out",
    };

    switch (anim.type) {
      case "fadeIn": {
        const a = el.animate([{ opacity: 0 }, { opacity: 1 }], opts);
        webAnims.push(a);
        break;
      }
      case "fadeOut": {
        const a = el.animate([{ opacity: 1 }, { opacity: 0 }], opts);
        webAnims.push(a);
        break;
      }
      case "pulse": {
        const a = el.animate(
          [
            { opacity: 1 },
            { opacity: 0.35 },
            { opacity: 1 },
            { opacity: 0.35 },
            { opacity: 1 },
          ],
          { ...opts, easing: "ease-in-out" }
        );
        webAnims.push(a);
        break;
      }
      case "colorTo": {
        const color = (anim.params as { color?: string }).color ?? "#1488fc";
        const t = setTimeout(() => {
          el.style.fill = color;
          el.animate(
            [{ opacity: 0.4 }, { opacity: 1 }],
            { duration: 300, fill: "forwards" }
          );
        }, delay);
        timeouts.push(t);
        break;
      }
      case "moveAlongPath": {
        // Animate opacity fade-in as a fallback (true path-following
        // requires an actual motion path which varies per SVG)
        const a = el.animate([{ opacity: 0 }, { opacity: 1 }], opts);
        webAnims.push(a);
        break;
      }
    }
  });

  return () => {
    timeouts.forEach(clearTimeout);
    webAnims.forEach((a) => a.cancel());
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SvgDiagramPlayer({ data, equation }: Props) {
  const [current, setCurrent] = useState(0);
  const [replayKey, setReplayKey] = useState(0);
  const svgRef = useRef<HTMLDivElement>(null);
  const total = data.steps.length;
  const step = data.steps[current];

  const preparedSvg = prepareSvg(step.svg, step.highlightIds, step.animate);

  // Run animations whenever step or replayKey changes
  useEffect(() => {
    if (!svgRef.current) return;
    const cleanup = runAnimations(svgRef.current, step.animate);
    return cleanup;
  }, [current, replayKey, step.animate]);

  const goTo = useCallback(
    (index: number) => {
      setCurrent(Math.max(0, Math.min(total - 1, index)));
      setReplayKey((k) => k + 1);
    },
    [total]
  );

  const replay = () => setReplayKey((k) => k + 1);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") goTo(current + 1);
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") goTo(current - 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [current, goTo]);

  const isLast = current === total - 1;

  return (
    <div
      className="flex flex-col h-full w-full max-w-sm mx-auto select-none"
      style={{ background: "#07070e" }}
    >
      {/* ── Header ─────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div className="flex items-center gap-2">
          {equation && (
            <span className="text-xs font-mono text-gray-400 bg-white/5 px-2 py-1 rounded-lg border border-white/10">
              {equation}
            </span>
          )}
        </div>

        {/* Step dots */}
        <div className="flex items-center gap-1.5">
          {data.steps.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === current ? 20 : 7,
                height: 7,
                background:
                  i === current
                    ? "#818cf8"
                    : i < current
                    ? "rgba(129,140,248,0.4)"
                    : "rgba(255,255,255,0.15)",
              }}
            />
          ))}
        </div>

        <button
          onClick={replay}
          className="text-gray-600 hover:text-indigo-400 transition-colors p-1.5 rounded-lg hover:bg-white/5"
        >
          <RotateCcw size={14} />
        </button>
      </div>

      {/* ── SVG area ───────────────────────────────── */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${current}-${replayKey}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="absolute inset-0 flex items-center justify-center p-4"
          >
            <div
              ref={svgRef}
              className="w-full h-full"
              style={{ aspectRatio: "1080/1920", maxHeight: "100%" }}
              dangerouslySetInnerHTML={{ __html: preparedSvg }}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Narration card ─────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0 mx-3 mb-3 rounded-xl px-4 py-3 flex items-start gap-3"
          style={{
            background: "rgba(129,140,248,0.08)",
            border: "1px solid rgba(129,140,248,0.2)",
          }}
        >
          <Volume2 size={15} className="text-indigo-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-gray-200 leading-relaxed">{step.narration}</p>
        </motion.div>
      </AnimatePresence>

      {/* ── Navigation ─────────────────────────────── */}
      <div
        className="flex items-center justify-between px-3 pb-4 flex-shrink-0 gap-2"
      >
        <button
          onClick={() => goTo(current - 1)}
          disabled={current === 0}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#9ca3af" }}
        >
          <ChevronLeft size={16} /> Back
        </button>

        <span className="text-xs text-gray-600 tabular-nums">
          {current + 1} / {total}
        </span>

        <button
          onClick={() => goTo(current + 1)}
          disabled={isLast}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          style={
            isLast
              ? { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#9ca3af" }
              : {
                  background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                  boxShadow: "0 4px 14px rgba(99,102,241,0.4)",
                  color: "white",
                }
          }
        >
          {isLast ? "Done" : "Next"} <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
