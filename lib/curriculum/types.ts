export type CurriculumSubjectId = "maths" | "english" | "science";

export type CurriculumStageId =
  | "year-3"
  | "year-4"
  | "year-5"
  | "year-6"
  | "year-7"
  | "year-8"
  | "year-9"
  | "gcse"
  | "a-level";

export type KeyStage = "KS2" | "KS3" | "KS4" | "KS5";

export type ExamBoardId = "AQA" | "Edexcel" | "OCR" | "WJEC" | "Eduqas";

export type ScienceTrack = "combined" | "triple";

export type GcseTier = "foundation" | "higher";

export interface CurriculumStage {
  id: CurriculumStageId;
  label: string;
  shortLabel: string;
  keyStage: KeyStage;
  ages: string;
  hasExamBoards: boolean;
  order: number;
  blurb: string;
}

export interface CurriculumSubject {
  id: CurriculumSubjectId;
  name: string;
  emoji: string;
  color: string;
}

/** Compact authoring format inside subject seed files. */
export interface TopicSeed {
  strand: string;
  name: string;
  subtopics: string[];
  examBoards?: ExamBoardId[];
  higherOnly?: string[];
  scienceTrack?: ScienceTrack;
  sortOrder?: number;
}

export type SubjectSeeds = Partial<Record<CurriculumStageId, TopicSeed[]>>;

export interface CurriculumTopic {
  id: string;
  stageId: CurriculumStageId;
  subjectId: CurriculumSubjectId;
  strand: string;
  name: string;
  subtopics: string[];
  examBoards?: ExamBoardId[];
  higherOnly?: string[];
  scienceTrack?: ScienceTrack;
  sortOrder?: number;
}

export interface GetTopicsOptions {
  board?: ExamBoardId | null;
  scienceTrack?: ScienceTrack | null;
  tier?: GcseTier | null;
}
