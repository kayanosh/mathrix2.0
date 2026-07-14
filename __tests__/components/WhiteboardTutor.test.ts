/** @jest-environment jsdom */

import React from "react";
import "@testing-library/jest-dom";
import { act, fireEvent, render, screen } from "@testing-library/react";
import WhiteboardTutor from "@/components/WhiteboardTutor";
import { estimateTextWriteMs } from "@/lib/handwriting";
import type { WhiteboardResponse } from "@/types/whiteboard";

class FakeAudio {
  readyState = 1;
  duration = 0.02;
  src = "";
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;

  pause() {}
  addEventListener() {}
  removeEventListener() {}
  play() {
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
      value: jest.fn(async () => ({
        ok: true,
        blob: async () => new Blob(["audio"], { type: "audio/mpeg" }),
      })),
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

    fireEvent.click(screen.getByLabelText("Next step"));
    const activeCard = screen.getByText("Add the ones").closest("article");
    const preparedRequests = (globalThis.fetch as jest.Mock).mock.calls.length;
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

    await tick(480);
    expect(screen.getByRole("dialog")).toHaveAttribute(
      "data-playback-phase",
      "write",
    );

    await tick(estimateTextWriteMs(data.teachingSteps![0].explanation));
    expect(screen.getByRole("dialog")).toHaveAttribute(
      "data-playback-phase",
      "explain",
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
    expect(globalThis.fetch).toHaveBeenCalledTimes(preparedRequests);
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
});
