import { GCSE_SYLLABUS } from "@/lib/syllabus";
import type { ExamBoardId, TopicSeed } from "../types";

const BOARD_MAP = {
  AQA: "AQA",
  Edexcel: "Edexcel",
  OCR: "OCR",
} as const;

/**
 * Build GCSE maths TopicSeeds from lib/syllabus.ts — one topic per strand per board.
 */
export function gcseMathsSeedsFromSyllabus(): TopicSeed[] {
  const seeds: TopicSeed[] = [];

  for (const [board, topics] of Object.entries(GCSE_SYLLABUS)) {
    const examBoard = BOARD_MAP[board as keyof typeof BOARD_MAP] as ExamBoardId;
    for (const topic of topics) {
      seeds.push({
        strand: topic.name,
        name: topic.name,
        subtopics: [...topic.subtopics],
        examBoards: [examBoard],
        higherOnly: topic.higherOnly ? [...topic.higherOnly] : undefined,
      });
    }
  }

  return seeds;
}
