/** @jest-environment jsdom */

import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import TextRenderer from "@/components/whiteboard/blocks/TextRenderer";

describe("TextRenderer lesson safety", () => {
  it("renders stable teaching-stage labels", () => {
    render(
      React.createElement(TextRenderer, {
        block: {
          type: "text",
          section: "guided",
          heading: "Try the first move",
          content: "Which side is opposite the right angle? Explain how you know.",
        },
      }),
    );

    expect(screen.getByText("We do")).toBeInTheDocument();
    expect(screen.getByText("Guided practice")).toBeInTheDocument();
    expect(screen.getByText("Try the first move")).toBeInTheDocument();
  });

  it("never renders a raw internal lesson payload", () => {
    const raw = '{"intro":"Welcome","blocks":[{"type":"text"}]}';
    const { container } = render(
      React.createElement(TextRenderer, {
        block: { type: "text", content: raw },
      }),
    );

    expect(screen.getByRole("alert")).toHaveTextContent("This lesson needs rebuilding");
    expect(container.textContent).not.toContain('"blocks"');
  });
});
