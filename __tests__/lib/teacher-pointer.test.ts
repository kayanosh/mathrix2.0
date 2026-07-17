import {
  teacherPointerPoint,
  teacherSpeechProgress,
  teacherTargetIndex,
} from "@/lib/teacher-pointer";

describe("teacher pointer synchronisation", () => {
  const targets = [
    { label: "apple", sequence: 0 },
    { label: "gravity downwards", sequence: 1 },
    { label: "ground", sequence: 2 },
  ];

  it("points to the semantic visual named near the spoken word", () => {
    const narration = "The apple falls because gravity pulls it downwards.";

    expect(teacherTargetIndex(targets, narration, 1, "explain")).toBe(0);
    expect(teacherTargetIndex(targets, narration, 5, "explain")).toBe(1);
  });

  it("advances through ordered anchors when labels do not occur in speech", () => {
    const narration = "First compare each part and then finish the method.";

    expect(teacherTargetIndex(targets, narration, 0, "explain")).toBe(0);
    expect(teacherTargetIndex(targets, narration, 4, "explain")).toBe(1);
    expect(teacherTargetIndex(targets, narration, 8, "explain")).toBe(2);
  });

  it("uses the first anchor while writing and the last for pupil pause", () => {
    expect(teacherTargetIndex(targets, "", -1, "write")).toBe(0);
    expect(teacherTargetIndex(targets, "", -1, "pupil_pause")).toBe(2);
  });

  it("moves across a large visual with narration progress", () => {
    const rect = { left: 100, top: 50, width: 400, height: 50 };
    const start = teacherPointerPoint(rect, 0);
    const end = teacherPointerPoint(rect, 1);

    expect(end.x).toBeGreaterThan(start.x);
    expect(end.y).toBe(start.y);
    expect(teacherSpeechProgress("one two three four", 0, "explain")).toBeLessThan(
      teacherSpeechProgress("one two three four", 3, "explain"),
    );
  });

  it("points to the centre of a compact semantic target", () => {
    expect(
      teacherPointerPoint({ left: 20, top: 30, width: 40, height: 20 }, 0.8),
    ).toEqual({ x: 40, y: 40 });
  });
});
