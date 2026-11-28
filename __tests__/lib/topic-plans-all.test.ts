/**
 * Every GCSE topic has a teaching plan.
 *
 * The pilot had one plan in each strand. These tests hold the full set to
 * three promises: every subtopic on every exam board finds a plan; every plan
 * is complete; and a question on a topic is given that topic's plan, not a
 * neighbour's. The last is the one that goes wrong quietly, because the plans
 * are tried in order and the first to match is used.
 */
import { PLAN_SAMPLES } from "../fixtures/topic-plan-samples";
import { GCSE_SYLLABUS, getSubtopicsForTier } from "@/lib/syllabus";
import { buildSystemPrompt } from "@/lib/prompts/system";
import { TOPIC_PLANS, planForLesson, planForQuestion, planForSolving, planForTopic } from "@/lib/topic-plans";

const BOARDS = Object.keys(GCSE_SYLLABUS) as Array<keyof typeof GCSE_SYLLABUS>;

/** Every subtopic name any board uses, with its strand. */
const syllabusNames = () => {
  const names: Array<{ board: string; strand: string; name: string }> = [];
  for (const board of BOARDS) {
    for (const topic of GCSE_SYLLABUS[board]) {
      for (const name of new Set([...getSubtopicsForTier(topic, "higher"), ...getSubtopicsForTier(topic, "foundation")])) {
        names.push({ board, strand: topic.id, name });
      }
    }
  }
  return names;
};

describe("the set of plans", () => {
  it("has 64 plans with ids that are all different", () => {
    expect(TOPIC_PLANS).toHaveLength(64);
    expect(new Set(TOPIC_PLANS.map((p) => p.id)).size).toBe(64);
  });

  it("covers the six strands", () => {
    const count = (strand: string) => TOPIC_PLANS.filter((p) => p.strand === strand).length;
    expect({
      number: count("number"),
      algebra: count("algebra"),
      ratio: count("ratio"),
      geometry: count("geometry"),
      statistics: count("statistics"),
      probability: count("probability"),
    }).toEqual({ number: 10, algebra: 16, ratio: 8, geometry: 16, statistics: 7, probability: 7 });
  });

  it.each(TOPIC_PLANS.map((p) => [p.id, p] as const))("%s is complete", (_id, plan) => {
    expect(plan.subtopics.length).toBeGreaterThan(0);
    expect(plan.match.length).toBeGreaterThan(0);
    expect(plan.needsFirst.length).toBeGreaterThan(20);
    expect(plan.bigIdea.length).toBeGreaterThan(60);
    expect(plan.method.length).toBeGreaterThanOrEqual(3);
    expect(plan.method.length).toBeLessThanOrEqual(6);
    expect(plan.mistake.wrong.length).toBeGreaterThan(20);
    expect(plan.mistake.right.length).toBeGreaterThan(20);
    expect(plan.check.length).toBeGreaterThan(20);
    // The question for the pupil really is a question.
    expect(plan.ask.trim().endsWith("?")).toBe(true);
    expect(plan.marks).toMatch(/mark/i);
    // Plain words: the same swaps the rest of the app makes.
    const words = [plan.bigIdea, plan.needsFirst, ...plan.method, plan.check, plan.ask].join(" ");
    expect(words).not.toMatch(/\b(?:utilise|therefore|hence|thus|determine|evaluate the)\b/i);
    // It can be written out for a question and for a lesson without gaps.
    expect(planForSolving(plan)).not.toMatch(/undefined|\[object/);
    expect(planForLesson(plan)).not.toMatch(/undefined|\[object/);
  });

  it("only draws pictures the board knows how to draw", () => {
    const drawable = ["labeled_shape", "coordinate_graph", "probability_tree", "venn_diagram", "number_line", "table", "chart", "bar_model"];
    for (const plan of TOPIC_PLANS) {
      if (plan.picture) expect(drawable).toContain(plan.picture.block);
    }
  });
});

describe("every subtopic on every board finds its plan", () => {
  it.each(syllabusNames().map((s) => [`${s.board}: ${s.name}`, s] as const))("%s", (_label, subtopic) => {
    const plan = planForTopic(subtopic.name);
    expect(plan).not.toBeNull();
    // By its own name, not by a lucky match on a word in it.
    expect(plan!.subtopics).toContain(subtopic.name);
    // "Ratio and proportion" sits under Number on one board and Ratio on others.
    const strands = subtopic.strand === "number" || subtopic.strand === "ratio" ? ["number", "ratio"] : [subtopic.strand];
    expect(strands).toContain(plan!.strand);
  });

  it("no subtopic name is claimed by two plans", () => {
    const seen = new Map<string, string>();
    for (const plan of TOPIC_PLANS) {
      for (const name of plan.subtopics) {
        expect(seen.get(name) ?? plan.id).toBe(plan.id);
        seen.set(name, plan.id);
      }
    }
  });
});

describe("a question is given its own topic's plan", () => {
  it("there is a sample question for every plan", () => {
    expect(PLAN_SAMPLES.map((s) => s.plan).sort()).toEqual(TOPIC_PLANS.map((p) => p.id).sort());
  });

  it.each(PLAN_SAMPLES.map((s) => [s.plan, s.question] as const))("%s", (planId, question) => {
    expect(planForQuestion(question)?.id).toBe(planId);
  });

  it("the plan reaches the model for every one of them", () => {
    for (const sample of PLAN_SAMPLES) {
      const plan = TOPIC_PLANS.find((p) => p.id === sample.plan)!;
      const prompt = buildSystemPrompt("algebra", null, undefined, false, "higher", undefined, sample.question);
      expect(prompt).toContain(`HOW TO TEACH THIS TOPIC: ${plan.title.toUpperCase()}`);
    }
  });

  it("a question that is not maths gets no plan", () => {
    for (const text of ["", "hello", "Can you help me?", "What is your name?"]) {
      expect(planForQuestion(text)).toBeNull();
    }
  });
});
