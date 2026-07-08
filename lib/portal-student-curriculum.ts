import type { StudentRow } from "@/components/portal/types";
import type {
  CurriculumStageId,
  CurriculumSubjectId,
  ExamBoardId,
  ScienceTrack,
} from "@/lib/curriculum";
import { STAGES } from "@/lib/curriculum/stages";

export interface StudentTeachDefaults {
  stageId: CurriculumStageId | null;
  subjectId: CurriculumSubjectId | null;
  board: ExamBoardId | null;
  scienceTrack: ScienceTrack | null;
}

const SUBJECT_ORDER: CurriculumSubjectId[] = ["maths", "english", "science"];

const VALID_BOARDS: ExamBoardId[] = ["AQA", "Edexcel", "OCR", "WJEC", "Eduqas"];

export function yearGroupToStageId(yearGroup: string | null): CurriculumStageId | null {
  if (!yearGroup) return null;
  const y = yearGroup.trim().toLowerCase();

  const yearNum = y.match(/year\s*(\d+)/)?.[1] || y.match(/^y\s*(\d+)$/)?.[1];
  if (yearNum) {
    const id = `year-${yearNum}` as CurriculumStageId;
    if (STAGES.some((s) => s.id === id)) return id;
  }

  if (/\bgcse\b|ks4|year\s*1[01]\b/.test(y)) return "gcse";
  if (/\ba[- ]?level\b|ks5|year\s*1[23]\b|sixth\s*form/.test(y)) return "a-level";

  return null;
}

function parseBoard(value: string | null): ExamBoardId | null {
  if (!value) return null;
  const upper = value.trim().toUpperCase();
  const match = VALID_BOARDS.find((b) => upper.includes(b.toUpperCase()));
  return match ?? null;
}

export function getStudentTeachDefaults(student: StudentRow): StudentTeachDefaults {
  const fromYear = yearGroupToStageId(student.year_group);

  const levelWithStage = student.levels.find((l) => l.current_stage);
  if (levelWithStage?.current_stage) {
    const stageId = levelWithStage.current_stage as CurriculumStageId;
    const subjectId = (levelWithStage.subject_id as CurriculumSubjectId) || "maths";
    const board = parseBoard(levelWithStage.exam_board);
    return {
      stageId: STAGES.some((s) => s.id === stageId) ? stageId : fromYear,
      subjectId: SUBJECT_ORDER.includes(subjectId) ? subjectId : "maths",
      board,
      scienceTrack: null,
    };
  }

  const mathsLevel = student.levels.find((l) => l.subject_id === "maths" && l.current_stage);
  if (mathsLevel?.current_stage) {
    return {
      stageId: mathsLevel.current_stage as CurriculumStageId,
      subjectId: "maths",
      board: parseBoard(mathsLevel.exam_board),
      scienceTrack: null,
    };
  }

  for (const subj of SUBJECT_ORDER) {
    const lvl = student.levels.find((l) => l.subject_id === subj && l.current_stage);
    if (lvl) {
      return {
        stageId: lvl.current_stage as CurriculumStageId,
        subjectId: subj,
        board: parseBoard(lvl.exam_board),
        scienceTrack: null,
      };
    }
  }

  return {
    stageId: fromYear,
    subjectId: fromYear ? "maths" : null,
    board: null,
    scienceTrack: null,
  };
}
