/** @jest-environment jsdom */

import React from "react";
import "@testing-library/jest-dom";
import { act, fireEvent, render, screen } from "@testing-library/react";
import WhiteboardTutor from "@/components/WhiteboardTutor";
import { estimateTextWriteMs } from "@/lib/handwriting";
import type { WhiteboardResponse } from "@/types/whiteboard";

/** Records transport calls so a test can tell resume from re-speak. */
const audioLog: { pauses: number; plays: number } = { pauses: 0, plays: 0 };

class FakeAudio {
  readyState = 1;
  duration = 0.02;
  currentTime = 0;
  playbackRate = 1;
  src = "";
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;

  pause() {
    audioLog.pauses += 1;
  }
  addEventListener() {}
  removeEventListener() {}
  play() {
    audioLog.plays += 1;
    setTimeout(() => this.onended?.(), 20);
    return Promise.resolve();
  }
}

const data: WhiteboardResponse = {
  intro: "Let us solve this together.",
  blocks: [{ type: "text", content: "7 + 8 = 15" }],
  teachingSteps: [
    {
      title: "Add the ones",
      explanation: "Add 7 and 8 to make 15.",
      narration: "Add 7 and 8 to make 15.",
      why: "The ones column must be completed first.",
      check: "Which digit belongs in the ones column?",
      blockIndex: 0,
    },
  ],
  conclusion: "The answer is 15.",
};

async function tick(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("WhiteboardTutor playback", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    audioLog.pauses = 0;
    audioLog.plays = 0;
    Object.defineProperty(globalThis, "Audio", {
      configurable: true,
      value: FakeAudio,
    });
    Object.defineProperty(globalThis.URL, "createObjectURL", {
      configurable: true,
      value: jest.fn(() => "blob:test-audio"),
    });
    Object.defineProperty(globalThis.URL, "revokeObjectURL", {
      configurable: true,
      value: jest.fn(),
    });
    Object.defineProperty(globalThis, "ResizeObserver", {
      configurable: true,
      value: class {
        observe() {}
        disconnect() {}
      },
    });
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      value: jest.fn(async (url: string) => {
        if (typeof url === "string" && url.includes("/api/tts-timing")) {
          return { ok: true, json: async () => ({ segments: [] }) };
        }
        return {
          ok: true,
          blob: async () => new Blob(["audio"], { type: "audio/mpeg" }),
        };
      }),
    });
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: jest.fn(() => ({
        matches: false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      })),
    });
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it("moves through focus, pointer, writing, explanation, check, and pupil pause", async () => {
    render(React.createElement(WhiteboardTutor, { data, onClose: jest.fn() }));

    // Only the narration-audio fetches are what this test cares about (the
    // prefetch/de-dup behaviour of loadCloudAudio) — /api/tts-timing calls
    // (DEF-002 segment sync) are a separate, independently-cached concern.
    const audioFetchCount = () =>
      (globalThis.fetch as jest.Mock).mock.calls.filter(
        ([url]) => typeof url === "string" && url.includes("/api/tts") && !url.includes("timing"),
      ).length;

    fireEvent.click(screen.getByLabelText("Next step"));
    const activeCard = screen.getByText("Add the ones").closest("article");
    const preparedRequests = audioFetchCount();
    expect(screen.getByRole("dialog")).toHaveAttribute(
      "data-playback-phase",
      "focus",
    );
    expect(screen.getByLabelText("Play")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Play"));
    await tick(260);
    expect(screen.getByRole("dialog")).toHaveAttribute(
      "data-playback-phase",
      "point",
    );

    // `write` and `explain` are one `perform` phase now. The old sequence sat
    // in a silent `write` for the full ink estimate before any audio began; the
    // player must not wait for ink before speaking, so there is deliberately no
    // estimateTextWriteMs tick between `point` and speech starting.
    await tick(480);
    expect(screen.getByRole("dialog")).toHaveAttribute(
      "data-playback-phase",
      "perform",
    );

    await tick(25);
    expect(screen.getByRole("dialog")).toHaveAttribute(
      "data-playback-phase",
      "check",
    );
    expect(screen.getAllByText("Quick check")[0].parentElement).toHaveClass(
      "opacity-100",
    );

    await tick(25);
    expect(screen.getByRole("dialog")).toHaveAttribute(
      "data-playback-phase",
      "pupil_pause",
    );
    expect(screen.getByText("Add the ones").closest("article")).toBe(activeCard);
    expect(screen.getByText("Your thinking time")).toBeInTheDocument();
    expect(audioFetchCount()).toBe(preparedRequests);
  });

  it("holds the current phase while paused", async () => {
    render(React.createElement(WhiteboardTutor, { data, onClose: jest.fn() }));
    fireEvent.click(screen.getByLabelText("Pause"));
    const phase = screen.getByRole("dialog").getAttribute("data-playback-phase");

    await tick(10_000);

    expect(screen.getByRole("dialog")).toHaveAttribute(
      "data-playback-phase",
      phase,
    );
  });

  /**
   * Pausing used to call cancel(), which bumped the speech generation and left
   * resume with no option but to speak() the line again — so a pupil who
   * paused half way through a sentence heard it restart from the beginning.
   * The clip is now held and resumed in place, which is observable as: no new
   * narration request on resume, and a second play() on the same element.
   */
  it("resumes a paused sentence instead of re-speaking it", async () => {
    render(React.createElement(WhiteboardTutor, { data, onClose: jest.fn() }));

    // Counting /api/tts calls would NOT distinguish the two behaviours: the
    // blob is already in the module-level audio cache, so even a full re-speak
    // fetches nothing. Attaching a clip to the element is what differs —
    // speak() always creates a fresh object URL and reassigns `src`, resume()
    // touches neither.
    const clipAttachments = () =>
      (globalThis.URL.createObjectURL as jest.Mock).mock.calls.length;

    fireEvent.click(screen.getByLabelText("Next step"));
    fireEvent.click(screen.getByLabelText("Play"));
    await tick(260);
    await tick(480);
    expect(screen.getByRole("dialog")).toHaveAttribute(
      "data-playback-phase",
      "perform",
    );

    const attachmentsBeforePause = clipAttachments();
    const playsBeforePause = audioLog.plays;

    fireEvent.click(screen.getByLabelText("Pause"));
    await tick(5);

    // Still on the same step, and the element was actually paused.
    expect(screen.getByRole("dialog")).toHaveAttribute(
      "data-playback-phase",
      "perform",
    );
    expect(audioLog.pauses).toBeGreaterThan(0);

    fireEvent.click(screen.getByLabelText("Play"));
    await tick(5);

    // The decisive assertion: no new clip was attached, so the existing audio
    // was continued in place rather than the sentence being started again.
    expect(clipAttachments()).toBe(attachmentsBeforePause);
    expect(audioLog.plays).toBeGreaterThan(playsBeforePause);
  });
});

/**
 * The inline variant embeds the same player inside a lesson page. Every modal
 * behaviour the overlay relies on is wrong there, and each of these would be
 * invisible in a passing build but obvious to a pupil.
 */
describe("WhiteboardTutor inline variant", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    audioLog.pauses = 0;
    audioLog.plays = 0;
    Object.defineProperty(globalThis, "Audio", {
      configurable: true,
      value: FakeAudio,
    });
    Object.defineProperty(globalThis.URL, "createObjectURL", {
      configurable: true,
      value: jest.fn(() => "blob:test-audio"),
    });
    Object.defineProperty(globalThis.URL, "revokeObjectURL", {
      configurable: true,
      value: jest.fn(),
    });
    Object.defineProperty(globalThis, "ResizeObserver", {
      configurable: true,
      value: class {
        observe() {}
        disconnect() {}
      },
    });
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      value: jest.fn(async (url: string) => {
        if (typeof url === "string" && url.includes("/api/tts-timing")) {
          return { ok: true, json: async () => ({ segments: [] }) };
        }
        return {
          ok: true,
          blob: async () => new Blob(["audio"], { type: "audio/mpeg" }),
        };
      }),
    });
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: jest.fn(() => ({
        matches: false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      })),
    });
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    document.body.style.overflow = "";
  });

  /**
   * A browser refuses audio no gesture asked for, so an inline player that
   * "autoplayed" would fail silently and then narrate the wrong step later.
   */
  it("starts paused inline and playing in the overlay", () => {
    const { unmount } = render(
      React.createElement(WhiteboardTutor, { data, variant: "inline" as const }),
    );
    expect(screen.getByLabelText("Play")).toBeInTheDocument();
    unmount();

    render(
      React.createElement(WhiteboardTutor, { data, onClose: jest.fn() }),
    );
    expect(screen.getByLabelText("Pause")).toBeInTheDocument();
  });

  it("does not lock body scroll inline, but does in the overlay", () => {
    const { unmount } = render(
      React.createElement(WhiteboardTutor, { data, variant: "inline" as const }),
    );
    expect(document.body.style.overflow).not.toBe("hidden");
    unmount();

    const overlay = render(
      React.createElement(WhiteboardTutor, { data, onClose: jest.fn() }),
    );
    expect(document.body.style.overflow).toBe("hidden");
    overlay.unmount();
    // And it must put the page back, or the lesson stays frozen after closing.
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("is a region inline, not a modal dialog", () => {
    render(
      React.createElement(WhiteboardTutor, { data, variant: "inline" as const }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    const root = document.querySelector('[data-variant="inline"]');
    expect(root).not.toBeNull();
    expect(root).not.toHaveAttribute("aria-modal");
  });

  /**
   * NOTE this currently holds for a structural reason as well as the gate:
   * inline renders no close button, so the ref the overlay focuses is null
   * either way. Verified by removing the gate — this test still passed while
   * the scroll-lock and Escape tests failed. Kept as a regression guard in
   * case anything ever renders a focusable control inline on mount.
   */
  it("does not steal focus inline", () => {
    const outside = document.createElement("button");
    document.body.appendChild(outside);
    outside.focus();
    expect(document.activeElement).toBe(outside);

    render(
      React.createElement(WhiteboardTutor, { data, variant: "inline" as const }),
    );
    expect(document.activeElement).toBe(outside);
    outside.remove();
  });

  it("offers expand instead of close inline, and calls it", () => {
    const onExpand = jest.fn();
    render(
      React.createElement(WhiteboardTutor, {
        data,
        variant: "inline" as const,
        onExpand,
      }),
    );
    expect(screen.queryByLabelText("Close tutor")).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Expand to full screen"));
    expect(onExpand).toHaveBeenCalledTimes(1);
  });

  /** A global Escape handler inline would hijack a key the page may own. */
  it("does not close on Escape inline", () => {
    const onClose = jest.fn();
    render(
      React.createElement(WhiteboardTutor, {
        data,
        variant: "inline" as const,
        onClose,
      }),
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });
});
