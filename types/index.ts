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
}
