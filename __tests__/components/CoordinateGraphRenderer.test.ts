/** @jest-environment jsdom */

import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import CoordinateGraphRenderer from "@/components/whiteboard/blocks/CoordinateGraphRenderer";
import type { CoordinateGraphBlock } from "@/types/whiteboard";

describe("CoordinateGraphRenderer", () => {
  it("renders a points-only graph when legacy lesson data omits plots", () => {
    const pointsOnlyBlock = {
      type: "coordinate_graph",
      xRange: [-5, 5],
      yRange: [-5, 5],
      points: [{ x: 2, y: -3, label: "A(2,-3)" }],
      grid: true,
      xLabel: "x",
      yLabel: "y",
    } as unknown as CoordinateGraphBlock;

    const { container } = render(
      React.createElement(CoordinateGraphRenderer, {
        baseDelay: 0,
        block: pointsOnlyBlock,
      }),
    );

    expect(screen.getByText("A(2,-3)")).toBeInTheDocument();
    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});
