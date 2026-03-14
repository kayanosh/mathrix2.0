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

export type SympyTaskType =
  | "solve"
  | "simplify"
  | "expand"
  | "factorise"
  | "diff"
  | "integrate"
  | "evaluate"
  | "simultaneous";

export interface SympyResult {
  success: boolean;
  /** Stringified answers (e.g. ["3", "2"] for x² - 5x + 6 = 0) */
  answers?: string[];
  /** LaTeX-formatted answers */
  answersLatex?: string[];
  /** Error message if success is false */
  error?: string;
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

  // Simultaneous equations
  if (/simultaneous|solve.*and.*=/i.test(text)) {
    const eqs = text.match(/([0-9a-zA-Z\s+\-*/^().=²³]+=[0-9a-zA-Z\s+\-*/^().²³]+)/g);
    if (eqs && eqs.length >= 2) {
      return {
        type: "simultaneous",
        expression: eqs[0],
        expressions: eqs.slice(0, 3).map(normaliseForSympy),
        variable: "x",
      };
    }
  }

  // Differentiation
  if (/differentiat|derivativ|d\/d[a-z]/i.test(text)) {
    const m = text.match(/(?:differentiat|derivativ)[a-z]*[:\s]+(.+)/i);
    if (m) {
      const expr = normaliseForSympy(m[1]);
      return { type: "diff", expression: expr, variable: detectVariable(expr) };
    }
  }

  // Integration
  if (/integrat|anti.?derivativ/i.test(text)) {
    const m = text.match(/(?:integrat|anti.?derivativ)[a-z]*[:\s]+(.+)/i);
    if (m) {
      const expr = normaliseForSympy(m[1]);
      return { type: "integrate", expression: expr, variable: detectVariable(expr) };
    }
  }

  // Expand
  if (/expand/i.test(text)) {
    const m = text.match(/expand[:\s]+(.+)/i);
    if (m) {
      const expr = normaliseForSympy(m[1]);
      return { type: "expand", expression: expr, variable: detectVariable(expr) };
    }
  }

  // Factorise
  if (/factoris[ez]/i.test(text)) {
    const m = text.match(/factoris[ez][:\s]+(.+)/i);
    if (m) {
      const expr = normaliseForSympy(m[1]);
      return { type: "factorise", expression: expr, variable: detectVariable(expr) };
    }
  }

  // Simplify
  if (/simplif/i.test(text)) {
    const m = text.match(/simplif[yie]+[:\s]+(.+)/i);
    if (m) {
      const expr = normaliseForSympy(m[1]);
      return { type: "simplify", expression: expr, variable: detectVariable(expr) };
    }
  }

  // Evaluate / calculate
  if (/calculate|evaluate|compute|find the value/i.test(text)) {
    const m = text.match(/(?:calculate|evaluate|compute|find the value of)[:\s]+([0-9\s+\-*/^().piπe√]+)/i);
    if (m) {
      return { type: "evaluate", expression: normaliseForSympy(m[1]), variable: "x" };
    }
  }

  // General equation solving (anything with =)
  const eqMatch = text.match(/([0-9a-zA-Z\s+\-*/^().²³]+=[0-9a-zA-Z\s+\-*/^().²³]+)/);
  if (eqMatch) {
    const eq = normaliseForSympy(eqMatch[1]);
    return { type: "solve", expression: eq, variable: detectVariable(eq.split("=")[0]) };
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

  // Determine base URL — works both locally (via vercel dev) and in production
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(`${baseUrl}/api/sympy_solver`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expression, type, variable, expressions }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`[SymPy] HTTP ${res.status}`);
      return null;
    }

    const data = await res.json();
    return { ...data, latencyMs: Date.now() - start } as SympyResult;
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

/** Guess the primary variable from an expression string. */
function detectVariable(expr: string): string {
  const match = expr.match(/[a-zA-Z]/);
  return match ? match[0] : "x";
}
