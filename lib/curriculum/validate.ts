import type { CurriculumStageId, CurriculumSubjectId, CurriculumTopic } from "./types";

/** Minimum topic counts per stage/subject — regression guard for market coverage. */
export const MIN_TOPIC_COUNTS: Record<CurriculumStageId, Record<CurriculumSubjectId, number>> = {
  "year-3": { maths: 12, english: 10, science: 10 },
  "year-4": { maths: 12, english: 10, science: 10 },
  "year-5": { maths: 12, english: 10, science: 10 },
  "year-6": { maths: 12, english: 10, science: 10 },
  "year-7": { maths: 12, english: 10, science: 10 },
  "year-8": { maths: 12, english: 10, science: 10 },
  "year-9": { maths: 12, english: 10, science: 10 },
  gcse: { maths: 6, english: 12, science: 8 },
  "a-level": { maths: 10, english: 8, science: 10 },
};

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    totalTopics: number;
    byStage: Record<string, number>;
  };
}

export function validateCurriculum(topics: CurriculumTopic[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const ids = new Set<string>();

  for (const t of topics) {
    if (ids.has(t.id)) errors.push(`Duplicate topic id: ${t.id}`);
    ids.add(t.id);
    if (!t.subtopics.length) errors.push(`Topic "${t.name}" (${t.id}) has no subtopics`);
    if (t.subtopics.length < 3) warnings.push(`Topic "${t.name}" has fewer than 3 subtopics`);
  }

  const byStageSubject: Record<string, number> = {};
  for (const t of topics) {
    const key = `${t.stageId}/${t.subjectId}`;
    byStageSubject[key] = (byStageSubject[key] || 0) + 1;
  }

  for (const [stage, mins] of Object.entries(MIN_TOPIC_COUNTS)) {
    for (const [subject, min] of Object.entries(mins)) {
      const count = byStageSubject[`${stage}/${subject}`] || 0;
      if (count < min) {
        errors.push(`${stage} ${subject}: ${count} topics (minimum ${min})`);
      }
    }
  }

  const gcseCombined = topics.filter((t) => t.stageId === "gcse" && t.subjectId === "science" && t.scienceTrack === "combined");
  const gcseTriple = topics.filter((t) => t.stageId === "gcse" && t.subjectId === "science" && t.scienceTrack === "triple");
  if (gcseCombined.length < 8) errors.push(`GCSE combined science: ${gcseCombined.length} topics (minimum 8)`);
  if (gcseTriple.length < 18) errors.push(`GCSE triple science: ${gcseTriple.length} topics (minimum 18)`);

  const byStage: Record<string, number> = {};
  for (const t of topics) {
    byStage[t.stageId] = (byStage[t.stageId] || 0) + 1;
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    stats: { totalTopics: topics.length, byStage },
  };
}
