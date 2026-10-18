/** @jest-environment jsdom */

import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import PenOverlay, { seededWobble } from "@/components/whiteboard/tutor/PenOverlay";
import { teacherTargetIndex } from "@/lib/teacher-pointer";

/**
 * PenOverlay replaced TeacherPointer, whose arrow was positioned in VIEWPORT
 * coordinates while the ink it was supposedly drawing lived in container ones —
 * two spaces that could never meet.
 */
describe("PenOverlay", () => {
  it("renders the pen without an attached caption", () => {
    const { container } = render(
      React.createElement(PenOverlay, {
        x: 120,
        y: 80,
        visible: true,
        mode: "write" as const,
      }),
    );

    expect(container.querySelector("svg")).toBeInTheDocument();
    expect(screen.queryByText("Watch this")).not.toBeInTheDocument();
    expect(screen.queryByText("Look here")).not.toBeInTheDocument();
    expect(screen.queryByText("Your turn")).not.toBeInTheDocument();
  });

  /**
   * The whole point of the move. `fixed` positions against the viewport, so the
   * pen could not scroll with the board and would float over page chrome once
   * the board scrolled away — the reason the inline variant needed a bounds
   * guard at all.
   */
  it("positions itself inside the board, not against the viewport", () => {
    const { container } = render(
      React.createElement(PenOverlay, { x: 10, y: 10, visible: true }),
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain("absolute");
    expect(root.className).not.toContain("fixed");
  });

  /**
   * A replay must draw the identical wobble. Seeding from the anchor means a
   * pupil watching a step twice sees the same hand, not a different jitter.
   */
  it("is deterministic for a given seed and differs across seeds", () => {
    // Asserted on the generator, not the markup: these values go to
    // framer-motion's `animate` prop, which jsdom never renders, so a DOM
    // comparison would pass for both seeds and prove nothing.
    expect(seededWobble("cue-1:0")).toEqual(seededWobble("cue-1:0"));
    expect(seededWobble("cue-1:0")).not.toEqual(seededWobble("cue-1:3"));
  });

  it("keeps the wobble small enough to read as a hand, not a glitch", () => {
    const { dx, dy } = seededWobble("cue-2:1");
    for (const v of [...dx, ...dy]) {
      expect(Math.abs(v)).toBeLessThanOrEqual(2);
    }
    // Loops back to the start, or the pen visibly jumps each cycle.
    expect(dx[dx.length - 1]).toBe(dx[0]);
    expect(dy[dy.length - 1]).toBe(dy[0]);
  });

  it("hides without unmounting, so it can animate back in", () => {
    const { container } = render(
      React.createElement(PenOverlay, { x: 0, y: 0, visible: false }),
    );
    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});

/**
 * DEF-004: the cursor pointed at the wrong thing during playback.
 *
 * Column-method anchors are labelled with single DIGITS, which repeat across
 * cells, so matching narration words against them picked a cell by
 * coincidence. Worse, normalizedWords kept trailing punctuation, so the spoken
 * "5." never matched the label "5" — and a stale match within ±4 words then
 * outranked everything, pinning the cursor to one cell for an entire step.
 *
 * Those anchors already carry an authored pen order in `sequence`
 * (data-teacher-sequence, set from the step's cellKeys/carryKeys), which is
 * the real teaching order.
 */
describe("teacherTargetIndex — authored order vs word matching (DEF-004)", () => {
  // The phase in which the teacher writes and talks at the same time.
  const speak = "perform" as const;

  it("advances through digit anchors in pen order instead of pinning to one", () => {
    const targets = [
      { label: "6", sequence: 0 }, // ones cell, written first
      { label: "5", sequence: 1 }, // carry slot
    ];
    const narration = "8 times 7 is 56. Write 6 and carry 5.";
    const picks = narration
      .split(/\s+/)
      .map((_, w) => teacherTargetIndex(targets, narration, w, speak));

    // Previously every word resolved to 0 — the carry was never pointed at.
    expect(new Set(picks).size).toBeGreaterThan(1);
    expect(picks[0]).toBe(0);
    expect(picks[picks.length - 1]).toBe(1);
    // Pen order must be monotonic: the cursor never goes backwards.
    expect([...picks]).toEqual([...picks].sort((a, b) => a - b));
  });

  it("strips trailing punctuation so a spoken '5.' can match the label '5'", () => {
    const targets = [
      { label: "sum", sequence: 0 },
      { label: "total", sequence: 1 },
    ];
    // "total." with a full stop must still match the "total" anchor.
    const narration = "First find the sum, then write the total.";
    const words = narration.split(/\s+/);
    expect(teacherTargetIndex(targets, narration, words.length - 1, speak)).toBe(1);
  });

  it("still uses word matching when labels are distinctive", () => {
    const targets = [
      { label: "gravity", sequence: 0 },
      { label: "friction", sequence: 1 },
    ];
    const narration = "The gravity arrow points down while friction acts sideways.";
    const words = narration.split(/\s+/);
    expect(teacherTargetIndex(targets, narration, words.indexOf("gravity"), speak)).toBe(0);
    expect(teacherTargetIndex(targets, narration, words.indexOf("friction"), speak)).toBe(1);
  });

  it("never points past the last anchor", () => {
    const targets = [
      { label: "4", sequence: 0 },
      { label: "2", sequence: 1 },
      { label: "9", sequence: 2 },
    ];
    const narration = "Write 4 then 2 then 9.";
    for (let w = 0; w < 40; w++) {
      const idx = teacherTargetIndex(targets, narration, w, speak);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThanOrEqual(2);
    }
  });
});
