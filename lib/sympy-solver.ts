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

  // ── Geometry inference ──────────────────────────────────────────────────

  // Pythagoras: extract two known sides
  if (/pythagoras|hypotenuse/i.test(text)) {
    const sides = extractNumberPairs(text);
    if (sides.length >= 2) {
      // Heuristic: if "hypotenuse" mentioned with a value, it's c
      const hypMatch = text.match(/hypotenuse[^0-9]*(\d+\.?\d*)/i);
      if (hypMatch) {
        const c = hypMatch[1];
        const other = sides.find((s) => s !== c) || sides[0];
        return { type: "pythagoras", expression: `a=${other},c=${c}`, variable: "x" };
      }
      return { type: "pythagoras", expression: `a=${sides[0]},b=${sides[1]}`, variable: "x" };
    }
  }

  // Triangle angles: "angles of a triangle" with some known
  if (/angle.*triangle|triangle.*angle|angles?.*(sum|add|total)/i.test(text)) {
    const nums = text.match(/\d+\.?\d*\s*°?/g);
    if (nums && nums.length >= 1 && nums.length <= 2) {
      const cleaned = nums.map((n) => n.replace(/[°\s]/g, ""));
      const labels = ["A", "B", "C"];
      const parts = cleaned.map((v, i) => `${labels[i]}=${v}`).join(",");
      return { type: "triangle_angles", expression: parts, variable: "x" };
    }
  }

  // Area: detect shape + dimensions
  if (/\barea\b/i.test(text)) {
    const areaExpr = inferAreaExpression(text);
    if (areaExpr) {
      return { type: "area", expression: areaExpr, variable: "x" };
    }
  }

  // Volume: detect shape + dimensions
  if (/\bvolume\b/i.test(text)) {
    const volExpr = inferVolumeExpression(text);
    if (volExpr) {
      return { type: "volume", expression: volExpr, variable: "x" };
    }
  }

  // Trig: SOHCAHTOA style questions
  if (/\b(sin|cos|tan)\b.*\d|opposite.*hypotenuse|adjacent.*hypotenuse|opposite.*adjacent/i.test(text)) {
    const trigExpr = inferTrigExpression(text);
    if (trigExpr) {
      return { type: "trig_solve", expression: trigExpr, variable: "x" };
    }
  }

  // Circle properties: circumference, arc length, sector area
  if (/\b(circumference|arc\s*length|sector\s*area|perimeter.*circle)\b/i.test(text)) {
    const circExpr = inferCircleExpression(text);
    if (circExpr) {
      return { type: "circle_property", expression: circExpr, variable: "x" };
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

// ── Geometry inference helpers ─────────────────────────────────────────────────

/** Extract numbers from text (for side lengths, angles, etc.) */
function extractNumberPairs(text: string): string[] {
  const matches = text.match(/\d+\.?\d*/g);
  return matches ? [...new Set(matches)] : [];
}

/** Build area expression from natural language. */
function inferAreaExpression(text: string): string | null {
  const nums = extractNumberPairs(text);

  if (/triangle/i.test(text)) {
    const baseM = text.match(/base[^0-9]*(\d+\.?\d*)/i);
    const heightM = text.match(/height[^0-9]*(\d+\.?\d*)/i);
    if (baseM && heightM) return `shape=triangle,base=${baseM[1]},height=${heightM[1]}`;
    if (nums.length >= 2) return `shape=triangle,base=${nums[0]},height=${nums[1]}`;
  }
  if (/circle/i.test(text)) {
    const rM = text.match(/radius[^0-9]*(\d+\.?\d*)/i) || text.match(/r\s*=\s*(\d+\.?\d*)/i);
    if (rM) return `shape=circle,radius=${rM[1]}`;
    if (nums.length >= 1) return `shape=circle,radius=${nums[0]}`;
  }
  if (/trapez/i.test(text)) {
    const parA = text.match(/parallel[^0-9]*(\d+\.?\d*)\s*(?:cm|m|mm)?\s*(?:and|,)\s*(\d+\.?\d*)/i);
    const heightM = text.match(/height[^0-9]*(\d+\.?\d*)/i);
    if (parA && heightM) return `shape=trapezium,a=${parA[1]},b=${parA[2]},height=${heightM[1]}`;
    if (nums.length >= 3) return `shape=trapezium,a=${nums[0]},b=${nums[1]},height=${nums[2]}`;
  }
  if (/parallelogram/i.test(text)) {
    const baseM = text.match(/base[^0-9]*(\d+\.?\d*)/i);
    const heightM = text.match(/height[^0-9]*(\d+\.?\d*)/i);
    if (baseM && heightM) return `shape=parallelogram,base=${baseM[1]},height=${heightM[1]}`;
    if (nums.length >= 2) return `shape=parallelogram,base=${nums[0]},height=${nums[1]}`;
  }
  if (/sector/i.test(text)) {
    const rM = text.match(/radius[^0-9]*(\d+\.?\d*)/i);
    const angM = text.match(/angle[^0-9]*(\d+\.?\d*)/i);
    if (rM && angM) return `shape=sector,radius=${rM[1]},angle=${angM[1]}`;
    if (nums.length >= 2) return `shape=sector,radius=${nums[0]},angle=${nums[1]}`;
  }
  if (/rectangle|square/i.test(text)) {
    const lenM = text.match(/length[^0-9]*(\d+\.?\d*)/i);
    const widM = text.match(/width[^0-9]*(\d+\.?\d*)/i);
    if (lenM && widM) return `shape=rectangle,length=${lenM[1]},width=${widM[1]}`;
    if (nums.length >= 2) return `shape=rectangle,length=${nums[0]},width=${nums[1]}`;
    // Square: single side
    if (/square/i.test(text) && nums.length >= 1) return `shape=rectangle,length=${nums[0]},width=${nums[0]}`;
  }
  return null;
}

/** Build volume expression from natural language. */
function inferVolumeExpression(text: string): string | null {
  const nums = extractNumberPairs(text);

  if (/cylinder/i.test(text)) {
    const rM = text.match(/radius[^0-9]*(\d+\.?\d*)/i);
    const hM = text.match(/height[^0-9]*(\d+\.?\d*)/i);
    if (rM && hM) return `shape=cylinder,radius=${rM[1]},height=${hM[1]}`;
    if (nums.length >= 2) return `shape=cylinder,radius=${nums[0]},height=${nums[1]}`;
  }
  if (/sphere/i.test(text)) {
    const rM = text.match(/radius[^0-9]*(\d+\.?\d*)/i);
    if (rM) return `shape=sphere,radius=${rM[1]}`;
    if (nums.length >= 1) return `shape=sphere,radius=${nums[0]}`;
  }
  if (/cone/i.test(text)) {
    const rM = text.match(/radius[^0-9]*(\d+\.?\d*)/i);
    const hM = text.match(/height[^0-9]*(\d+\.?\d*)/i);
    if (rM && hM) return `shape=cone,radius=${rM[1]},height=${hM[1]}`;
    if (nums.length >= 2) return `shape=cone,radius=${nums[0]},height=${nums[1]}`;
  }
  if (/pyramid/i.test(text)) {
    const aM = text.match(/(?:base\s*)?area[^0-9]*(\d+\.?\d*)/i);
    const hM = text.match(/height[^0-9]*(\d+\.?\d*)/i);
    if (aM && hM) return `shape=pyramid,area=${aM[1]},height=${hM[1]}`;
    if (nums.length >= 2) return `shape=pyramid,area=${nums[0]},height=${nums[1]}`;
  }
  if (/prism/i.test(text)) {
    const aM = text.match(/(?:cross.?section(?:al)?)?.*area[^0-9]*(\d+\.?\d*)/i);
    const lM = text.match(/length[^0-9]*(\d+\.?\d*)/i);
    if (aM && lM) return `shape=prism,area=${aM[1]},length=${lM[1]}`;
    if (nums.length >= 2) return `shape=prism,area=${nums[0]},length=${nums[1]}`;
  }
  if (/cuboid/i.test(text)) {
    const lM = text.match(/length[^0-9]*(\d+\.?\d*)/i);
    const wM = text.match(/width[^0-9]*(\d+\.?\d*)/i);
    const hM = text.match(/height[^0-9]*(\d+\.?\d*)/i);
    if (lM && wM && hM) return `shape=cuboid,length=${lM[1]},width=${wM[1]},height=${hM[1]}`;
    if (nums.length >= 3) return `shape=cuboid,length=${nums[0]},width=${nums[1]},height=${nums[2]}`;
  }
  if (/cube\b/i.test(text)) {
    const sM = text.match(/side[^0-9]*(\d+\.?\d*)/i) || text.match(/length[^0-9]*(\d+\.?\d*)/i);
    if (sM) return `shape=cuboid,length=${sM[1]},width=${sM[1]},height=${sM[1]}`;
    if (nums.length >= 1) return `shape=cuboid,length=${nums[0]},width=${nums[0]},height=${nums[0]}`;
  }
  return null;
}

/** Build trig expression from natural language. */
function inferTrigExpression(text: string): string | null {
  // "find the angle" with sides given
  const oppM = text.match(/opposite[^0-9]*(\d+\.?\d*)/i);
  const adjM = text.match(/adjacent[^0-9]*(\d+\.?\d*)/i);
  const hypM = text.match(/hypotenuse[^0-9]*(\d+\.?\d*)/i);

  if (oppM && hypM) return `func=sin,opposite=${oppM[1]},hypotenuse=${hypM[1]}`;
  if (adjM && hypM) return `func=cos,adjacent=${adjM[1]},hypotenuse=${hypM[1]}`;
  if (oppM && adjM) return `func=tan,opposite=${oppM[1]},adjacent=${adjM[1]}`;

  // "sin(30)" or "cos 45°"
  const funcMatch = text.match(/\b(sin|cos|tan)\s*\(?(\d+\.?\d*)\s*°?\)?/i);
  if (funcMatch) return `func=${funcMatch[1].toLowerCase()},angle=${funcMatch[2]}`;

  return null;
}

/** Build circle property expression from natural language. */
function inferCircleExpression(text: string): string | null {
  const rM = text.match(/radius[^0-9]*(\d+\.?\d*)/i) || text.match(/r\s*=\s*(\d+\.?\d*)/i);
  const nums = extractNumberPairs(text);
  const r = rM ? rM[1] : nums.length > 0 ? nums[0] : null;

  if (!r) return null;

  if (/arc\s*length/i.test(text)) {
    const angM = text.match(/angle[^0-9]*(\d+\.?\d*)/i);
    if (angM) return `property=arc_length,radius=${r},angle=${angM[1]}`;
  }
  if (/sector\s*area/i.test(text)) {
    const angM = text.match(/angle[^0-9]*(\d+\.?\d*)/i);
    if (angM) return `property=sector_area,radius=${r},angle=${angM[1]}`;
  }
  if (/circumference|perimeter.*circle/i.test(text)) {
    return `property=circumference,radius=${r}`;
  }
  return null;
}
