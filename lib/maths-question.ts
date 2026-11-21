/**
 * Strict reader for typed maths questions.
 *
 * WHY THIS EXISTS. The "ground truth" that the solver is told to match, and that
 * earns an answer its verified badge, used to come from loose regexes that
 * grabbed whatever looked like maths and stopped at the first character they
 * did not know:
 *
 *   "Calculate 6 × 7"            → read "6"           → ground truth 6
 *   "What is 25% of 80?"         → read "25"          → ground truth 25
 *   "Calculate 62,403 - 27,568"  → read "62"          → ground truth 62
 *   "Solve 3x + 5 = 20"          → read the word "Solve" as a variable
 *                                → ground truth "Solve = 5/x", marked verified
 *
 * A wrong ground truth is worse than none: the model is ordered to agree with
 * it and the pupil is shown a badge saying it was independently checked.
 *
 * THE RULE HERE is the opposite of "extract what you can": the question must be
 * read IN FULL or not at all. A recognised instruction ("solve", "calculate",
 * "expand"...) followed by nothing but maths is accepted; any leftover word,
 * symbol or ambiguity returns null, and the caller then has no ground truth —
 * which is the honest answer for a question this reader cannot read.
 *
 * Expressions are returned in nerdamer syntax with every multiplication
 * explicit and no whitespace, so "2x", "3(x+1)" and "(x+1)(x+2)" can never be
 * mistaken for a variable called "2x".
 */

import { makeRational, parseNumericToken, type Rational } from "@/lib/maths-value";

export type ParsedMathsQuestion =
  | { task: "evaluate"; expression: string; exact: boolean }
  | { task: "solve"; equation: string; variable: string }
  | { task: "simultaneous"; equations: [string, string]; variables: [string, string] }
  | { task: "expand" | "factorise" | "simplify"; expression: string; variable: string | null }
  | { task: "derivative" | "integral"; expression: string; variable: string };

type Kind = ParsedMathsQuestion["task"];

const FUNCTIONS = new Set(["sqrt", "sin", "cos", "tan", "log", "ln"]);
const CONSTANTS = new Set(["pi"]);
/** nerdamer reads these as Euler's number and √-1, not as unknowns. */
const RESERVED_VARIABLES = new Set(["e", "i"]);

const MAX_LENGTH = 200;
/**
 * Powers are how a few characters become a computation that stalls the server
 * ("9^9^9"). Each literal exponent is capped, and so is the product of all of
 * them, because nested brackets multiply: ((9^99)^99)^99.
 */
const MAX_EXPONENT = 99;
const MAX_EXPONENT_PRODUCT = 10_000;

/** Instructions this reader understands. First match wins, so order matters. */
const INSTRUCTIONS: Array<{ pattern: RegExp; kind: Kind }> = [
  { pattern: /^solve (?:the |these )?simultaneous equations?:? */i, kind: "simultaneous" },
  { pattern: /^solve for [a-z]:? */i, kind: "solve" },
  {
    pattern:
      /^solve(?: the)?(?: following)?(?: (?:linear |quadratic )?equation| quadratic)?:? */i,
    kind: "solve",
  },
  {
    pattern: /^find (?:the value of )?[a-z] (?:when|if|given that|given|where) /i,
    kind: "solve",
  },
  { pattern: /^expand(?: and simplify)?(?: the brackets)?:? */i, kind: "expand" },
  { pattern: /^factori[sz]e(?: fully| completely)?:? */i, kind: "factorise" },
  { pattern: /^simplify(?: fully)?:? */i, kind: "simplify" },
  { pattern: /^(?:differentiate|(?:find |work out )?the derivative of):? */i, kind: "derivative" },
  { pattern: /^(?:integrate|(?:find |work out )?the integral of):? */i, kind: "integral" },
  {
    pattern: /^(?:calculate|evaluate|compute|work out|find the value of|what is|what's):? */i,
    kind: "evaluate",
  },
];

/** Bring the many ways of typing maths down to one plain spelling. */
function tidy(raw: string): string | null {
  let s = raw
    .replace(/\$+/g, " ")
    .replace(/\\left|\\right/g, "")
    // 2\frac{1}{2} is the mixed number two and a half. It must be read before
    // the general fraction rule below, which would leave "2((1)/(2))" — and a
    // number against a bracket means multiply, giving 1 instead of 2.5.
    .replace(/(\d+)\s*\\[dt]?frac\s*\{\s*(\d+)\s*\}\s*\{\s*(\d+)\s*\}/g, "($1+$2/$3)")
    .replace(/\\[dt]?frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, "(($1)/($2))")
    .replace(/\\sqrt\s*\{([^{}]+)\}/g, "sqrt($1)")
    .replace(/\\(?:times|cdot)(?![a-zA-Z])/g, "*")
    .replace(/\\div(?![a-zA-Z])/g, "/")
    .replace(/\\pi(?![a-zA-Z])/g, "pi")
    .replace(/[−–—]/g, "-")
    .replace(/[×⋅·∙]/g, "*")
    .replace(/÷/g, "/")
    .replace(/²/g, "^2")
    .replace(/³/g, "^3")
    .replace(/π/g, "pi")
    .replace(/√\s*(\d+(?:\.\d+)?)/g, "sqrt($1)")
    .replace(/√\s*\(/g, "sqrt(")
    // LaTeX powers and the colour/anchor wrappers the whiteboard adds.
    .replace(/\\(?:htmlId|htmlClass|textcolor|color)\s*\{[^{}]*\}\s*\{([^{}]*)\}/g, "$1")
    .replace(/\^\s*\{([^{}]+)\}/g, "^($1)")
    // Thousands separators: 62,403 → 62403. Only a comma followed by exactly
    // three digits, so "3, 5, 7" and "x = 1, y = 2" are left alone.
    .replace(/(\d),(?=\d{3}(?!\d))/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

  // Thousands written with a space, as UK primary materials do: 62 403. Two
  // numbers side by side are refused further down, so groups of exactly three
  // digits after a short lead can only be one number.
  s = s.replace(/(?<![\d.,/])(\d{1,3})((?: \d{3})+)(?![\d.,/])/g, (_, lead: string, rest: string) =>
    lead + rest.replace(/ /g, ""),
  );
  // Mixed numbers: "2 1/4" is two and a quarter, never 2 × 1/4 or 21/4.
  s = s.replace(/(?<![\d./])(\d+) (\d+)\/(\d+)(?![\d./])/g, "($1+$2/$3)");

  s = s.replace(/[?!.]+$/, "").trim();
  s = s.replace(/^(?:(?:please|can you|could you) )+/i, "");

  // Any LaTeX command we did not translate is something we cannot read.
  if (s.includes("\\") || s.length === 0 || s.length > MAX_LENGTH) return null;
  return s;
}

type Token =
  | { type: "number"; text: string }
  | { type: "variable"; text: string }
  | { type: "constant"; text: string }
  | { type: "function"; text: string }
  | { type: "operator"; text: string }
  | { type: "open" }
  | { type: "close" };

interface Expression {
  text: string;
  variables: Set<string>;
  /** True when the value is a plain rational: no functions or constants. */
  rational: boolean;
  hasOperator: boolean;
}

function tokenise(source: string): Token[] | null {
  const tokens: Token[] = [];
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    if (ch === " ") {
      i += 1;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      const match = /^(?:\d+(?:\.\d+)?|\.\d+)/.exec(source.slice(i));
      if (!match) return null;
      tokens.push({ type: "number", text: match[0] });
      i += match[0].length;
      continue;
    }
    if (/[a-zA-Z]/.test(ch)) {
      const word = /^[a-zA-Z]+/.exec(source.slice(i))![0];
      const lower = word.toLowerCase();
      const previous = tokens[tokens.length - 1];
      if (FUNCTIONS.has(lower)) {
        tokens.push({ type: "function", text: lower });
      } else if (CONSTANTS.has(lower)) {
        tokens.push({ type: "constant", text: lower });
      } else if (word.length === 1) {
        tokens.push({ type: "variable", text: word });
      } else if (
        // "3xy" and "(a+b)xy" are products of single-letter unknowns. A word
        // standing on its own ("the", "of", "and") is English, and English
        // means this is not a question we can read.
        (previous?.type === "number" || previous?.type === "close") &&
        source[i - 1] !== " "
      ) {
        for (const letter of word) tokens.push({ type: "variable", text: letter });
      } else {
        return null;
      }
      i += word.length;
      continue;
    }
    if ("+-*/^".includes(ch)) {
      tokens.push({ type: "operator", text: ch });
      i += 1;
      continue;
    }
    if (ch === "(") {
      tokens.push({ type: "open" });
      i += 1;
      continue;
    }
    if (ch === ")") {
      tokens.push({ type: "close" });
      i += 1;
      continue;
    }
    return null; // %, £, =, commas, units — anything else is unreadable here
  }
  return tokens;
}

const endsOperand = (t: Token | undefined) =>
  !!t && (t.type === "number" || t.type === "variable" || t.type === "constant" || t.type === "close");
const startsOperand = (t: Token | undefined) =>
  !!t &&
  (t.type === "number" ||
    t.type === "variable" ||
    t.type === "constant" ||
    t.type === "function" ||
    t.type === "open");

/**
 * How large the exponent starting at `start` could make things, or null if it
 * is a shape we refuse: a tower (a^b^c), or a bracketed exponent that itself
 * contains a power or a product. A symbolic exponent stays symbolic, so it
 * counts as 1.
 */
function exponentSize(tokens: Token[], start: number): number | null {
  let index = start;
  const sign = tokens[index];
  if (sign?.type === "operator" && (sign.text === "-" || sign.text === "+")) index += 1;

  const first = tokens[index];
  if (!first) return null;

  let end = index;
  let size = 1;
  if (first.type === "open") {
    let depth = 0;
    for (; end < tokens.length; end += 1) {
      const token = tokens[end];
      if (token.type === "open") depth += 1;
      else if (token.type === "close") {
        depth -= 1;
        if (depth === 0) break;
      } else if (token.type === "operator" && (token.text === "^" || token.text === "*")) {
        return null;
      } else if (token.type === "number") {
        size = Math.max(size, Math.ceil(Number(token.text)));
      }
    }
    if (depth !== 0) return null;
  } else if (first.type === "number") {
    size = Math.max(1, Math.ceil(Number(first.text)));
  }
  if (size > MAX_EXPONENT) return null;

  const after = tokens[end + 1];
  if (after?.type === "operator" && after.text === "^") return null;
  return size;
}

/**
 * Turn one side of a question into a nerdamer expression, or null if any part
 * of it is not understood. `timesX` reads a lone "x" between two operands as a
 * multiplication sign ("12 x 15"), which is only safe in pure arithmetic.
 */
function readExpression(source: string, timesX: boolean): Expression | null {
  const raw = tokenise(source);
  if (!raw || raw.length === 0) return null;

  const tokens: Token[] = raw.map((token, index) => {
    if (
      timesX &&
      token.type === "variable" &&
      token.text.toLowerCase() === "x" &&
      endsOperand(raw[index - 1]) &&
      startsOperand(raw[index + 1])
    ) {
      return { type: "operator", text: "*" };
    }
    return token;
  });

  const variables = new Set<string>();
  let rational = true;
  let hasOperator = false;
  let depth = 0;
  let exponentProduct = 1;
  let out = "";

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const previous = tokens[index - 1];
    const next = tokens[index + 1];

    if (endsOperand(previous) && startsOperand(token)) {
      // Two numbers side by side ("2 1/4", "3 4") is a mixed number or a typo.
      // Either way it is not a product, and guessing is how answers go wrong.
      if (previous!.type === "number" && token.type === "number") return null;
      // "x2" is far more likely a mistyped x² than x times 2.
      if (previous!.type !== "number" && previous!.type !== "close" && token.type === "number") {
        return null;
      }
      out += "*";
      hasOperator = true;
    }

    switch (token.type) {
      case "number":
        out += token.text;
        break;
      case "variable":
        if (RESERVED_VARIABLES.has(token.text)) return null;
        variables.add(token.text);
        out += token.text;
        break;
      case "constant":
        rational = false;
        out += token.text;
        break;
      case "function":
        if (next?.type !== "open") return null;
        rational = false;
        hasOperator = true;
        out += token.text;
        break;
      case "open":
        depth += 1;
        if (next?.type === "close") return null;
        out += "(";
        break;
      case "close":
        depth -= 1;
        if (depth < 0) return null;
        out += ")";
        break;
      case "operator": {
        const unary = !endsOperand(previous);
        if (unary && token.text !== "-" && token.text !== "+") return null;
        if (!startsOperand(next) && !(next?.type === "operator" && next.text === "-")) {
          return null;
        }
        if (token.text === "^") {
          const size = exponentSize(tokens, index + 1);
          if (size === null) return null;
          exponentProduct *= size;
          if (exponentProduct > MAX_EXPONENT_PRODUCT) return null;
          // Only a whole-number power keeps the value an exact fraction.
          if (next?.type !== "number" || !/^\d+$/.test(next.text)) rational = false;
        }
        if (!unary) hasOperator = true;
        out += token.text;
        break;
      }
    }
  }

  if (depth !== 0) return null;
  return { text: out, variables, rational, hasOperator };
}

function readEquation(source: string): { text: string; variables: Set<string> } | null {
  const sides = source.split("=");
  if (sides.length !== 2) return null;
  const left = readExpression(sides[0], false);
  const right = readExpression(sides[1], false);
  if (!left || !right) return null;
  return {
    text: `${left.text}=${right.text}`,
    variables: new Set([...left.variables, ...right.variables]),
  };
}

/**
 * Read a bare expression — no instruction, no equals sign — such as the final
 * line of a worked solution. Accepts the LaTeX the whiteboard writes
 * (\frac, ^{2}, \htmlId wrappers). Returns null if any of it is unclear.
 */
export function readMathsExpression(
  source: string,
): { expression: string; variables: string[] } | null {
  const tidied = typeof source === "string" ? tidy(source) : null;
  if (!tidied || tidied.includes("=")) return null;
  const expression = readExpression(tidied, false);
  if (!expression) return null;
  return { expression: expression.text, variables: [...expression.variables] };
}

/**
 * Read a typed maths question in full, or return null.
 *
 * null does not mean "no maths here" — it means "not certain enough to stake a
 * verified badge on". Callers must treat it as "no ground truth available".
 */
export function parseMathsQuestion(question: string): ParsedMathsQuestion | null {
  const tidied = typeof question === "string" ? tidy(question) : null;
  if (!tidied) return null;

  let kind: Kind | null = null;
  let body = tidied;
  for (const { pattern, kind: candidate } of INSTRUCTIONS) {
    const match = pattern.exec(tidied);
    if (match) {
      kind = candidate;
      body = tidied.slice(match[0].length).trim();
      break;
    }
  }
  if (!body) return null;

  // "Solve 2x + 3 = 7 and x - y = 1" is two equations whatever the wording.
  if (kind === "solve" && (body.match(/=/g) || []).length === 2) kind = "simultaneous";

  // No instruction at all: only the two unambiguous shapes are accepted — a
  // single equation in one unknown, or pure arithmetic.
  if (kind === null) {
    // "6 × 7 =" and "6 × 7 = ?" are sums waiting for an answer, not equations.
    body = body.replace(/\s*=\s*$/, "");
    kind = body.includes("=") ? "solve" : "evaluate";
  }

  switch (kind) {
    case "evaluate": {
      // "6 × 7 =" and "6 × 7 = ?" both just mean "what is 6 × 7".
      let sum = body.replace(/\s*=\s*$/, "");
      // "25% of 80", "3/4 of 20", "2/3 of 3/4". Only this exact shape — one
      // amount "of" another — because "half of 3 + 1" is genuinely ambiguous.
      const TERM = String.raw`\d+(?:\.\d+)?|\d+\/\d+|\(\d+\+\d+\/\d+\)`;
      const ofMatch = new RegExp(`^(${TERM})(%?) of (${TERM})$`, "i").exec(sum);
      if (ofMatch) {
        const share = ofMatch[2] ? `(${ofMatch[1]})/100` : `(${ofMatch[1]})`;
        sum = `(${share})*(${ofMatch[3]})`;
      }
      const expression = readExpression(sum, true);
      if (!expression || expression.variables.size > 0 || !expression.hasOperator) return null;
      if (!/\d/.test(expression.text)) return null;
      return { task: "evaluate", expression: expression.text, exact: expression.rational };
    }

    case "solve": {
      const equation = readEquation(body.replace(/ for [a-z]$/i, ""));
      if (!equation || equation.variables.size !== 1) return null;
      return { task: "solve", equation: equation.text, variable: [...equation.variables][0] };
    }

    case "simultaneous": {
      const parts = body
        .split(/ and |[,;]/i)
        .map((part) => part.trim())
        .filter(Boolean);
      if (parts.length !== 2) return null;
      const first = readEquation(parts[0]);
      const second = readEquation(parts[1]);
      if (!first || !second) return null;
      const variables = [...new Set([...first.variables, ...second.variables])].sort();
      if (variables.length !== 2) return null;
      return {
        task: "simultaneous",
        equations: [first.text, second.text],
        variables: [variables[0], variables[1]],
      };
    }

    case "expand":
    case "factorise":
    case "simplify": {
      const expression = readExpression(body, false);
      if (!expression) return null;
      const variables = [...expression.variables];
      // Expanding or factorising needs an unknown; with none, the pupil most
      // likely means something else (prime factors, say).
      if (kind !== "simplify" && variables.length === 0) return null;
      if (kind === "simplify" && !expression.hasOperator) return null;
      return { task: kind, expression: expression.text, variable: variables[0] ?? null };
    }

    case "derivative":
    case "integral": {
      const respect = / with respect to ([a-z])$/i.exec(body);
      const expression = readExpression(
        body.replace(/ with respect to [a-z]$/i, "").replace(/ d[a-z]$/i, ""),
        false,
      );
      if (!expression) return null;
      const variables = [...expression.variables];
      const variable = respect?.[1] ?? (variables.length === 1 ? variables[0] : null);
      if (!variable) return null;
      return { task: kind, expression: expression.text, variable };
    }
  }
}

// ── Exact evaluation ─────────────────────────────────────────────────────────

/**
 * Evaluate an expression produced by this reader as an exact fraction.
 *
 * No floating point and no algebra library: whole numbers, decimals, + − × ÷,
 * brackets and whole-number powers, on BigInt fractions. Unknowns are taken
 * from `scope`. Returns null for anything else (roots, π, a missing unknown,
 * division by zero), which callers must read as "cannot check", never as zero.
 *
 * It exists so a builder's answer can be checked against the question in the
 * browser as well as on the server, without shipping an algebra engine.
 */
export function evaluateExact(
  expression: string,
  scope: Record<string, Rational> = {},
): Rational | null {
  const tokens = tokenise(expression);
  if (!tokens || tokens.length === 0) return null;
  let position = 0;

  const peek = () => tokens[position];
  const isOperator = (text: string) => {
    const token = peek();
    return token?.type === "operator" && token.text === text;
  };

  const add = (a: Rational, b: Rational) => makeRational(a.num * b.den + b.num * a.den, a.den * b.den);
  const multiply = (a: Rational, b: Rational) => makeRational(a.num * b.num, a.den * b.den);
  const negate = (a: Rational): Rational => ({ num: -a.num, den: a.den });

  function power(base: Rational, exponent: Rational): Rational | null {
    if (exponent.den !== 1n) return null;
    let n = exponent.num < 0n ? -exponent.num : exponent.num;
    if (n > BigInt(MAX_EXPONENT)) return null;
    let result: Rational = { num: 1n, den: 1n };
    while (n > 0n) {
      const next = multiply(result, base);
      if (!next) return null;
      result = next;
      n -= 1n;
    }
    return exponent.num < 0n ? makeRational(result.den, result.num) : result;
  }

  function atom(): Rational | null {
    const token = peek();
    if (!token) return null;
    if (token.type === "number") {
      position += 1;
      return parseNumericToken(token.text.startsWith(".") ? `0${token.text}` : token.text);
    }
    if (token.type === "variable") {
      position += 1;
      return scope[token.text] ?? null;
    }
    if (token.type === "open") {
      position += 1;
      const inner = sum();
      if (!inner || peek()?.type !== "close") return null;
      position += 1;
      return inner;
    }
    return null; // functions and constants have no exact value here
  }

  function unary(): Rational | null {
    if (isOperator("-")) {
      position += 1;
      const value = unary();
      return value ? negate(value) : null;
    }
    if (isOperator("+")) {
      position += 1;
      return unary();
    }
    const base = atom();
    if (!base) return null;
    if (isOperator("^")) {
      position += 1;
      const exponent = unary();
      return exponent ? power(base, exponent) : null;
    }
    return base;
  }

  function product(): Rational | null {
    let left = unary();
    while (left && (isOperator("*") || isOperator("/"))) {
      const divide = isOperator("/");
      position += 1;
      const right = unary();
      if (!right) return null;
      left = divide ? makeRational(left.num * right.den, left.den * right.num) : multiply(left, right);
    }
    return left;
  }

  function sum(): Rational | null {
    let left = product();
    while (left && (isOperator("+") || isOperator("-"))) {
      const subtract = isOperator("-");
      position += 1;
      const right = product();
      if (!right) return null;
      left = add(left, subtract ? negate(right) : right);
    }
    return left;
  }

  const value = sum();
  return value && position === tokens.length ? value : null;
}
