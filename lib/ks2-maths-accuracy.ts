/** Deterministic answer checks shared by KS2 Learn, Guided and audits. */

import { buildMethodForQuestion } from "@/lib/methods";
import { normalizeMathText } from "@/lib/methods/normalize-math-text";

export interface MathsAnswerIssue {
  location: string;
  question: string;
  supplied: string;
  expected: string;
  builderId: string;
}

interface PracticeItemLike {
  question?: string;
  answer?: string;
}

export interface MathsPracticeLessonLike {
  guidedPractice?: PracticeItemLike[];
  independentPractice?: PracticeItemLike[];
  quickCheck?: PracticeItemLike;
  tryThis?: PracticeItemLike;
}

function numericValue(text: string): number | null {
  const normalized = normalizeMathText(text).replace(/,/g, "");
  const fractions = [...normalized.matchAll(/(-?\d+)\s*\/\s*(\d+)/g)];
  if (fractions.length > 0) {
    const match = fractions[fractions.length - 1];
    const denominator = Number(match[2]);
    return denominator === 0 ? null : Number(match[1]) / denominator;
  }
  const numbers = normalized.match(/-?\d+(?:\.\d+)?/g);
  return numbers?.length ? Number(numbers[numbers.length - 1]) : null;
}

function coordinateTuple(text: string): [number, number] | null {
  const match = normalizeMathText(text).match(
    /\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)/,
  );
  return match ? [Number(match[1]), Number(match[2])] : null;
}

export function mathsAnswersEquivalent(
  supplied: string,
  expected: string,
): boolean {
  const actualText = normalizeMathText(supplied || "").toLowerCase();
  const expectedText = normalizeMathText(expected || "").toLowerCase();
  if (!expectedText) return true;

  const expectedCoordinate = coordinateTuple(expectedText);
  if (expectedCoordinate) {
    const suppliedCoordinate = coordinateTuple(actualText);
    return Boolean(
      suppliedCoordinate &&
      suppliedCoordinate[0] === expectedCoordinate[0] &&
      suppliedCoordinate[1] === expectedCoordinate[1],
    );
  }

  const expectedNumber = numericValue(expectedText);
  const suppliedNumber = numericValue(actualText);
  if (expectedNumber !== null && suppliedNumber !== null) {
    // Lists of values (for example common multiples) must contain every value.
    const expectedNumbers: string[] =
      expectedText.match(/-?\d+(?:\.\d+)?/g) ?? [];
    if (expectedNumbers.length > 1 && /,/.test(expectedText)) {
      const actualNumbers: string[] =
        actualText.match(/-?\d+(?:\.\d+)?/g) ?? [];
      return expectedNumbers.every((value) => actualNumbers.includes(value));
    }
    return Math.abs(expectedNumber - suppliedNumber) < 1e-9;
  }

  const compactActual = actualText.replace(/[^a-z0-9]/g, "");
  const compactExpected = expectedText.replace(/[^a-z0-9]/g, "");
  return Boolean(compactExpected) && compactActual.includes(compactExpected);
}

export function deterministicMathsAnswer(
  question: string,
): { answer: string; builderId: string } | null {
  const built = buildMethodForQuestion(question);
  if (!built?.answer) return null;
  return { answer: built.answer, builderId: built.builderId };
}

function hardenItem<T extends PracticeItemLike>(item: T | undefined): T | undefined {
  if (!item?.question) return item;
  const solved = deterministicMathsAnswer(String(item.question));
  return solved ? ({ ...item, answer: solved.answer } as T) : item;
}

/** Repair every answer-bearing pupil task, not only the main worked example. */
export function hardenKS2MathsPracticeAnswers<T extends MathsPracticeLessonLike>(
  lesson: T,
): T {
  return {
    ...lesson,
    guidedPractice: Array.isArray(lesson.guidedPractice)
      ? lesson.guidedPractice.map((item) => hardenItem(item)!)
      : lesson.guidedPractice,
    independentPractice: Array.isArray(lesson.independentPractice)
      ? lesson.independentPractice.map((item) => hardenItem(item)!)
      : lesson.independentPractice,
    quickCheck: hardenItem(lesson.quickCheck),
    tryThis: hardenItem(lesson.tryThis),
  } as T;
}

/** Find any deterministically solvable practice answer that disagrees. */
export function auditKS2MathsPracticeAnswers(
  lesson: MathsPracticeLessonLike,
): MathsAnswerIssue[] {
  const issues: MathsAnswerIssue[] = [];
  const check = (location: string, item: PracticeItemLike | undefined) => {
    if (!item?.question || !item.answer) return;
    const solved = deterministicMathsAnswer(String(item.question));
    if (!solved || mathsAnswersEquivalent(String(item.answer), solved.answer)) return;
    issues.push({
      location,
      question: String(item.question),
      supplied: String(item.answer),
      expected: solved.answer,
      builderId: solved.builderId,
    });
  };

  (lesson.guidedPractice || []).forEach((item, index) =>
    check(`guidedPractice[${index}]`, item),
  );
  (lesson.independentPractice || []).forEach((item, index) =>
    check(`independentPractice[${index}]`, item),
  );
  check("quickCheck", lesson.quickCheck);
  check("tryThis", lesson.tryThis);
  return issues;
}
