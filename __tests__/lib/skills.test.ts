import { getMastery } from "@/lib/skills";
import type { MasteryLevel } from "@/lib/skills";

describe("getMastery", () => {
  it("returns 'unseen' for 0 attempts", () => {
    expect(getMastery(0)).toBe("unseen");
  });

  it("returns 'learning' for 1 attempt", () => {
    expect(getMastery(1)).toBe("learning");
  });

  it("returns 'learning' for 2 attempts", () => {
    expect(getMastery(2)).toBe("learning");
  });

  it("returns 'practiced' for 3 attempts", () => {
    expect(getMastery(3)).toBe("practiced");
  });

  it("returns 'practiced' for 4 attempts", () => {
    expect(getMastery(4)).toBe("practiced");
  });

  it("returns 'mastered' for 5+ attempts", () => {
    expect(getMastery(5)).toBe("mastered");
    expect(getMastery(10)).toBe("mastered");
    expect(getMastery(100)).toBe("mastered");
  });
});

// localStorage-dependent functions tested with mock
describe("getSkillData", () => {
  let getSkillData: typeof import("@/lib/skills").getSkillData;
  let recordSkillAttempt: typeof import("@/lib/skills").recordSkillAttempt;

  beforeEach(() => {
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
    const skills = require("@/lib/skills");
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
