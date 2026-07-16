/**
 * Deterministic KS2 order-of-operations (BIDMAS) builder.
 *
 * It evaluates the complete visible expression, one operation at a time. This
 * prevents a leading multiplication such as 36 × 15 from being mistaken for
 * the whole question in 36 × 15 ÷ 5 + 8.
 */

import { normalizeMathText } from "@/lib/methods/normalize-math-text";
import type { MethodBuildResult, TeachingStep } from "@/lib/methods/types";
import type { EquationStep, EquationStepBlock } from "@/types/whiteboard";

type Operator = "+" | "-" | "×" | "÷" | "^";
type Token =
  | { kind: "number"; value: number }
  | { kind: "operator"; value: Operator }
  | { kind: "paren"; value: "(" | ")" };

export interface OrderOperationReduction {
  before: string;
  after: string;
  operator: Operator;
  left: number;
  right: number;
  result: number;
  insideBrackets: boolean;
}

export interface OrderOperationsProblem {
  expression: string;
  reductions: OrderOperationReduction[];
  answer: number;
}

function formatNumber(value: number): string {
  if (Object.is(value, -0)) return "0";
  if (Number.isInteger(value)) return String(value);
  return String(Number(value.toFixed(10)));
}

function tokenText(token: Token): string {
  if (token.kind === "number") return formatNumber(token.value);
  if (token.kind === "paren") return token.value;
  if (token.value === "×") return "\\times";
  if (token.value === "÷") return "\\div";
  return token.value;
}

function tokensToLatex(tokens: Token[]): string {
  return tokens.map(tokenText).join(" ");
}

function tokenize(raw: string): Token[] | null {
  const source = raw
    .replace(/,/g, "")
    .replace(/²/g, "^2")
    .replace(/³/g, "^3")
    .replace(/[x*]/gi, "×")
    .trim();
  const tokens: Token[] = [];
  let index = 0;

  while (index < source.length) {
    const char = source[index];
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }
    if (char === "(" || char === ")") {
      tokens.push({ kind: "paren", value: char });
      index += 1;
      continue;
    }
    if (["+", "-", "×", "÷", "^"].includes(char)) {
      const previous = tokens[tokens.length - 1];
      const unary =
        (char === "+" || char === "-") &&
        (!previous ||
          previous.kind === "operator" ||
          (previous.kind === "paren" && previous.value === "("));
      if (!unary) {
        tokens.push({ kind: "operator", value: char as Operator });
        index += 1;
        continue;
      }
    }

    const numberMatch = source
      .slice(index)
      .match(/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)/);
    if (!numberMatch) return null;
    const value = Number(numberMatch[0]);
    if (!Number.isFinite(value)) return null;
    tokens.push({ kind: "number", value });
    index += numberMatch[0].length;
  }

  const operators = tokens.filter((token) => token.kind === "operator").length;
  const numbers = tokens.filter((token) => token.kind === "number").length;
  if (operators < 2 || numbers < 3) return null;

  let depth = 0;
  for (const token of tokens) {
    if (token.kind !== "paren") continue;
    depth += token.value === "(" ? 1 : -1;
    if (depth < 0) return null;
  }
  return depth === 0 ? tokens : null;
}

function stripResolvedParentheses(tokens: Token[]): void {
  let changed = true;
  while (changed) {
    changed = false;
    for (let index = 0; index <= tokens.length - 3; index += 1) {
      if (
        tokens[index].kind === "paren" &&
        tokens[index].value === "(" &&
        tokens[index + 1].kind === "number" &&
        tokens[index + 2].kind === "paren" &&
        tokens[index + 2].value === ")"
      ) {
        tokens.splice(index, 3, tokens[index + 1]);
        changed = true;
        break;
      }
    }
  }
}

function operationIndex(
  tokens: Token[],
): { index: number; insideBrackets: boolean } | null {
  let open = -1;
  let close = -1;
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.kind === "paren" && token.value === "(") open = index;
    if (token.kind === "paren" && token.value === ")") {
      close = index;
      break;
    }
  }
  const start = open >= 0 ? open + 1 : 0;
  const end = close >= 0 ? close : tokens.length;
  const find = (operators: Operator[], rightToLeft = false): number => {
    if (rightToLeft) {
      for (let index = end - 1; index >= start; index -= 1) {
        const token = tokens[index];
        if (token.kind === "operator" && operators.includes(token.value)) {
          return index;
        }
      }
      return -1;
    }
    for (let index = start; index < end; index += 1) {
      const token = tokens[index];
      if (token.kind === "operator" && operators.includes(token.value)) {
        return index;
      }
    }
    return -1;
  };

  let selected = find(["^"], true);
  if (selected < 0) selected = find(["×", "÷"]);
  if (selected < 0) selected = find(["+", "-"]);
  return selected > 0 ? { index: selected, insideBrackets: open >= 0 } : null;
}

function calculate(left: number, operator: Operator, right: number): number {
  if (operator === "+") return left + right;
  if (operator === "-") return left - right;
  if (operator === "×") return left * right;
  if (operator === "÷") {
    if (right === 0) throw new Error("Cannot divide by zero");
    return left / right;
  }
  if (!Number.isInteger(right) || right < 0 || right > 10) {
    throw new Error("KS2 indices must be small non-negative whole numbers");
  }
  return left ** right;
}

function reduceExpression(expression: string): OrderOperationsProblem | null {
  const tokens = tokenize(expression);
  if (!tokens) return null;
  const reductions: OrderOperationReduction[] = [];
  const original = tokensToLatex(tokens);

  for (let guard = 0; guard < 30; guard += 1) {
    stripResolvedParentheses(tokens);
    if (tokens.length === 1 && tokens[0].kind === "number") {
      return { expression: original, reductions, answer: tokens[0].value };
    }
    const selected = operationIndex(tokens);
    if (!selected) return null;
    const leftToken = tokens[selected.index - 1];
    const opToken = tokens[selected.index];
    const rightToken = tokens[selected.index + 1];
    if (
      leftToken?.kind !== "number" ||
      opToken?.kind !== "operator" ||
      rightToken?.kind !== "number"
    ) {
      return null;
    }
    const before = tokensToLatex(tokens);
    const result = calculate(leftToken.value, opToken.value, rightToken.value);
    if (!Number.isFinite(result) || Math.abs(result) > Number.MAX_SAFE_INTEGER) {
      return null;
    }
    tokens.splice(selected.index - 1, 3, { kind: "number", value: result });
    stripResolvedParentheses(tokens);
    reductions.push({
      before,
      after: tokensToLatex(tokens),
      operator: opToken.value,
      left: leftToken.value,
      right: rightToken.value,
      result,
      insideBrackets: selected.insideBrackets,
    });
  }
  return null;
}

function extractExpression(text: string): string | null {
  const normalized = normalizeMathText(text);
  const candidates = normalized.match(/[()\d.,+\-×x*÷^²³\s]+/g) || [];
  const parsed = candidates
    .map((candidate) => ({
      candidate: candidate.trim(),
      parsed: reduceExpression(candidate),
    }))
    .filter(
      (entry): entry is { candidate: string; parsed: OrderOperationsProblem } =>
        Boolean(entry.parsed),
    )
    .sort(
      (left, right) =>
        right.parsed.reductions.length - left.parsed.reductions.length,
    );
  return parsed[0]?.candidate || null;
}

export function parseOrderOperationsQuestion(
  text: string,
): OrderOperationsProblem | null {
  const expression = extractExpression(text);
  if (!expression) return null;
  const problem = reduceExpression(expression);
  if (!problem) return null;

  // A repeated single operation such as 3 × 4 × 5 is normally a volume,
  // scaling or arithmetic question, not a BIDMAS lesson. Do not steal it
  // from the more specific deterministic builders unless the wording makes
  // the intended method explicit.
  const explicitOrderLanguage =
    /\b(BIDMAS|order of operations|mixed operations?|correct order)\b/i.test(text);
  const operators = new Set(problem.reductions.map((step) => step.operator));
  const structurallyOrdered = /[()²³^]/.test(expression) || operators.size > 1;
  return explicitOrderLanguage || structurallyOrdered ? problem : null;
}

function actionName(operator: Operator): string {
  if (operator === "×") return "Multiply";
  if (operator === "÷") return "Divide";
  if (operator === "+") return "Add";
  if (operator === "-") return "Subtract";
  return "Work out the index";
}

function ruleFor(reduction: OrderOperationReduction): string {
  if (reduction.insideBrackets) return "Brackets first";
  if (reduction.operator === "^") return "Indices before other operations";
  if (reduction.operator === "×" || reduction.operator === "÷") {
    return "Multiplication and division, left to right";
  }
  return "Addition and subtraction, left to right";
}

function whyFor(reduction: OrderOperationReduction): string {
  if (reduction.insideBrackets) {
    return "BIDMAS tells us to complete the calculation inside brackets first.";
  }
  if (reduction.operator === "^") {
    return "Indices are completed before multiplication, division, addition or subtraction.";
  }
  if (reduction.operator === "×" || reduction.operator === "÷") {
    return "Multiplication and division have equal priority, so we work from left to right before adding or subtracting.";
  }
  return "After higher-priority operations, addition and subtraction are completed from left to right.";
}

export function buildOrderOperations(
  problem: OrderOperationsProblem,
): MethodBuildResult {
  const equationSteps: EquationStep[] = [
    {
      stepNumber: 1,
      operationLabel: "Write the complete expression",
      explanation: "Keep every operation visible before choosing the first one.",
      latexBefore: problem.expression,
      latexAfter: problem.expression,
      arrowDirection: "down",
      rule: "BIDMAS",
      why: "Seeing the complete expression prevents us from stopping after only one operation.",
    },
    ...problem.reductions.map((reduction, index) => ({
      stepNumber: index + 2,
      operationLabel: `${actionName(reduction.operator)}: ${formatNumber(reduction.left)} ${reduction.operator} ${formatNumber(reduction.right)}`,
      explanation: `${formatNumber(reduction.left)} ${reduction.operator} ${formatNumber(reduction.right)} = ${formatNumber(reduction.result)}. Rewrite the whole expression with that part replaced.`,
      latexBefore: reduction.before,
      latexAfter: reduction.after,
      arrowDirection: "simplify" as const,
      rule: ruleFor(reduction),
      why: whyFor(reduction),
      selfCheck:
        index === problem.reductions.length - 1
          ? `Final answer: ${formatNumber(problem.answer)} ✓`
          : undefined,
    })),
  ];
  const block: EquationStepBlock = { type: "equation_steps", steps: equationSteps };

  const teachingSteps: TeachingStep[] = [
    {
      title: "Read the complete expression",
      explanation: `Keep ${problem.expression} together and use BIDMAS to choose the first operation.`,
      why: "Stopping after the first calculation would answer only part of the question.",
      narration: "Read the complete expression and choose the first operation using BIDMAS.",
      cellKeys: [],
      carryKeys: [],
      noteKeys: [],
    },
    ...problem.reductions.map((reduction, index) => ({
      title: `${actionName(reduction.operator)} ${formatNumber(reduction.left)} ${reduction.operator} ${formatNumber(reduction.right)}`,
      explanation: `${reduction.before} becomes ${reduction.after}.`,
      why: whyFor(reduction),
      narration: `${actionName(reduction.operator)} ${formatNumber(reduction.left)} and ${formatNumber(reduction.right)} to get ${formatNumber(reduction.result)}, then rewrite the complete expression.`,
      cellKeys: [],
      carryKeys: [],
      noteKeys: [],
      showAnswer: index === problem.reductions.length - 1,
    })),
  ];

  return {
    builderId: "order_of_operations",
    block,
    teachingSteps,
    captions: teachingSteps.map((step) => step.explanation),
    answer: formatNumber(problem.answer),
    intro: "Use BIDMAS on the complete expression, rewriting it after each operation.",
  };
}
