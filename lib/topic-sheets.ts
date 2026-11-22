/**
 * Question sheets and mark schemes for every GCSE Maths topic.
 *
 * A sheet is written by a model the first time anyone asks for it, checked by
 * a second model, and then saved — so each topic costs one generation, ever,
 * and everyone after that gets the same sheet instantly.
 *
 * Two things keep this safe to leave open to visitors:
 *
 *   - A sheet can only be requested for a real subtopic of a real board's
 *     syllabus (lib/syllabus.ts). The route is not a way to send a model
 *     arbitrary text, and the number of sheets that can ever be generated is
 *     the size of the syllabus.
 *   - A question whose answer the checking model does not agree with is taken
 *     off the sheet. A wrong mark scheme is worse than a shorter sheet.
 */
import { GCSE_SYLLABUS, getSubtopicsForTier, isHigherOnly } from "./syllabus";
import type { SyllabusTopic } from "@/types";

export type SheetBoard = keyof typeof GCSE_SYLLABUS;
export type SheetTier = "foundation" | "higher";

export const SHEET_BOARDS = Object.keys(GCSE_SYLLABUS) as SheetBoard[];
export const SHEET_QUESTION_COUNT = 10;
/** Fewer than this after checking and the sheet is not worth handing out. */
export const SHEET_MIN_QUESTIONS = 4;
/** Bump to make every saved sheet be written again. */
const SHEET_VERSION = 1;

export interface MarkPoint {
  /** M1, A1, B1 … as on a real mark scheme. */
  mark: string;
  /** What earns it. */
  award: string;
}

export interface SheetQuestion {
  id: number;
  question: string;
  marks: number;
  difficulty: "easy" | "medium" | "hard" | "exam";
  /** The final answer. */
  answer: string;
  /** The working, one step per line. */
  method: string[];
  markScheme: MarkPoint[];
}

export interface TopicSheet {
  board: SheetBoard;
  tier: SheetTier;
  topicId: string;
  topicName: string;
  subtopic: string;
  questions: SheetQuestion[];
  totalMarks: number;
  generatedAt: string;
  /** True when a second model solved every question and agreed with its answer. */
  checked: boolean;
  /** How many questions were removed because the check disagreed. */
  removed: number;
}

export interface SheetRequest {
  board: SheetBoard;
  tier: SheetTier;
  topic: SyllabusTopic;
  subtopic: string;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * The request as a real place in the syllabus, or null. Everything the model
 * is later told comes from the syllabus entry found here, never from the
 * caller's own words.
 */
export function resolveSheetRequest(input: {
  board?: unknown;
  tier?: unknown;
  topic?: unknown;
  subtopic?: unknown;
}): SheetRequest | null {
  const board = SHEET_BOARDS.find((b) => b.toLowerCase() === String(input.board ?? "").toLowerCase());
  if (!board) return null;
  const tier: SheetTier | null =
    input.tier === "foundation" || input.tier === "higher" ? input.tier : null;
  if (!tier) return null;
  const topic = GCSE_SYLLABUS[board].find((t) => t.id === String(input.topic ?? ""));
  if (!topic) return null;
  const wanted = slugify(String(input.subtopic ?? ""));
  if (!wanted) return null;
  const subtopic = getSubtopicsForTier(topic, tier).find((s) => slugify(s) === wanted);
  if (!subtopic) return null;
  return { board, tier, topic, subtopic };
}

export function topicSheetKey(request: SheetRequest): string {
  return [
    "topic-sheet",
    `v${SHEET_VERSION}`,
    request.board.toLowerCase(),
    request.tier,
    request.topic.id,
    slugify(request.subtopic),
  ].join(":");
}

/** The address of a sheet's page. */
export function sheetHref(
  board: SheetBoard,
  tier: SheetTier,
  topicId: string,
  subtopic: string,
  view: "questions" | "mark-scheme" = "questions",
): string {
  const params = new URLSearchParams({ board, tier, topic: topicId, subtopic: slugify(subtopic), view });
  return `/topics/sheet?${params.toString()}`;
}

/** Every sheet that exists for a board and tier, in syllabus order. */
export function sheetsFor(board: SheetBoard, tier: SheetTier) {
  return GCSE_SYLLABUS[board].map((topic) => ({
    topic,
    subtopics: getSubtopicsForTier(topic, tier).map((name) => ({
      name,
      higherOnly: isHigherOnly(topic, name),
    })),
  }));
}

// ── Writing ─────────────────────────────────────────────────────────────────

export function buildSheetPrompt(request: SheetRequest): string {
  const tierLine =
    request.tier === "higher"
      ? "Higher tier (grades 4–9). Include questions that reach grades 7–9."
      : "Foundation tier (grades 1–5). Nothing beyond grade 5.";
  return `You write GCSE Mathematics exam questions for UK students, in the style of ${request.board} papers.

Write a question sheet on this one subtopic of the ${request.board} GCSE Maths syllabus:
Topic: ${request.topic.name}
Subtopic: ${request.subtopic}
${tierLine}

Write exactly ${SHEET_QUESTION_COUNT} questions, in this order: 3 easy, 3 medium, 2 hard, 2 exam-style (multi-step, in a context, worth 4–5 marks).

RULES FOR THE QUESTIONS
• Every question must be on "${request.subtopic}" and nothing off the ${request.board} specification.
• Every question must be complete in words and symbols. There are NO diagrams on this sheet, so never write "the diagram shows", "in the figure" or "as shown". If a shape is needed, describe it fully in words with every length and angle given.
• Choose numbers so the working is clean and the answer is exact, unless the question tells the student how to round.
• Plain, short sentences, the way a real exam paper is worded. UK spelling and units.
• Each question is worth 1 to 5 marks.
• Wrap all maths in $...$ (for example $3x + 7 = 25$, $\\frac{3}{4}$, $x^2$). Use double backslashes inside JSON strings.

RULES FOR THE MARK SCHEME
• "answer" is the final answer only, exactly as it would be written on the answer line, with units.
• "method" is the full working, one short step per item, so a student can follow it.
• "markScheme" lists each mark as on a real mark scheme: M1 for a correct method step, A1 for a correct answer that follows from it, B1 for a correct statement or value on its own. The number of items must equal "marks".
• Work every question out yourself before you write its answer. Check each answer by putting it back into the question. An answer that is wrong makes the sheet useless.

Return ONLY valid JSON, no markdown fences:
{
  "questions": [
    {
      "question": "the question",
      "marks": 3,
      "difficulty": "easy | medium | hard | exam",
      "method": ["step 1", "step 2"],
      "answer": "final answer",
      "markScheme": [{ "mark": "M1", "award": "for …" }, { "mark": "A1", "award": "for …" }]
    }
  ]
}`;
}

const DIFFICULTIES = ["easy", "medium", "hard", "exam"] as const;
const NEEDS_A_PICTURE = /\b(?:diagram|figure|shown (?:below|above|here)|as shown|the graph (?:shows|below)|the table below|the picture)\b/i;

/** The model's reply as questions, dropping any that cannot be used. */
export function parseSheetQuestions(raw: string): SheetQuestion[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.replace(/^```(?:json)?|```$/gim, "").trim());
  } catch {
    return [];
  }
  const list = (parsed as { questions?: unknown })?.questions;
  if (!Array.isArray(list)) return [];
  const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

  const questions: SheetQuestion[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const q = item as Record<string, unknown>;
    const question = text(q.question);
    const answer = text(q.answer) || (typeof q.answer === "number" ? String(q.answer) : "");
    if (!question || !answer) continue;
    // The sheet has no pictures, so a question that points at one cannot be done.
    if (NEEDS_A_PICTURE.test(question)) continue;

    const markScheme: MarkPoint[] = (Array.isArray(q.markScheme) ? q.markScheme : [])
      .map((point) => {
        const p = (point ?? {}) as Record<string, unknown>;
        return { mark: text(p.mark).toUpperCase().slice(0, 4), award: text(p.award) };
      })
      .filter((point) => /^[MAB]\d$/.test(point.mark) && point.award);
    const stated = Math.round(Number(q.marks));
    const marks = markScheme.length > 0 ? markScheme.length : Number.isFinite(stated) ? stated : 1;
    if (marks < 1 || marks > 6) continue;

    const difficulty = DIFFICULTIES.find((d) => d === text(q.difficulty).toLowerCase()) ?? "medium";
    questions.push({
      id: questions.length + 1,
      question,
      marks,
      difficulty,
      answer,
      method: (Array.isArray(q.method) ? q.method : []).map(text).filter(Boolean),
      markScheme:
        markScheme.length > 0
          ? markScheme
          : Array.from({ length: marks }, (_, i) =>
              i === marks - 1
                ? { mark: "A1", award: `for ${answer}` }
                : { mark: "M1", award: "for a correct method step" },
            ),
    });
  }
  return questions.slice(0, SHEET_QUESTION_COUNT);
}

// ── Checking ────────────────────────────────────────────────────────────────

export function buildCheckPrompt(): string {
  return `You are a GCSE Maths examiner checking a question sheet before it is printed.

For each question you are given, do this:
1. Solve it yourself from scratch. Do not look at the given answer until you have your own.
2. Compare your answer with the given answer. Equivalent forms are the same answer ($0.5$ and $\\frac{1}{2}$; $x = 3$ and $3$).
3. Decide whether the question can be answered as written: it must be complete, unambiguous, and have exactly the answer given.

Be strict. If you are not sure the given answer is right, mark it wrong.

Return ONLY valid JSON, no markdown fences, with one entry per question:
{ "checks": [{ "id": 1, "myAnswer": "your own answer", "correct": true, "problem": "" }] }
Set "correct" to false if the given answer is wrong, or the question is unclear, impossible, or needs a diagram. Say why in "problem".`;
}

export function checkInput(questions: SheetQuestion[]): string {
  return JSON.stringify(
    questions.map((q) => ({ id: q.id, question: q.question, givenAnswer: q.answer })),
    null,
    1,
  );
}

/**
 * The ids the checker agreed with, or null when its reply cannot be read (in
 * which case nothing has been checked). A question it did not mention is not
 * passed: silence is not agreement.
 */
export function passedChecks(raw: string, questions: SheetQuestion[]): Set<number> | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.replace(/^```(?:json)?|```$/gim, "").trim());
  } catch {
    return null;
  }
  const checks = (parsed as { checks?: unknown })?.checks;
  if (!Array.isArray(checks)) return null;
  const known = new Set(questions.map((q) => q.id));
  const passed = new Set<number>();
  for (const check of checks) {
    const c = (check ?? {}) as Record<string, unknown>;
    const id = Number(c.id);
    if (known.has(id) && c.correct === true) passed.add(id);
  }
  return passed;
}

/** Put a sheet together from the questions that survived, renumbered. */
export function assembleSheet(
  request: SheetRequest,
  questions: SheetQuestion[],
  passed: Set<number> | null,
  now: Date = new Date(),
): TopicSheet {
  const kept = passed ? questions.filter((q) => passed.has(q.id)) : questions;
  const order = { easy: 0, medium: 1, hard: 2, exam: 3 };
  const sorted = [...kept]
    .sort((a, b) => order[a.difficulty] - order[b.difficulty] || a.id - b.id)
    .map((q, index) => ({ ...q, id: index + 1 }));
  return {
    board: request.board,
    tier: request.tier,
    topicId: request.topic.id,
    topicName: request.topic.name,
    subtopic: request.subtopic,
    questions: sorted,
    totalMarks: sorted.reduce((sum, q) => sum + q.marks, 0),
    generatedAt: now.toISOString(),
    checked: passed !== null,
    removed: questions.length - kept.length,
  };
}

/** A saved sheet, if it is in a shape this version can show. */
export function readSavedSheet(value: unknown): TopicSheet | null {
  const sheet = value as Partial<TopicSheet> | null;
  if (!sheet || !Array.isArray(sheet.questions) || sheet.questions.length === 0) return null;
  if (typeof sheet.subtopic !== "string" || typeof sheet.board !== "string") return null;
  return sheet as TopicSheet;
}
