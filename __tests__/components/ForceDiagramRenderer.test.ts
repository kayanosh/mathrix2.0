/** @jest-environment jsdom */

import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import ForceDiagramRenderer from "@/components/whiteboard/blocks/ForceDiagramRenderer";

describe("ForceDiagramRenderer", () => {
  it("shows the named object and scientifically labelled arrow", () => {
    const { container } = render(
      React.createElement(ForceDiagramRenderer, {
        baseDelay: 0,
        block: {
          type: "force_diagram",
          objectLabel: "apple",
          objectEmoji: "🍎",
          caption: "Gravity acting on a dropped apple",
          forces: [
            {
              label: "gravity",
              direction: "down",
              detail: "towards Earth's centre",
            },
          ],
          groundLabel: "Earth",
        },
      }),
    );

    expect(screen.getByRole("img", { name: /force diagram for apple/i })).toBeInTheDocument();
    expect(container.textContent).toContain("apple");
    expect(container.textContent).toContain("gravity");
    expect(container.textContent).toContain("towards Earth's centre");
    expect(container.querySelector("line[marker-end]")).toBeInTheDocument();
  });
});
