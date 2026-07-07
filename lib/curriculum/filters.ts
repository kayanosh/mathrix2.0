import type { CurriculumTopic, GcseTier, GetTopicsOptions } from "./types";

export function filterSubtopicsForTier(topic: CurriculumTopic, tier: GcseTier | null | undefined): string[] {
  if (!tier || tier === "higher" || !topic.higherOnly?.length) {
    return topic.subtopics;
  }
  const higher = new Set(topic.higherOnly);
  return topic.subtopics.filter((s) => !higher.has(s));
}

export function matchesTopicFilters(topic: CurriculumTopic, opts: GetTopicsOptions): boolean {
  const { board, scienceTrack } = opts;

  if (board && topic.examBoards && !topic.examBoards.includes(board)) {
    return false;
  }

  if (scienceTrack && topic.scienceTrack && topic.scienceTrack !== scienceTrack) {
    return false;
  }

  if (scienceTrack && !topic.scienceTrack && topic.stageId === "gcse" && topic.subjectId === "science") {
    return false;
  }

  return true;
}

export function applyTopicFilters(
  topics: CurriculumTopic[],
  opts: GetTopicsOptions,
): CurriculumTopic[] {
  return topics
    .filter((t) => matchesTopicFilters(t, opts))
    .map((t) => {
      const subtopics = filterSubtopicsForTier(t, opts.tier);
      if (subtopics === t.subtopics) return t;
      return { ...t, subtopics };
    });
}
