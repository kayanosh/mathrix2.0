/**
 * Marking an answer against one that was worked out by code.
 *
 * This is the "mark scheme" half of the accuracy check (the questions are in
 * bank.ts). It reads the line a pupil is shown as the answer and decides
 * whether it says the right thing. It never asks a model: every expected
 * answer was computed with ordinary arithmetic, and every comparison here is
 * arithmetic too, so a pass means the number is right and not that two models
 * agreed.
 *
 * It marks the ANSWER LINE. An earlier check searched the whole answer for the
 * expected number and passed 64 out of 64, while six of those answers were
 * wrong: "Simplify the ratio 18 : 24" was answered "the ratio has 42 parts",
 * and the 3 and the 4 it was looking for were somewhere on the board.
 *
 * No imports from the rest of the app, so it can run anywhere.
 */

export type Expected =
  /** One value: 32, 0.48, 16π. `form` is a pattern the tidied answer must also match. */
  | { kind: "number"; value: number; tolerance?: number; orPercent?: boolean; form?: RegExp }
  /** Several values that must all be there, in any order: £24 and £36. */
  | { kind: "numbers"; values: number[]; tolerance?: number }
  /** Values of letters: x = 4 and y = 2, or the two roots x = 2, x = 3. */
  | { kind: "assign"; values: Record<string, number | number[]>; tolerance?: number }
  /** An expression equal to this one for every value of its letters. */
  | { kind: "expression"; expr: string; vars: string[]; form?: "expanded" | "factorised" | RegExp }
  /** A ratio in its simplest form: 3 : 4. */
  | { kind: "ratio"; parts: number[] }
  /** x < 5 */
  | { kind: "inequality"; variable: string; op: "<" | "<=" | ">" | ">="; value: number }
  /** A number written as a product of primes: 2² × 3 × 5. */
  | { kind: "primeFactors"; n: number }
  /** Words that must be there, for the few answers that are not a number. */
  | { kind: "text"; patterns: RegExp[] };

export interface Mark {
  right: boolean;
  /** What was read from the answer, for the report. */
  found: string;
}

// ── Reading maths ─────────────────────────────────────────────────────────

/** LaTeX or typed maths as one plain line: fractions as (a)/(b), × as *, π as pi. */
export function tidy(raw: string): string {
  let s = String(raw ?? "");
  s = s.replace(/\$/g, " ");
  // Wrappers that mean nothing: pen marks, colours, bold.
  for (let i = 0; i < 3; i++) {
    s = s.replace(/\\(?:htmlId|textcolor|htmlClass|colorbox)\s*\{[^{}]*\}\s*\{((?:[^{}]|\{[^{}]*\})*)\}/g, "$1");
    s = s.replace(/\\(?:boxed|underline|mathbf|mathrm|boldsymbol|textbf|mathit|operatorname)\s*\{((?:[^{}]|\{[^{}]*\})*)\}/g, "$1");
  }
  s = s.replace(/\\text\s*\{([^{}]*)\}/g, " $1 ");
  s = s.replace(/\\(?:left|right|displaystyle|big|Big)(?![a-zA-Z])/g, "");
  s = s.replace(/\\[,;:! ]|\\q?quad(?![a-zA-Z])|~/g, " ");
  s = s.replace(/\\[dt]frac/g, "\\frac");
  // A column vector written with \binom is two numbers, not a product.
  s = s.replace(/\\binom\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, " $1 ; $2 ");
  // Degrees and money carry no value.
  s = s.replace(/\^\s*\{\s*(?:\\circ|\\textdegree|\\degree|°)\s*\}|\^\s*\\circ(?![a-zA-Z])|\\(?:textdegree|degree)(?![a-zA-Z])|°/g, " ");
  s = s.replace(/\\pounds(?![a-zA-Z])|£|\\\$/g, " ");
  s = s.replace(/\\%/g, "%");
  // A unit with its power is a unit, not a number: cm², m^3.
  s = s.replace(/\b(mm|cm|km|m)\s*(?:\^\s*\{?\s*[23]\s*\}?|[²³])/g, " $1 ");
  s = s.replace(/²/g, "^2").replace(/³/g, "^3");
  s = s.replace(/√\s*\(?\s*(\d+(?:\.\d+)?)\s*\)?/g, "\\sqrt{$1}");
  // Fractions and roots, innermost first. A whole number in front is a mixed number.
  for (let i = 0; i < 6; i++) {
    s = s.replace(/(\d)\s*\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, "($1+($2)/($3))");
    s = s.replace(/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, "(($1)/($2))");
    s = s.replace(/\\sqrt\s*\{([^{}]*)\}/g, "sqrt($1)");
  }
  s = s.replace(/\\sqrt\s*(\d+(?:\.\d+)?|[a-z])/g, "sqrt($1)");
  // "5 out of 36" is the fraction 5/36.
  s = s.replace(/(\d+)\s+out of\s+(\d+)/gi, "(($1)/($2))");
  s = s.replace(/\\times(?![a-zA-Z])|\\cdot(?![a-zA-Z])|[×·⋅✕]/g, "*");
  s = s.replace(/\\div(?![a-zA-Z])|÷/g, "/");
  s = s.replace(/[−–—]/g, "-");
  s = s.replace(/\\pi(?![a-zA-Z])|π/g, " pi ");
  s = s.replace(/\\leq?(?![a-zA-Z])|≤/g, "<=").replace(/\\geq?(?![a-zA-Z])|≥/g, ">=");
  s = s.replace(/\\lt(?![a-zA-Z])/g, "<").replace(/\\gt(?![a-zA-Z])/g, ">");
  s = s.replace(/\\approx(?![a-zA-Z])|≈|\\simeq(?![a-zA-Z])/g, "=");
  s = s.replace(/\^\s*\{([^{}]*)\}/g, "^($1)");
  s = s.replace(/_\s*\{([^{}]*)\}/g, "_$1");
  // Thousands: 25,600 and 25{,}600.
  s = s.replace(/(\d)\{,\}(?=\d{3})/g, "$1");
  for (let i = 0; i < 3; i++) s = s.replace(/(\d),(?=\d{3}(?!\d))/g, "$1");
  s = s.replace(/\\[a-zA-Z]+/g, " ");
  s = s.replace(/\{/g, "(").replace(/\}/g, ")");
  return s.replace(/\s+/g, " ").trim();
}

type Scope = Record<string, number>;

/** The value of a line of maths, or null if it is not one. Implied multiplication is understood: 2x, 3(x+1), 6√2. */
export function evaluate(text: string, scope: Scope = {}): number | null {
  const tokens: string[] = [];
  const source = text.replace(/\s+/g, " ").trim();
  const re = /\d+(?:\.\d+)?|sqrt|pi|[a-zA-Z]|[-+*/^()]|\s|./g;
  for (const match of source.matchAll(re)) {
    const t = match[0];
    if (t === " ") {
      tokens.push(" ");
      continue;
    }
    if (!/^(?:\d+(?:\.\d+)?|sqrt|pi|[a-zA-Z]|[-+*/^()])$/.test(t)) return null;
    tokens.push(t);
  }
  // Two numbers side by side are not a product: "12 25" is two things.
  for (let i = 0; i + 2 < tokens.length; i++) {
    if (/^\d/.test(tokens[i]) && tokens[i + 1] === " " && /^\d/.test(tokens[i + 2])) return null;
  }
  const toks = tokens.filter((t) => t !== " ");
  if (toks.length === 0) return null;
  let pos = 0;
  const peek = () => toks[pos];
  const startsPrimary = (t: string | undefined) => t !== undefined && (/^\d/.test(t) || /^[a-zA-Z]/.test(t) || t === "(");

  class NotMaths extends Error {}

  function primary(): number {
    const t = toks[pos++];
    if (t === undefined) throw new NotMaths();
    if (/^\d/.test(t)) return Number(t);
    if (t === "(") {
      const value = expression();
      if (toks[pos++] !== ")") throw new NotMaths();
      return value;
    }
    if (t === "pi") return Math.PI;
    if (t === "sqrt") {
      const inside = primary();
      if (inside < 0) throw new NotMaths();
      return Math.sqrt(inside);
    }
    if (/^[a-zA-Z]$/.test(t) && t in scope) return scope[t];
    throw new NotMaths();
  }
  function factor(): number {
    if (peek() === "-") {
      pos++;
      return -factor();
    }
    if (peek() === "+") {
      pos++;
      return factor();
    }
    const base = primary();
    if (peek() === "^") {
      pos++;
      return Math.pow(base, factor());
    }
    return base;
  }
  function term(): number {
    let value = factor();
    for (;;) {
      const t = peek();
      if (t === "*") {
        pos++;
        value *= factor();
      } else if (t === "/") {
        pos++;
        value /= factor();
      } else if (startsPrimary(t)) {
        value *= factor();
      } else break;
    }
    return value;
  }
  function expression(): number {
    let value = term();
    for (;;) {
      const t = peek();
      if (t === "+") {
        pos++;
        value += term();
      } else if (t === "-") {
        pos++;
        value -= term();
      } else break;
    }
    return value;
  }

  try {
    const value = expression();
    if (pos !== toks.length || !Number.isFinite(value)) return null;
    return value;
  } catch (error) {
    if (error instanceof NotMaths) return null;
    throw error;
  }
}

interface Candidate {
  value: number;
  /** A "%" follows it. */
  percent: boolean;
  text: string;
}

const isMathsToken = (t: string) => /^(?:\d+(?:\.\d+)?|pi|sqrt|[-+*/^()])$/.test(t);

/**
 * Every number a line of text states, with sums worked out: "6 × 10^9" is one
 * number. The numbers inside a sum are listed too ("24 + 36 = 60" states 24
 * and 36) unless `parts` is false.
 */
export function valuesIn(raw: string, options: { parts?: boolean } = {}): Candidate[] {
  const text = tidy(raw);
  const tokens = text.match(/\d+(?:\.\d+)?|pi\b|sqrt\b|[a-zA-Z_]+|[-+*/^()]|%|\S/g) ?? [];
  const found: Candidate[] = [];
  let run: string[] = [];

  const flush = (percent: boolean) => {
    let piece = [...run];
    run = [];
    // A run is trimmed to something that can stand alone.
    while (piece.length && /^[+*/^)]$/.test(piece[0])) piece.shift();
    while (piece.length && /^[-+*/^(]$/.test(piece[piece.length - 1])) piece.pop();
    // Unmatched brackets, as around a point "(2, 5)", are dropped.
    let depth = 0;
    piece = piece.filter((t) => {
      if (t === "(") depth++;
      if (t === ")") {
        if (depth === 0) return false;
        depth--;
      }
      return true;
    });
    while (depth > 0) {
      const open = piece.indexOf("(");
      if (open < 0) break;
      piece.splice(open, 1);
      depth--;
    }
    if (!piece.some((t) => /^\d|^pi$/.test(t))) return;
    const joined = piece.join(" ").replace(/\( /g, "(").replace(/ \)/g, ")");
    const literals = piece.filter((t) => /^\d/.test(t));
    // A value counts as stated when it is written as a number, or in one of
    // the forms an answer is given in: a fraction, a mixed number, standard
    // form, or a multiple of π or of a root. A sum that has not been worked
    // out is not an answer. "£1500 × 1.02³ = £1591.22" was first marked right
    // because the left-hand side comes to the right value; the pupil was told
    // £1591.22.
    const value = isAWayOfWritingAnAnswer(joined) ? evaluate(joined) : null;
    if (value !== null) found.push({ value, percent, text: joined });
    // The numbers inside a sum are also stated: "24 + 36 = 60" says 24 and 36.
    if (options.parts !== false && (value === null || literals.length > 1)) {
      for (const literal of literals) found.push({ value: Number(literal), percent: false, text: literal });
    }
  };

  for (const token of tokens) {
    if (isMathsToken(token)) run.push(token);
    else {
      if (run.length) flush(token === "%");
    }
  }
  if (run.length) flush(false);
  return found;
}

/** A number, a fraction, a mixed number, standard form, or a multiple of π or a root. */
function isAWayOfWritingAnAnswer(maths: string): boolean {
  const flat = maths.replace(/[\s()]/g, "");
  if (/^-?\d+(?:\.\d+)?$/.test(flat)) return true;
  if (/^-?\d+(?:\.\d+)?\/\d+(?:\.\d+)?$/.test(flat)) return true;
  if (/^-?\d+\+\d+\/\d+$/.test(flat)) return true;
  if (/^-?\d+(?:\.\d+)?\*10\^-?\d+$/.test(flat)) return true;
  if (/pi|sqrt/.test(flat)) return !/[+-]/.test(flat.replace(/^-/, "")) && (flat.match(/\d+(?:\.\d+)?/g) ?? []).length <= 3;
  return false;
}

const close = (a: number, b: number, tolerance: number) => Math.abs(a - b) <= tolerance + 1e-9 * Math.max(1, Math.abs(b));

function isPrime(n: number): boolean {
  if (!Number.isInteger(n) || n < 2) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return true;
}

/** The sides of every equation or statement in a piece of text, as raw maths. */
function sidesOf(raw: string): string[] {
  const spans = [...raw.matchAll(/\$\$?([^$]+)\$\$?/g)].map((m) => m[1]);
  const pieces = spans.length > 0 ? spans : [raw];
  return pieces.flatMap((piece) => piece.split(/=|\\approx|≈|\\equiv|\\Rightarrow|\\to(?![a-zA-Z])|,(?!\d{3})|;/)).map((side) => side.trim()).filter(Boolean);
}

// ── Marking ───────────────────────────────────────────────────────────────

/**
 * Mark one line of text. `ignore` holds numbers that were in the question, so
 * that an answer line repeating the question ("the HCF of 36 and 60 is…") is
 * not given credit for them.
 */
export function markText(expected: Expected, raw: string, ignore: number[] = []): Mark {
  const text = tidy(raw);
  const tolerance = "tolerance" in expected && expected.tolerance !== undefined ? expected.tolerance : 1e-9;
  const stated = (wanted: number[]) => {
    const ignored = ignore.filter((q) => !wanted.some((w) => close(q, w, tolerance)));
    return valuesIn(raw).filter((c) => !ignored.some((q) => close(c.value, q, 1e-9)));
  };
  const show = (list: Candidate[]) => list.map((c) => c.text).slice(0, 6).join(" | ") || "(no number found)";

  switch (expected.kind) {
    case "number": {
      const candidates = stated([expected.value]);
      const hit = candidates.some(
        (c) => close(c.value, expected.value, tolerance) || (expected.orPercent === true && c.percent && close(c.value / 100, expected.value, tolerance)),
      );
      const formed = !expected.form || expected.form.test(text);
      return { right: hit && formed, found: hit && !formed ? `${show(candidates)} (right value, wrong form)` : show(candidates) };
    }
    case "numbers": {
      const candidates = stated(expected.values);
      const right = expected.values.every((v) => candidates.some((c) => close(c.value, v, tolerance)));
      return { right, found: show(candidates) };
    }
    case "assign": {
      const letters = Object.keys(expected.values);
      const read: string[] = [];
      let right = true;
      for (const letter of letters) {
        const wanted = ([] as number[]).concat(expected.values[letter]);
        const got: number[] = [];
        const at = new RegExp(`(?<![a-zA-Z])${letter}(?:_\\d)?\\s*=\\s*([^=;]*?)(?=(?:\\s+(?:and|or|when|so|is|into)\\b)|[;.](?:\\s|$)|,\\s*[a-zA-Z]|[a-zA-Z]{2,}|(?<![a-zA-Z])[a-zA-Z]\\s*=|$)`, "g");
        for (const match of text.matchAll(at)) {
          for (const part of match[1].split(/,|\bor\b|\band\b|±/)) {
            const value = evaluate(part.trim());
            if (value !== null) got.push(value);
          }
        }
        // "x = 2 or 3": the second root has no "x =" of its own.
        for (const match of text.matchAll(new RegExp(`(?<![a-zA-Z])${letter}\\s*=\\s*-?[\\d./ ()]+?\\s*(?:or|and|,)\\s*(-?\\d+(?:\\.\\d+)?(?:\\s*/\\s*\\d+)?)(?![\\d.]*\\s*=)`, "g"))) {
          const value = evaluate(match[1]);
          if (value !== null) got.push(value);
        }
        read.push(`${letter} = ${got.length ? got.map((g) => +g.toFixed(4)).join(", ") : "?"}`);
        if (!wanted.every((w) => got.some((g) => close(g, w, tolerance)))) right = false;
      }
      // "The solutions are 2 and 3", with no letter named.
      if (!right && letters.length === 1) {
        const wanted = ([] as number[]).concat(expected.values[letters[0]]);
        const candidates = stated(wanted);
        if (!new RegExp(`(?<![a-zA-Z])${letters[0]}\\s*=`).test(text) && wanted.every((w) => candidates.some((c) => close(c.value, w, tolerance)))) {
          return { right: true, found: show(candidates) };
        }
      }
      return { right, found: read.join("; ") };
    }
    case "expression": {
      const points: Scope[] = [0.37, 1.91, -2.43, 3.3, 5.07].map((base, i) =>
        Object.fromEntries(expected.vars.map((v, j) => [v, base + j * 0.61 + i * 0.13])),
      );
      const truth = points.map((scope) => evaluate(tidy(expected.expr), scope));
      if (truth.some((t) => t === null)) throw new Error(`The expected expression cannot be read: ${expected.expr}`);
      const sides = sidesOf(raw);
      let sawEqual = false;
      for (const side of sides) {
        const plain = tidy(side);
        const values = points.map((scope) => evaluate(plain, scope));
        if (values.some((v) => v === null)) continue;
        // Must really contain a letter, or be a number when a number is expected.
        if (!values.every((v, i) => close(v!, truth[i]!, 1e-6 * Math.max(1, Math.abs(truth[i]!))))) continue;
        sawEqual = true;
        const form = expected.form;
        const formed =
          form === undefined
            ? true
            : form === "expanded"
              ? !/[()]/.test(side.replace(/\\left|\\right/g, "").replace(/\^\s*\(|\\frac\{[^{}]*\}\{[^{}]*\}/g, ""))
              : form === "factorised"
                ? /\)\s*\(|[\da-zA-Z]\s*\(|\)\s*\^|\)\s*\(/.test(side.replace(/\\left|\\right/g, ""))
                : form.test(side.replace(/\\left|\\right|\s/g, ""));
        if (formed) return { right: true, found: plain };
      }
      return { right: false, found: sawEqual ? "(equal, but not in the form asked for)" : sides.map(tidy).slice(0, 4).join(" | ") || "(nothing readable)" };
    }
    case "ratio": {
      const ratios = [...text.matchAll(/(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)(?:\s*:\s*(\d+(?:\.\d+)?))?/g)].map((m) =>
        m.slice(1).filter((x) => x !== undefined).map(Number),
      );
      const right = ratios.some((r) => r.length === expected.parts.length && r.every((v, i) => v === expected.parts[i]));
      return { right, found: ratios.map((r) => r.join(":")).join(" | ") || "(no ratio found)" };
    }
    case "inequality": {
      const flip: Record<string, string> = { "<": ">", "<=": ">=", ">": "<", ">=": "<=" };
      const v = expected.variable;
      const number = "(-?\\d+(?:\\.\\d+)?(?:\\s*/\\s*\\d+)?|\\(\\(-?\\d+\\)/\\(\\d+\\)\\))";
      const seen: string[] = [];
      for (const m of text.matchAll(new RegExp(`(?<![a-zA-Z])${v}\\s*(<=|>=|<|>)\\s*${number}`, "g"))) {
        const value = evaluate(m[2]);
        seen.push(`${v} ${m[1]} ${m[2]}`);
        if (m[1] === expected.op && value !== null && close(value, expected.value, 1e-9)) return { right: true, found: seen.join(" | ") };
      }
      for (const m of text.matchAll(new RegExp(`${number}\\s*(<=|>=|<|>)\\s*${v}(?![a-zA-Z])`, "g"))) {
        const value = evaluate(m[1]);
        seen.push(`${m[1]} ${m[2]} ${v}`);
        if (flip[m[2]] === expected.op && value !== null && close(value, expected.value, 1e-9)) return { right: true, found: seen.join(" | ") };
      }
      return { right: false, found: seen.join(" | ") || "(no inequality found)" };
    }
    case "primeFactors": {
      const products = text.match(/\d+(?:\s*\^\s*\(?\d+\)?)?(?:\s*\*\s*\d+(?:\s*\^\s*\(?\d+\)?)?)+|\d+\s*\^\s*\(?\d+\)?/g) ?? [];
      for (const product of products) {
        const bases = product.split("*").map((part) => Number(part.trim().split("^")[0]));
        if (evaluate(product) === expected.n && bases.every(isPrime)) return { right: true, found: product };
      }
      return { right: false, found: products.join(" | ") || "(no product found)" };
    }
    case "text": {
      const right = expected.patterns.every((re) => re.test(text) || re.test(raw));
      return { right, found: text.slice(0, 80) };
    }
  }
}

/** The numbers written in a question, for the `ignore` list. */
export function numbersInQuestion(question: string): number[] {
  return valuesIn(question).map((c) => c.value);
}

export interface BoardLike {
  conclusion?: string | null;
  blocks?: Array<{ type: string; steps?: Array<{ latexAfter?: string }> }>;
}

export interface BoardMark extends Mark {
  /** "answer": stated in the answer line. "working": only on the last lines of working. */
  where: "answer" | "working" | "nowhere";
}

/** Mark a whole board: its answer line, and failing that, its last lines of working. */
export function markBoard(expected: Expected, question: string, board: BoardLike): BoardMark {
  const ignore = numbersInQuestion(question);
  const answer = markText(expected, board.conclusion ?? "", ignore);
  if (answer.right) return { ...answer, where: "answer" };
  // An answer line that states a different number is wrong, whatever the
  // working says. The working is only looked at when the answer line states
  // nothing that could be the answer ("That's it!", "The factors are…").
  if (expected.kind === "number" || expected.kind === "numbers") {
    const wanted = expected.kind === "number" ? [expected.value] : expected.values;
    const others = valuesIn(board.conclusion ?? "", { parts: false }).filter(
      (c) => !ignore.some((q) => close(q, c.value, 1e-9)) && !wanted.some((w) => close(w, c.value, 1e-9)),
    );
    if (others.length > 0) return { right: false, found: answer.found, where: "nowhere" };
  }
  const working = (board.blocks ?? [])
    .filter((b) => b.type === "equation_steps")
    .flatMap((b) => b.steps ?? [])
    .map((s) => s.latexAfter ?? "")
    .filter(Boolean);
  const last = working.slice(-3).map((line) => `$${line}$`).join(" ; ");
  if (last && markText(expected, last, ignore).right) return { right: true, found: answer.found, where: "working" };
  return { right: false, found: answer.found, where: "nowhere" };
}
