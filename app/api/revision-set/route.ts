import { NextRequest, NextResponse } from "next/server";
import { getOpenAI } from "@/lib/openai";
import { claudeSolve } from "@/lib/claude-solver";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { allowRequest, requestClientKey } from "@/lib/rate-limit";
import { runToolChecks } from "@/lib/verification-tools";
import { casSolve } from "@/lib/cas-solver";
import {
  SET_MIN_QUESTIONS,
  assembleSet,
  buildSameAnswerPrompt,
  buildSetPrompt,
  buildSetSolvePrompt,
  calculationIn,
  linesOfWorking,
  parseSetQuestions,
  readSameAnswers,
  readSavedSet,
  readSetSolutions,
  resolveRevisionRequest,
  revisionSetKey,
  sameAnswer,
  sameAnswerInput,
  setSolveInput,
  type RevisionQuestion,
  type RevisionRequest,
  type RevisionSet,
  type Solution,
} from "@/lib/revision-sets";
import type { WhiteboardResponse } from "@/types/whiteboard";

export const maxDuration = 120;

/** New sets one visitor may have written in ten minutes. Saved sets are free. */
const NEW_SETS_PER_WINDOW = 8;
const WINDOW_MS = 600_000;

const TABLE = "tutor_lesson_cache";

async function lookupSet(key: string): Promise<RevisionSet | null> {
  try {
    const { data, error } = await supabaseAdmin.from(TABLE).select("lesson_json").eq("cache_key", key).maybeSingle();
    if (error || !data) return null;
    return readSavedSet(data.lesson_json);
  } catch {
    return null;
  }
}

async function saveSet(key: string, request: RevisionRequest, set: RevisionSet): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from(TABLE).upsert(
      {
        cache_key: key,
        stage_id: "gcse",
        subject: "Maths",
        exam_board: "GCSE",
        topic_id: request.topic.id,
        topic_name: request.subtopic.name,
        level: request.tier,
        kind: "revision_set",
        lesson_json: set,
        hit_count: 0,
      },
      { onConflict: "cache_key" },
    );
    if (error) console.error("[RevisionSet] Save failed:", error.message);
  } catch (err) {
    console.error("[RevisionSet] Save threw:", (err as Error).message);
  }
}

async function writeQuestions(
  request: RevisionRequest,
  only?: Array<{ level: number; problem: string }>,
): Promise<RevisionQuestion[]> {
  const completion = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: buildSetPrompt(request, only) },
      {
        role: "user",
        content: only
          ? `Write the replacement questions for ${request.subtopic.name} now.`
          : `Write the six questions on ${request.subtopic.name} now.`,
      },
    ],
    max_tokens: 5000,
    // A later set has to differ from the first, so it is given more freedom.
    temperature: request.set === 0 ? 0.5 : 0.8,
  });
  return parseSetQuestions(completion.choices[0]?.message?.content || "");
}

/**
 * The sums in a worked answer, done in code.
 *
 * A second model asked to check a first can make the same slip, and with one
 * provider it is the same model. The arithmetic checks do not have that
 * weakness: "$1500 \times 1.02^3 = 1591.22$" is wrong whoever agrees with it.
 * Returns what is wrong, or an empty string.
 */
function arithmeticFault(question: RevisionQuestion): string {
  const lines = linesOfWorking(question);
  if (lines.length === 0) return "";
  const board: WhiteboardResponse = {
    intro: "",
    blocks: [
      {
        type: "equation_steps",
        steps: lines.map((line, i) => ({
          stepNumber: i + 1,
          operationLabel: "",
          explanation: "",
          latexBefore: "",
          latexAfter: line,
          arrowDirection: "down" as const,
        })),
      },
    ],
    conclusion: "",
    subject: "Maths",
  };
  try {
    const failed = runToolChecks(board, question.question).checks.find((c) => !c.passed && c.decisive);
    return failed ? failed.detail : "";
  } catch {
    return "";
  }
}

/**
 * What the answer has to be, where code can work that out without a model:
 * a bare calculation, or an equation or expression the algebra engine can do.
 * Null for every other question.
 */
function knownAnswer(question: string): string | null {
  const value = calculationIn(question);
  if (value !== null) return String(value);
  try {
    const solved = casSolve(question);
    if (solved?.verified && solved.answers.length > 0) return solved.answers.join(" or ");
  } catch {
    // The engine could not read it. That is not a fault in the question.
  }
  return null;
}

/** One question to a model, as JSON, from a different model where there is one. */
async function ask(system: string, input: string, maxTokens: number): Promise<string | null> {
  try {
    const result = await claudeSolve(system, [{ role: "user", content: input }], { thinkingBudget: 4096, maxTokens: maxTokens * 2 });
    if (result.content.trim()) return result.content;
  } catch {
    // Fall through to the other model.
  }
  try {
    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: input },
      ],
      max_tokens: maxTokens,
      temperature: 0,
    });
    return completion.choices[0]?.message?.content || null;
  } catch (err) {
    console.error("[RevisionSet] Check failed:", (err as Error).message);
    return null;
  }
}

/** Each question solved again by a model that is not shown the answer. */
async function solveBlind(questions: RevisionQuestion[]): Promise<Map<number, Solution> | null> {
  if (questions.length === 0) return new Map();
  const raw = await ask(buildSetSolvePrompt(), setSolveInput(questions), 3500);
  return raw ? readSetSolutions(raw, questions) : null;
}

/**
 * The checks on a batch of questions. `checked` is false when the blind solve
 * could not be had at all. `problems` says what is wrong with each question
 * that failed, in words the writer can act on.
 *
 *   1. The sums in the worked answer, done in code.
 *   2. A blind solve, compared with the given answer in code (sameAnswer).
 *   3. Only for answers code cannot read (words, inequalities): a model is
 *      asked whether the two answers are the same.
 */
async function check(questions: RevisionQuestion[]): Promise<{ checked: boolean; problems: Map<number, string> }> {
  const problems = new Map<number, string>();
  for (const q of questions) {
    const fault = arithmeticFault(q);
    if (fault) {
      problems.set(q.id, `a sum in the working is wrong: ${fault}`);
      continue;
    }
    // Only a clear disagreement counts. The engine writes answers its own way
    // ("-12-x+x^2"), and "cannot tell" is not "wrong".
    const known = knownAnswer(q.question);
    if (known !== null && sameAnswer(q.answer, known, q.question) === "different") {
      problems.set(q.id, `worked out exactly, the answer is ${known}, not ${q.answer}`);
    }
  }
  const toSolve = questions.filter((q) => !problems.has(q.id));
  const solutions = await solveBlind(toSolve);
  if (!solutions) return { checked: false, problems };

  const unsure: RevisionQuestion[] = [];
  for (const q of toSolve) {
    const solution = solutions.get(q.id);
    if (!solution || !solution.answer) {
      // Silence is not agreement.
      problems.set(q.id, "it could not be solved from the question as written");
    } else if (solution.unclear) {
      problems.set(q.id, `the question cannot be answered as written: ${solution.problem}`);
    } else {
      const verdict = sameAnswer(q.answer, solution.answer, q.question);
      if (verdict === "different") {
        problems.set(q.id, `solved separately, the answer came to ${solution.answer}, not ${q.answer}`);
      } else if (verdict === "unsure") {
        unsure.push(q);
      }
    }
  }

  if (unsure.length > 0) {
    const raw = await ask(
      buildSameAnswerPrompt(),
      sameAnswerInput(unsure.map((q) => ({ id: q.id, question: q.question, first: q.answer, second: solutions.get(q.id)!.answer }))),
      600,
    );
    const same = raw ? readSameAnswers(raw) : new Set<number>();
    for (const q of unsure) {
      if (!same.has(q.id)) {
        problems.set(q.id, `solved separately, the answer came to ${solutions.get(q.id)!.answer}, not ${q.answer}`);
      }
    }
  }
  return { checked: true, problems };
}

/**
 * POST /api/revision-set
 * Body: { topic, subtopic, tier, set } — a revision topic, and which numbered
 * set of its questions.
 *
 * Returns the saved set, writing and checking it first if nobody has asked for
 * it before. A question that fails a check is written again once; if it fails
 * again it is left out. A wrong worked answer is worse than a shorter lesson.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const request = resolveRevisionRequest(body);
    if (!request) {
      return NextResponse.json({ error: "That is not a revision topic." }, { status: 400 });
    }

    const key = revisionSetKey(request);
    const saved = await lookupSet(key);
    if (saved) return NextResponse.json({ set: saved, cached: true });

    if (!allowRequest(`revision-set:${requestClientKey(req.headers)}`, NEW_SETS_PER_WINDOW, WINDOW_MS)) {
      return NextResponse.json(
        { error: "That's a lot of new questions at once. Try again in a few minutes." },
        { status: 429 },
      );
    }

    let questions = await writeQuestions(request);
    if (questions.length < SET_MIN_QUESTIONS) {
      return NextResponse.json({ error: "Could not write those questions. Please try again." }, { status: 502 });
    }

    const first = await check(questions);
    let checked = first.checked;
    const problems = first.problems;

    for (const [id, problem] of problems) {
      console.warn(`[RevisionSet] ${request.subtopic.name} Q${id} failed: ${problem || "(no reason given)"}`);
    }

    // One more go at the ones that failed, told what was wrong with them.
    if (problems.size > 0) {
      const again = await writeQuestions(
        request,
        [...problems].map(([level, problem]) => ({ level, problem })),
      ).catch(() => [] as RevisionQuestion[]);
      const replacements = again.filter((q) => problems.has(q.id));
      if (replacements.length > 0) {
        const second = await check(replacements);
        checked = checked && second.checked;
        for (const [id, problem] of second.problems) {
          console.warn(`[RevisionSet] ${request.subtopic.name} Q${id} failed again: ${problem || "(no reason given)"}`);
        }
        const good = replacements.filter((q) => !second.problems.has(q.id));
        questions = questions.map((q) => good.find((g) => g.id === q.id) ?? q);
        for (const q of good) problems.delete(q.id);
      }
    }

    const passed = new Set(questions.filter((q) => !problems.has(q.id)).map((q) => q.id));
    const set = assembleSet(request, questions, checked ? passed : null);
    // Whatever the second opinion, a set never shows a question whose own
    // arithmetic is wrong.
    if (!checked) set.questions = set.questions.filter((q) => passed.has(q.id));
    if (set.questions.length < SET_MIN_QUESTIONS) {
      return NextResponse.json(
        { error: "Too many of those questions failed our checks. Please try again." },
        { status: 502 },
      );
    }

    // Only a checked set is kept. An unchecked one is still shown, labelled,
    // but the next request writes a fresh one rather than serving it for ever.
    if (set.checked) await saveSet(key, request, set);

    return NextResponse.json({ set, cached: false });
  } catch (err) {
    console.error("[RevisionSet]", err);
    return NextResponse.json({ error: "Could not load those questions. Please try again." }, { status: 500 });
  }
}
