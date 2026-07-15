/** @jest-environment jsdom */

import React from "react";
import "@testing-library/jest-dom";
import { render } from "@testing-library/react";
import InlineMath from "@/components/InlineMath";
import { BarModelRenderer } from "@/components/whiteboard/blocks/KS2TeachingVisuals";
import { inlineMathToPlainText, splitInlineMath } from "@/lib/inline-math";

describe("lesson inline maths delimiters", () => {
  it("renders paired and stray delimiters without displaying dollar signs", () => {
    const { container } = render(
      React.createElement(InlineMath, {
        text: "$6$ eighths, $$3$$ groups, and a stray $ delimiter",
      }),
    );

    expect(container.textContent).not.toContain("$");
    expect(container.querySelectorAll(".katex").length).toBeGreaterThan(0);
    expect(splitInlineMath("Group $1$")).toEqual([
      { content: "Group ", isMath: false },
      { content: "1", isMath: true },
    ]);
    expect(inlineMathToPlainText("Group $2$")).toBe("Group 2");
  });

  it("does not leak delimiters from KS2 bar-model captions or labels", () => {
    const { container } = render(
      React.createElement(BarModelRenderer, {
        baseDelay: 0,
        block: {
          type: "bar_model",
          caption: "$6$ eighths shared into $3$ equal groups gives $2$ eighths in each group.",
          parts: [
            { label: "Group $1$" },
            { label: "Group $2$" },
            { label: "Group $3$" },
          ],
        },
      }),
    );

    expect(container.textContent).not.toContain("$");
    expect(container.querySelectorAll(".katex").length).toBeGreaterThanOrEqual(6);
  });
});
