/**
 * The last line of defence between a deterministic builder and the pupil.
 *
 * WHY THIS EXISTS. Builders draw the working for a question they recognise, and
 * their output REPLACES the model's. Most of them find their operands with
 * regexes that match anywhere in the text, so a question they only half-read
 * still "matches" — and the board then shows a different, simpler sum, solved
 * correctly:
 *
 *   "62,403 − 27,568"        → worked 403 − 27 = 376
 *   "25 + 37 + 48"           → worked 25 + 37 = 62
 *   "3(4 + 5)"               → worked 4 + 5 = 9
 *   "rectangle 3.5 m by 2 m" → worked 5 × 2 = 10
 *   "−x² + 5x − 6 = 0"       → solved x² + 5x − 6 = 0
 *
 * These were being fixed one builder at a time as pupils hit them. This is the
 * general answer: every builder's result is checked HERE, in one place, before
 * anything is allowed to use it, and a result that fails is discarded. The
 * model's own answer then stands — a plainer board, but not a wrong one.
 *
 * Three independent tests:
 *
 *   1. The answer. If the strict reader (lib/maths-question.ts) can read the
 *      whole question, its exact value is compared with the builder's, or the
 *      builder's roots are substituted into the equation. Disagreement = discard.
 *
 *   2. The operands. Every number in the question must appear somewhere in the
 *      builder's output. A builder that never mentions 62,403 did not work on
 *      a question about 62,403.
 *
 *   3. The kind of answer. A fraction where a decimal was asked for, or a
 *      negative angle, length or area.
 *
 * All three run in the browser too (no algebra engine), because the lesson panel
 * re-runs builders client-side and must reach the same verdict as the server.
 */
import type { MethodBuildResult } from "./types";
import { evaluateExact, parseMathsQuestion } from "@/lib/maths-question";
import {
  mathsValuesEquivalent,
  parseMathsValue,
  rationalEquals,
  type Rational,
} from "@/lib/maths-value";
import { assignedValues, numbersIn, plain } from "@/lib/answer-text";

/** The answer the builder states, wherever this kind of builder keeps it. */
function statedAnswer(built: MethodBuildResult): string {
  const onBlock = (built.block as { answer?: unknown }).answer;
  return String(built.answer || (typeof onBlock === "string" ? onBlock : "") || built.conclusion || "");
}

function lastEquationLine(built: MethodBuildResult): string {
  const block = built.block;
  if (block.type !== "equation_steps" || block.steps.length === 0) return "";
  return block.steps[block.steps.length - 1].latexAfter || "";
}

function asText(value: Rational): string {
  return value.den === 1n ? String(value.num) : `${value.num}/${value.den}`;
}

/** Test 1: does the builder's answer contradict the question itself? */
function answerContradiction(question: string, built: MethodBuildResult): string | null {
  const parsed = parseMathsQuestion(question);
  if (!parsed) return null;

  if (parsed.task === "evaluate" && parsed.exact) {
    const truth = evaluateExact(parsed.expression);
    const answer = plain(statedAnswer(built));
    if (!truth || !answer) return null;
    // "3 r 2" is a correct way to answer 17 ÷ 5 and is not the number 17/5.
    if (/\b(?:r|rem|remainder)\b/i.test(answer)) return null;
    if (!parseMathsValue(answer)) return null;
    return mathsValuesEquivalent(answer, asText(truth))
      ? null
      : `answered "${answer}" but the question works out to ${asText(truth)}`;
  }

  if (parsed.task === "solve") {
    const [lhs, rhs] = parsed.equation.split("=");
    const stated = assignedValues(
      [statedAnswer(built), lastEquationLine(built)].map(plain).join(" ; "),
      parsed.variable,
    );
    if (stated === "unreadable") return null;
    for (const root of stated) {
      const scope = { [parsed.variable]: root };
      const left = evaluateExact(lhs, scope);
      const right = evaluateExact(rhs, scope);
      if (left && right && !rationalEquals(left, right)) {
        return `${parsed.variable} = ${asText(root)} does not satisfy ${parsed.equation}`;
      }
    }
  }

  return null;
}

/** Every number anywhere in a builder's output: text fields and numeric fields. */
function numbersInOutput(value: unknown, found: Rational[], depth = 0): void {
  if (depth > 12 || value == null) return;
  if (typeof value === "string") {
    for (const { value: number } of numbersIn(plain(value))) found.push(number);
  } else if (typeof value === "number" && Number.isFinite(value)) {
    for (const { value: number } of numbersIn(String(Math.abs(value)))) found.push(number);
  } else if (Array.isArray(value)) {
    for (const item of value) numbersInOutput(item, found, depth + 1);
  } else if (typeof value === "object") {
    for (const item of Object.values(value as Record<string, unknown>)) {
      numbersInOutput(item, found, depth + 1);
    }
  }
}

const magnitude = (value: Rational): Rational =>
  value.num < 0n ? { num: -value.num, den: value.den } : value;

/**
 * Numbers in a question that label something rather than take part in it:
 * "Quadrant 4", "Year 5", "Question 3", "to 2 decimal places". A builder has no
 * reason to repeat these, so they are not held against it.
 */
const LABELLED_NUMBER =
  /\b(?:quadrant|year|yr|question|q|step|part|figure|fig|table|stage|level|ks|paper|grade|chapter|page|lesson|exercise)\.?\s*#?\d+\b|\b\d+\s*(?:d\.?\s?p\.?|decimal places?|s\.?\s?f\.?|significant figures?)(?![a-z])/gi;

/** Test 2: which numbers from the question does the builder never mention? */
function unusedNumbers(question: string, built: MethodBuildResult): string[] {
  const asked = numbersIn(plain(question).replace(LABELLED_NUMBER, " "));
  if (asked.length === 0) return [];

  const used: Rational[] = [];
  numbersInOutput(
    [built.block, built.extraBlocks, built.teachingSteps, built.captions, built.answer, built.intro, built.conclusion],
    used,
  );
  const usedMagnitudes = used.map(magnitude);

  return asked
    .filter(({ value }) => !usedMagnitudes.some((u) => rationalEquals(u, magnitude(value))))
    .map(({ raw }) => raw.trim());
}

/**
 * Test 3: is the answer even the right KIND of thing? Cheap checks for a
 * builder that read the numbers but answered a different question.
 */
function wrongKindOfAnswer(question: string, built: MethodBuildResult): string | null {
  const answer = plain(statedAnswer(built));
  if (!answer) return null;
  const hasFraction = /\d\s*\/\s*\d/.test(answer);
  const hasPercent = /%|per\s?cent/i.test(answer);

  // "Write 2 3/4 as a decimal" answered "11/4": equal in value, wrong in form.
  // (An equivalence chain such as "1/4 = 0.25 = 25%" does contain the decimal.)
  if (
    /\b(?:as|to|into) an? decimal\b/i.test(question) &&
    (hasFraction || hasPercent) &&
    !/\d\.\d/.test(answer)
  ) {
    return `asked for a decimal but answered "${answer}"`;
  }
  if (/\b(?:as|to|into) an? (?:percentage|percent)\b/i.test(question) && !hasPercent) {
    return `asked for a percentage but answered "${answer}"`;
  }
  if (
    /\b(?:as|to|into) an? (?:fraction|mixed number|improper fraction)\b/i.test(question) &&
    !hasFraction
  ) {
    return `asked for a fraction but answered "${answer}"`;
  }

  // "Convert 1/4 kg to g" is a unit conversion, and only the unit-conversion
  // builder knows how to do one. When it declined or was discarded, the next
  // builder in line used to answer anyway — "1/4 = 0.25 = 25%" — which reads
  // the number correctly and answers a different question.
  const isUnitConversion =
    /\b(?:convert|change)\b/i.test(question) &&
    /\d\s*(?:(?:kilo|centi|milli)?(?:metres?|meters?|grams?|litres?|liters?)|km|cm|mm|kg|ml|m|g|l|hours?|hrs?|minutes?|mins?|seconds?|secs?|days?|weeks?|pence|pounds?)\b/i.test(
      plain(question),
    );
  if (isUnitConversion && built.builderId !== "unit_conversion") {
    return `a unit conversion answered by the ${built.builderId} builder`;
  }

  // "A cuboid is 6 cm long, 4 cm wide and 6 cm high. Work out its total
  // surface area." has three lengths, so the volume method took it and
  // answered 144 cm³. The surface area is 168 cm².
  if (/\bsurface\s+area\b/i.test(question) && (built.builderId === "cuboid_volume" || built.builderId === "rect_perimeter_area")) {
    return `asked for a surface area but answered by the ${built.builderId} builder`;
  }
  // "A regular polygon has 18 sides. Work out the size of each exterior
  // angle." was answered 180° − 18° = 162°: the number of sides was read as an
  // angle. The angle method needs an angle in the question to start from.
  if (built.builderId === "angle_diagram" && !/\d\s*(?:°|\^\s*\{?\s*\\circ|degrees?\b)/i.test(question)) {
    return "the question gives no angle for the angle method to start from";
  }

  // A measurement cannot be negative. "Angles 90°, 80° and 110°. Find the
  // missing angle." → −100° is a builder that subtracted from the wrong total.
  // Deliberately limited to measurements: equations, coordinates and vectors
  // have perfectly good negative answers.
  const value = parseMathsValue(answer);
  const asksForMeasurement =
    /°|\b(?:angles?|degrees?|area|perimeter|volume|length|width|height|mass|weight|capacity)\b/i.test(
      question,
    );
  if (value && value.value.num < 0n && asksForMeasurement) {
    return `answered "${answer}", but a measurement cannot be negative`;
  }
  return null;
}

/**
 * Why this builder's result must not be used for this question, or null if it
 * may be. Callers should discard the result on any non-null answer.
 */
export function builderRejection(question: string, built: MethodBuildResult): string | null {
  const contradiction = answerContradiction(question, built);
  if (contradiction) return contradiction;

  const wrongKind = wrongKindOfAnswer(question, built);
  if (wrongKind) return wrongKind;

  const unused = unusedNumbers(question, built);
  if (unused.length > 0) {
    return `never used ${unused.join(", ")} from the question`;
  }
  return null;
}
