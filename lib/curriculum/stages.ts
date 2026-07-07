import type { CurriculumStage, CurriculumSubject, CurriculumStageId, CurriculumSubjectId, ExamBoardId } from "./types";

export const STAGES: CurriculumStage[] = [
  { id: "year-3", label: "Year 3", shortLabel: "Y3", keyStage: "KS2", ages: "Age 7–8", hasExamBoards: false, order: 3, blurb: "Lower KS2 foundations" },
  { id: "year-4", label: "Year 4", shortLabel: "Y4", keyStage: "KS2", ages: "Age 8–9", hasExamBoards: false, order: 4, blurb: "Lower KS2 fluency" },
  { id: "year-5", label: "Year 5", shortLabel: "Y5", keyStage: "KS2", ages: "Age 9–10", hasExamBoards: false, order: 5, blurb: "Upper KS2" },
  { id: "year-6", label: "Year 6", shortLabel: "Y6", keyStage: "KS2", ages: "Age 10–11", hasExamBoards: false, order: 6, blurb: "SATs preparation" },
  { id: "year-7", label: "Year 7", shortLabel: "Y7", keyStage: "KS3", ages: "Age 11–12", hasExamBoards: false, order: 7, blurb: "KS3 transition" },
  { id: "year-8", label: "Year 8", shortLabel: "Y8", keyStage: "KS3", ages: "Age 12–13", hasExamBoards: false, order: 8, blurb: "KS3 deepening" },
  { id: "year-9", label: "Year 9", shortLabel: "Y9", keyStage: "KS3", ages: "Age 13–14", hasExamBoards: false, order: 9, blurb: "GCSE bridging" },
  { id: "gcse", label: "GCSE", shortLabel: "GCSE", keyStage: "KS4", ages: "Age 14–16", hasExamBoards: true, order: 10, blurb: "Years 10–11 · exam-board aligned" },
  { id: "a-level", label: "A-Level", shortLabel: "A-Level", keyStage: "KS5", ages: "Age 16–18", hasExamBoards: true, order: 11, blurb: "Years 12–13 · exam-board aligned" },
];

export const SUBJECTS: CurriculumSubject[] = [
  { id: "maths", name: "Maths", emoji: "🔢", color: "indigo" },
  { id: "english", name: "English", emoji: "📖", color: "rose" },
  { id: "science", name: "Science", emoji: "🔬", color: "emerald" },
];

const GCSE_BOARDS: Record<CurriculumSubjectId, ExamBoardId[]> = {
  maths: ["AQA", "Edexcel", "OCR", "WJEC"],
  english: ["AQA", "Edexcel", "OCR", "Eduqas"],
  science: ["AQA", "Edexcel", "OCR"],
};

const A_LEVEL_BOARDS: Record<CurriculumSubjectId, ExamBoardId[]> = {
  maths: ["AQA", "Edexcel", "OCR"],
  english: ["AQA", "Edexcel", "OCR", "Eduqas"],
  science: ["AQA", "Edexcel", "OCR"],
};

export function getBoardsFor(stageId: CurriculumStageId, subjectId: CurriculumSubjectId): ExamBoardId[] {
  if (stageId === "gcse") return GCSE_BOARDS[subjectId];
  if (stageId === "a-level") return A_LEVEL_BOARDS[subjectId];
  return [];
}

export function getStage(stageId: CurriculumStageId): CurriculumStage | undefined {
  return STAGES.find((s) => s.id === stageId);
}

export function getSubject(subjectId: CurriculumSubjectId): CurriculumSubject | undefined {
  return SUBJECTS.find((s) => s.id === subjectId);
}

export function stageHasBoards(stageId: CurriculumStageId): boolean {
  return getStage(stageId)?.hasExamBoards ?? false;
}
