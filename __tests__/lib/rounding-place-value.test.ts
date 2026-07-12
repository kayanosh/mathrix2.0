import {
  buildRoundingNumberLine,
  parseRoundingQuestion,
} from "@/lib/methods/rounding-number-line";
import {
  buildPlaceValueChart,
  parsePlaceValueChart,
} from "@/lib/methods/place-value-chart";
import { buildMethodForQuestion } from "@/lib/methods";
import { applyMethodBuilderToWorkedExample } from "@/lib/methods/apply-builder";
import { filterFitBlocks, isBlockFit } from "@/lib/ks2-visual-fitness";
import { preferredBuilderId, lookupPedagogy } from "@/lib/ks2-pedagogy/registry";
import type { NumberLineBlock, TableBlock } from "@/types/whiteboard";

describe("rounding number line", () => {
  it("parses Round 57,892 to the nearest 10,000", () => {
    expect(parseRoundingQuestion("Round 57,892 to the nearest 10,000")).toEqual({
      value: 57892,
      place: 10000,
    });
  });

  it("builds a 50,000–60,000 line for 57,892 → 10,000", () => {
    const built = buildRoundingNumberLine(57892, 10000);
    expect(built.builderId).toBe("rounding_number_line");
    expect(built.answer).toBe("60000");
    const block = built.block as NumberLineBlock;
    expect(block.type).toBe("number_line");
    expect(block.range).toEqual([50000, 60000]);
    expect(block.markers.some((m) => m.value === 57892)).toBe(true);
    expect(block.markers.some((m) => m.value === 55000 && m.label === "halfway")).toBe(
      true,
    );
    expect(block.markers.some((m) => m.value === 60000)).toBe(true);
    expect(built.teachingSteps.length).toBeGreaterThanOrEqual(3);
    expect(built.intro).toMatch(/57,892/);
    expect(built.intro).toMatch(/10,000/);
  });

  it("rounds down when below halfway", () => {
    const built = buildRoundingNumberLine(52000, 10000);
    expect(built.answer).toBe("50000");
  });

  it("is selected by buildMethodForQuestion", () => {
    expect(
      buildMethodForQuestion("Round 57,892 to the nearest 10,000")?.builderId,
    ).toBe("rounding_number_line");
  });

  it("replaces a useless 0–10 LLM line via apply-builder", () => {
    const next = applyMethodBuilderToWorkedExample(
      {
        question: "Round 57,892 to the nearest 10,000",
        steps: ["Look at the thousands digit"],
        answer: "60,000",
        whiteboard: {
          intro: "Let's round together",
          blocks: [
            {
              type: "number_line",
              range: [0, 10],
              tickInterval: 1,
              markers: [],
            },
          ],
          conclusion: "Round up!",
        },
      },
      "Place Value",
      ["Round to the nearest 10,000"],
    );
    const line = next.whiteboard?.blocks.find((b) => b.type === "number_line") as
      | NumberLineBlock
      | undefined;
    expect(line?.range).toEqual([50000, 60000]);
    expect(next.answer).toBe("60000");
  });
});

describe("place value chart", () => {
  it("parses digit-value questions", () => {
    expect(parsePlaceValueChart("What is the value of the 7 in 57,892?")).toEqual({
      digit: 7,
      value: 57892,
    });
  });

  it("builds a chart highlighting the digit", () => {
    const built = buildPlaceValueChart(57892, 7);
    expect(built.builderId).toBe("place_value_chart");
    expect(built.answer).toBe("7000");
    const table = built.block as TableBlock;
    expect(table.rows[0]).toEqual(["", "5", "7", "8", "9", "2"]);
    expect(table.highlightCells).toEqual([[0, 2]]);
  });
});

describe("visual fitness", () => {
  it("rejects a 0–10 line for a large rounding question", () => {
    expect(
      isBlockFit(
        { type: "number_line", range: [0, 10], tickInterval: 1, markers: [] },
        "Round 57,892 to the nearest 10,000",
      ),
    ).toBe(false);
  });

  it("accepts a bracket that contains the number", () => {
    expect(
      isBlockFit(
        {
          type: "number_line",
          range: [50000, 60000],
          tickInterval: 2000,
          markers: [{ value: 57892, style: "filled" }],
        },
        "Round 57,892 to the nearest 10,000",
      ),
    ).toBe(true);
  });

  it("drops unfit blocks", () => {
    const kept = filterFitBlocks(
      [
        { type: "number_line", range: [0, 10], tickInterval: 1, markers: [] },
        {
          type: "number_line",
          range: [50000, 60000],
          tickInterval: 2000,
          markers: [],
        },
      ],
      "Round 57892 to the nearest 10000",
    );
    expect(kept).toHaveLength(1);
    expect((kept[0] as NumberLineBlock).range).toEqual([50000, 60000]);
  });
});

describe("place value pedagogy routing", () => {
  it("prefers the rounding builder for round-to-nearest questions", () => {
    expect(
      preferredBuilderId("Round 57,892 to the nearest 10,000", "Place Value"),
    ).toBe("rounding_number_line");
    expect(lookupPedagogy("Round 57,892 to the nearest 10,000", "Place Value")[0].id).toBe(
      "place_value_rounding",
    );
  });

  it("still maps the Place Value topic catch-all", () => {
    expect(lookupPedagogy("", "Place Value")[0].id).toBe("place_value_general");
  });
});
