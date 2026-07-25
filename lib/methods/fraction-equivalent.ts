/**
 * Deterministic KS2 equivalent-fraction builder.
 *
 * This is deliberately separate from FDP conversion: a question that asks
 * for a new numerator or denominator should stay entirely in fraction form.
 */

import type {
  EquationStepBlock,
  FractionBarBlock,
} from "@/types/whiteboard";
import type {
  MethodBuildResult,
  TeachingStep,
} from "@/lib/methods/types";
import { normalizeMathText } from "@/lib/methods/normalize-math-text";

export interface EquivalentFractionProblem {
  sourceNumerator: number;
  sourceDenominator: number;
  targetNumerator: number;
  targetDenominator: number;
  givenPart: "numerator" | "denominator";
  factor: number;
  operation: "multiply" | "divide";
}

function wholeNumberScale(
  source: number,
  target: number,
): { factor: number; operation: "multiply" | "divide" } | null {
  if (source > 0 && target >= source && target % source === 0) {
    return { factor: target / source, operation: "multiply" };
  }
  if (target > 0 && source > target && source % target === 0) {
    return { factor: source / target, operation: "divide" };
  }
  return null;
}

export function parseEquivalentFraction(
  text: string,
): EquivalentFractionProblem | null {
  const normalized = normalizeMathText(text);
  const namesEquivalence = /\bequivalent\b/i.test(normalized);
  const hasMissingFractionEquation =
    /(\d+)\s*\/\s*(\d+)\s*=\s*(?:(?:\?|[a-z])\s*\/\s*\d+|\d+\s*\/\s*(?:\?|[a-z]))/i.test(
      normalized,
    );
  if (!namesEquivalence && !hasMissingFractionEquation) {
    return null;
  }
  // FDP questions genuinely need decimal/percentage conversion and belong to
  // the FDP builder, even when they also use the word "equivalent".
  if (/\bdecimals?\b|\bpercent(?:age)?s?\b|%|\bfdp\b/i.test(normalized)) {
    return null;
  }

  const source = normalized.match(/(\d+)\s*\/\s*(\d+)/);
  if (!source) return null;
  const sourceNumerator = Number(source[1]);
  const sourceDenominator = Number(source[2]);
  if (
    !Number.isInteger(sourceNumerator) ||
    !Number.isInteger(sourceDenominator) ||
    sourceNumerator < 0 ||
    sourceDenominator <= 0 ||
    sourceNumerator > sourceDenominator
  ) {
    return null;
  }

  const afterSource = normalized.slice((source.index || 0) + source[0].length);
  const denominatorMatch =
    afterSource.match(
      /\bdenominator\s*(?:of|is|equals?|must\s+be|should\s+be|=|:)?\s*(\d+)\b/i,
    ) ||
    afterSource.match(/=\s*(?:\?|[a-z])\s*\/\s*(\d+)\b/i);
  const numeratorMatch =
    afterSource.match(
      /\bnumerator\s*(?:of|is|equals?|must\s+be|should\s+be|=|:)?\s*(\d+)\b/i,
    ) ||
    afterSource.match(/=\s*(\d+)\s*\/\s*(?:\?|[a-z])\b/i);

  if (denominatorMatch) {
    const targetDenominator = Number(denominatorMatch[1]);
    const scale = wholeNumberScale(sourceDenominator, targetDenominator);
    if (!scale || scale.factor <= 1) return null;
    const targetNumerator =
      scale.operation === "multiply"
        ? sourceNumerator * scale.factor
        : sourceNumerator / scale.factor;
    if (!Number.isInteger(targetNumerator)) return null;
    return {
      sourceNumerator,
      sourceDenominator,
      targetNumerator,
      targetDenominator,
      givenPart: "denominator",
      ...scale,
    };
  }

  if (numeratorMatch) {
    const targetNumerator = Number(numeratorMatch[1]);
    const scale = wholeNumberScale(sourceNumerator, targetNumerator);
    if (!scale || scale.factor <= 1) return null;
    const targetDenominator =
      scale.operation === "multiply"
        ? sourceDenominator * scale.factor
        : sourceDenominator / scale.factor;
    if (!Number.isInteger(targetDenominator)) return null;
    return {
      sourceNumerator,
      sourceDenominator,
      targetNumerator,
      targetDenominator,
      givenPart: "numerator",
      ...scale,
    };
  }

  return null;
}

export function buildEquivalentFraction(
  problem: EquivalentFractionProblem,
): MethodBuildResult {
  const {
    sourceNumerator: n,
    sourceDenominator: d,
    targetNumerator: tn,
    targetDenominator: td,
    givenPart,
    factor,
    operation,
  } = problem;
  const symbol = operation === "multiply" ? "×" : "÷";
  const latexSymbol = operation === "multiply" ? "\\times" : "\\div";
  const scaleSource = givenPart === "denominator" ? d : n;
  const scaleTarget = givenPart === "denominator" ? td : tn;

  const sourceBar: FractionBarBlock = {
    type: "fraction_bar",
    numerator: n,
    denominator: d,
    shaded: n,
    label: `Start: ${n}/${d}`,
  };
  const targetBar: FractionBarBlock = {
    type: "fraction_bar",
    numerator: tn,
    denominator: td,
    shaded: tn,
    label: `Equivalent fraction: ${tn}/${td}`,
  };

  const equations: EquationStepBlock = {
    type: "equation_steps",
    steps: [
      {
        stepNumber: 1,
        operationLabel: "Find the scale factor",
        explanation: `${scaleSource} ${symbol} ${factor} = ${scaleTarget}.`,
        rule: "Compare the matching parts",
        why: `The ${givenPart} changes by a factor of ${factor}.`,
        latexBefore: `${scaleSource} ${latexSymbol} ? = ${scaleTarget}`,
        latexAfter: `${scaleSource} ${latexSymbol} ${factor} = ${scaleTarget}`,
        arrowDirection: "simplify",
      },
      {
        stepNumber: 2,
        operationLabel: `${operation === "multiply" ? "Multiply" : "Divide"} both parts`,
        explanation: `${n} ${symbol} ${factor} = ${tn} and ${d} ${symbol} ${factor} = ${td}.`,
        rule: `${operation === "multiply" ? "Multiply" : "Divide"} numerator and denominator`,
        why: `${operation === "multiply" ? "Multiplying" : "Dividing"} both parts by the same number keeps the fraction equivalent.`,
        latexBefore: `\\frac{${n}}{${d}}`,
        latexAfter: `\\frac{${n} ${latexSymbol} ${factor}}{${d} ${latexSymbol} ${factor}} = \\frac{${tn}}{${td}}`,
        arrowDirection: "simplify",
      },
      {
        stepNumber: 3,
        operationLabel: "Check the value",
        explanation: `${n} × ${td} = ${n * td} and ${tn} × ${d} = ${tn * d}.`,
        rule: "Cross-products match",
        why: "Matching cross-products confirm that both fractions have the same value.",
        latexBefore: `\\frac{${n}}{${d}} \\stackrel{?}{=} \\frac{${tn}}{${td}}`,
        latexAfter: `${n} \\times ${td} = ${tn} \\times ${d}`,
        arrowDirection: "simplify",
        selfCheck: `${n * td} = ${tn * d}`,
      },
    ],
  };

  const teachingSteps: TeachingStep[] = [
    {
      title: "Find the scale factor",
      explanation: `${scaleSource} ${symbol} ${factor} = ${scaleTarget}, so the scale factor is ${factor}.`,
      why: `Compare the ${givenPart}s first.`,
      narration: `Compare the matching parts. ${scaleSource} ${operation === "multiply" ? "times" : "divided by"} ${factor} is ${scaleTarget}.`,
      cellKeys: [],
      carryKeys: [],
      noteKeys: [],
    },
    {
      title: `${operation === "multiply" ? "Multiply" : "Divide"} top and bottom`,
      explanation: `${n} ${symbol} ${factor} = ${tn}; ${d} ${symbol} ${factor} = ${td}.`,
      why: "Changing both parts by the same factor keeps the amount unchanged.",
      narration: `${operation === "multiply" ? "Multiply" : "Divide"} the numerator and denominator by ${factor}.`,
      cellKeys: [],
      carryKeys: [],
      noteKeys: [],
    },
    {
      title: "Write and check",
      explanation: `${n}/${d} = ${tn}/${td}. Both bars show the same amount.`,
      why: "The whole is split into more or fewer equal parts, but the shaded proportion is unchanged.",
      narration: `${n} over ${d} equals ${tn} over ${td}. The two bars show the same amount.`,
      cellKeys: [],
      carryKeys: [],
      noteKeys: [],
      showAnswer: true,
    },
  ];

  return {
    builderId: "fraction_equivalent",
    block: sourceBar,
    extraBlocks: [targetBar, equations],
    teachingSteps,
    captions: teachingSteps.map((step) => `${step.title}: ${step.explanation}`),
    answer: `${tn}/${td}`,
    intro: `Make ${n}/${d} equivalent by using the same scale factor on the numerator and denominator.`,
    conclusion: `${n}/${d} = ${tn}/${td}. Both fractions represent the same amount.`,
  };
}
