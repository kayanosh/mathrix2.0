/** The shape of a topic's teaching plan. See index.ts for what a plan is for. */

export type Strand = "number" | "algebra" | "ratio" | "geometry" | "statistics" | "probability";

export interface TopicPlan {
  id: string;
  strand: Strand;
  /** Name shown to the model and used in logs. */
  title: string;
  /** The syllabus subtopics this plan teaches, as written in lib/syllabus.ts. */
  subtopics: string[];
  /** A question is on this topic if it matches one of these… */
  match: RegExp[];
  /** …and none of these, which belong to a neighbouring topic. */
  not?: RegExp[];
  /** What the pupil must already be able to do. */
  needsFirst: string;
  /** The idea underneath the method, in words a pupil could repeat. */
  bigIdea: string;
  /** The picture that carries the idea, and exactly how to draw it. */
  picture?: { block: string; draw: string };
  /** The method, one move per line, in the order it is taught. */
  method: string[];
  /** The mistake most pupils make, and what to do instead. */
  mistake: { wrong: string; right: string };
  /** How the answer is checked. Shown by the teacher on the last step. */
  check: string;
  /** One real question put to the pupil part-way through. */
  ask: string;
  /** How the marks are given in the exam. */
  marks: string;
  /** Bump when the plan changes, so saved lessons are written again. */
  version: number;
}
