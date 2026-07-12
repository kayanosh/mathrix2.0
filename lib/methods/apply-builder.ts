/**
 * Replace LLM-authored arithmetic working with deterministic method builders
 * so Learn / Guided / Tutor share one correct digit-level script.
 */

import { buildMethodForQuestion } from "@/lib/methods";
import {
  buildColumnMultiplication,
  parseMultiplicationOperands,
} from "@/lib/methods/column-multiplication";
import {
  buildColumnAddition,
  buildColumnSubtraction,
  parseAdditionOperands,
  parseSubtractionOperands,
} from "@/lib/methods/column-addition";
import {
  buildLongDivision,
  parseDivisionOperands,
} from "@/lib/methods/long-division";
import { buildPlaceValueShift, parsePlaceValueShift } from "@/lib/methods/place-value-shift";
import {
  buildFractionOps,
  parseFractionOp,
} from "@/lib/methods/fraction-ops";
import {
  buildDecimalColumn,
  parseDecimalOp,
} from "@/lib/methods/decimal-column";
import { preferredBuilderId } from "@/lib/ks2-pedagogy/registry";
import { teachingStepsToCaptions, type MethodBuildResult, type TeachingStep } from "@/lib/methods/types";
import { normalizeColumnDigits } from "@/lib/column-method-layout";
import { normalizeMathText } from "@/lib/methods/normalize-math-text";
import type {
  ColumnMethodBlock,
  EquationStepBlock,
  TableBlock,
  VisualBlock,
  WhiteboardResponse,
} from "@/types/whiteboard";

export interface WorkedExampleLike {
  question: string;
  steps: string[];
  answer: string;
  /** Digit-level teaching script from a method builder (Learn renders title + why). */
  teachingSteps?: TeachingStep[];
  whiteboard?: {
    intro: string;
    blocks: VisualBlock[];
    conclusion: string;
  };
}

/**
 * Authoritative sources for the complete worked example.
 * Deliberately excludes step captions/equation steps: those contain small
 * sub-calculations such as 7 × 3, not the worksheet question 23 × 47.
 */
function collectCandidateTexts(example: WorkedExampleLike): string[] {
  const texts: string[] = [];
  if (example.question) texts.push(example.question);
  const wb = example.whiteboard;
  if (wb?.intro) texts.push(wb.intro);
  if (wb?.conclusion) texts.push(wb.conclusion);
  for (const block of wb?.blocks || []) {
    if (block.type === "column_method" && block.question) {
      texts.push(block.question);
    }
    if (block.type === "table" && block.caption) {
      texts.push(block.caption);
    }
  }
  return texts.map(normalizeMathText);
}

/** Rebuild from an existing column_method board when prose has no operands. */
function buildFromColumnBlock(block: ColumnMethodBlock): MethodBuildResult | null {
  // The block question describes the complete calculation. Prefer it over rows:
  // an LLM sometimes puts only the first digit calculation (e.g. 7 × 3) in
  // the rows even though the worked-example question is 23 × 47.
  try {
    switch (block.method) {
      case "column_multiplication": {
        const operands = parseMultiplicationOperands(block.question || "");
        if (operands) return buildColumnMultiplication(operands.a, operands.b);
        break;
      }
      case "column_addition": {
        const operands = parseAdditionOperands(block.question || "");
        if (operands) return buildColumnAddition(operands.a, operands.b);
        break;
      }
      case "column_subtraction": {
        const operands = parseSubtractionOperands(block.question || "");
        if (operands) return buildColumnSubtraction(operands.a, operands.b);
        break;
      }
      case "long_division": {
        const operands = parseDivisionOperands(block.question || "");
        if (operands) return buildLongDivision(operands.a, operands.b);
        break;
      }
    }
  } catch {
    // Fall through to recovering operands from the rows.
  }

  const a = parseInt(normalizeColumnDigits(block.rows[0] || ""), 10);
  const b = parseInt(normalizeColumnDigits(block.rows[1] || ""), 10);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;

  try {
    switch (block.method) {
      case "column_multiplication":
        return buildColumnMultiplication(a, b);
      case "column_addition":
        return buildColumnAddition(a, b);
      case "column_subtraction":
        return a >= b ? buildColumnSubtraction(a, b) : null;
      case "long_division": {
        // Prefer parsing "12)384" style from the bracket row
        const bracket = block.rows.find((r) => r.includes(")"));
        if (bracket) {
          const m = bracket.match(/(\d+)\s*\)\s*(\d+)/);
          if (m) return buildLongDivision(parseInt(m[2], 10), parseInt(m[1], 10));
        }
        const q = parseDivisionOperands(block.question || "");
        return q ? buildLongDivision(q.a, q.b) : null;
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}

function buildFromTableBlock(block: TableBlock): MethodBuildResult | null {
  const caption = block.caption || "";
  const pv = parsePlaceValueShift(caption);
  if (!pv) return null;
  try {
    return buildPlaceValueShift(pv.value, pv.factor, pv.operation);
  } catch {
    return null;
  }
}

function buildFromEquationBlock(block: EquationStepBlock): MethodBuildResult | null {
  const blob = block.steps
    .map((s) => `${s.latexBefore} ${s.latexAfter} ${s.explanation}`)
    .join(" ");
  const parsed = parseFractionOp(blob);
  if (!parsed) return null;
  try {
    return buildFractionOps(parsed);
  } catch {
    return null;
  }
}

function expectedNumericAnswer(answer: string): string | null {
  const matches = answer.replace(/,/g, "").match(/-?\d+(?:\.\d+)?(?:\s*\/\s*\d+)?/g);
  return matches?.length ? matches[matches.length - 1]!.replace(/\s/g, "") : null;
}

/** Reject a sub-calculation when it clearly disagrees with the stated answer. */
function matchesWorkedAnswer(
  built: MethodBuildResult,
  example: WorkedExampleLike,
): boolean {
  const expected = expectedNumericAnswer(example.answer || "");
  if (!expected) return true;
  const actualRaw =
    built.answer ||
    (built.block.type === "column_method" ? built.block.answer : "") ||
    "";
  const actual = expectedNumericAnswer(actualRaw);
  if (!actual) return true;
  // Fraction string compare
  if (actual.includes("/") || expected.includes("/")) {
    return actual === expected;
  }
  return Number(actual) === Number(expected);
}

function resolveBuild(
  example: WorkedExampleLike,
  topic?: string,
  subtopics?: string[],
): MethodBuildResult | null {
  const preferred = preferredBuilderId(
    [example.question, topic, ...(subtopics || [])].filter(Boolean).join(" "),
    topic,
    subtopics,
  );

  // 1. The visible worked-example question is authoritative.
  const fromQuestion =
    buildMethodForQuestion(example.question, preferred) ||
    buildMethodForQuestion(example.question, null);
  // The visible question is authoritative even if an older cached worksheet
  // contains the wrong answer produced by the previous sub-step bug.
  if (fromQuestion) return fromQuestion;

  // 2. Recover the complete calculation from the main board before scanning
  // explanatory steps, which contain smaller calculations such as 7 × 3.
  for (const block of example.whiteboard?.blocks || []) {
    if (block.type === "column_method") {
      const fromBlock = buildFromColumnBlock(block);
      if (fromBlock && matchesWorkedAnswer(fromBlock, example)) return fromBlock;
      // Decimal boards: try decimal builder from the question on the block
      const dec = parseDecimalOp(block.question || "");
      if (dec) {
        try {
          const built = buildDecimalColumn(dec);
          if (matchesWorkedAnswer(built, example)) return built;
        } catch {
          /* ignore */
        }
      }
    }
    if (block.type === "table") {
      const fromTable = buildFromTableBlock(block);
      if (fromTable) return fromTable;
    }
    if (block.type === "equation_steps") {
      const fromEq = buildFromEquationBlock(block);
      if (fromEq && matchesWorkedAnswer(fromEq, example)) return fromEq;
    }
  }

  // 3. Inspect only complete-problem prose (never digit-level sub-steps).
  for (const text of collectCandidateTexts(example)) {
    const built = buildMethodForQuestion(text, preferred);
    if (built && matchesWorkedAnswer(built, example)) return built;
    // Also try without preferred lock in case topic mis-routes
    const any = buildMethodForQuestion(text, null);
    if (any && matchesWorkedAnswer(any, example)) return any;
  }

  // Last resort: parse operands with loose helpers from the joined blob
  const blob = collectCandidateTexts(example).join(" ");
  const mult = parseMultiplicationOperands(blob);
  if (mult && ![10, 100, 1000].includes(mult.b)) {
    try {
      const built = buildColumnMultiplication(mult.a, mult.b);
      if (matchesWorkedAnswer(built, example)) return built;
    } catch {
      /* ignore */
    }
  }
  const add = parseAdditionOperands(blob);
  if (add) {
    try {
      const built = buildColumnAddition(add.a, add.b);
      if (matchesWorkedAnswer(built, example)) return built;
    } catch {
      /* ignore */
    }
  }
  const sub = parseSubtractionOperands(blob);
  if (sub) {
    try {
      const built = buildColumnSubtraction(sub.a, sub.b);
      if (matchesWorkedAnswer(built, example)) return built;
    } catch {
      /* ignore */
    }
  }
  const div = parseDivisionOperands(blob);
  if (div && ![10, 100, 1000].includes(div.b)) {
    try {
      const built = buildLongDivision(div.a, div.b);
      if (matchesWorkedAnswer(built, example)) return built;
    } catch {
      /* ignore */
    }
  }
  const frac = parseFractionOp(blob);
  if (frac) {
    try {
      const built = buildFractionOps(frac);
      if (matchesWorkedAnswer(built, example)) return built;
    } catch {
      /* ignore */
    }
  }
  const dec = parseDecimalOp(blob);
  if (dec) {
    try {
      const built = buildDecimalColumn(dec);
      if (matchesWorkedAnswer(built, example)) return built;
    } catch {
      /* ignore */
    }
  }

  return null;
}

function applyBuiltToExample<T extends WorkedExampleLike>(
  example: T,
  built: MethodBuildResult,
): T & { teachingSteps?: TeachingStep[]; steps: string[]; answer: string } {
  // Keep the full digit-level script — do not truncate mid-method.
  const captions = teachingStepsToCaptions(built.teachingSteps);
  const answer =
    built.answer ||
    (built.block.type === "column_method"
      ? built.block.answer || example.answer
      : example.answer);

  const teachingSteps =
    built.teachingSteps.length > 0
      ? built.teachingSteps.filter((s) => s.title !== "Answer")
      : example.teachingSteps;

  const next = {
    ...example,
    steps: captions.length > 0 ? captions : example.steps,
    answer,
    teachingSteps,
  };

  const wb = example.whiteboard;
  const boardIntro =
    built.intro ||
    wb?.intro ||
    `Let's work out ${example.question}.`;
  const boardConclusion =
    built.block.type === "column_method"
      ? `${built.block.question} = ${built.block.answer}`
      : `${example.question} = ${answer}`;

  if (!wb || !Array.isArray(wb.blocks) || wb.blocks.length === 0) {
    return {
      ...next,
      whiteboard: {
        intro: boardIntro,
        blocks: [built.block],
        conclusion: boardConclusion,
      },
    };
  }

  let replaced = false;
  const blocks = wb.blocks.map((block) => {
    if (replaced) return block;
    if (built.block.type === "column_method" && block.type === "column_method") {
      replaced = true;
      return built.block;
    }
    if (built.block.type === "table" && block.type === "table") {
      replaced = true;
      return built.block;
    }
    if (built.block.type === "equation_steps" && block.type === "equation_steps") {
      replaced = true;
      return built.block;
    }
    return block;
  });
  if (!replaced) {
    // Drop competing LLM sketches of the same family, then insert builder block first.
    const filtered = blocks.filter((b) => {
      if (built.block.type === "column_method") return b.type !== "column_method";
      if (built.block.type === "table") return b.type !== "table";
      if (built.block.type === "equation_steps") return b.type !== "equation_steps";
      return true;
    });
    filtered.unshift(built.block);
    return {
      ...next,
      whiteboard: {
        ...wb,
        intro: boardIntro,
        blocks: filtered,
        conclusion: boardConclusion,
      },
    };
  }

  return {
    ...next,
    whiteboard: {
      ...wb,
      intro: boardIntro,
      blocks,
      conclusion: boardConclusion,
    },
  };
}

/**
 * If the worked-example question matches a registered builder, replace
 * column_method / place-value table digits and step captions with builder output.
 */
export function applyMethodBuilderToWorkedExample<T extends WorkedExampleLike>(
  example: T,
  topic?: string,
  subtopics?: string[],
): T & { teachingSteps?: TeachingStep[]; steps: string[]; answer: string } {
  const built = resolveBuild(example, topic, subtopics);
  if (!built) return example;
  return applyBuiltToExample(example, built);
}

/**
 * For KS2 Ask AI chat: replace arithmetic column_method / place-value tables
 * with builder output when the question text parses cleanly.
 */
export function applyMethodBuilderToWhiteboard(
  data: WhiteboardResponse,
  question: string,
  topic?: string,
  subtopics?: string[],
): WhiteboardResponse {
  const fake: WorkedExampleLike = {
    question,
    steps: [],
    answer: "",
    whiteboard: {
      intro: data.intro || "",
      blocks: data.blocks,
      conclusion: data.conclusion || "",
    },
  };
  const built = resolveBuild(fake, topic, subtopics);
  if (!built) return data;

  const applied = applyBuiltToExample(fake, built);
  return {
    ...data,
    intro: applied.whiteboard?.intro || data.intro,
    blocks: applied.whiteboard?.blocks || data.blocks,
    conclusion: applied.whiteboard?.conclusion || data.conclusion,
  };
}
