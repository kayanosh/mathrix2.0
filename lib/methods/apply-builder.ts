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
} from "@/lib/methods/column-addition";
import { buildPlaceValueShift, parsePlaceValueShift } from "@/lib/methods/place-value-shift";
import { preferredBuilderId } from "@/lib/ks2-pedagogy/registry";
import { teachingStepsToCaptions, type MethodBuildResult } from "@/lib/methods/types";
import { normalizeColumnDigits } from "@/lib/column-method-layout";
import { normalizeMathText } from "@/lib/methods/normalize-math-text";
import type {
  ColumnMethodBlock,
  TableBlock,
  VisualBlock,
  WhiteboardResponse,
} from "@/types/whiteboard";

export interface WorkedExampleLike {
  question: string;
  steps: string[];
  answer: string;
  whiteboard?: {
    intro: string;
    blocks: VisualBlock[];
    conclusion: string;
  };
}

/**
 * Authoritative sources for the MAIN worked example only.
 * Never scan step captions or equation_steps — they contain sub-operations
 * (e.g. "3 × 7") that would replace the real problem (23 × 47).
 */
function primarySourceTexts(example: WorkedExampleLike): string[] {
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
  return texts;
}

/** Rebuild from an existing column_method board when prose has no operands. */
function buildFromColumnBlock(block: ColumnMethodBlock): MethodBuildResult | null {
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

  // Pass 1: worked-example question / intro / board question (never sub-steps).
  for (const raw of primarySourceTexts(example)) {
    const text = normalizeMathText(raw);
    const built = buildMethodForQuestion(text, preferred);
    if (built) return built;
    const any = buildMethodForQuestion(text, null);
    if (any) return any;
  }

  // Pass 2: operands encoded in the column/table board itself.
  for (const block of example.whiteboard?.blocks || []) {
    if (block.type === "column_method") {
      const fromBlock = buildFromColumnBlock(block);
      if (fromBlock) return fromBlock;
    }
    if (block.type === "table") {
      const fromTable = buildFromTableBlock(block);
      if (fromTable) return fromTable;
    }
  }

  // Pass 3: one-shot parse from joined primary sources (still no step captions).
  const blob = primarySourceTexts(example).map(normalizeMathText).join(" ");
  const mult = parseMultiplicationOperands(blob);
  if (mult && ![10, 100, 1000].includes(mult.b)) {
    try {
      return buildColumnMultiplication(mult.a, mult.b);
    } catch {
      /* ignore */
    }
  }

  return null;
}

function applyBuiltToExample<T extends WorkedExampleLike>(
  example: T,
  built: MethodBuildResult,
): T {
  const captions = teachingStepsToCaptions(built.teachingSteps);
  const answer =
    built.block.type === "column_method"
      ? built.block.answer || example.answer
      : example.answer;

  const next: T = {
    ...example,
    steps: captions.length > 0 ? captions : example.steps,
    answer,
  };

  const wb = example.whiteboard;
  if (!wb || !Array.isArray(wb.blocks) || wb.blocks.length === 0) {
    return {
      ...next,
      whiteboard: {
        intro: wb?.intro || `Let's work out ${example.question}.`,
        blocks: [built.block],
        conclusion:
          wb?.conclusion ||
          (built.block.type === "column_method"
            ? `${built.block.question} = ${built.block.answer}`
            : example.answer),
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
    return block;
  });
  if (!replaced) {
    const filtered = blocks.filter((b) => {
      if (built.block.type === "column_method") return b.type !== "column_method";
      if (built.block.type === "table") return b.type !== "table";
      return true;
    });
    filtered.unshift(built.block);
    return {
      ...next,
      whiteboard: {
        ...wb,
        blocks: filtered,
        conclusion:
          built.block.type === "column_method"
            ? `${built.block.question} = ${built.block.answer}`
            : wb.conclusion,
      },
    };
  }

  return {
    ...next,
    whiteboard: {
      ...wb,
      blocks,
      conclusion:
        built.block.type === "column_method"
          ? `${built.block.question} = ${built.block.answer}`
          : wb.conclusion,
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
): T {
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
    blocks: applied.whiteboard?.blocks || data.blocks,
    conclusion: applied.whiteboard?.conclusion || data.conclusion,
  };
}
