import { STAGES } from "./stages";
import type {
  CurriculumSubjectId,
  CurriculumTopic,
  SubjectSeeds,
  TopicSeed,
} from "./types";

function slug(input: string): string {
  return input
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildTopics(subjectId: CurriculumSubjectId, seeds: SubjectSeeds): CurriculumTopic[] {
  const topics: CurriculumTopic[] = [];
  const used = new Set<string>();

  for (const stage of STAGES) {
    const stageSeeds = seeds[stage.id];
    if (!stageSeeds) continue;

    stageSeeds.forEach((seed, index) => {
      const base = `${stage.id}-${subjectId}-${slug(seed.name)}`;
      let id = base;
      let n = 2;
      while (used.has(id)) {
        id = `${base}-${n++}`;
      }
      used.add(id);

      topics.push({
        id,
        stageId: stage.id,
        subjectId,
        strand: seed.strand,
        name: seed.name,
        subtopics: seed.subtopics,
        examBoards: seed.examBoards,
        higherOnly: seed.higherOnly,
        scienceTrack: seed.scienceTrack,
        sortOrder: seed.sortOrder ?? index,
      });
    });
  }

  return topics;
}

/** Merge multiple seed arrays for the same stage (e.g. combined + triple GCSE science). */
export function mergeStageSeeds(...arrays: TopicSeed[][]): TopicSeed[] {
  return arrays.flat();
}
