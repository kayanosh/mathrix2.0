/**
 * Topic-teaching lesson contract.
 *
 * A "Teach me a topic" lesson is not a single solved question — it is a full
 * mini-lesson that must cover a fixed pedagogical structure, in order:
 *
 *   1. Objective       — what the student will be able to do by the end
 *   2. Prerequisites   — what they should already know before starting
 *   3. Vocabulary      — the key words/terms, each defined in plain English
 *   4. Rule            — the core idea / rule / formula, explained
 *   5. I do            — two graded, fully worked examples
 *   6. We do           — a scaffolded question for guided practice
 *   7. You do          — short independent practice
 *   8. Check           — an exit question with a checkable answer
 *   9. Mistakes        — common mistakes to avoid
 *  10. Recap           — a short recap of the key points
 *
 * The AI signals which section a text block belongs to via `TextBlock.section`.
 * `validateLessonContract` checks that every required section is present so the
 * API route can reject and retry an incomplete lesson.
 */
import type { LessonSection, WhiteboardResponse } from "@/types/whiteboard";

export interface LessonSectionSpec {
  section: LessonSection;
  /** Human-friendly heading + emoji shown on the whiteboard. */
  label: string;
  /** What the AI should put in this section (used to build the prompt). */
  instruction: string;
  /** Minimum number of tagged blocks required for this section to count. */
  min: number;
}

/** The ordered lesson contract every topic lesson must satisfy. */
export const LESSON_CONTRACT: LessonSectionSpec[] = [
  {
    section: "objective",
    label: "🎯 What you'll learn",
    instruction:
      "State the lesson objective in one or two short sentences: what the student will be able to do by the end.",
    min: 1,
  },
  {
    section: "prerequisites",
    label: "🧠 What you need first",
    instruction:
      "List the prior knowledge the student should already have. Keep it to the essentials they truly need for this topic.",
    min: 1,
  },
  {
    section: "vocabulary",
    label: "📖 Key words",
    instruction:
      "Define the key terms in plain English. Prefer a `table` block with a 'Word' and 'What it means' column, or a short text list. Every new term used later must be defined here.",
    min: 1,
  },
  {
    section: "rule",
    label: "📏 The main idea",
    instruction:
      "Explain the core rule, method or formula for this topic and WHY it works. Introduce the rule here; you may follow it with an equation_steps or a diagram block that demonstrates the rule.",
    min: 1,
  },
  {
    section: "example",
    label: "✏️ I do — worked example",
    instruction:
      "Give TWO fully worked examples, graded from a clear foundation example to a GCSE exam-style example. Each example MUST have a section-tagged text block header followed by a structured block (equation_steps, labeled_shape, column_method, etc.) with 3–6 meaningful steps. Never jump to the answer.",
    min: 2,
  },
  {
    section: "guided",
    label: "🤝 We do — guided practice",
    instruction:
      "Give one fresh question. Ask the student to identify the first move, then show a short hint and the remaining method in a structured block. Do not simply repeat a worked example.",
    min: 1,
  },
  {
    section: "practice",
    label: "🧩 You do — independent practice",
    instruction:
      "Give two or three concise practice questions, ordered easier to harder. Put questions and final answers in a table so students can try them before checking; do not reveal full working here.",
    min: 1,
  },
  {
    section: "check",
    label: "✅ Check your understanding",
    instruction:
      "Give one short exit question that tests the main idea in a slightly different form, followed by a concise answer or self-check method.",
    min: 1,
  },
  {
    section: "mistakes",
    label: "⚠️ Common mistakes",
    instruction:
      "Describe the 1–3 mistakes students most often make on this topic and how to avoid each one.",
    min: 1,
  },
  {
    section: "recap",
    label: "🔁 Quick recap",
    instruction:
      "Summarise the key points in three short, plain-English sentences the student can remember.",
    min: 1,
  },
];

/** Lookup of section → spec. */
export const LESSON_SECTION_SPECS: Record<LessonSection, LessonSectionSpec> =
  LESSON_CONTRACT.reduce(
    (acc, spec) => {
      acc[spec.section] = spec;
      return acc;
    },
    {} as Record<LessonSection, LessonSectionSpec>,
  );

/** Ordered list of the sections in the contract. */
export const LESSON_SECTION_ORDER: LessonSection[] = LESSON_CONTRACT.map(
  (s) => s.section,
);

export interface LessonContractResult {
  ok: boolean;
  /** Sections that are missing or under the required count. */
  missing: LessonSection[];
  /** Non-blocking notes (e.g. sections out of the expected order). */
  warnings: string[];
  /** Blocking structure problems inside otherwise present sections. */
  errors: string[];
  /** How many tagged blocks were found per section. */
  counts: Record<LessonSection, number>;
}

/**
 * Count the section-tagged text blocks in a response and check the contract.
 */
export function validateLessonContract(
  data: WhiteboardResponse,
): LessonContractResult {
  const counts = LESSON_SECTION_ORDER.reduce(
    (acc, s) => {
      acc[s] = 0;
      return acc;
    },
    {} as Record<LessonSection, number>,
  );

  const seenOrder: LessonSection[] = [];
  for (const block of data.blocks) {
    if (block.type === "text" && block.section) {
      counts[block.section] += 1;
      if (
        seenOrder.length === 0 ||
        seenOrder[seenOrder.length - 1] !== block.section
      ) {
        seenOrder.push(block.section);
      }
    }
  }

  const missing: LessonSection[] = [];
  for (const spec of LESSON_CONTRACT) {
    if (counts[spec.section] < spec.min) missing.push(spec.section);
  }

  // Order check (warning only) — the first time we encounter each section it
  // should follow the canonical order.
  const warnings: string[] = [];
  const firstSeen = LESSON_SECTION_ORDER.filter((s) => seenOrder.includes(s));
  const actualFirstSeen = seenOrder.filter((s, i) => seenOrder.indexOf(s) === i);
  if (JSON.stringify(firstSeen) !== JSON.stringify(actualFirstSeen)) {
    warnings.push(
      `Lesson sections are out of the recommended order. Expected: ${firstSeen.join(
        " → ",
      )}; got: ${actualFirstSeen.join(" → ")}.`,
    );
  }

  const errors: string[] = [];
  data.blocks.forEach((block, index) => {
    if (block.type !== "text" || block.section !== "example") return;
    const nextSectionIndex = data.blocks.findIndex(
      (candidate, candidateIndex) =>
        candidateIndex > index && candidate.type === "text" && !!candidate.section,
    );
    const end = nextSectionIndex === -1 ? data.blocks.length : nextSectionIndex;
    const hasStructuredWorking = data.blocks
      .slice(index + 1, end)
      .some((candidate) => candidate.type !== "text");
    if (!hasStructuredWorking) {
      errors.push(
        `${block.heading || "Worked example"} must be followed by a structured diagram or step-by-step working block.`,
      );
    }
  });

  return {
    ok: missing.length === 0 && errors.length === 0,
    missing,
    warnings,
    errors,
    counts,
  };
}

/**
 * Build the retry instruction sent back to the model when sections are missing.
 */
export function buildLessonRetryMessage(missing: LessonSection[]): string {
  const details = missing
    .map((s) => {
      const spec = LESSON_SECTION_SPECS[s];
      const note =
        s === "example"
          ? ` (need at least ${spec.min} graded worked examples)`
          : "";
      return `• "${s}"${note}: ${spec.instruction}`;
    })
    .join("\n");

  return `Your lesson does not yet meet the teaching contract. It is missing these required sections:\n${details}\n\nRegenerate the FULL lesson as valid WhiteboardResponse JSON. Every section must be introduced by a "text" block whose "section" field is set to the section name and whose "heading" field is the section title. Keep all the sections you already had and add the missing ones, in this order: ${LESSON_SECTION_ORDER.join(
    " → ",
  )}.`;
}

/**
 * The prompt block describing the lesson contract, injected into the system
 * prompt so the model tags each section correctly.
 */
export function buildLessonContractPromptBlock(): string {
  const sections = LESSON_CONTRACT.map((spec, i) => {
    return `${i + 1}. section: "${spec.section}" — heading e.g. "${spec.label}"\n   ${spec.instruction}`;
  }).join("\n\n");

  return `━━━ LESSON CONTRACT — FOLLOW EXACTLY ━━━

You are teaching a WHOLE TOPIC, not answering a single question. Your "blocks" array
MUST walk through these sections IN THIS ORDER. Introduce each section with a "text"
block that sets BOTH:
  • "section": the exact section key below (e.g. "objective")
  • "heading": a short friendly title (e.g. "🎯 What you'll learn")
The "content" of that text block holds the section's explanation. For "rule" and each
"example" you MUST follow the section's text block with a structured visual block
(equation_steps / labeled_shape / column_method / table / etc.) that shows the working.

${sections}

RULES:
• EVERY section above must appear. A lesson missing any section will be REJECTED and retried.
• Provide TWO graded worked examples (foundation → GCSE exam-style), each as its own
  "example" text header followed by a structured block containing 3–6 meaningful steps.
• Never answer with prose only — the rule and examples must use structured blocks.
• Teach through I do → We do → You do → Check. Do not turn the lesson into a long article.
• Do not use Markdown headings, asterisks, fenced code, or hyphen-list syntax inside strings.
• Keep language appropriate to the student's level. Short, clear sentences.
• The top-level "intro" welcomes the student to the lesson; "conclusion" is an encouraging closing line.`;
}
