/**
 * Full UK curriculum registry for the Tuition Centre tutor portal.
 * Year 3 → A-Level · Maths, English, Science.
 * Lessons and worksheets are AI-generated on demand from topic subtopics.
 */

import { buildTopics } from "./build";
import { applyTopicFilters } from "./filters";
import { MATHS_SEEDS } from "./maths";
import { ENGLISH_SEEDS } from "./english";
import { SCIENCE_SEEDS } from "./science";
import { STAGES, SUBJECTS, getBoardsFor, getStage, getSubject, stageHasBoards } from "./stages";
import { validateCurriculum } from "./validate";
export { validateCurriculum, MIN_TOPIC_COUNTS } from "./validate";

export type {
  CurriculumStageId,
  CurriculumSubjectId,
  CurriculumStage,
  CurriculumSubject,
  CurriculumTopic,
  TopicSeed,
  SubjectSeeds,
  ExamBoardId,
  KeyStage,
  ScienceTrack,
  GcseTier,
  GetTopicsOptions,
} from "./types";

export { STAGES, SUBJECTS, getBoardsFor, getStage, getSubject, stageHasBoards };

export const CURRICULUM = [
  ...buildTopics("maths", MATHS_SEEDS),
  ...buildTopics("english", ENGLISH_SEEDS),
  ...buildTopics("science", SCIENCE_SEEDS),
];

const _validation = validateCurriculum(CURRICULUM);
if (!_validation.ok && process.env.NODE_ENV !== "test") {
  console.warn("[curriculum] Validation issues:", _validation.errors);
}

const TOPIC_BY_ID = new Map(CURRICULUM.map((t) => [t.id, t]));

export function getStages() {
  return STAGES;
}

export function getSubjects() {
  return SUBJECTS;
}

export function getSubjectsForStage(stageId: import("./types").CurriculumStageId) {
  return SUBJECTS.filter((s) => CURRICULUM.some((t) => t.stageId === stageId && t.subjectId === s.id));
}

export function getTopics(
  stageId: import("./types").CurriculumStageId,
  subjectId: import("./types").CurriculumSubjectId,
  board?: import("./types").ExamBoardId | null,
  options?: Omit<import("./types").GetTopicsOptions, "board">,
) {
  const filtered = CURRICULUM.filter((t) => t.stageId === stageId && t.subjectId === subjectId);
  return applyTopicFilters(filtered, { board, ...options });
}

export function getTopicsByStrand(
  stageId: import("./types").CurriculumStageId,
  subjectId: import("./types").CurriculumSubjectId,
  board?: import("./types").ExamBoardId | null,
  options?: Omit<import("./types").GetTopicsOptions, "board">,
) {
  const groups: { strand: string; topics: import("./types").CurriculumTopic[] }[] = [];
  for (const topic of getTopics(stageId, subjectId, board, options)) {
    let group = groups.find((g) => g.strand === topic.strand);
    if (!group) {
      group = { strand: topic.strand, topics: [] };
      groups.push(group);
    }
    group.topics.push(topic);
  }
  return groups;
}

export function getTopicById(topicId: string) {
  return TOPIC_BY_ID.get(topicId);
}

export function topicCount(
  stageId: import("./types").CurriculumStageId,
  subjectId: import("./types").CurriculumSubjectId,
  options?: import("./types").GetTopicsOptions,
) {
  return getTopics(stageId, subjectId, options?.board, options).length;
}

export function getSubtopicsForTopic(
  topic: import("./types").CurriculumTopic,
  tier?: import("./types").GcseTier | null,
) {
  return applyTopicFilters([topic], { tier })[0]?.subtopics ?? topic.subtopics;
}

export function curriculumStats() {
  return validateCurriculum(CURRICULUM).stats;
}
