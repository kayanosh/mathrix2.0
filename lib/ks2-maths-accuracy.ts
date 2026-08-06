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

/**
 * Why a question's answer must NOT be replaced by a builder's numeric result,
 * or null when a bare computed value is genuinely what the question asks for.
 *
 * Every rule here was derived from a real cached question that would otherwise
 * have been corrupted — see DEF-026. Returning a reason (rather than a boolean)
 * keeps the tests and any future audit output self-explanatory.
 *
 * The governing principle, learned the hard way across DEF-008/020/023/024/025:
 * a builder must DECLINE rather than guess. Declining leaves the model's
 * answer, which for these question forms is usually right; guessing replaces
 * correct prose or a correct sub-step value with an unrelated total.
 */
export function reasonToDeclineNumericAnswer(
  question: string,
  builderId = "",
): string | null {
  const t = normalizeMathText(question);
  const isIntegerArithmeticBuilder =
    /^(?:column_addition|column_subtraction|column_multiplication|long_division)$/.test(
      builderId,
    );

  // "In 268 + 157, what digit is carried?" / "When calculating 326 x 54, why..."
  // The expression is CONTEXT; the question is about a step inside it.
  if (/^\s*(?:in|for|when|from)\b[^,?]{0,60},/i.test(t)) {
    return "sub-step question: the expression is context, not the task";
  }
  // Asks about a digit, a place value, or a named part of the method.
  if (
    /\bwhat\s+(?:digit|number|does|do\s+you\s+write)\b|\brepresent\b|\bstand\s+for\b|\bmean\b|\bcarried\b|\bpartial\s+product\b|\bexchang\w*\b/i.test(
      t,
    )
  ) {
    return "asks about a digit/place value/step, not the result";
  }
  // Wants reasoning in prose. A bare number cannot be an explanation.
  if (/\b(?:why|explain|justify|describe|how\s+do\s+you\s+know|reason)\b/i.test(t)) {
    return "reasoning question: the answer is prose";
  }
  // "Use 46 + 23 = 69 to work out 460 + 230" — the stated fact is a GIVEN, and a
  // builder reading left-to-right answers the given instead of the target.
  if (/\buse\b[^.?]*\bto\s+(?:work\s+out|find|calculate|solve)\b/i.test(t)) {
    return "derived-fact question: the stated calculation is a given, not the task";
  }
  // Fill-in-the-blank: the answer is the completed statement, not one value.
  if (/complete\s*:|\\+square|\\+Box|□|\?\s*=/i.test(t)) {
    return "fill-in-the-blank: the answer is the completed statement";
  }
  // Verify/check questions want the checking calculation or a yes/no with a why.
  if (
    /\bis\b[^?]*\bcorrect\b|\btrue\?|\bcheck\b[^?]*\b(?:using|by)\b|\bwhich\s+calculation\b|\bsensible\b|\binverse\s+operation\b/i.test(
      t,
    )
  ) {
    return "verification question: the answer is a check, not the total";
  }
  // Estimation asks for a ROUNDED value; a builder returns the exact one.
  if (/\bestimat\w*\b|\bround\w*\s+to\s+the\s+nearest\b|\bapproximat\w*\b/i.test(t)) {
    return "estimation question: an exact total is the wrong answer";
  }
  // Function machines / sequences ask for a rule or several outputs.
  if (/\bthe\s+rule\s+is\b|\bfunction\s+machine\b|\boutput\s+values?\b|\bnth\s+term\b/i.test(t)) {
    return "rule/sequence question: the answer is not a single total";
  }
  // Multi-part questions have more than one required answer.
  if (/\band\s+what\s+is\b/i.test(t) || (t.match(/\?/g) ?? []).length > 1) {
    return "multi-part question: more than one answer is required";
  }
  // The integer column/division builders cannot do decimals or fractions, and
  // silently return a wrong integer for them (e.g. "8.4 ÷ 4" -> 1, not 2.1).
  if (isIntegerArithmeticBuilder && /\d\.\d/.test(t)) {
    return "decimal question routed to an integer-only builder";
  }
  // Fraction notation must be checked in BOTH forms: normalizeMathText rewrites
  // "\frac{8}{12}" to "8/12", so testing only for the LaTeX macro silently
  // missed every normalised fraction and let long_division answer "What is
  // \frac{8}{12} simplified?" with "0 r 8".
  const hasFractionNotation =
    /\\+frac/i.test(question) ||
    /\d\s*\/\s*\d/.test(t) ||
    /[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]/.test(t);
  if (isIntegerArithmeticBuilder && (hasFractionNotation || /%|\bpercent/i.test(t))) {
    return "fraction/percentage question routed to an integer-only builder";
  }
  return null;
}

export function deterministicMathsAnswer(
  question: string,
): { answer: string; builderId: string } | null {
  const built = buildMethodForQuestion(question);
  if (!built) return null;

  // Column/division builders put their result on the block, not on the result
  // object. Without this fallback, deterministicMathsAnswer() returned null for
  // ALL column arithmetic — so hardenKS2MathsPracticeAnswers() silently
  // verified nothing there, which is why DEF-008's wrong practice answers
  // (e.g. "47,586 + 28,749 = 614") survived long after its parser was fixed and
  // its worked examples had self-healed (DEF-026).
  const blockAnswer =
    built.block?.type === "column_method" ? String(built.block.answer ?? "") : "";
  const answer = built.answer || blockAnswer;
  if (!answer) return null;

  // Only trust a computed value when the question actually asks for one.
  if (reasonToDeclineNumericAnswer(question, built.builderId)) return null;

  return { answer, builderId: built.builderId };
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
