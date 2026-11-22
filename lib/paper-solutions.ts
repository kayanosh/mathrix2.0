/**
 * Worked solutions for the past papers.
 *
 * An exam board publishes a question paper and a mark scheme. A mark scheme
 * says what earns each mark; it does not show a pupil how to get there. A
 * worked-solutions paper does: for every question, the working, step by step,
 * down to the answer.
 *
 * Ours are written by a model that is shown the board's question paper and its
 * mark scheme, and they are held to the mark scheme:
 *
 *   - the writer is told every final answer must be the mark scheme's answer;
 *   - a second pass then compares each of our answers with the mark scheme
 *     again, and any that does not match has its working withheld, with a note
 *     to use the official mark scheme for that question.
 *
 * The solutions are our own work and refer to questions by number. The board's
 * question wording is not reproduced: the pupil reads the solutions next to the
 * board's own paper.
 *
 * A paper is identified by a short id made from the past-paper list, so the
 * only documents a model is ever sent are the two official PDFs of a paper on
 * that list.
 */
import { PAST_PAPERS, type PastPaper } from "./past-papers";
import { mathsInDollars } from "./maths-text";
import { plainLanguage } from "./plain-language";
import { PLAIN_ENGLISH_RULES } from "./prompts/plain-english";

/** Bump to make every saved solutions paper be written again. */
const SOLUTIONS_VERSION = 3;
/** Fewer worked answers than this and the paper was not read properly. */
export const SOLUTIONS_MIN_ITEMS = 8;

export interface SolutionItem {
  /** The question reference as printed on the paper: "7", "12(a)", "3(b)(ii)". */
  ref: string;
  marks: number | null;
  /** The working, one short step per line. Empty when withheld. */
  working: string[];
  answer: string;
  /** True when our answer matched the board's mark scheme at the second check. */
  confirmed: boolean;
}

export interface PaperSolutions {
  paperId: string;
  board: PastPaper["board"];
  year: number;
  month: PastPaper["month"];
  tier: PastPaper["tier"];
  paperName: string;
  note: string;
  items: SolutionItem[];
  /** True when the second check against the mark scheme ran. */
  checked: boolean;
  /** How many answers did not match the mark scheme and had their working withheld. */
  withheld: number;
  generatedAt: string;
}

export function paperId(paper: Pick<PastPaper, "board" | "year" | "month" | "tier" | "paper">): string {
  return [paper.board, paper.year, paper.month, paper.tier, paper.paper].join("-").toLowerCase();
}

/** The paper with this id, if it is on the list and has a mark scheme to check against. */
export function findPaper(id: unknown, papers: PastPaper[] = PAST_PAPERS): PastPaper | null {
  if (typeof id !== "string" || id.length > 60) return null;
  return papers.find((paper) => paperId(paper) === id.toLowerCase() && Boolean(paper.markScheme)) ?? null;
}

export function solutionsHref(paper: PastPaper): string {
  return `/exam-papers/solutions?paper=${encodeURIComponent(paperId(paper))}`;
}

export function solutionsKey(paper: PastPaper, stage: "final" | "draft" = "final"): string {
  return ["paper-solutions", `v${SOLUTIONS_VERSION}`, paperId(paper), stage].join(":");
}

/** The only places a paper's PDFs may be fetched from. */
const OFFICIAL_HOSTS: Record<PastPaper["board"], RegExp> = {
  AQA: /^https:\/\/(?:filestore\.aqa\.org\.uk|cdn\.sanity\.io\/files\/p28bar15)\//,
  Edexcel: /^https:\/\/qualifications\.pearson\.com\//,
  OCR: /^https:\/\/www\.ocr\.org\.uk\//,
};

export function isOfficialUrl(board: PastPaper["board"], url: string): boolean {
  return OFFICIAL_HOSTS[board].test(url) && /\.pdf$/i.test(url);
}

export function paperTitle(paper: Pick<PastPaper, "board" | "year" | "month" | "tier" | "name">): string {
  return `${paper.board} ${paper.month} ${paper.year} ${paper.tier === "higher" ? "Higher" : "Foundation"} ${paper.name}`;
}

// ── Writing ─────────────────────────────────────────────────────────────────

export function buildSolutionsPrompt(paper: PastPaper): string {
  return `You are an expert GCSE Maths teacher writing a worked-solutions paper for pupils.

You are given two PDFs: the ${paperTitle(paper)} question paper (${paper.note.toLowerCase()}), and the exam board's official mark scheme for it.

Write a worked solution for EVERY question and every part of every question on the paper, in order.

THE MARK SCHEME IS THE AUTHORITY
• Every final answer you give must be the answer in the mark scheme. Work the question out yourself, then compare. If yours differs, find your mistake and correct your working so it leads to the mark scheme's answer.
• Where the mark scheme accepts a range or several forms, give the most standard one.
• Take the marks for each part from the question paper.

HOW TO WRITE THE WORKING
• Write for a pupil who got the question wrong and wants to see how it is done.
• One short step per line, in plain everyday English: say what you do, then show it. Three to six steps for most questions; one step is enough for a one-mark question.
• ${paper.note === "Non-calculator" ? "This is a NON-CALCULATOR paper. Every step must be one a pupil can do by hand. Never work out a large power, product or division in full when a rule gives the answer directly: for $3^{12} \\div 3^{7}$ take the powers away to get $3^{5}$, do not write out $531441 \\div 2187$." : "This is a calculator paper: say what to type where a calculator is used."}
• UK spelling ("labelled", "centre", "metres").
• When a value is read from a diagram, graph or table on the paper, say so: "From the diagram, angle $ABC = 40°$."
• For "show that", "prove" and "explain" questions, write out the full argument as the working and put a short closing statement in "answer".
• For a question answered by drawing or completing something on the paper, describe exactly what to draw in the working and summarise it in "answer".
• Wrap all maths in $...$ (for example $3x + 7 = 25$, $\\frac{3}{4}$, $x^2$). Use double backslashes inside JSON strings.

DO NOT COPY THE QUESTION
• Never reproduce the wording of a question. Refer to it only by its number. You may restate the numbers you are using as part of the working.

${PLAIN_ENGLISH_RULES}

HOW MATHS IS WRITTEN — plain words do not mean plain typing
• Every sum, power, fraction and letter goes inside $...$ as LaTeX, even a short one. Write "$150 \\div 5 = 30$", never "150 ÷ 5 = 30". Write "$3^{5}$" and "$\\frac{5}{18}$", never "3^5" or "5/18".
• The "answer" is in $...$ too when it is a number, a fraction, a power or algebra.

Return ONLY valid JSON, no markdown fences:
{
  "solutions": [
    { "ref": "1", "marks": 1, "working": ["Share 150 into 5 equal parts: $150 \\\\div 5 = 30$."], "answer": "$30$" },
    { "ref": "7(a)", "marks": 2, "working": ["The two powers are being divided, so take one power from the other: $12 - 7 = 5$.", "So the answer is $3^{5}$. Work it out: $3^{5} = 243$."], "answer": "$243$" }
  ]
}
Use the question references exactly as printed: "7", "7(a)", "7(b)(ii)". One entry per part.`;
}

/** The writer's reply as solution items, dropping any that cannot be used. */
export function parseSolutions(raw: string): SolutionItem[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.replace(/^```(?:json)?|```$/gim, "").trim());
  } catch {
    return [];
  }
  const list = (parsed as { solutions?: unknown })?.solutions;
  if (!Array.isArray(list)) return [];
  const text = (value: unknown) =>
    typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : "";

  const seen = new Set<string>();
  // Each maths word is explained once on the paper, the first time it is used.
  const explained = new Set<string>();
  const items: SolutionItem[] = [];
  for (const entry of list) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    const ref = text(e.ref).replace(/^(?:question|q)\s*/i, "").replace(/\s+/g, "").slice(0, 16);
    const answer = mathsInDollars(text(e.answer));
    if (!/^\d{1,2}(?:\([a-z]+\)|\([ivx]+\))*$/i.test(ref) || !answer || seen.has(ref)) continue;
    seen.add(ref);
    const marks = Math.round(Number(e.marks));
    items.push({
      ref,
      marks: Number.isFinite(marks) && marks >= 1 && marks <= 10 ? marks : null,
      working: (Array.isArray(e.working) ? e.working : [])
        .map(text)
        .filter(Boolean)
        .slice(0, 14)
        .map((step) => plainLanguage(mathsInDollars(step), { explained })),
      answer,
      confirmed: false,
    });
  }
  return items.slice(0, 80);
}

// ── Checking against the mark scheme ────────────────────────────────────────

export function buildSolutionsCheckPrompt(paper: PastPaper): string {
  return `You are checking a worked-solutions paper against the official mark scheme before it is given to pupils.

You are given the exam board's mark scheme for the ${paperTitle(paper)} paper as a PDF, and a list of final answers from our worked solutions.

For each answer in the list, find that question part in the mark scheme and decide whether our answer is one the mark scheme would accept as the final answer.
• Equivalent forms count as a match ($0.5$ and $\\frac{1}{2}$; $x = 3$ and $3$; an answer inside an accepted range).
• For "show that", proof, explanation and drawing questions, it matches if our closing statement agrees with what the mark scheme requires.
• Be strict about values: a different number is not a match.
• If you cannot find the question part in the mark scheme, it is not a match.

Return ONLY valid JSON, no markdown fences, with one entry per answer you were given:
{ "checks": [{ "ref": "7(a)", "markSchemeAnswer": "what the mark scheme gives", "matches": true }] }`;
}

export function solutionsCheckInput(items: SolutionItem[]): string {
  return JSON.stringify(
    items.map((item) => ({ ref: item.ref, ourAnswer: item.answer })),
    null,
    1,
  );
}

/**
 * The references the checker confirmed, or null when its reply cannot be read
 * (nothing has been checked). A part it did not mention is not confirmed.
 */
export function confirmedRefs(raw: string, items: SolutionItem[]): Set<string> | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.replace(/^```(?:json)?|```$/gim, "").trim());
  } catch {
    return null;
  }
  const checks = (parsed as { checks?: unknown })?.checks;
  if (!Array.isArray(checks)) return null;
  const known = new Set(items.map((item) => item.ref));
  const confirmed = new Set<string>();
  for (const check of checks) {
    const c = (check ?? {}) as Record<string, unknown>;
    const ref = typeof c.ref === "string" ? c.ref.replace(/\s+/g, "") : "";
    if (known.has(ref) && c.matches === true) confirmed.add(ref);
  }
  return confirmed;
}

/** What is shown in place of working that did not match the mark scheme. */
export const WITHHELD_ANSWER = "See the official mark scheme for this question.";

/**
 * The finished paper. Working whose answer the check did not confirm is
 * withheld rather than shown with a warning: a pupil learning from a wrong
 * method is the thing to avoid, and the official mark scheme is one tap away.
 */
export function assembleSolutions(
  paper: PastPaper,
  items: SolutionItem[],
  confirmed: Set<string> | null,
  now: Date = new Date(),
): PaperSolutions {
  const finished = items.map((item) => {
    if (confirmed === null) return { ...item, confirmed: false };
    if (confirmed.has(item.ref)) return { ...item, confirmed: true };
    return { ...item, working: [], answer: WITHHELD_ANSWER, confirmed: false };
  });
  return {
    paperId: paperId(paper),
    board: paper.board,
    year: paper.year,
    month: paper.month,
    tier: paper.tier,
    paperName: paper.name,
    note: paper.note,
    items: finished,
    checked: confirmed !== null,
    withheld: confirmed === null ? 0 : finished.filter((item) => !item.confirmed).length,
    generatedAt: now.toISOString(),
  };
}

export function readSavedSolutions(value: unknown): PaperSolutions | null {
  const saved = value as Partial<PaperSolutions> | null;
  if (!saved || !Array.isArray(saved.items) || saved.items.length === 0) return null;
  if (typeof saved.paperId !== "string") return null;
  return saved as PaperSolutions;
}

/** A draft is the writer's items, saved so the check can be retried without rewriting. */
export function readSavedDraft(value: unknown): SolutionItem[] | null {
  const items = (value as { draft?: unknown } | null)?.draft;
  return Array.isArray(items) && items.length > 0 ? (items as SolutionItem[]) : null;
}
