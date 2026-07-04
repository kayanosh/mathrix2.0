/**
 * When a term physically moves across the "=" sign and changes sign,
 * this captures what moved and what it became.
 * e.g.  +4 crossing to the right becomes -4
 */
export interface TermTransfer {
  from_term: string;       // LaTeX of the term leaving its side  e.g. "+4"
  to_term: string;         // LaTeX of what it becomes on the other side e.g. "-4"
  from_side: "left" | "right";
  sign_rule: string;       // plain-English rule e.g. "adding becomes subtracting"
}

export interface TutorStep {
  step_number: number;
  operation_label: string;
  explanation: string;
  latex_before: string;
  latex_after: string;
  arrow_direction?: "down" | "both_sides" | "simplify";
  /** Present when a term crosses the = sign and changes sign */
  term_transfer?: TermTransfer;
  /** LaTeX for the | notation shown on both sides, e.g. "-4" or "\\div 2" */
  balance_notation?: string;
}

export interface TutorResponse {
  type: "steps" | "explanation" | "question";
  intro: string;
  steps: TutorStep[];
  conclusion: string;
  hint?: string;
  subject?: string;
  topic?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  parsed?: TutorResponse;
  /** New whiteboard response format */
  whiteboard?: import("./whiteboard").WhiteboardResponse;
  /** Base64 image data URI attached to this message */
  imageUrl?: string;
  timestamp: Date;
}

export type ExamLevel = "KS1" | "KS2" | "KS3" | "GCSE" | "A-Level";
export type ExamBoard = "AQA" | "Edexcel" | "OCR" | "WJEC";
export type GCSETier = "foundation" | "higher";

export interface Subject {
  id: string;
  name: string;
  icon: string;
  color: string;
  level: ExamLevel[];
  topics: Topic[];
}

export interface Topic {
  id: string;
  subject_id: string;
  name: string;
  subtopics: string[];
  /** Subtopics that only appear on Higher tier */
  higherOnly?: string[];
}

/** A topic entry within the GCSE syllabus (board-specific) */
export interface SyllabusTopic {
  id: string;
  name: string;
  subtopics: string[];
  /** Subtopics exclusive to Higher tier */
  higherOnly: string[];
}

/** Exam paper metadata stored in Supabase */
export interface ExamPaper {
  id: string;
  exam_board: ExamBoard;
  tier: GCSETier;
  year: number;
  paper_number: string;
  title: string;
  storage_path: string;
  is_mark_scheme: boolean;
  created_at: string;
}

/** Cached question/answer entry */
export interface QuestionCacheEntry {
  id: string;
  question_hash: string;
  question_text: string;
  level: string;
  tier: string | null;
  exam_board: string | null;
  category: string;
  response_json: import("./whiteboard").WhiteboardResponse;
  verification_json: import("./whiteboard").VerificationStatus;
  ground_truth: string | null;
  created_at: string;
  hit_count: number;
}

/** A chunk of extracted content from GCSE PDF */
export interface ContentChunk {
  id: string;
  source_file: string;
  topic: string;
  subtopic: string | null;
  tier: "foundation" | "higher" | "both";
  chunk_text: string;
  page_number: number;
  created_at: string;
}

// ── Teacher Mode ──────────────────────────────────────────────────────────────

export type TeacherQuestionDifficulty = "easy" | "medium" | "hard" | "exam";

export interface TeacherQuestion {
  id: number;
  questionText: string;
  answer: string;
  answerLatex?: string;
  difficulty: TeacherQuestionDifficulty;
  marks?: number;
}

export interface TeacherWorksheetData {
  topic: string;
  subtopic: string;
  level: string;
  examBoard?: string;
  questions: TeacherQuestion[];
  generatedAt: string;
}

// ── Tuition Centre — tutor worksheets with full step-by-step solutions ────────

export interface TutorSolutionQuestion {
  id: number;
  questionText: string;
  answer: string;
  /** Full worked solution, one line/step per array item. */
  solutionSteps: string[];
  difficulty: TeacherQuestionDifficulty;
  marks?: number;
}

export interface TutorWorksheet {
  stageId: string;
  stageLabel: string;
  subjectId: string;
  subjectName: string;
  examBoard?: string;
  topicId: string;
  topicName: string;
  level?: string;
  questions: TutorSolutionQuestion[];
  generatedAt: string;
}

export interface TutorLessonSection {
  heading: string;
  body: string;
}

export interface TutorLessonExample {
  question: string;
  steps: string[];
  answer: string;
}

export interface TutorLesson {
  intro: string;
  objectives: string[];
  sections: TutorLessonSection[];
  workedExamples: TutorLessonExample[];
  keyPoints: string[];
  commonMistakes: string[];
  examTip?: string;
}
