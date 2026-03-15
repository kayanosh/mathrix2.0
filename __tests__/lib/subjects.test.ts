import { SUBJECTS } from "@/lib/subjects";

describe("SUBJECTS", () => {
  it("contains at least 4 subjects", () => {
    expect(SUBJECTS.length).toBeGreaterThanOrEqual(4);
  });

  it("has Mathematics as the first subject", () => {
    expect(SUBJECTS[0].id).toBe("maths");
    expect(SUBJECTS[0].name).toBe("Mathematics");
  });

  it("each subject has required fields", () => {
    for (const subject of SUBJECTS) {
      expect(subject.id).toBeDefined();
      expect(subject.name).toBeDefined();
      expect(subject.icon).toBeDefined();
      expect(subject.color).toBeDefined();
      expect(subject.level).toBeDefined();
      expect(subject.level.length).toBeGreaterThan(0);
      expect(subject.topics).toBeDefined();
      expect(subject.topics.length).toBeGreaterThan(0);
    }
  });

  it("each topic has required fields", () => {
    for (const subject of SUBJECTS) {
      for (const topic of subject.topics) {
        expect(topic.id).toBeDefined();
        expect(topic.subject_id).toBe(subject.id);
        expect(topic.name).toBeDefined();
        expect(topic.subtopics).toBeDefined();
        expect(topic.subtopics.length).toBeGreaterThan(0);
      }
    }
  });

  it("contains expected subjects", () => {
    const ids = SUBJECTS.map((s) => s.id);
    expect(ids).toContain("maths");
    expect(ids).toContain("physics");
    expect(ids).toContain("chemistry");
    expect(ids).toContain("biology");
  });

  it("maths has algebra topic", () => {
    const maths = SUBJECTS.find((s) => s.id === "maths")!;
    const algebra = maths.topics.find((t) => t.id === "algebra");
    expect(algebra).toBeDefined();
    expect(algebra!.subtopics).toContain("Solving linear equations");
  });

  it("maths has calculus topic with A-Level subtopics", () => {
    const maths = SUBJECTS.find((s) => s.id === "maths")!;
    const calculus = maths.topics.find((t) => t.id === "calculus");
    expect(calculus).toBeDefined();
    expect(calculus!.subtopics).toContain("Differentiation from first principles");
  });

  it("physics has mechanics topic", () => {
    const physics = SUBJECTS.find((s) => s.id === "physics")!;
    const mechanics = physics.topics.find((t) => t.id === "mechanics");
    expect(mechanics).toBeDefined();
    expect(mechanics!.subtopics).toContain("Newton's laws");
  });

  it("topics have unique IDs within a subject", () => {
    for (const subject of SUBJECTS) {
      const ids = subject.topics.map((t) => t.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});
