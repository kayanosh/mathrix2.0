/**
 * Rich KS2 teaching-lesson schema (Teaching Engine).
 * Extends the flat CachedKS2Lesson shape used by Learn/Guided.
 */

import type { VisualBlock } from "@/types/whiteboard";
import type { TeachingStep } from "@/lib/methods/types";

export type KS2TeachingBlockType =
  | "learningObjective"
  | "priorKnowledgeCheck"
  | "conceptExplanation"
  | "definition"
  | "teacherExplanation"
  | "visualModel"
  | "workedExample"
  | "stepByStepSolution"
  | "commonMistake"
  | "teacherTip"
  | "guidedPractice"
  | "independentPractice"
  | "quickCheck"
  | "recap"
  | "finalAnswer";

export interface KS2TeachingBlock {
  type: KS2TeachingBlockType;
  title?: string;
  body: string;
  /** Optional companion visual (whiteboard block) */
  visual?: VisualBlock;
  mistake?: string;
  correction?: string;
}

export interface KS2PracticeItem {
  question: string;
  answer: string;
  hint?: string;
}

export interface KS2CommonMistake {
  mistake: string;
  correction: string;
}

export interface KS2WorkedExample {
  question: string;
  steps: string[];
  answer: string;
  emoji?: string;
  whiteboard?: {
    intro: string;
    blocks: VisualBlock[];
    conclusion: string;
  };
  teachingSteps?: TeachingStep[];
}

/**
 * Full teaching-engine lesson. Flat Learn fields remain for backward compat;
 * teaching fields deepen the pedagogy.
 */
export interface KS2TeachingLesson {
  schemaVersion: 2;
  id?: string;
  keyStage: "KS2";
  yearGroup?: string;
  strand?: string;
  topic: string;
  skill?: string;
  method?: string;
  learningObjective: string;
  prerequisiteKnowledge: string[];
  /** Structured teaching beats */
  teachingBlocks: KS2TeachingBlock[];
  /** Primary worked example (also mirrored as workedExample for UI) */
  workedExamples: KS2WorkedExample[];
  guidedPractice: KS2PracticeItem[];
  independentPractice: KS2PracticeItem[];
  quickCheck: KS2PracticeItem;
  commonMistakes: KS2CommonMistake[];
  recap: string;

  // ── Legacy flat fields (LessonPanel / cache) ──────────────────────────────
  intro: string;
  heroEmoji?: string;
  sections: { heading: string; body: string; emoji?: string }[];
  workedExample: KS2WorkedExample;
  keyPoints: string[];
  tryThis?: { question: string; answer: string };
}

export const KS2_TEACHING_BLOCK_TYPES: KS2TeachingBlockType[] = [
  "learningObjective",
  "priorKnowledgeCheck",
  "conceptExplanation",
  "definition",
  "teacherExplanation",
  "visualModel",
  "workedExample",
  "stepByStepSolution",
  "commonMistake",
  "teacherTip",
  "guidedPractice",
  "independentPractice",
  "quickCheck",
  "recap",
  "finalAnswer",
];
