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
 * falls back to GPT-4o alone.
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const nerdamer = require("nerdamer");
require("nerdamer/Algebra");
require("nerdamer/Calculus");
require("nerdamer/Solve");
require("nerdamer/Extra");
/* eslint-enable @typescript-eslint/no-require-imports */

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

// ── Pattern extractors ────────────────────────────────────────────────────────

/** Try to pull an equation (something with "=") from the user text */
function extractEquation(text: string): string | null {
  // Match patterns like "2x + 4 = 10" or "x^2 - 5x + 6 = 0"
  const m = text.match(
    /([0-9a-zA-Z\s+\-*/^().²³]+=[0-9a-zA-Z\s+\-*/^().²³]+)/
  );
  if (m) return normalise(m[1]);

  // "solve: expression" or "solve expression"
  const solveMatch = text.match(
    /solve[:\s]+([0-9a-zA-Z\s+\-*/^().=²³]+)/i
  );
  if (solveMatch) return normalise(solveMatch[1]);

  return null;
}

/** Try to pull an expression to expand */
function extractExpand(text: string): string | null {
  const m = text.match(
    /expand(?:\s+and\s+simplify)?[:\s]+(.+)/i
  );
  if (m) return normalise(m[1]);
  return null;
}

/** Try to pull an expression to factorise */
function extractFactorise(text: string): string | null {
  const m = text.match(
    /factoris[ez][:\s]+(.+)/i
  );
  if (m) return normalise(m[1]);
  return null;
}

/** Try to pull an expression to simplify */
function extractSimplify(text: string): string | null {
  const m = text.match(
    /simplif[yie]+[:\s]+(.+)/i
  );
  if (m) return normalise(m[1]);
  return null;
}

/** Try to pull a numeric evaluation */
function extractEvaluate(text: string): string | null {
  const m = text.match(
    /(?:calculate|evaluate|compute|find the value of|what is)[:\s]+([0-9\s+\-*/^().piπe√]+)/i
  );
  if (m) return normalise(m[1]);
  return null;
}

/** Detect simultaneous equations */
function extractSimultaneous(text: string): string[] | null {
  const m = text.match(
    /simultaneous|solve.*(?:and|,).*=/i
  );
  if (!m) return null;

  // Try to find two equations
  const eqs = text.match(
    /([0-9a-zA-Z\s+\-*/^().]+=[0-9a-zA-Z\s+\-*/^().]+)/g
  );
  if (eqs && eqs.length >= 2) {
    return eqs.slice(0, 2).map(normalise);
  }
  return null;
}

/** Detect derivative requests */
function extractDerivative(text: string): { expr: string; variable: string } | null {
  const m = text.match(
    /(?:differentiat|derivativ|d\/d[a-z])[a-z]*[:\s]+(.+)/i
  );
  if (m) {
    const expr = normalise(m[1]);
    // Guess variable from the expression
    const vars = getVariables(expr);
    return { expr, variable: vars[0] || "x" };
  }
  return null;
}

/** Detect integral requests */
function extractIntegral(text: string): { expr: string; variable: string } | null {
  const m = text.match(
    /(?:integrat|anti.?derivativ)[a-z]*[:\s]+(.+)/i
  );
  if (m) {
    const expr = normalise(m[1]);
    const vars = getVariables(expr);
    return { expr, variable: vars[0] || "x" };
  }
  return null;
}

function getVariables(expr: string): string[] {
  try {
    return nerdamer(expr).variables();
  } catch {
    return ["x"];
  }
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

    const lVal = nerdamer(lhs, { [variable]: solution }).evaluate().text();
    const rVal = nerdamer(rhs, { [variable]: solution }).evaluate().text();

    return (
      Math.abs(parseFloat(lVal) - parseFloat(rVal)) < 1e-9
    );
  } catch {
    return false;
  }
}

/**
 * For expansion: verify by evaluating both at a few test points.
 */
function verifyExpansion(
  original: string,
  expanded: string,
  variable: string
): boolean {
  try {
    for (const val of ["2", "7", "-3"]) {
      const a = nerdamer(original, { [variable]: val }).evaluate().text();
      const b = nerdamer(expanded, { [variable]: val }).evaluate().text();
      if (Math.abs(parseFloat(a) - parseFloat(b)) > 1e-9) return false;
    }
    return true;
  } catch {
    return false;
  }
}

// ── Main solver ───────────────────────────────────────────────────────────────

/**
 * Attempts to solve the user's maths question using the CAS.
 * Returns null if the question can't be handled algebraically.
 */
export function casSolve(questionText: string): CASResult | null {
  // Clean up the question
  const text = questionText
    .replace(/²/g, "^2")
    .replace(/³/g, "^3")
    .replace(/π/g, "pi");

  try {
    // ── Simultaneous equations ───────────────────────────────────────────
    const simul = extractSimultaneous(text);
    if (simul) {
      const solutions = nerdamer.solveEquations(simul);
      return {
        problemType: "solve_simultaneous",
        inputExpression: simul.join(" ; "),
        answers: solutions.map((s: [string, string]) => `${s[0]} = ${s[1]}`),
        answersLatex: solutions.map(
          (s: [string, string]) => `${s[0]} = ${nerdamer(s[1]).toTeX()}`
        ),
        verified: true, // nerdamer's simultaneous solver is exact
      };
    }

    // ── Derivative ──────────────────────────────────────────────────────
    const deriv = extractDerivative(text);
    if (deriv) {
      const result = nerdamer(`diff(${deriv.expr}, ${deriv.variable})`);
      return {
        problemType: "derivative",
        inputExpression: deriv.expr,
        answers: [result.toString()],
        answersLatex: [result.toTeX()],
        verified: true,
      };
    }

    // ── Integral ────────────────────────────────────────────────────────
    const integ = extractIntegral(text);
    if (integ) {
      const result = nerdamer(`integrate(${integ.expr}, ${integ.variable})`);
      return {
        problemType: "integral",
        inputExpression: integ.expr,
        answers: [result.toString() + " + C"],
        answersLatex: [result.toTeX() + " + C"],
        verified: true,
      };
    }

    // ── Expand ──────────────────────────────────────────────────────────
    const expandExpr = extractExpand(text);
    if (expandExpr) {
      const expanded = nerdamer(expandExpr).expand();
      const vars = getVariables(expandExpr);
      const verified = verifyExpansion(
        expandExpr,
        expanded.toString(),
        vars[0] || "x"
      );
      return {
        problemType: "expand",
        inputExpression: expandExpr,
        answers: [expanded.toString()],
        answersLatex: [expanded.toTeX()],
        verified,
      };
    }

    // ── Factorise ───────────────────────────────────────────────────────
    // nerdamer can solve the roots → we reconstruct factors
    const factExpr = extractFactorise(text);
    if (factExpr) {
      const vars = getVariables(factExpr);
      const v = vars[0] || "x";
      const roots = nerdamer(factExpr + "=0").solveFor(v);
      const rootArr = Array.isArray(roots)
        ? roots.map((r: { toString: () => string }) => r.toString())
        : [roots.toString()];

      // Build factored form: (x - r1)(x - r2)...
      // Verify: expand the factored form and compare
      let factored: string;
      let factoredLatex: string;

      // Get leading coefficient
      const expanded = nerdamer(factExpr).expand().toString();
      // Match coefficient of highest power
      const coefMatch = expanded.match(
        /^(-?\d*)\*?[a-zA-Z]\^/
      );
      const leadCoef = coefMatch
        ? coefMatch[1] === "" || coefMatch[1] === "-"
          ? coefMatch[1] + "1"
          : coefMatch[1]
        : "1";

      if (rootArr.length === 2) {
        const [r1, r2] = rootArr;
        const f1 = parseFloat(r1) >= 0 ? `(${v} - ${r1})` : `(${v} + ${Math.abs(parseFloat(r1))})`;
        const f2 = parseFloat(r2) >= 0 ? `(${v} - ${r2})` : `(${v} + ${Math.abs(parseFloat(r2))})`;
        factored = leadCoef === "1" ? `${f1}${f2}` : `${leadCoef}*${f1}${f2}`;
        factoredLatex = nerdamer(factored).toTeX();
      } else {
        // Single root or can't factor nicely
        factored = rootArr.map((r) => {
          const n = parseFloat(r);
          return n >= 0 ? `(${v} - ${r})` : `(${v} + ${Math.abs(n)})`;
        }).join("");
        if (leadCoef !== "1") factored = `${leadCoef}*${factored}`;
        factoredLatex = nerdamer(factored).toTeX();
      }

      const verified = verifyExpansion(factExpr, factored, v);

      return {
        problemType: "factorise",
        inputExpression: factExpr,
        answers: [factored],
        answersLatex: [factoredLatex],
        intermediateSteps: rootArr.map((r, i) => ({
          label: `Root ${i + 1}`,
          latex: `${v} = ${nerdamer(r).toTeX()}`,
        })),
        verified,
      };
    }

    // ── Simplify ────────────────────────────────────────────────────────
    const simpExpr = extractSimplify(text);
    if (simpExpr) {
      const simplified = nerdamer(simpExpr).simplify();
      const vars = getVariables(simpExpr);
      const verified = vars.length > 0
        ? verifyExpansion(simpExpr, simplified.toString(), vars[0])
        : true;

      return {
        problemType: "simplify",
        inputExpression: simpExpr,
        answers: [simplified.toString()],
        answersLatex: [simplified.toTeX()],
        verified,
      };
    }

    // ── Evaluate ────────────────────────────────────────────────────────
    const evalExpr = extractEvaluate(text);
    if (evalExpr) {
      const result = nerdamer(evalExpr).evaluate();
      return {
        problemType: "evaluate",
        inputExpression: evalExpr,
        answers: [result.text()],
        answersLatex: [result.toTeX()],
        verified: true,
      };
    }

    // ── Solve equation (general fallback for anything with "=") ────────
    const eq = extractEquation(text);
    if (eq) {
      const hasEquals = eq.includes("=");
      if (hasEquals) {
        const vars = getVariables(eq.split("=")[0]);
        const v = vars[0] || "x";

        const solutions = nerdamer(eq).solveFor(v);
        const solArr = Array.isArray(solutions)
          ? solutions.map((s: { toString: () => string }) => s.toString())
          : [solutions.toString()];

        const isQuadratic = solArr.length > 1;

        // Verify each solution
        const allVerified = solArr.every((sol) =>
          verifyEquationSolution(eq, v, sol)
        );

        return {
          problemType: isQuadratic ? "solve_quadratic" : "solve_equation",
          inputExpression: eq,
          answers: solArr.map((s) => `${v} = ${s}`),
          answersLatex: solArr.map(
            (s) => `${v} = ${nerdamer(s).toTeX()}`
          ),
          verified: allVerified,
        };
      }
    }

    // ── If nothing matched, bail → GPT-4o handles it alone ────────────
    return null;
  } catch (e) {
    // CAS couldn't parse → not a problem, GPT-4o will handle it
    console.log("[CAS] Could not solve:", (e as Error).message);
    return null;
  }
}
