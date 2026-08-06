/**
 * DEF-004, authored half.
 *
 * Timing alone was not the whole defect. The cursor also needs to know WHICH
 * elements form the path, and inferring that from the DOM guessed wrong on
 * column methods: every cell looks alike, so the inferred order came out as
 * document order rather than pen order.
 *
 * A step already declares its pen order as `cellKeys`/`carryKeys`. Deriving the
 * path from those — rather than asking each builder to also emit a parallel
 * `focusTargetIds` list — keeps ONE source of truth. Two lists would silently
 * drift apart the first time a builder changed its reveal and forgot the copy,
 * and a drifted cursor path fails invisibly: it still points at a real cell.
 */
import { teacherFocusPath } from "@/lib/tutor-steps";

describe("teacherFocusPath (DEF-004)", () => {
  it("derives the path from the keys the step already declares", () => {
    // Matches ColumnMethodRenderer's writeOrder (cells, then carries) and the
    // `data-teacher-id` scheme it emits.
    expect(
      teacherFocusPath({ cellKeys: ["r2c3", "r2c2"], carryKeys: ["r0c2"] }),
    ).toEqual(["cell:r2c3", "cell:r2c2", "carry:r0c2"]);
  });

  it("preserves pen order rather than sorting", () => {
    // Right-to-left is the whole point of a column method; a sort would undo it.
    expect(teacherFocusPath({ cellKeys: ["r2c3", "r2c2", "r2c1"] })).toEqual([
      "cell:r2c3",
      "cell:r2c2",
      "cell:r2c1",
    ]);
  });

  it("lets an explicit focusTargetIds override the derived path", () => {
    expect(
      teacherFocusPath({
        focusTargetIds: ["cell:custom"],
        cellKeys: ["r2c3"],
        carryKeys: ["r0c2"],
      }),
    ).toEqual(["cell:custom"]);
  });

  it("falls through to derivation when focusTargetIds is present but empty", () => {
    // An empty array is "not authored", not "author says point at nothing" —
    // otherwise the cursor would freeze.
    expect(teacherFocusPath({ focusTargetIds: [], cellKeys: ["r1c1"] })).toEqual([
      "cell:r1c1",
    ]);
  });

  it("returns undefined when the step declares no keys, so inference still runs", () => {
    // Non-column steps (diagrams, number lines) have no cell keys and must keep
    // using the DOM-inferred anchors.
    expect(teacherFocusPath({})).toBeUndefined();
    expect(teacherFocusPath({ cellKeys: [], carryKeys: [] })).toBeUndefined();
  });
});
