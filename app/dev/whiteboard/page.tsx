"use client";

import { useMemo, useState } from "react";
import { notFound } from "next/navigation";
import WhiteboardTutor from "@/components/WhiteboardTutor";
import { applyMethodBuilderToWhiteboard } from "@/lib/methods/apply-builder";
import type { WhiteboardResponse } from "@/types/whiteboard";

/**
 * Development-only stage for the whiteboard tutor: a fixed lesson, no login,
 * no model call and no network — so the pen, pointer and timing can be worked
 * on and watched without spending anything.
 *
 *   /dev/whiteboard            3x + 7 = 25
 *   /dev/whiteboard?q=...      any question a step builder can read
 *
 * Not available in production builds.
 */
const SAMPLES: Record<string, string> = {
  linear: "Solve 3x + 7 = 25",
  quadratic: "Solve x^2 - 5x - 6 = 0",
  column: "456 + 278",
  multiply: "23 × 47",
};

export default function WhiteboardDevPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const [open, setOpen] = useState(true);
  const [question, setQuestion] = useState(() => {
    if (typeof window === "undefined") return SAMPLES.linear;
    const params = new URLSearchParams(window.location.search);
    return params.get("q") || SAMPLES[params.get("sample") || "linear"] || SAMPLES.linear;
  });

  const data = useMemo<WhiteboardResponse>(
    () =>
      applyMethodBuilderToWhiteboard(
        {
          intro: "Let's work through this one together.",
          blocks: [],
          conclusion: "",
          subject: "Maths",
          topic: "Whiteboard test",
        },
        question,
      ),
    [question],
  );

  return (
    <main className="mx-auto max-w-xl space-y-4 p-6">
      <h1 className="text-lg font-semibold">Whiteboard test stage</h1>
      <p className="text-sm text-slate-600">{question}</p>
      <div className="flex flex-wrap gap-2">
        {Object.entries(SAMPLES).map(([name, sample]) => (
          <button
            key={name}
            type="button"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            onClick={() => {
              setQuestion(sample);
              setOpen(true);
            }}
          >
            {name}
          </button>
        ))}
        <button
          type="button"
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white"
          onClick={() => setOpen(true)}
        >
          Open whiteboard
        </button>
      </div>
      {open && <WhiteboardTutor key={question} data={data} onClose={() => setOpen(false)} />}
    </main>
  );
}
