/**
 * Replace LLM-authored arithmetic working with deterministic method builders
 * so Learn / Guided / Tutor share one correct digit-level script.
 */

import { buildMethodForQuestion } from "@/lib/methods";
import { preferredBuilderId } from "@/lib/ks2-pedagogy/registry";
import { teachingStepsToCaptions } from "@/lib/methods/types";
import type { VisualBlock, WhiteboardResponse } from "@/types/whiteboard";

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
 * If the worked-example question matches a registered builder, replace
 * column_method / place-value table digits and step captions with builder output.
 */
export function applyMethodBuilderToWorkedExample<T extends WorkedExampleLike>(
  example: T,
  topic?: string,
  subtopics?: string[],
): T {
  const preferred = preferredBuilderId(example.question, topic, subtopics);
  const built = buildMethodForQuestion(example.question, preferred);
  if (!built) return example;

  const captions = teachingStepsToCaptions(built.teachingSteps).slice(0, 6);
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
    if (
      built.block.type === "column_method" &&
      block.type === "column_method"
    ) {
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
    blocks.unshift(built.block);
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
 * For KS2 Ask AI chat: replace arithmetic column_method / place-value tables
 * with builder output when the question text parses cleanly.
 */
export function applyMethodBuilderToWhiteboard(
  data: WhiteboardResponse,
  question: string,
  topic?: string,
  subtopics?: string[],
): WhiteboardResponse {
  const preferred = preferredBuilderId(question, topic, subtopics);
  const built = buildMethodForQuestion(question, preferred);
  if (!built) return data;

  let replaced = false;
  const blocks = data.blocks.map((block) => {
    if (replaced) return block;
    if (
      built.block.type === "column_method" &&
      block.type === "column_method"
    ) {
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
    const insertAt = blocks.findIndex((b) => b.type !== "text");
    if (insertAt < 0) blocks.push(built.block);
    else blocks.splice(insertAt, 0, built.block);
  }

  const conclusion =
    built.block.type === "column_method"
      ? `${built.block.question} = ${built.block.answer}`
      : data.conclusion;

  return { ...data, blocks, conclusion };
}
