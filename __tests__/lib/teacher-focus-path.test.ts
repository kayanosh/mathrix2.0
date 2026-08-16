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

describe("teacherFocusPath and exchange/borrow marks (DEF-004)", () => {
  it("anchors notes first, because the exchange is written before the digit", () => {
    expect(
      teacherFocusPath({ noteKeys: ["r0c1"], cellKeys: ["r2c1"] }),
    ).toEqual(["cell:r0c1", "cell:r2c1"]);
  });

  it("gives a borrow-only step a path instead of falling back to inference", () => {
    // Column subtraction narrates the exchange as its own step. With noteKeys
    // ignored this returned undefined, so the cursor was inferred — and landed
    // on the result cell while the tutor said "we exchange a ten".
    expect(teacherFocusPath({ noteKeys: ["r0c2", "r0c1"] })).toEqual([
      "cell:r0c2",
      "cell:r0c1",
    ]);
  });

  it("does not anchor the same box twice", () => {
    // A note and the digit it strikes through share one element; two anchors
    // would spend a narration segment moving the cursor nowhere.
    expect(
      teacherFocusPath({ noteKeys: ["r0c1"], cellKeys: ["r0c1", "r2c1"] }),
    ).toEqual(["cell:r0c1", "cell:r2c1"]);
  });
});

/**
 * The `column` cue used to drop the anchor keys.
 *
 * `buildColumnRevealTimeline` produces steps carrying cellKeys/carryKeys/
 * noteKeys, and column_method is the only block type in the codebase whose
 * renderer emits `data-teacher-id`. The teaching_step branch of buildTutorSteps
 * passed those through; the column branch did not, so the one place with a
 * fully authored cursor path fell back to guessing from the DOM.
 */
import { buildTutorSteps } from "@/lib/tutor-steps";
import { buildNarrationPlan } from "@/lib/narration";

describe("buildTutorSteps: column cues keep their authored cursor path", () => {
  // Shape taken from a real cached lesson — an invented one silently produces
  // an empty reveal timeline and the test passes for the wrong reason.
  const data = {
    intro: "Let us multiply these together.",
    blocks: [
      {
        type: "column_method",
        method: "column_multiplication",
        rows: ["347", "\u00d76", "2082"],
        answer: "2082",
        carries: [
          { col: 2, row: 0, value: "4" },
          { col: 1, row: 0, value: "2" },
        ],
        moves: [
          { kind: "carry", label: "carry 4", fromRow: 0, fromCol: 3, toRow: 0, toCol: 2 },
          { kind: "carry", label: "carry 2", fromRow: 0, fromCol: 2, toRow: 0, toCol: 1 },
        ],
      },
    ],
    conclusion: "So 347 \u00d7 6 = 2082.",
  } as never;

  it("emits focusTargetIds for at least one column step", () => {
    const steps = buildTutorSteps(data, buildNarrationPlan(data));
    const column = steps.filter((s) => s.kind === "column");
    expect(column.length).toBeGreaterThan(0);
    const withPath = column.filter((s) => (s.focusTargetIds?.length ?? 0) > 0);
    expect(withPath.length).toBeGreaterThan(0);
  });

  it("uses ids the ColumnMethodRenderer actually emits", () => {
    // Renderer emits `cell:<row>-<col>` and `carry:<row>-<col>`; an id in any
    // other shape resolves to nothing and silently degrades to inference.
    for (const step of buildTutorSteps(data, buildNarrationPlan(data))) {
      for (const id of step.focusTargetIds ?? []) {
        expect(id).toMatch(/^(cell|carry):\d+-\d+$/);
      }
    }
  });
});
