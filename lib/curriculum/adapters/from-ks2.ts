import { getKS2Content } from "@/lib/ks2";
import type { CurriculumSubjectId, CurriculumStageId, TopicSeed } from "../types";

const STAGE_TO_YEAR: Partial<Record<CurriculumStageId, "Year 5" | "Year 6">> = {
  "year-5": "Year 5",
  "year-6": "Year 6",
};

function inferStrand(subjectId: CurriculumSubjectId, topicName: string): string {
  if (subjectId === "maths") {
    if (/fraction|decimal|percent|place|add|subtract|multiply|divide|number/i.test(topicName)) return "Number";
    if (/algebra|equation|sequence/i.test(topicName)) return "Algebra";
    if (/shape|angle|geometry|coordinate|symmetry/i.test(topicName)) return "Geometry";
    if (/measure|area|perimeter|volume|time|money/i.test(topicName)) return "Measurement";
    if (/stat|graph|chart|data/i.test(topicName)) return "Statistics";
    if (/ratio|proportion/i.test(topicName)) return "Ratio and Proportion";
    return "Number";
  }
  if (subjectId === "english") {
    if (/read|comprehension|book/i.test(topicName)) return "Reading";
    if (/writ|narrative|persuasive|genre/i.test(topicName)) return "Writing";
    if (/grammar|punctuation|gps|spag/i.test(topicName)) return "Grammar and Punctuation";
    if (/spell|vocab/i.test(topicName)) return "Spelling and Vocabulary";
    return "Reading";
  }
  if (/plant|animal|living|life|body|evolution|ecology/i.test(topicName)) return "Biology";
  if (/material|state|rock|reaction|chemical/i.test(topicName)) return "Chemistry";
  if (/force|light|sound|electric|earth|space|energy/i.test(topicName)) return "Physics";
  return "Working Scientifically";
}

/**
 * Import Year 5/6 curriculum topics from lib/ks2.ts (Barnet Hill aligned, NC-grounded).
 */
export function ks2CurriculumSeeds(
  stageId: CurriculumStageId,
  subjectId: CurriculumSubjectId,
): TopicSeed[] {
  const year = STAGE_TO_YEAR[stageId];
  if (!year) return [];

  const subjects = getKS2Content("curriculum", year);
  const subject = subjects.find((s) => s.id === subjectId);
  if (!subject) return [];

  return subject.topics.map((t, i) => ({
    strand: inferStrand(subjectId, t.name),
    name: t.name,
    subtopics: [...t.subtopics],
    sortOrder: i,
  }));
}
