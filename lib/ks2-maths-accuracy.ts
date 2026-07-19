/** Deterministic answer checks shared by KS2 Learn, Guided and audits. */

import { buildMethodForQuestion } from "@/lib/methods";
import { normalizeMathText } from "@/lib/methods/normalize-math-text";
import { mathsValuesEquivalent, parseMathsValue } from "@/lib/maths-value";

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

/**
 * Numeric value of an answer string, via the exact-rational canonicaliser
 * (lib/maths-value). Mixed numbers, LaTeX fractions, unicode vulgar
 * fractions, money and decimals all reduce to one structural value.
 */
function numericValue(text: string): number | null {
  const parsed = parseMathsValue(text);
  if (!parsed) return null;
  return Number(parsed.value.num) / Number(parsed.value.den);
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

  const expectedNumber = numericValue(expected || "");
  const suppliedNumber = numericValue(supplied || "");
  if (expectedNumber !== null && suppliedNumber !== null) {
    // Lists of values (for example common multiples) must contain every value.
    const expectedNumbers: string[] =
      expectedText.match(/-?\d+(?:\.\d+)?/g) ?? [];
    if (expectedNumbers.length > 1 && /,/.test(expectedText)) {
      const actualNumbers: string[] =
        actualText.match(/-?\d+(?:\.\d+)?/g) ?? [];
      return expectedNumbers.every((value) => actualNumbers.includes(value));
    }
    // Exact rational comparison — no float tolerance.
    return mathsValuesEquivalent(supplied || "", expected || "");
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
