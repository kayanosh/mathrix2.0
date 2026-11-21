/**
 * Reading numbers and "x = …" statements out of whiteboard text.
 *
 * Pure string work with no algebra engine behind it, so it can run in the
 * browser as well as on the server. lib/answer-agreement.ts (server) and
 * lib/methods/builder-guard.ts (both) are built on it.
 */
import { parseNumericToken, type Rational } from "@/lib/maths-value";

export const NUMBER = String.raw`\d+ \d+\s*\/\s*\d+|\d+\s*\/\s*\d+|\d+(?:\.\d+)?`;
/** A minus is a sign only when it does not follow something it could subtract from. */
const SIGNED_NUMBER = new RegExp(String.raw`(?:(?<![\d)a-zA-Z]\s?)-)?(?:${NUMBER})`, "g");

/** Strip the whiteboard's LaTeX down to text a number can be read from. */
export function plain(text: string): string {
  return String(text || "")
    .replace(/\\(?:htmlId|htmlClass|textcolor|color)\s*\{[^{}]*\}\s*\{([^{}]*)\}/g, "$1")
    .replace(/(\d)\s*\\[dt]?frac/g, "$1 \\frac") // 2\frac{1}{4} is a mixed number, not 21/4
    .replace(/\\[dt]?frac\s*\{\s*(-?\d+)\s*\}\s*\{\s*(\d+)\s*\}/g, "$1/$2")
    .replace(/\\text\s*\{([^{}]*)\}/g, " $1 ")
    .replace(/\\pm/g, "±")
    .replace(/[−–]/g, "-")
    .replace(/\\(?:quad|qquad|[,;! ])/g, " ")
    .replace(/\$+/g, " ")
    .replace(/(\d),(?=\d{3}(?!\d))/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export function toRational(token: string): Rational | null {
  return parseNumericToken(token.replace(/\s*\/\s*/g, "/").trim());
}

export function numbersIn(text: string): Array<{ raw: string; value: Rational }> {
  const found: Array<{ raw: string; value: Rational }> = [];
  for (const match of text.matchAll(SIGNED_NUMBER)) {
    const value = toRational(match[0]);
    if (value) found.push({ raw: match[0], value });
  }
  return found;
}

/** Values assigned to `variable` in text: "x = 6 or -1", "x = ±4", "x = 20 - 15 = 5". */
export function assignedValues(text: string, variable: string): Rational[] | "unreadable" {
  const values: Rational[] = [];
  const start = new RegExp(String.raw`(?<![a-zA-Z])${variable}\s*=\s*`, "g");
  const one = new RegExp(String.raw`^\s*(±|\+\s*-|\+\/-)?\s*(-?(?:${NUMBER}))`);
  let sawUnreadable = false;

  for (const match of text.matchAll(start)) {
    let rest = text.slice(match.index! + match[0].length);
    const here: Rational[] = [];
    for (;;) {
      const value = one.exec(rest);
      if (!value) {
        sawUnreadable = true; // "x = 2y + 1", "x = \sqrt{5}" — not a number we can compare
        here.length = 0;
        break;
      }
      const parsed = toRational(value[2]);
      if (!parsed) {
        sawUnreadable = true;
        here.length = 0;
        break;
      }
      rest = rest.slice(value[0].length);

      // "x = 20 - 15 = 5" and "x = 10 = 10": the value is whatever the chain
      // of working ends on, so skip to the last equals sign in the run.
      const chained = /^\s*(?:[+\-*/×÷^][\d\s+\-*/×÷^().]*)?=\s*/.exec(rest);
      if (chained) {
        rest = rest.slice(chained[0].length);
        continue;
      }
      // "x = 3 + 2" is working, not an answer.
      if (/^\s*[+\-*/×÷^]/.test(rest)) {
        sawUnreadable = true;
        here.length = 0;
        break;
      }

      here.push(parsed);
      if (value[1]) here.push({ num: -parsed.num, den: parsed.den });

      // "x = 6 or -1", "x = 6, -1" — but not "x = 6 and y = 2".
      const more = /^\s*(?:,|or|and)\s*(?=[±\-\d])(?![a-zA-Z]\s*=)/.exec(rest);
      if (!more) break;
      rest = rest.slice(more[0].length);
    }
    values.push(...here);
  }

  if (values.length === 0 && sawUnreadable) return "unreadable";
  return values;
}
