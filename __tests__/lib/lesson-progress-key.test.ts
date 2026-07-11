import {
  lessonContentKey,
  stableHash,
  buildLessonKeyInput,
} from "@/lib/lesson-progress-key";

describe("stableHash", () => {
  it("is deterministic", () => {
    expect(stableHash("hello")).toBe(stableHash("hello"));
  });
  it("produces a 16-char hex string", () => {
    expect(stableHash("anything")).toMatch(/^[a-f0-9]{16}$/);
  });
  it("differs for different input", () => {
    expect(stableHash("a")).not.toBe(stableHash("b"));
  });
});

describe("buildLessonKeyInput", () => {
  it("extracts block types and count", () => {
    const input = buildLessonKeyInput({
      intro: "hi",
      conclusion: "bye",
      blocks: [{ type: "equation_steps" }, { type: "text" }],
    });
    expect(input.blockTypes).toEqual(["equation_steps", "text"]);
    expect(input.blockCount).toBe(2);
  });
});

describe("lessonContentKey", () => {
  const base = {
    topic: "Linear equations",
    subject: "Maths",
    intro: "Let's solve 2x + 4 = 10.",
    conclusion: "So x = 3.",
    blocks: [{ type: "equation_steps" }],
  };

  it("is stable across whitespace/case differences", () => {
    const a = lessonContentKey(base);
    const b = lessonContentKey({
      ...base,
      intro: "  Let's   solve 2x + 4 = 10.  ",
      topic: "linear equations",
    });
    expect(a).toBe(b);
  });

  it("changes when the content changes", () => {
    expect(lessonContentKey(base)).not.toBe(
      lessonContentKey({ ...base, conclusion: "So x = 5." }),
    );
  });

  it("changes when the block structure changes", () => {
    expect(lessonContentKey(base)).not.toBe(
      lessonContentKey({ ...base, blocks: [{ type: "equation_steps" }, { type: "text" }] }),
    );
  });

  it("handles missing optional fields", () => {
    expect(lessonContentKey({ intro: "x", conclusion: "y" })).toMatch(/^[a-f0-9]{16}$/);
  });
});
