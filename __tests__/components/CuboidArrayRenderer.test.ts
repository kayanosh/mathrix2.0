/** @jest-environment jsdom */

import React from "react";
import "@testing-library/jest-dom";
import { render } from "@testing-library/react";
import CuboidArrayRenderer from "@/components/whiteboard/blocks/CuboidArrayRenderer";

describe("CuboidArrayRenderer", () => {
  it("shows the dimensions, unit-cube grid, and layer structure", () => {
    const { container, getByText, getByRole } = render(
      React.createElement(CuboidArrayRenderer, {
        block: {
          type: "cuboid_array",
          length: 3,
          width: 2,
          height: 2,
          unit: "unit",
        },
        baseDelay: 0,
      }),
    );

    expect(
      getByRole("figure", {
        name: "3 by 2 by 2 cuboid split into unit cubes",
      }),
    ).toBeInTheDocument();
    expect(getByText("One layer: 3 × 2 = 6 cubes")).toBeInTheDocument();
    expect(getByText("2 equal layers")).toBeInTheDocument();
    expect(getByText("Each small cube is 1 cubic unit.")).toBeInTheDocument();
    expect(container.querySelectorAll("svg line").length).toBeGreaterThanOrEqual(
      6,
    );
    expect(container.textContent).not.toContain("Picture the cuboid");
  });
});
