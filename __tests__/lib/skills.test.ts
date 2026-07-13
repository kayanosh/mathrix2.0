import { getMastery } from "@/lib/skills";

describe("getMastery", () => {
  const rec = (attempts: number, correct: number) => ({ attempts, correct, lastSeen: Date.now() });

  it("returns 'unseen' for undefined or 0 attempts", () => {
    expect(getMastery(undefined)).toBe("unseen");
    expect(getMastery(rec(0, 0))).toBe("unseen");
  });

  it("returns 'learning' for 1-2 attempts", () => {
    expect(getMastery(rec(1, 1))).toBe("learning");
    expect(getMastery(rec(2, 0))).toBe("learning");
  });

  it("returns 'practiced' for 3-4 attempts with low accuracy", () => {
    expect(getMastery(rec(3, 1))).toBe("practiced");
    expect(getMastery(rec(4, 2))).toBe("practiced");
  });

  it("returns 'confident' for 3-4 attempts with >=60% accuracy", () => {
    expect(getMastery(rec(3, 2))).toBe("confident");
    expect(getMastery(rec(4, 3))).toBe("confident");
  });

  it("returns 'mastered' for 5+ attempts with >=70% accuracy", () => {
    expect(getMastery(rec(5, 4))).toBe("mastered");
    expect(getMastery(rec(10, 8))).toBe("mastered");
  });

  it("returns 'confident' for 5+ attempts with <70% accuracy", () => {
    expect(getMastery(rec(5, 3))).toBe("confident");
    expect(getMastery(rec(10, 5))).toBe("confident");
  });
});

// localStorage-dependent functions tested with mock
describe("getSkillData", () => {
  let getSkillData: typeof import("@/lib/skills").getSkillData;
  let recordSkillAttempt: typeof import("@/lib/skills").recordSkillAttempt;

  beforeEach(async () => {
    // Mock localStorage
    const store: Record<string, string> = {};
    Object.defineProperty(global, "window", {
      value: {
        ...global.window,
      },
      writable: true,
    });
    Object.defineProperty(global, "localStorage", {
      value: {
        getItem: jest.fn((key: string) => store[key] || null),
        setItem: jest.fn((key: string, value: string) => {
          store[key] = value;
        }),
        removeItem: jest.fn((key: string) => {
          delete store[key];
        }),
        clear: jest.fn(() => {
          Object.keys(store).forEach((key) => delete store[key]);
        }),
      },
      writable: true,
      configurable: true,
    });

    // Re-import to pick up the mocked global
    jest.resetModules();
    const skills = await import("@/lib/skills");
    getSkillData = skills.getSkillData;
    recordSkillAttempt = skills.recordSkillAttempt;
  });

  it("returns empty object when no data exists", () => {
    expect(getSkillData()).toEqual({});
  });

  it("records a skill attempt", () => {
    recordSkillAttempt("Algebra — Solving linear equations");
    const data = getSkillData();
    expect(data["Algebra — Solving linear equations"]).toBeDefined();
    expect(data["Algebra — Solving linear equations"].attempts).toBe(1);
  });

  it("increments attempts on repeated calls", () => {
    recordSkillAttempt("Algebra — Expanding brackets");
    recordSkillAttempt("Algebra — Expanding brackets");
    recordSkillAttempt("Algebra — Expanding brackets");
    const data = getSkillData();
    expect(data["Algebra — Expanding brackets"].attempts).toBe(3);
  });

  it("does not record when topic is undefined", () => {
    recordSkillAttempt(undefined);
    expect(getSkillData()).toEqual({});
  });
});
