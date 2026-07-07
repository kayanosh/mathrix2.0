import {
  CURRICULUM,
  getTopics,
  getSubtopicsForTopic,
  topicCount,
  validateCurriculum,
} from "@/lib/curriculum";
import { MIN_TOPIC_COUNTS } from "@/lib/curriculum/validate";

describe("curriculum registry", () => {
  it("passes validation with minimum topic counts", () => {
    const result = validateCurriculum(CURRICULUM);
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(CURRICULUM.length).toBeGreaterThanOrEqual(300);
  });

  it("has unique topic ids", () => {
    const ids = CURRICULUM.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("covers every stage with all three subjects", () => {
    for (const stage of Object.keys(MIN_TOPIC_COUNTS)) {
      for (const subject of ["maths", "english", "science"] as const) {
        const count = CURRICULUM.filter((t) => t.stageId === stage && t.subjectId === subject).length;
        expect(count).toBeGreaterThanOrEqual(MIN_TOPIC_COUNTS[stage as keyof typeof MIN_TOPIC_COUNTS][subject]);
      }
    }
  });

  it("filters GCSE science by combined and triple tracks", () => {
    const combined = getTopics("gcse", "science", null, { scienceTrack: "combined" });
    const triple = getTopics("gcse", "science", null, { scienceTrack: "triple" });
    expect(combined.length).toBeGreaterThanOrEqual(8);
    expect(triple.length).toBeGreaterThanOrEqual(18);
    expect(combined.every((t) => t.scienceTrack === "combined")).toBe(true);
    expect(triple.every((t) => t.scienceTrack === "triple")).toBe(true);
  });

  it("filters GCSE maths by exam board", () => {
    const aqa = getTopics("gcse", "maths", "AQA");
    const edexcel = getTopics("gcse", "maths", "Edexcel");
    expect(aqa.length).toBe(6);
    expect(edexcel.length).toBe(6);
    expect(aqa.every((t) => t.examBoards?.includes("AQA"))).toBe(true);
  });

  it("excludes higher-only subtopics at Foundation tier", () => {
    const algebra = CURRICULUM.find(
      (t) => t.stageId === "gcse" && t.subjectId === "maths" && t.name === "Algebra" && t.examBoards?.includes("AQA"),
    );
    expect(algebra).toBeDefined();
    if (!algebra?.higherOnly?.length) return;
    const foundation = getSubtopicsForTopic(algebra, "foundation");
    const higher = getSubtopicsForTopic(algebra, "higher");
    expect(foundation.length).toBeLessThan(higher.length);
    for (const ho of algebra.higherOnly) {
      expect(foundation).not.toContain(ho);
      expect(higher).toContain(ho);
    }
  });

  it("imports Year 5 maths from ks2 with at least 12 topics", () => {
    expect(topicCount("year-5", "maths")).toBeGreaterThanOrEqual(12);
  });

  it("imports GCSE maths from syllabus with board variants", () => {
    expect(topicCount("gcse", "maths", { board: "AQA" })).toBe(6);
    expect(topicCount("gcse", "maths", { board: "OCR" })).toBe(6);
  });
});
