/**
 * Correctness checks for angle/protractor practice answers (DEF-040).
 *
 * Found by hand-checking the top of the review-triage queue, which is the point
 * of that queue: protractor lessons have no deterministic builder, so
 * deterministicMathsAnswer() returns null, hardenKS2MathsPracticeAnswers()
 * verifies nothing, and validateKS2TeachingLesson() only inspects structure.
 * Three cached lessons (75 historical hits) were serving systematically wrong
 * answers with every automated check passing.
 *
 * The faults are kept distinct because they need different repairs:
 *
 *   SUPPLEMENTED  The question states the arm crosses the MATCHING scale at
 *                 x°, and the answer gives 180 - x. "Arm DF crosses the
 *                 matching scale at 72°" answered "108°". This is the exact
 *                 wrong-scale error those lessons' own commonMistakes section
 *                 warns pupils against.
 *   UNCLASSIFIED  The question says "classify", the answer is a bare number
 *                 with no acute/right/obtuse/straight/reflex word — and in the
 *                 observed rows the number is the supplement too, so a pupil
 *                 reading "A measured angle is 45°. Classify it." is told
 *                 "135°".
 *   IMPOSSIBLE    A negative angle. "The known angles in a quadrilateral total
 *                 245°. What is the missing angle?" answered "-65°" (the
 *                 correct answer is 360 - 245 = 115°).
 */

const CLASSIFY_WORDS = /acute|right angle|right-angle|obtuse|straight|reflex/i;

/**
 * Questions where the stated reading IS the answer. If the question does not
 * pin the arm to the correct scale, then reading the other scale is a fair
 * thing to ask and 180 - x may legitimately be right, so we must not flag it.
 */
const MATCHING_SCALE =
  /matching scale|that scale|same scale|correct scale|measured angle|protractor reading|reading is/i;

export type AngleAnswerFault = "SUPPLEMENTED" | "UNCLASSIFIED" | "IMPOSSIBLE";

export interface AngleAnswerIssue {
  fault: AngleAnswerFault;
  expected: string;
  /**
   * True when the NUMBER is wrong, not merely the wording.
   *
   * This distinction decides severity and must not be collapsed. "Measure an
   * angle shown as 73° and classify it." answered "73" states a correct angle
   * and omits the word "acute" — a pedagogical shortfall. The same fault code
   * on "...reaches 135° on that scale..." answered "45°" is a child being
   * taught a wrong measurement. Reporting those as one number would overstate
   * the first and bury the second.
   */
  valueWrong: boolean;
}

/** Degree values mentioned in a string, in order. */
export function degreesIn(text: string): number[] {
  const out: number[] = [];
  // Matches "72°", "72 degrees", and the LaTeX "$72°$" / "72^\circ" forms.
  const re = /(-?\d+(?:\.\d+)?)\s*(?:°|\\?degrees?|\^\\?circ)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) out.push(Number(m[1]));
  return out;
}

/**
 * The reading a question is actually asking about.
 *
 * NOT simply the first degree value: these questions almost always name the
 * protractor baseline first ("Arm RS starts at 0°, and arm RT crosses the
 * matching scale at 90°"). Taking the first match treated that baseline as the
 * measurement, which invented a false positive (90° answered 90°, scored
 * against a "reading" of 0) and simultaneously hid four genuinely wrong answers
 * whose supplement was computed from the real reading. Drop zeros, take last.
 */
export function statedReading(question: string): number | undefined {
  const nonZero = degreesIn(question).filter((d) => d !== 0);
  return nonZero.length ? nonZero[nonZero.length - 1] : undefined;
}

/**
 * Does this question ask the pupil to NAME the angle, not just measure it?
 *
 * Kept deliberately broader than the word "classify": the commonest KS2
 * phrasing enumerates the names instead ("Is it acute, right or obtuse?").
 * Must stay in step with parseProtractorMeasure's `classify` cue in
 * lib/methods/ks2-topic-builders.ts — if the builder thinks a question wants a
 * classification and this does not (or vice versa), one of them is wrong about
 * what a pupil was asked.
 */
export function asksForClassification(question: string): boolean {
  return (
    /\bclassif\w*/i.test(question) ||
    /\b(acute|obtuse|right angle|straight|reflex)\b[^.?]*\b(or|and)\b[^.?]*\b(acute|obtuse|right|straight|reflex)\b/i.test(
      question,
    ) ||
    /\bwhat (?:kind|type) of angle\b/i.test(question) ||
    /\bname the type\b/i.test(question)
  );
}

/** The KS2 name for an angle of this size. */
export function classifyAngle(deg: number): string {
  if (deg < 90) return "acute";
  if (deg === 90) return "right angle";
  if (deg < 180) return "obtuse";
  if (deg === 180) return "straight";
  return "reflex";
}

/**
 * Check one practice item. Returns null when nothing is detectably wrong —
 * this is a targeted check for a known failure mode, NOT a general proof of
 * correctness, so a null here says "no known fault", not "verified".
 */
export function checkAngleAnswer(
  question: string,
  answer: string,
): AngleAnswerIssue | null {
  const reading = statedReading(question);
  const answerDegrees = degreesIn(answer);

  // An angle is never negative, whatever the question said.
  if (answerDegrees.some((d) => d < 0)) {
    return {
      fault: "IMPOSSIBLE",
      expected: "a non-negative angle",
      valueWrong: true,
    };
  }

  // A classification can be asked for without the word "classify". This audit
  // reported a clean zero over the whole cache while a regenerated lesson was
  // answering "A measured angle is 110°. Is it acute, right or obtuse?" with
  // "110°" — a checker's silence is only as wide as its cues.
  if (asksForClassification(question)) {
    if (!CLASSIFY_WORDS.test(answer)) {
      return {
        fault: "UNCLASSIFIED",
        expected: reading === undefined ? "a classification" : classifyAngle(reading),
        // In these questions the stated reading IS the angle, so a number that
        // disagrees with it is a wrong measurement, not just a missing word.
        valueWrong:
          reading !== undefined &&
          answerDegrees.length > 0 &&
          answerDegrees[0] !== reading,
      };
    }
  }

  if (!MATCHING_SCALE.test(question)) return null;
  if (reading === undefined || answerDegrees.length === 0) return null;

  const given = answerDegrees[0];
  if (given === reading) return null;
  if (given === 180 - reading || given === 90 - reading) {
    return { fault: "SUPPLEMENTED", expected: `${reading}°`, valueWrong: true };
  }
  return null;
}
