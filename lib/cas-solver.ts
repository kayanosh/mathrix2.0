/**
 * CAS (Computer Algebra System) solver powered by nerdamer.
 *
 * This module tries to parse a natural-language maths question,
 * extract the algebraic expression / equation, solve it symbolically,
 * and return a structured result that gets injected into the GPT-4o prompt
 * so the LLM formats the explanation around the verified answer.
 *
 * If the question can't be parsed or solved by the CAS (geometry word
 * problems, probability, etc.) it returns `null` and the pipeline
 * falls back to the model alone.
 *
 * Reading the question is done by lib/maths-question.ts, which accepts a
 * question only when it can read ALL of it. This file used to do that with
 * loose regexes, and produced confidently wrong "verified" answers — see the
 * note at the top of that file before loosening anything here.
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const nerdamer = require("nerdamer");
require("nerdamer/Algebra");
require("nerdamer/Calculus");
require("nerdamer/Solve");
require("nerdamer/Extra");
/* eslint-enable @typescript-eslint/no-require-imports */

import { parseMathsQuestion } from "@/lib/maths-question";

// ── Public interface ──────────────────────────────────────────────────────────

export interface CASResult {
  /** What the CAS understood the problem to be */
  problemType:
    | "solve_equation"
    | "solve_quadratic"
    | "solve_simultaneous"
    | "expand"
    | "factorise"
    | "simplify"
    | "evaluate"
    | "derivative"
    | "integral";
  /** The original expression the CAS parsed */
  inputExpression: string;
  /** The computed answer(s), stringified */
  answers: string[];
  /** LaTeX form of each answer */
  answersLatex: string[];
  /** Optional intermediate steps the CAS can expose */
  intermediateSteps?: { label: string; latex: string }[];
  /** Whether the answer was verified by substitution */
  verified: boolean;
}

// ── Normalisation helpers ─────────────────────────────────────────────────────

/**
 * Converts natural-language / LaTeX-ish expressions into a form nerdamer
 * can parse.  Handles implicit multiplication, unicode minus, common
 * patterns students type, etc.
 *
 * Exported so that sympy-solver.ts can reuse the same normalisation logic.
 */
export function normalise(expr: string): string {
  let s = expr.trim();

  // Remove trailing question marks, periods
  s = s.replace(/[?.!]+$/, "").trim();

  // Unicode minus → ASCII
  s = s.replace(/−/g, "-");
  // × → *
  s = s.replace(/×/g, "*");
  // ÷ → /
  s = s.replace(/÷/g, "/");
  // ^ already works in nerdamer

  // Strip LaTeX: \frac{a}{b} → (a)/(b)
  s = s.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1)/($2)");
  // \sqrt{x} → sqrt(x)
  s = s.replace(/\\sqrt\{([^}]+)\}/g, "sqrt($1)");
  // \left( and \right)
  s = s.replace(/\\(?:left|right)([()[\]])/g, "$1");
  // Strip remaining backslash commands (e.g. \cdot → *)
  s = s.replace(/\\cdot/g, "*");
  s = s.replace(/\\times/g, "*");
  s = s.replace(/\\div/g, "/");
  s = s.replace(/\\pi/g, "pi");
  // generic \cmd{…} → just the contents
  s = s.replace(/\\[a-zA-Z]+\{([^}]+)\}/g, "$1");
  // remaining backslash commands → remove
  s = s.replace(/\\[a-zA-Z]+/g, "");

  // Implicit multiplication: 2x → 2*x, 3(x+1) → 3*(x+1)
  s = s.replace(/(\d)([a-zA-Z(])/g, "$1*$2");
  // x( → x*(
  s = s.replace(/([a-zA-Z])(\()/g, "$1*$2");
  // )(  → )*(
  s = s.replace(/\)\(/g, ")*(");
  // )x → )*x
  s = s.replace(/\)([a-zA-Z])/g, ")*$1");

  return s;
}

// ── Verification ──────────────────────────────────────────────────────────────

/**
 * For equations: substitute the answer back into both sides and check equality.
 */
function verifyEquationSolution(
  equation: string,
  variable: string,
  solution: string
): boolean {
  try {
    const [lhs, rhs] = equation.split("=").map((s) => s.trim());
    if (!lhs || !rhs) return false;

    const lVal = parseFloat(nerdamer(lhs, { [variable]: solution }).evaluate().text());
    const rVal = parseFloat(nerdamer(rhs, { [variable]: solution }).evaluate().text());

    // NaN compares false with everything, so "not too far apart" would pass a
    // result that is not a number at all. Demand two real numbers first.
    if (!Number.isFinite(lVal) || !Number.isFinite(rVal)) return false;
    return Math.abs(lVal - rVal) < 1e-9;
  } catch {
    return false;
  }
}

/**
 * For expansion: verify by evaluating both at a few test points.
 *
 * Every unknown in either expression is given a value, not just the first: with
 * one left symbolic, "10*y" and "10*y^2" both read as the number 10 and agree.
 */
function verifyExpansion(
  original: string,
  expanded: string,
  variable: string
): boolean {
  try {
    const names = new Set<string>([
      variable,
      ...nerdamer(original).variables(),
      ...nerdamer(expanded).variables(),
    ]);
    for (const base of [2, 7, -3]) {
      const scope: Record<string, string> = {};
      let offset = 0;
      for (const name of names) {
        scope[name] = String(base + offset);
        offset += 3;
      }
      const a = Number(nerdamer(original, scope).evaluate().text());
      const b = Number(nerdamer(expanded, scope).evaluate().text());
      // "x² + 1" used to factorise to "(x + NaN)(x + NaN)" and pass, because
      // NaN is never "more than 1e-9 away" from anything.
      if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
      if (Math.abs(a - b) > 1e-9 * Math.max(1, Math.abs(a))) return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Are two expressions the same function? Checked by evaluating both at several
 * points, with every unknown given a value. False if either cannot be read.
 */
export function expressionsEquivalent(a: string, b: string): boolean {
  return verifyExpansion(a, b, "x");
}

/**
 * Roots of an equation in one unknown, as strings nerdamer can re-read — with
 * repeats, so (x + 3)² yields -3 twice. Returns null when any root is complex:
 * at this level the right answer is "no real solutions", and "x = i" presented
 * as ground truth would be worse than no ground truth.
 */
function rootsOf(equation: string, variable: string): string[] | null {
  const solutions = nerdamer(equation).solveFor(variable);
  const list: string[] = Array.isArray(solutions)
    ? solutions.map((s: { toString: () => string }) => s.toString())
    : [solutions.toString()];
  if (list.some((root) => /i/.test(root))) return null;
  return list;
}

// ── Main solver ───────────────────────────────────────────────────────────────

/**
 * Attempts to solve the user's maths question using the CAS.
 * Returns null if the question can't be handled algebraically.
 *
 * `verified: true` is a claim other code relies on — it becomes the ground
 * truth the model must match. It is only set when the answer was confirmed by
 * a second route (substitution, or re-evaluating at test points), or is plain
 * exact arithmetic on a question that was read in full.
 */
export function casSolve(questionText: string): CASResult | null {
  const parsed = parseMathsQuestion(questionText);
  if (!parsed) return null;

  try {
    switch (parsed.task) {
      case "evaluate": {
        const value = nerdamer(parsed.expression).evaluate();
        // Exact arithmetic is reported as a fraction (5/4, not 1.25) so that it
        // can be compared exactly; 1/3 has no finite decimal to compare against.
        const text: string = parsed.exact ? value.text("fractions") : value.text("decimals");
        if (!text || /[a-zA-Z]/.test(text.replace(/e[+-]?\d+/i, ""))) return null;
        return {
          problemType: "evaluate",
          inputExpression: parsed.expression,
          // "≈" marks a decimal approximation (π or a root was involved), which
          // tells the comparison to accept a correct rounding and nothing else.
          // A root that comes out whole (√16 + 2 = 6) is exact after all.
          answers: [parsed.exact || /^-?\d+$/.test(text) ? text : `≈${text}`],
          answersLatex: [parsed.exact ? nerdamer(text).toTeX() : text],
          verified: true,
        };
      }

      case "solve": {
        const { equation, variable } = parsed;
        const roots = rootsOf(equation, variable);
        if (!roots || roots.length === 0) return null;
        // A repeated root comes back twice; a pupil is asked for it once.
        const solutions = [...new Set(roots)];
        return {
          problemType: solutions.length > 1 ? "solve_quadratic" : "solve_equation",
          inputExpression: equation,
          answers: solutions.map((s) => `${variable} = ${s}`),
          answersLatex: solutions.map((s) => `${variable} = ${nerdamer(s).toTeX()}`),
          verified: solutions.every((s) => verifyEquationSolution(equation, variable, s)),
        };
      }

      case "simultaneous": {
        // A copy, because nerdamer rewrites the array it is handed.
        const solutions: [string, string | number][] = nerdamer.solveEquations([
          ...parsed.equations,
        ]);
        if (!Array.isArray(solutions) || solutions.length !== 2) return null;
        // Substitute the pair back into both equations before vouching for it.
        const values = Object.fromEntries(solutions.map(([name, value]) => [name, String(value)]));
        const verified = parsed.equations.every((equation) => {
          try {
            const [lhs, rhs] = equation.split("=");
            const l = parseFloat(nerdamer(lhs, values).evaluate().text());
            const r = parseFloat(nerdamer(rhs, values).evaluate().text());
            return Math.abs(l - r) < 1e-9;
          } catch {
            return false;
          }
        });
        return {
          problemType: "solve_simultaneous",
          inputExpression: parsed.equations.join(" ; "),
          answers: solutions.map(([name, value]) => `${name} = ${value}`),
          answersLatex: solutions.map(
            ([name, value]) => `${name} = ${nerdamer(String(value)).toTeX()}`
          ),
          verified,
        };
      }

      case "derivative": {
        const result = nerdamer(`diff(${parsed.expression}, ${parsed.variable})`);
        return {
          problemType: "derivative",
          inputExpression: parsed.expression,
          answers: [result.toString()],
          answersLatex: [result.toTeX()],
          verified: true,
        };
      }

      case "integral": {
        const result = nerdamer(`integrate(${parsed.expression}, ${parsed.variable})`);
        return {
          problemType: "integral",
          inputExpression: parsed.expression,
          answers: [result.toString() + " + C"],
          answersLatex: [result.toTeX() + " + C"],
          verified: true,
        };
      }

      case "expand": {
        const expanded = nerdamer(parsed.expression).expand();
        return {
          problemType: "expand",
          inputExpression: parsed.expression,
          answers: [expanded.toString()],
          answersLatex: [expanded.toTeX()],
          verified: verifyExpansion(
            parsed.expression,
            expanded.toString(),
            parsed.variable || "x"
          ),
        };
      }

      case "factorise": {
        // nerdamer can solve the roots → we reconstruct factors
        const factExpr = parsed.expression;
        const v = parsed.variable || "x";
        const rootArr = rootsOf(factExpr + "=0", v);
        if (!rootArr || rootArr.length === 0) return null;

        // Get leading coefficient
        const expanded = nerdamer(factExpr).expand().toString();
        // Match coefficient of highest power
        const coefMatch = expanded.match(/^(-?\d*)\*?[a-zA-Z]\^/);
        const leadCoef = coefMatch
          ? coefMatch[1] === "" || coefMatch[1] === "-"
            ? coefMatch[1] + "1"
            : coefMatch[1]
          : "1";

        // Build factored form: (x - r1)(x - r2)...
        let factored = rootArr
          .map((r) => {
            const n = parseFloat(r);
            return n >= 0 ? `(${v} - ${r})` : `(${v} + ${Math.abs(n)})`;
          })
          .join("");
        if (leadCoef !== "1") factored = `${leadCoef}*${factored}`;

        // Verify: evaluate the factored form against the original. This is what
        // catches a repeated root or an irreducible factor the rebuild missed.
        const verified = verifyExpansion(factExpr, factored.replace(/\)\(/g, ")*("), v);

        return {
          problemType: "factorise",
          inputExpression: factExpr,
          answers: [factored],
          answersLatex: [nerdamer(factored.replace(/\)\(/g, ")*(")).toTeX()],
          intermediateSteps: rootArr.map((r, i) => ({
            label: `Root ${i + 1}`,
            latex: `${v} = ${nerdamer(r).toTeX()}`,
          })),
          verified,
        };
      }

      case "simplify": {
        const simplified = nerdamer(parsed.expression).simplify();
        return {
          problemType: "simplify",
          inputExpression: parsed.expression,
          answers: [simplified.toString()],
          // simplify() returns a bare symbol with no toTeX(); calling it threw,
          // so no "simplify" question ever produced a ground truth.
          answersLatex: [nerdamer(simplified.toString()).toTeX()],
          verified: parsed.variable
            ? verifyExpansion(parsed.expression, simplified.toString(), parsed.variable)
            : true,
        };
      }
    }
  } catch (e) {
    // CAS couldn't solve → not a problem, the model will handle it
    console.log("[CAS] Could not solve:", (e as Error).message);
    return null;
  }
}
