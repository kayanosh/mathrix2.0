/**
 * Six questions that teach a revision topic.
 *
 * The revision tab used to be notes: a summary, a list of facts and a couple
 * of worked examples to read. A pupil does not learn maths by reading it. So
 * each topic now opens with its main idea (lib/revision-ideas.ts) and is then
 * taught through six questions:
 *
 *   1 to 5   one skill, built up a step at a time, from the first question a
 *            pupil could do straight after hearing the idea to the hardest
 *            thing the topic asks for;
 *   6        an exam-style question: in a context, worded like a real paper,
 *            with its marks and a mark scheme.
 *
 * Every question comes with a hint (a nudge, not the answer), a worked answer
 * in which each step gives its reason, and one line saying what the question
 * adds to the one before. That last line is what makes it a lesson and not a
 * worksheet.
 *
 * A set is written by a model the first time anyone asks for it, checked, and
 * saved, as a topic sheet is (lib/topic-sheets.ts). "New questions" asks for
 * the next numbered set of the same topic. The number of sets is capped, so
 * the most that can ever be written is the topics × two tiers × the cap.
 *
 * Nothing here talks to a model or a database: see app/api/revision-set.
 */
import { REVISION_TOPICS, type RevisionSubtopic, type RevisionTopic } from "./revision-data";
import { REVISION_CONTENT, type RevisionNote } from "./revision-content";
import { mainIdeaFor } from "./revision-ideas";
import { mathsInDollars } from "./maths-text";
import { plainLanguage } from "./plain-language";
import { evaluate, tidy, valuesIn } from "./accuracy/grade";

export type RevisionTier = "foundation" | "higher";

/** Questions in a set. */
export const SET_SIZE = 6;
/** Fewer than this after checking and the set is not shown. */
export const SET_MIN_QUESTIONS = 4;
/** How many different sets a topic can have, counting the first. */
export const MAX_SETS = 12;
/** Bump to have every saved set written again. */
const SET_VERSION = 5;

/**
 * The six places in a set. `ask` is what the writer is told to put there.
 *
 * Question 1 is the easiest and 5 the hardest. To run them the other way,
 * hardest first, reverse the first five entries here; nothing else depends on
 * the order.
 */
export const LEVELS = [
  {
    level: 1,
    name: "Start here",
    ask: "The first question a pupil could do straight after hearing the main idea. One step, small whole numbers, nothing to trip over.",
  },
  {
    level: 2,
    name: "Build",
    ask: "The same skill with one thing added: a second step, a negative number, a decimal or a fraction.",
  },
  {
    level: 3,
    name: "Secure",
    ask: "The standard question on this topic, the kind in the middle of an exam paper. Two or three steps.",
  },
  {
    level: 4,
    name: "Stretch",
    ask: "The skill turned round or combined: the unknown in a different place, working backwards from the answer, or a second skill needed first.",
  },
  {
    level: 5,
    name: "Challenge",
    ask: "The hardest kind of question this topic has at this tier (not just bigger numbers). Several steps, and the pupil has to decide what to do: the method is not signposted.",
  },
  {
    level: 6,
    name: "Exam question",
    ask: "An exam-style question set in a real-life situation, worded as on a real GCSE paper, worth 4 or 5 marks, with its mark scheme. The pupil has to work out from the situation what maths to do; it is never just a calculation with a sentence round it.",
  },
] as const;

export type Level = (typeof LEVELS)[number]["level"];

export interface RevisionStep {
  /** What is done, with the maths. */
  text: string;
  /** Why it is done. */
  why?: string;
}

export interface RevisionMark {
  /** M1, A1, B1, as on a real mark scheme. */
  mark: string;
  award: string;
}

export interface RevisionQuestion {
  id: number;
  level: Level;
  question: string;
  marks: number;
  /** What this question adds to the one before it. */
  teaches: string;
  /** A nudge towards the first step. Never the answer. */
  hint: string;
  steps: RevisionStep[];
  /** The final answer, as written on the answer line. */
  answer: string;
  /** For the exam question. */
  markScheme?: RevisionMark[];
}

export interface RevisionSet {
  topicId: string;
  subtopic: string;
  tier: RevisionTier;
  /** 0 for the first set, 1 for the next, and so on. */
  set: number;
  questions: RevisionQuestion[];
  generatedAt: string;
  /** True when every answer was worked out again separately and agreed. */
  checked: boolean;
  /** How many questions were taken out because a check disagreed. */
  removed: number;
}

export interface RevisionRequest {
  topic: RevisionTopic;
  subtopic: RevisionSubtopic;
  tier: RevisionTier;
  set: number;
}

export function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** The address of a topic's revision page. */
export function revisionHref(topicId: string, subtopic: string): string {
  return `/revision?topic=${encodeURIComponent(topicId)}&sub=${slug(subtopic)}`;
}

/** A revision subtopic from its topic id and the slug of its name, or null. */
export function findSubtopic(topicId: unknown, subtopic: unknown): { topic: RevisionTopic; subtopic: RevisionSubtopic } | null {
  const topic = REVISION_TOPICS.find((t) => t.id === String(topicId ?? ""));
  if (!topic) return null;
  const wanted = slug(String(subtopic ?? ""));
  if (!wanted) return null;
  const found = topic.subtopics.find((s) => slug(s.name) === wanted);
  return found ? { topic, subtopic: found } : null;
}

/**
 * The request as a real revision topic, or null. Everything the model is told
 * comes from the topic found here, never from the caller's own words, so this
 * is not a way to send a model arbitrary text.
 */
export function resolveRevisionRequest(input: {
  topic?: unknown;
  subtopic?: unknown;
  tier?: unknown;
  set?: unknown;
}): RevisionRequest | null {
  const place = findSubtopic(input.topic, input.subtopic);
  if (!place) return null;
  const set = Number(input.set ?? 0);
  if (!Number.isInteger(set) || set < 0 || set >= MAX_SETS) return null;
  // A Higher-only topic has no Foundation version.
  const tier: RevisionTier = place.subtopic.higherOnly || input.tier === "higher" ? "higher" : "foundation";
  return { ...place, tier, set };
}

export function revisionSetKey(request: RevisionRequest): string {
  return ["revision-set", `v${SET_VERSION}`, request.topic.id, slug(request.subtopic.name), request.tier, `set${request.set}`].join(":");
}

export function noteFor(topicId: string, subtopic: string): RevisionNote | null {
  return REVISION_CONTENT.find((n) => n.topicId === topicId && n.subtopic === subtopic) ?? null;
}

// ── Writing ─────────────────────────────────────────────────────────────────

/** A different setting for each set, so "new questions" are new. */
const SETTINGS = [
  "a school",
  "a shop or a market",
  "a sports club",
  "a journey by train or car",
  "cooking and recipes",
  "a building site or DIY",
  "a farm or a garden",
  "a science lab",
  "saving and spending money",
  "a concert or a cinema",
  "a holiday abroad",
  "a factory",
];

/** Numbers to build each set from, so that two sets do not open with the same question. */
const NUMBERS = [
  [3, 8, 60],
  [7, 45, 120],
  [9, 16, 84],
  [6, 35, 250],
  [4, 27, 96],
  [11, 18, 150],
  [5, 14, 72],
  [8, 21, 180],
  [12, 25, 64],
  [13, 32, 108],
  [15, 24, 90],
  [2, 19, 144],
];

/**
 * The instructions for writing a set. `only` rewrites just those places (after
 * a check has thrown some out), with what was wrong with each.
 */
export function buildSetPrompt(request: RevisionRequest, only?: Array<{ level: number; problem: string }>): string {
  const { topic, subtopic, tier, set } = request;
  const idea = mainIdeaFor(topic.id, subtopic.name);
  const note = noteFor(topic.id, subtopic.name);
  const tierLine =
    tier === "higher"
      ? "Higher tier (grades 4 to 9). Question 1 is about grade 4, question 3 about grade 6. Questions 4, 5 and 6 are grade 7 to 9, the kind found near the end of a Higher paper: they need something a grade 5 pupil could not do (surds or exact answers, algebra inside the problem, a problem in 3D or on coordinates, working backwards, or two topics joined)."
      : "Foundation tier (grades 1 to 5). Question 1 is about grade 1 or 2, question 3 about grade 3. Questions 5 and 6 are grade 5, the hardest a Foundation paper asks. Nothing is beyond grade 5.";
  const places = LEVELS.filter((l) => !only || only.some((o) => o.level === l.level));
  const background = note
    ? [
        note.method?.length ? `The method pupils are taught:\n${note.method.map((m, i) => `  ${i + 1}. ${m}`).join("\n")}` : "",
        note.formulas?.length ? `Formulas for this topic:\n${note.formulas.map((f) => `  • ${f}`).join("\n")}` : "",
        note.commonMistakes?.length
          ? `Mistakes pupils make:\n${note.commonMistakes.slice(0, 3).map((m) => `  • ${m.mistake} (${m.correction})`).join("\n")}`
          : "",
        tier === "higher" && note.challengeQuestions?.length
          ? `The standard expected of questions 5 and 6 (do not reuse these, write your own at this level):\n${note.challengeQuestions.slice(0, 2).map((c) => `  • ${c.question}`).join("\n")}`
          : "",
      ]
        .filter(Boolean)
        .join("\n\n")
    : "";

  return `You are an experienced UK maths teacher writing a short lesson made of questions. A pupil will learn this topic by doing them in order.

TOPIC: ${subtopic.name} (GCSE Maths, ${topic.name})
${tierLine}

THE MAIN IDEA the pupil has just read. Every question must teach or use this idea:
${idea || `The core idea of ${subtopic.name}.`}
${background ? `\n${background}\n` : ""}
WRITE ${only ? `ONLY THESE ${places.length} QUESTIONS` : `EXACTLY ${SET_SIZE} QUESTIONS`}, one for each of these places:
${places.map((l) => `  ${l.level}. ${l.name}: ${l.ask}`).join("\n")}
${
  only
    ? `\nThese replace questions that failed a check. Do not repeat the fault:\n${only.map((o) => `  ${o.level}. ${o.problem || "the answer given was wrong"}`).join("\n")}\n`
    : ""
}
HOW THE QUESTIONS FIT TOGETHER
• They are ONE lesson. Each question keeps what the one before it taught and adds exactly one new thing. A pupil who can do question 3 should find question 4 a step, not a jump.
• Each question must be a different KIND of question from the one before, and clearly harder. Changing only the numbers is not a new question. A pupil who can do question 1 should not yet be able to do question 5.
• "teaches" says, in one short sentence to the pupil, what is new in THIS question compared with the one before. It must be true of the question you wrote. For question 1 it says what the question shows about the main idea.
• Every question, the exam question included, is on this topic and can be done with this topic's method. Do not drift into a neighbouring topic to make a question harder.
• The worked answers use the method in the main idea above, the same way every time, so the pupil sees one method six times.
• This is set number ${set + 1} for this topic. ${
    set === 0
      ? "Use"
      : "Pupils have already done earlier sets, which opened with the most obvious question on this topic. Yours must not repeat any of them: use"
  } fresh numbers, and where you are free to choose, build them from ${NUMBERS[set % NUMBERS.length].join(", ")}. Where a question has a context, set it in ${SETTINGS[set % SETTINGS.length]}.
• Things that are counted (people, apples, tickets) come out as whole numbers.

RULES FOR EVERY QUESTION
• It must be on "${subtopic.name}" and on the GCSE specification${tier === "foundation" ? ", using only Foundation-tier content (no cones, spheres or pyramids, no perpendicular gradients, no quadratic nth terms, no surds)" : ""}.
• It must make the pupil work something out. Never ask them to "describe" or "state" something the question has already told them: "Describe the reflection in the line $y = 3$" has its answer in it. Give the starting points and the finishing points, and ask what happened, or give the rule and ask where the points end up.
• It must be complete in words and symbols. There are NO diagrams, so never write "the diagram shows", "in the figure" or "as shown". If a shape, graph or table is needed, describe it fully in words with every length, angle, point and value given.
• Choose numbers so the working is clean and the answer is exact, unless the question tells the pupil how to round. Money comes out in whole pounds or whole pence, written with two decimal places (£10.80, never £10.8).
• Plain, short sentences, the way a real exam paper is worded. UK spelling and units.
• Wrap all maths in $...$ (for example $3x + 7 = 25$, $\\frac{3}{4}$, $x^2$). Use double backslashes inside JSON strings.

RULES FOR THE HINT
• One sentence that gets the pupil thinking about the first step, without doing it for them. Point at what to look at, or ask the question a teacher would ask: "What has been done to $x$ last? Undo that first." It never states the first step outright, never gives the answer, and never gives a number that is part of the answer.

RULES FOR THE WORKED ANSWER
• "steps" is the full working, one move per step, as a teacher would write it on the board. A pupil must be able to see how each line came from the one before.
• Each step has "do": a short instruction in words, then the line of maths it produces: "Take 3 from both sides: $x + 3 - 3 = 7 - 3$". The maths is a whole line ("$\\text{One part} = 60 \\div 5 = 12$", never just "$12$"), and any sum you mention is written in full with its total.
• Each step has "why": one short sentence giving the reason the step is allowed or needed, as a teacher would say it. Never a "why" that only repeats or labels the step.
    Bad:  "Simplify the equation."            Good: "Adding 3 and then taking 3 away leaves $x$ by itself."
    Bad:  "Divide both sides by 2 to solve."  Good: "$2x$ means 2 lots of $x$, so halving gives one $x$."
• Plain everyday words: "work out" (not calculate or evaluate), "the number in front of $x$" (not the coefficient), "the power" (not the exponent).
• "answer" is the final answer only, exactly as it would be written on the answer line, with units, in its simplest usual form: "$x = 4$" (not "4"), "$12\\text{ cm}^2$", "£24 and £36".
• Work every question out yourself, carefully, before you write its answer. Then check the answer by putting it back into the question. A wrong answer teaches the pupil something false.

MARKS
• "marks" is 1 to 3 for questions 1 to 5 and 4 or 5 for question 6.
• Question 6 only: "markScheme" lists each mark as on a real mark scheme. M1 for a correct method step, A1 for a correct answer that follows from it, B1 for a correct statement or value on its own. The number of items equals "marks".

Return ONLY valid JSON, no markdown fences:
{
  "questions": [
    {
      "level": 1,
      "question": "the question",
      "marks": 1,
      "teaches": "what this question adds",
      "hint": "a nudge, not the answer",
      "steps": [{ "do": "what is done, with the maths", "why": "the reason" }],
      "answer": "final answer",
      "markScheme": [{ "mark": "M1", "award": "for …" }]
    }
  ]
}`;
}

/**
 * LaTeX commands put back after JSON has eaten their backslash.
 *
 * In JSON "\t" is a tab and "\f" a form feed, so a model that writes "\text"
 * or "\frac" with one backslash sends a tab followed by "ext". A field was
 * shown as "84 	ext{ m}^2". The control character is turned back into the
 * backslash and letter it came from, and a "\n" typed as two characters is a
 * line break the model meant, shown as a space.
 */
export function restoreLatex(text: string): string {
  return text
    .replace(/\t(?=ext|imes|frac|heta|an(?![a-z])|o(?![a-z])|riangle|herefore)/g, "\\t")
    .replace(/\f(?=rac|orall)/g, "\\f")
    .replace(/\x08(?=eta|egin|inom|ar(?![a-z])|ullet)/g, "\\b")
    .replace(/\r(?=ight|ho(?![a-z])|angle)/g, "\\r")
    .replace(/\n(?=eq(?![a-z])|abla|ot(?:in)?(?![a-z])|u(?![a-z]))/g, "\\n")
    .replace(/\\n(?!eq(?![a-z])|abla|ot(?:in)?(?![a-z])|u(?![a-z])|e(?![a-z]))/g, " ")
    .replace(/[\t\f\x08\r\n]+/g, " ")
    .replace(/ {2,}/g, " ");
}

// Pointing at a picture that is not there. "Draw a tree diagram" and "use a
// Venn diagram" are not that: every question on those two topics was being
// thrown away for containing the word.
const NEEDS_A_PICTURE =
  /\b(?:the diagram (?:shows|below|above)|in the (?:diagram|figure|picture)|(?:diagram|figure|graph|table|picture|grid) (?:below|above)|shown (?:below|above|here|in the)|as shown|the graph shows|the figure shows)\b/i;

/** The model's reply as questions, leaving out any that cannot be used. One per level. */
export function parseSetQuestions(raw: string): RevisionQuestion[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.replace(/^```(?:json)?|```$/gim, "").trim());
  } catch {
    return [];
  }
  const list = (parsed as { questions?: unknown })?.questions;
  if (!Array.isArray(list)) return [];
  const text = (value: unknown) =>
    typeof value === "string" ? mathsInDollars(restoreLatex(value).trim()) : typeof value === "number" ? String(value) : "";
  const plain = (value: unknown) => plainLanguage(text(value), { gloss: false });

  const byLevel = new Map<number, RevisionQuestion>();
  list.forEach((item, index) => {
    if (!item || typeof item !== "object") return;
    const q = item as Record<string, unknown>;
    const stated = Math.round(Number(q.level));
    const level = (LEVELS.some((l) => l.level === stated) ? stated : index + 1) as Level;
    if (!LEVELS.some((l) => l.level === level) || byLevel.has(level)) return;

    const question = text(q.question);
    const answer = text(q.answer);
    if (!question || !answer) return;
    // There are no pictures, so a question that points at one cannot be done.
    if (NEEDS_A_PICTURE.test(question)) return;

    const steps: RevisionStep[] = (Array.isArray(q.steps) ? q.steps : [])
      .map((step) => {
        if (typeof step === "string") return { text: plain(step) };
        const s = (step ?? {}) as Record<string, unknown>;
        const why = plain(s.why);
        return { text: plain(s.do ?? s.text ?? s.step), ...(why ? { why } : {}) };
      })
      .filter((step) => step.text);
    // A question with no working shown cannot teach anything.
    if (steps.length === 0) return;

    const markScheme: RevisionMark[] = (Array.isArray(q.markScheme) ? q.markScheme : [])
      .map((point) => {
        const p = (point ?? {}) as Record<string, unknown>;
        return { mark: text(p.mark).toUpperCase().slice(0, 4), award: text(p.award) };
      })
      .filter((point) => /^[MAB]\d$/.test(point.mark) && point.award);

    const isExam = level === 6;
    const givenMarks = Math.round(Number(q.marks));
    const marks = isExam && markScheme.length > 0 ? markScheme.length : Number.isFinite(givenMarks) && givenMarks > 0 ? givenMarks : isExam ? 4 : 1;
    byLevel.set(level, {
      id: level,
      level,
      question,
      marks: Math.min(isExam ? 6 : 4, Math.max(1, marks)),
      teaches: plain(q.teaches),
      hint: plain(q.hint),
      steps,
      answer,
      ...(isExam && markScheme.length > 0 ? { markScheme } : {}),
    });
  });
  return [...byLevel.values()].sort((a, b) => a.level - b.level);
}

// ── Checking ────────────────────────────────────────────────────────────────
//
// A question is checked by having it solved again by someone who has not seen
// the answer, and comparing the two answers in code.
//
// The first version showed the checking model the answer and asked "is this
// right?". With one provider that is a model marking its own work, and it was
// wrong in both directions: it passed a field "7 m by 9 m" with an area of
// 84 m², and it failed "y = 2x" for not being written "y = 2x + 0". Asked to
// solve the field question without seeing an answer, the same model gets
// 8.22 m, and code can see that 8.22 is not 7.

export function buildSetSolvePrompt(): string {
  return `You are a GCSE Maths examiner. Solve each question you are given.

For each question:
1. Work it out carefully, step by step. Check your answer by putting it back into the question.
2. Give the final answer only, exactly as it would be written on the answer line, with units. No working and no words about rounding in the answer.
3. If the question cannot be answered as written, set "unclear" to true and say why in "problem". That means: it is incomplete or ambiguous; it needs a diagram that is not there; or its numbers do not fit together (for example a mean and a set of scores that cannot both be true, or a count that does not come out as a whole number of people).

Return ONLY valid JSON, no markdown fences, with one entry per question:
{ "solutions": [{ "id": 1, "working": "your working, briefly", "answer": "the final answer", "unclear": false, "problem": "" }] }
Wrap maths in $...$ and use double backslashes inside JSON strings.`;
}

/** The questions as the solver sees them: no answers. */
export function setSolveInput(questions: RevisionQuestion[]): string {
  return JSON.stringify(
    questions.map((q) => ({ id: q.id, question: q.question })),
    null,
    1,
  );
}

export interface Solution {
  answer: string;
  /** The solver could not answer the question as written. */
  unclear: boolean;
  problem: string;
}

/** The solver's answers by question, or null when its reply cannot be read. */
export function readSetSolutions(raw: string, questions: RevisionQuestion[]): Map<number, Solution> | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.replace(/^```(?:json)?|```$/gim, "").trim());
  } catch {
    return null;
  }
  const list = (parsed as { solutions?: unknown })?.solutions;
  if (!Array.isArray(list)) return null;
  const known = new Set(questions.map((q) => q.id));
  const solutions = new Map<number, Solution>();
  for (const item of list) {
    const entry = (item ?? {}) as Record<string, unknown>;
    const id = Number(entry.id);
    if (!known.has(id)) continue;
    solutions.set(id, {
      answer: typeof entry.answer === "string" ? restoreLatex(entry.answer).trim() : typeof entry.answer === "number" ? String(entry.answer) : "",
      unclear: entry.unclear === true,
      problem: typeof entry.problem === "string" ? entry.problem.slice(0, 200) : "",
    });
  }
  return solutions;
}

interface Reading {
  /** The value at three sets of values for the letters; the same three times for a number. */
  at: number[];
  /** Decimal places it was written to, or null for an exact form. */
  places: number | null;
  percent: boolean;
}

const POINTS = [0.37, 1.91, -2.43];
const ROUNDING_NOTE = /\(?\b(?:correct\s+)?(?:to\s+)?(?:\d+|one|two|three)\s*(?:d\.?\s?p\.?|s\.?\s?f\.?|decimal places?|significant figures?)\)?/gi;
const UNIT_AFTER_A_NUMBER =
  /(?<=[\d)])\s*(?:mm|cm|km|kg|ml|mph|m|g|l|p|units?|miles?|hours?|minutes?|seconds?|pounds?|pence|degrees?)\b(?:\s*\^\s*\(?[23]\)?)?/gi;

/** The letters a question's maths uses as unknowns: x, y, n. */
function lettersIn(question: string): string[] {
  const maths = [...question.matchAll(/\$([^$]+)\$/g)].map((m) => m[1].replace(/\\text\s*\{[^{}]*\}/g, " ")).join(" ");
  const found = new Set<string>();
  // Letters written side by side are separate unknowns: "mx" is m and x.
  for (const match of tidy(maths).replace(/\b(?:pi|sqrt)\b/g, " ").matchAll(/[a-zA-Z]/g)) found.add(match[0]);
  return [...found];
}

function readAnswer(raw: string, letters: string[]): { readings: Reading[]; algebra: boolean } {
  const text = raw.replace(ROUNDING_NOTE, " ");
  const plain = tidy(text);
  const used = letters.filter((l) => new RegExp(`(?<![a-zA-Z])${l}(?![a-zA-Z])`).test(plain));
  const placesOf = (written: string) => (/^-?\d+(?:\.\d+)?$/.test(written.replace(/[\s()]/g, "")) ? (written.split(".")[1] ?? "").replace(/\D/g, "").length : null);

  if (used.length === 0) {
    return {
      algebra: false,
      readings: valuesIn(text, { parts: false }).map((c) => ({ at: POINTS.map(() => c.value), places: placesOf(c.text), percent: c.percent })),
    };
  }
  const readings: Reading[] = [];
  for (const piece of plain.split(/<=|>=|=|<|>|,|;|\bor\b|\band\b/)) {
    // The full stop that ends the sentence is not part of the number.
    const side = piece.replace(UNIT_AFTER_A_NUMBER, " ").trim().replace(/[.!?:]+$/, "").trim();
    // A side that is only a name ("x", "AB", "y") says nothing.
    if (!side || /^[a-zA-Z\s]*$/.test(side)) continue;
    const at = POINTS.map((point, i) => evaluate(side, Object.fromEntries(used.map((l, j) => [l, point + j * 0.61 + i * 0.13]))));
    if (at.some((v) => v === null)) continue;
    readings.push({ at: at as number[], places: placesOf(side), percent: false });
  }
  return { algebra: true, readings };
}

function sameReading(a: Reading, b: Reading): boolean {
  const near = (x: number, y: number) => Math.abs(x - y) <= 1e-6 * Math.max(1, Math.abs(x), Math.abs(y));
  if (a.at.every((v, i) => near(v, b.at[i]))) return true;
  const constant = (r: Reading) => r.at.every((v) => near(v, r.at[0]));
  if (!constant(a) || !constant(b)) return false;
  let x = a.at[0];
  let y = b.at[0];
  // 25% and 0.25.
  if (a.percent !== b.percent) {
    if (a.percent) x /= 100;
    else y /= 100;
    if (near(x, y)) return true;
  }
  // One is the other rounded: 7.07 and 7.071, 0.33 and a third.
  // To a whole number only when that barely changes it: 53.13° is 53°, but a
  // half is not 1. Allowing any rounding to a whole number passed "1/2" as the
  // answer to a sum that comes to 1.
  const roundsTo = (exact: number, rounded: number, places: number) =>
    Math.abs(Math.round((exact + Number.EPSILON) * 10 ** places) / 10 ** places - rounded) < 1e-9 &&
    (places > 0 || Math.abs(exact - rounded) <= 0.02 * Math.abs(exact));
  if (a.places !== null && (b.places === null || a.places <= b.places)) return roundsTo(y, x, a.places);
  if (b.places !== null) return roundsTo(x, y, b.places);
  return false;
}

/**
 * Whether two answers to a question say the same thing.
 *
 * "same" and "different" are worked out, not judged: the numbers in each are
 * read (fractions, roots, standard form and multiples of π included), or the
 * expressions are compared by value, and each answer has to contain what the
 * other does. "unsure" is for what code cannot read (an answer in words, an
 * inequality written two ways) and is settled by asking.
 */
export function sameAnswer(given: string, solved: string, question: string): "same" | "different" | "unsure" {
  const squash = (text: string) => tidy(text).toLowerCase().replace(/[\s.,;:!]+/g, "");
  if (squash(given) === squash(solved)) return "same";
  // Which way an inequality points matters, and reading its two sides would lose it.
  if (/<|>|≤|≥|\\l[te]|\\g[te]|\\leq|\\geq/.test(given + solved)) return "unsure";

  const letters = lettersIn(question);
  const a = readAnswer(given, letters);
  const b = readAnswer(solved, letters);
  if (a.readings.length === 0 || b.readings.length === 0) return "unsure";
  const covered = (xs: Reading[], ys: Reading[]) => xs.every((x) => ys.some((y) => sameReading(x, y)));
  if (covered(a.readings, b.readings) && covered(b.readings, a.readings)) return "same";
  // Two sets of plain numbers that do not match are different answers. With
  // letters involved there are more ways to write the same thing than this
  // reads ("f(x) = …", a different letter), so that is asked about.
  return a.algebra || b.algebra ? "unsure" : "different";
}

export function buildSameAnswerPrompt(): string {
  return `You compare two answers to the same GCSE Maths question and say whether they are the same answer.

They are the same if they are mathematically equivalent and both answer the question ($x < 5$ and $5 > x$; "positive correlation" and "a positive correlation"; $0.5$ and $\\frac{1}{2}$). They are different if a pupil who wrote one would be marked wrong against the other. If you are not sure, say they are different.

Return ONLY valid JSON, no markdown fences:
{ "pairs": [{ "id": 1, "same": true }] }`;
}

export function sameAnswerInput(pairs: Array<{ id: number; question: string; first: string; second: string }>): string {
  return JSON.stringify(pairs, null, 1);
}

/** The ids judged to be the same answer. Anything not mentioned is not. */
export function readSameAnswers(raw: string): Set<number> {
  const same = new Set<number>();
  try {
    const parsed = JSON.parse(raw.replace(/^```(?:json)?|```$/gim, "").trim()) as { pairs?: unknown };
    if (Array.isArray(parsed.pairs)) {
      for (const pair of parsed.pairs) {
        const entry = (pair ?? {}) as Record<string, unknown>;
        if (entry.same === true && Number.isFinite(Number(entry.id))) same.add(Number(entry.id));
      }
    }
  } catch {
    /* nothing judged the same */
  }
  return same;
}

/**
 * The answer to a question that is nothing but a calculation, worked out in
 * code, or null for any other question.
 *
 * "Calculate $\\frac{2}{3} \\times \\frac{9}{10} \\div \\frac{3}{5}$" was given
 * the answer a half, after a wrong cancellation in its second line, and the
 * blind solve agreed. It is 1. A question like this needs no opinion.
 */
export function calculationIn(question: string): number | null {
  const found = question.match(
    /^\s*(?:calculate|work out|evaluate|find the value of|what is)\s*:?\s*\$([^$]+)\$\s*[.?]?\s*(?:give[^.]*\.?)?\s*$/i,
  );
  if (!found || /[a-zA-Z]/.test(tidy(found[1]).replace(/\b(?:pi|sqrt)\b/g, ""))) return null;
  const value = evaluate(tidy(found[1]));
  return value !== null && Number.isFinite(value) ? value : null;
}

/**
 * The lines of a worked answer that state a sum and its total, as maths. The
 * route runs these through the arithmetic checks (lib/verification-tools.ts),
 * which work the sums out in code: a model checking a model can agree on the
 * same slip.
 */
export function linesOfWorking(question: RevisionQuestion): string[] {
  const lines: string[] = [];
  for (const step of question.steps) {
    for (const match of step.text.matchAll(/\$([^$]+)\$/g)) {
      if (/=|\\approx|≈/.test(match[1])) lines.push(match[1].trim());
    }
  }
  return lines;
}

/** Put a set together from the questions that passed. */
export function assembleSet(
  request: RevisionRequest,
  questions: RevisionQuestion[],
  passed: Set<number> | null,
  now: Date = new Date(),
): RevisionSet {
  const kept = passed ? questions.filter((q) => passed.has(q.id)) : questions;
  return {
    topicId: request.topic.id,
    subtopic: request.subtopic.name,
    tier: request.tier,
    set: request.set,
    questions: [...kept].sort((a, b) => a.level - b.level),
    generatedAt: now.toISOString(),
    checked: passed !== null,
    removed: questions.length - kept.length,
  };
}

/** A saved set, if it is in a shape this version can show. */
export function readSavedSet(value: unknown): RevisionSet | null {
  const set = value as Partial<RevisionSet> | null;
  if (!set || !Array.isArray(set.questions) || set.questions.length < SET_MIN_QUESTIONS) return null;
  if (typeof set.subtopic !== "string" || typeof set.topicId !== "string") return null;
  if (!set.questions.every((q) => q && typeof q.question === "string" && Array.isArray(q.steps))) return null;
  return set as RevisionSet;
}

export function levelName(level: number): string {
  return LEVELS.find((l) => l.level === level)?.name ?? `Question ${level}`;
}
