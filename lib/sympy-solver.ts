/**
 * TypeScript client for the SymPy Python solver endpoint.
 *
 * Calls POST /api/sympy_solver — a Vercel Python serverless function that
 * uses SymPy/NumPy for symbolic computation. Far more powerful than Nerdamer:
 * handles complex integrals, differential equations, 3+ variable simultaneous
 * equations, statistical distributions, and advanced algebra.
 *
 * Always returns null on failure — the pipeline degrades gracefully to Nerdamer.
 */

import { parseMathsQuestion } from "@/lib/maths-question";

export type SympyTaskType =
  | "solve"
  | "simplify"
  | "expand"
  | "factorise"
  | "diff"
  | "integrate"
  | "evaluate"
  | "simultaneous"
  | "pythagoras"
  | "triangle_angles"
  | "area"
  | "volume"
  | "trig_solve"
  | "circle_property";

export interface SympyResult {
  success: boolean;
  /** Stringified answers (e.g. ["3", "2"] for x² - 5x + 6 = 0) */
  answers?: string[];
  /** LaTeX-formatted answers */
  answersLatex?: string[];
  /** Error message if success is false */
  error?: string;
  /**
   * False when the answer is a decimal approximation of an irrational value
   * (anything with π or a root in it). Absent or true means exact.
   */
  exact?: boolean;
  /** How long the call took */
  latencyMs: number;
}

/**
 * Infer the best SymPy task type from the question text and any CAS result.
 */
export function inferSympyTask(questionText: string): {
  type: SympyTaskType;
  expression: string;
  expressions?: string[];
  variable: string;
} | null {
  const text = questionText.trim();

  // Algebra and arithmetic go through the strict reader shared with the
  // Nerdamer path: it reads the whole question or declines. The regexes that
  // used to live here sent SymPy expressions like "Solve the equation 2*x + 4"
  // — English words and all.
  const parsed = parseMathsQuestion(text);
  if (parsed) {
    const py = (expression: string) => expression.replace(/\^/g, "**");
    switch (parsed.task) {
      case "evaluate":
        return { type: "evaluate", expression: py(parsed.expression), variable: "x" };
      case "solve":
        return { type: "solve", expression: py(parsed.equation), variable: parsed.variable };
      case "simultaneous":
        return {
          type: "simultaneous",
          expression: py(parsed.equations[0]),
          expressions: parsed.equations.map(py),
          variable: parsed.variables[0],
        };
      case "expand":
      case "factorise":
      case "simplify":
        return {
          type: parsed.task,
          expression: py(parsed.expression),
          variable: parsed.variable ?? "x",
        };
      case "derivative":
        return { type: "diff", expression: py(parsed.expression), variable: parsed.variable };
      case "integral":
        return { type: "integrate", expression: py(parsed.expression), variable: parsed.variable };
    }
  }

  // ── Geometry ────────────────────────────────────────────────────────────
  // Same rule as the algebra above: read the whole question or decline.
  return inferGeometryTask(text);
}

/**
 * Geometry questions SymPy can be trusted with.
 *
 * This used to guess: "the radius is the first number in the question", "the
 * base and height are the first two numbers". "A circle has diameter 10" gave
 * the area for radius 10; "perimeter 20 and length 6, find the area" gave 120.
 * Those guesses would have become ground truth the moment SymPy was switched
 * on.
 *
 * Now a question is accepted only when
 *   - it is one direct "find the area / volume / circumference" question,
 *     with no second step and no reverse problem;
 *   - every dimension it needs is NAMED in the text (radius 7, base 5,
 *     height 3) — nothing is taken by position; and
 *   - those named dimensions account for every number in the question.
 */
function inferGeometryTask(text: string): ReturnType<typeof inferSympyTask> {
  const t = text.replace(/[−–]/g, "-").replace(/\s+/g, " ").trim();

  // Anything that makes this more than a single formula.
  if (
    /\b(?:diameter|shaded|compound|composite|remaining|left over|difference|total|altogether|each|per|cost|price|how many|times|twice|double|half|percent|ratio|scale|similar|increase|decrease|in terms of|surface area|show that|prove|explain|why)\b|%/i.test(
      t,
    )
  ) {
    return null;
  }
  // Two different length units means a conversion we are not doing.
  const units = new Set((t.match(/\d\s*(mm|cm|km|m)\b/gi) || []).map((u) => u.replace(/[\d\s]/g, "").toLowerCase()));
  if (units.size > 1) return null;

  const numbers = t.match(/\d+(?:\.\d+)?/g) || [];
  // Squared/cubed unit markers ("cm2", "m3") are not dimensions.
  const dimensionCount = numbers.length - (t.match(/\b(?:mm|cm|km|m)\s?[23]\b/gi) || []).length;

  /** The number that follows a dimension's name: "radius of 7 cm", "base = 5". */
  const named = (name: string): string | null => {
    const match = new RegExp(String.raw`\b${name}\b(?:\s+(?:of|is|=|:))?\s*=?\s*(\d+(?:\.\d+)?)\b`, "i").exec(t);
    return match ? match[1] : null;
  };
  /** Accept only if exactly these dimensions were found and nothing else numeric remains. */
  const build = (
    type: SympyTaskType,
    head: string,
    dims: Record<string, string | null>,
  ): ReturnType<typeof inferSympyTask> => {
    const entries = Object.entries(dims);
    if (entries.some(([, value]) => value === null)) return null;
    if (dimensionCount !== entries.length) return null;
    const expression = [head, ...entries.map(([key, value]) => `${key}=${value}`)]
      .filter(Boolean)
      .join(",");
    return { type, expression, variable: "x" };
  };

  // The quantity must be the thing asked for, straight after the verb: "find
  // the area of…". "Find the height of a triangle with area 12" mentions area
  // but asks for something else.
  const asks = (what: RegExp) =>
    new RegExp(
      String.raw`\b(?:find|calculate|work out|what is|determine)\s+(?:the\s+)?(?:${what.source})\b`,
      "i",
    ).test(t);
  // One quantity per question: "find the area and the circumference" has two
  // answers, and a ground truth for only one of them would contradict the other.
  const quantities = new Set(
    (t.match(/\b(?:area|volume|circumference|perimeter)\b/gi) || []).map((q) => q.toLowerCase()),
  );
  if (quantities.size > 1) return null;

  if (asks(/area/)) {
    if (/\bsector\b/i.test(t)) {
      return build("area", "shape=sector", { radius: named("radius"), angle: named("angle") });
    }
    if (/\bcircle\b/i.test(t)) return build("area", "shape=circle", { radius: named("radius") });
    if (/\btriangle\b/i.test(t)) {
      return build("area", "shape=triangle", { base: named("base"), height: named("height") });
    }
    if (/\bparallelogram\b/i.test(t)) {
      return build("area", "shape=parallelogram", { base: named("base"), height: named("height") });
    }
    if (/\brectangle\b/i.test(t)) {
      return build("area", "shape=rectangle", { length: named("length"), width: named("width") });
    }
    return null;
  }

  if (asks(/volume/)) {
    if (/\bcylinder\b/i.test(t)) {
      return build("volume", "shape=cylinder", { radius: named("radius"), height: named("height") });
    }
    if (/\bsphere\b/i.test(t)) return build("volume", "shape=sphere", { radius: named("radius") });
    if (/\bcone\b/i.test(t)) {
      return build("volume", "shape=cone", { radius: named("radius"), height: named("height") });
    }
    if (/\bcuboid\b/i.test(t)) {
      return build("volume", "shape=cuboid", {
        length: named("length"),
        width: named("width"),
        height: named("height"),
      });
    }
    return null;
  }

  if (asks(/circumference/) && /\bcircle\b/i.test(t)) {
    return build("circle_property", "property=circumference", { radius: named("radius") });
  }

  return null;
}


/**
 * Call the SymPy solver endpoint.
 * Returns null if the endpoint is unavailable or parsing fails.
 */
export async function sympySolve(
  expression: string,
  type: SympyTaskType,
  variable = "x",
  expressions?: string[],
): Promise<SympyResult | null> {
  const start = Date.now();

  // The solver evaluates its input, so it only answers callers that present this
  // shared secret (see the SECURITY note in api/sympy_solver.py). Without it the
  // request would be refused anyway — skip the round trip and let the caller
  // fall back to Nerdamer.
  const secret = process.env.SYMPY_INTERNAL_SECRET;
  if (!secret) {
    return null;
  }

  // Where the solver lives. This was written as `A || B ? C : D`, which parses
  // as `(A || B) ? C : D` — so with the site URL set it still called
  // https://<deployment-url>, the address Vercel puts behind its own login.
  // The public site URL comes first because it is the one that is reachable.
  const baseUrl = (
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000")
  ).replace(/\/$/, "");

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(`${baseUrl}/api/sympy_solver`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret": secret,
      },
      body: JSON.stringify({ expression, type, variable, expressions }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`[SymPy] HTTP ${res.status}`);
      return null;
    }

    const data = (await res.json()) as SympyResult;
    const answers = data.success ? normaliseSympyAnswers(type, variable, data) : null;
    if (data.success && !answers) {
      return { success: false, error: "Unusable answer", latencyMs: Date.now() - start };
    }
    return { ...data, answers: answers ?? data.answers, latencyMs: Date.now() - start };
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      console.warn("[SymPy] Timeout after 8s");
    } else {
      console.warn("[SymPy] Error:", (err as Error).message);
    }
    return null;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Put SymPy's answers into the same shape the Nerdamer path produces, so the
 * rest of the pipeline can compare them with what is on the board.
 *
 *   solve       ["-1", "6"]        → ["x = -1", "x = 6"]
 *   expand      ["x**2 - x - 6"]   → ["x^2 - x - 6"]
 *   evaluate    ["6.2831853…"]     → ["≈6.2831853…"]   (flagged inexact)
 *
 * Left as SymPy returns them, roots had no variable attached and powers were
 * written "**" — neither of which the comparison could read, so switching
 * SymPy on would have silently switched the answer check off.
 * Returns null for an answer that should not be offered at all.
 */
export function normaliseSympyAnswers(
  type: SympyTaskType,
  variable: string,
  data: Pick<SympyResult, "answers" | "exact">,
): string[] | null {
  const raw = (data.answers || []).map((answer) => String(answer).trim()).filter(Boolean);
  if (raw.length === 0) return null;
  // Complex, infinite or undefined results are not school-level answers.
  if (raw.some((answer) => /\bI\b|zoo|nan|oo\b/.test(answer))) return null;

  const caret = (answer: string) => answer.replace(/\*\*/g, "^");
  switch (type) {
    case "solve":
      return raw.map((answer) => `${variable} = ${caret(answer)}`);
    case "simultaneous":
    case "expand":
    case "factorise":
    case "simplify":
    case "diff":
    case "integrate":
      return raw.map(caret);
    default:
      // evaluate and the geometry tasks: one number, exact or approximate.
      return [data.exact === false ? `≈${raw[0]}` : raw[0]];
  }
}

/**
 * Normalise a maths expression from natural language/LaTeX into a form
 * Python's SymPy parser can handle.
 */
export function normaliseForSympy(expr: string): string {
  let s = expr.trim().replace(/[?.!]+$/, "").trim();

  // Unicode → ASCII
  s = s.replace(/−/g, "-");
  s = s.replace(/×/g, "*");
  s = s.replace(/÷/g, "/");
  s = s.replace(/²/g, "**2");
  s = s.replace(/³/g, "**3");
  s = s.replace(/π/g, "pi");

  // LaTeX fractions → Python division
  s = s.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1)/($2)");
  // \sqrt{x} → sqrt(x)
  s = s.replace(/\\sqrt\{([^}]+)\}/g, "sqrt($1)");
  // \left( \right) → ( )
  s = s.replace(/\\(?:left|right)([()[\]])/g, "$1");
  // \cdot → *
  s = s.replace(/\\cdot/g, "*");
  s = s.replace(/\\times/g, "*");
  s = s.replace(/\\div/g, "/");
  s = s.replace(/\\pi/g, "pi");
  // Strip remaining LaTeX commands
  s = s.replace(/\\[a-zA-Z]+\{([^}]+)\}/g, "$1");
  s = s.replace(/\\[a-zA-Z]+/g, "");

  // Implicit multiplication: 2x → 2*x
  s = s.replace(/(\d)([a-zA-Z(])/g, "$1*$2");
  s = s.replace(/([a-zA-Z])(\()/g, "$1*(");
  s = s.replace(/\)\(/g, ")*(");
  s = s.replace(/\)([a-zA-Z])/g, ")*$1");

  return s;
}
