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

  // ── Versioning / provenance (DEF-003) ─────────────────────────────────────
  // Descriptive metadata only — nothing in the serving path reads or gates on
  // these yet. Adding fields is a small, contained step; enforcing a review
  // workflow against them (rejecting an unreviewed lesson, invalidating the
  // cache on a content change) is a separate, larger decision for whoever
  // builds that workflow, since none of the ~437 currently-cached lessons
  // have ever been reviewed.
  /** Stable identity for this lesson instance, independent of the cache key's shape. */
  lessonId?: string;
  /** Content hash of the generated lesson. Deliberately NOT part of the cache
   *  key (see lib/ks2-lesson-cache.ts ks2LessonCacheKey) — including it there
   *  would mean every regeneration invalidates the whole cache by definition. */
  contentVersion?: string;
  /** Links this lesson to an official curriculum objective. Unpopulated until
   *  Phase 2 curriculum traceability (MATHRIX_CURRICULUM_COVERAGE.csv) exists. */
  curriculumObjectiveId?: string;
  /** The actual OpenAI model that generated this lesson's content. */
  modelVersion?: string;
  /** Bump KS2_PROMPT_VERSION (lib/ks2-lesson-version.ts) when the generation
   *  prompt materially changes, so a regression can be traced to a prompt edit. */
  promptVersion?: string;
  /** 'unreviewed' | 'approved' | 'rejected'. Always 'unreviewed' today — no
   *  teacher review workflow exists yet, and nothing should treat this as a
   *  gate until one does. */
  reviewStatus?: "unreviewed" | "approved" | "rejected";
  teacherReviewer?: string;
  sourceReferences?: string[];
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
