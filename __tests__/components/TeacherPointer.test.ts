/** @jest-environment jsdom */

import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import TeacherPointer from "@/components/whiteboard/tutor/TeacherPointer";

describe("TeacherPointer", () => {
  it("renders the cursor without an attached caption", () => {
    const { container } = render(
      React.createElement(TeacherPointer, {
        x: 120,
        y: 80,
        visible: true,
        mode: "write",
      }),
    );

    expect(container.querySelector("svg")).toBeInTheDocument();
    expect(screen.queryByText("Watch this")).not.toBeInTheDocument();
    expect(screen.queryByText("Look here")).not.toBeInTheDocument();
    expect(screen.queryByText("Your turn")).not.toBeInTheDocument();
  });
});
