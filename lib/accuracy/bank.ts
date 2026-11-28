/**
 * Questions with answers that were worked out by code.
 *
 * This is the "exam paper" half of the accuracy check (the marking is in
 * grade.ts). Each maker below writes one question with fresh numbers and
 * computes its answer with ordinary arithmetic. Nothing here was answered by a
 * model, so when the app's answer is marked against it, a model is never
 * marking its own work.
 *
 * The numbers come from a seed. The same seed always gives the same paper, so
 * a failure can be run again; a new seed gives a paper the app has never seen
 * and cannot have saved an answer to.
 *
 * The `topic` of each question is the id of its teaching plan in
 * lib/topic-plans, so the report can say which topics are weakest.
 */
import type { Expected } from "./grade";

export interface BankQuestion {
  /** The maker's name, with the seed: stable for one paper. */
  id: string;
  topic: string;
  question: string;
  expected: Expected;
}

// ── Numbers from a seed ───────────────────────────────────────────────────

/** A small repeatable random-number maker (mulberry32). */
function seeded(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  const pick = <T>(list: readonly T[]): T => list[Math.floor(next() * list.length)];
  /** A whole number in range that is not zero. */
  const nonZero = (lo: number, hi: number) => {
    let n = 0;
    while (n === 0) n = int(lo, hi);
    return n;
  };
  return { int, pick, nonZero };
}
type Rng = ReturnType<typeof seeded>;

const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
const round = (value: number, places: number) => Math.round(value * 10 ** places) / 10 ** places;
const money = (value: number) => `£${value.toFixed(2).replace(/\.00$/, "")}`;

/** "x^2 - 5x + 6": a polynomial as a pupil would type it. */
function poly(terms: Array<[coefficient: number, letters: string]>): string {
  let out = "";
  for (const [c, letters] of terms) {
    if (c === 0) continue;
    const size = Math.abs(c);
    const body = letters ? `${size === 1 ? "" : size}${letters}` : `${size}`;
    out += out === "" ? (c < 0 ? `-${body}` : body) : c < 0 ? ` - ${body}` : ` + ${body}`;
  }
  return out || "0";
}
/** "(x + 3)" or "(x - 4)". */
const bracket = (n: number) => `(x ${n < 0 ? "-" : "+"} ${Math.abs(n)})`;

type Maker = (r: Rng) => { question: string; expected: Expected };

// ── The makers ────────────────────────────────────────────────────────────
// Each entry: [name, topic, maker].

const MAKERS: Array<[string, string, Maker]> = [
  // ── Number ──────────────────────────────────────────────────────────────
  ["standard-form-multiply", "standard-form", (r) => {
    const a = r.pick([2, 3, 4, 5, 6]);
    const b = r.pick([2, 3, 4, 5]);
    const m = r.int(3, 7);
    const n = r.int(2, 6);
    return {
      question: `Work out (${a} × 10^${m}) × (${b} × 10^${n}). Give your answer in standard form.`,
      expected: { kind: "number", value: a * b * 10 ** (m + n), tolerance: 1, form: /(?<![\d.])[1-9](?:\.\d+)?\s*\*\s*10\s*\^/ },
    };
  }],
  ["standard-form-write", "standard-form", (r) => {
    const digits = r.pick([3.2, 4.7, 5.06, 8.1, 6.25]);
    const power = r.int(3, 6);
    const value = Math.round(digits * 10 ** power);
    return {
      question: `Write ${value.toLocaleString("en-GB")} in standard form.`,
      expected: { kind: "number", value, tolerance: 0.5, form: /(?<![\d.])[1-9](?:\.\d+)?\s*\*\s*10\s*\^/ },
    };
  }],
  ["surd-simplify", "surds", (r) => {
    const k = r.pick([2, 3, 4, 5, 6]);
    const m = r.pick([2, 3, 5, 6, 7]);
    return {
      question: `Simplify √${k * k * m}. Give your answer in the form a√b.`,
      expected: { kind: "number", value: k * Math.sqrt(m), tolerance: 1e-6, form: new RegExp(`(?<!\\d)${k}\\s*\\*?\\s*sqrt\\(${m}\\)`) },
    };
  }],
  ["error-interval", "bounds", (r) => {
    const tenths = r.int(12, 88);
    const v = tenths % 10 === 0 ? (tenths + 3) / 10 : tenths / 10;
    return {
      question: `A length is ${v} cm correct to 1 decimal place. Write down the error interval for the length.`,
      expected: { kind: "numbers", values: [round(v - 0.05, 2), round(v + 0.05, 2)] },
    };
  }],
  ["prime-factors", "prime-factorisation", (r) => {
    const n = r.pick([60, 72, 84, 90, 96, 120, 126, 150, 180, 200, 252, 300, 360, 420]);
    return { question: `Write ${n} as a product of its prime factors.`, expected: { kind: "primeFactors", n } };
  }],
  ["hcf", "hcf-lcm", (r) => {
    const g = r.pick([4, 6, 8, 12, 15, 18]);
    const [p, q] = r.pick([[2, 3], [2, 5], [3, 4], [3, 5], [4, 5], [2, 7], [3, 7], [5, 7]] as const);
    return {
      question: `Find the highest common factor of ${g * p} and ${g * q}.`,
      expected: { kind: "number", value: g },
    };
  }],
  ["lcm", "hcf-lcm", (r) => {
    const [a, b] = r.pick([[4, 6], [6, 8], [6, 9], [8, 12], [9, 12], [10, 15], [12, 18], [4, 10], [6, 15], [8, 20]] as const);
    return {
      question: `Find the lowest common multiple of ${a} and ${b}.`,
      expected: { kind: "number", value: (a * b) / gcd(a, b) },
    };
  }],
  ["index-laws-multiply", "indices", (r) => {
    const letter = r.pick(["a", "x", "y", "p"]);
    const m = r.int(2, 6);
    const n = r.int(2, 7);
    return {
      question: `Simplify ${letter}^${m} × ${letter}^${n}`,
      expected: { kind: "expression", expr: `${letter}^${m + n}`, vars: [letter], form: /^[a-z]\^\{?\(?\d+\)?\}?$/ },
    };
  }],
  ["index-laws-power", "indices", (r) => {
    const letter = r.pick(["a", "x", "t"]);
    const m = r.int(2, 4);
    const n = r.int(2, 4);
    return {
      question: `Simplify (${letter}^${m})^${n}`,
      expected: { kind: "expression", expr: `${letter}^${m * n}`, vars: [letter], form: /^[a-z]\^\{?\(?\d+\)?\}?$/ },
    };
  }],
  ["negative-index", "indices", (r) => {
    const base = r.pick([2, 3, 4, 5]);
    const n = r.pick([2, 3]);
    return { question: `Work out ${base}^-${n}. Give your answer as a fraction.`, expected: { kind: "number", value: base ** -n, tolerance: 1e-9 } };
  }],
  ["estimate", "rounding-estimation", (r) => {
    const [a, ra] = r.pick([[3.8, 4], [4.9, 5], [6.1, 6], [7.8, 8], [9.2, 9]] as const);
    const [b, rb] = r.pick([[19.7, 20], [30.4, 30], [41.2, 40], [58.9, 60]] as const);
    const [c, rc] = r.pick([[0.48, 0.5], [0.51, 0.5], [1.9, 2], [2.1, 2], [4.8, 5]] as const);
    return {
      question: `By rounding each number to 1 significant figure, estimate the value of (${a} × ${b}) ÷ ${c}`,
      expected: { kind: "number", value: (ra * rb) / rc },
    };
  }],
  ["round-sig-figs", "rounding-estimation", (r) => {
    const n = r.int(12000, 98000) + r.int(100, 899);
    const rounded = Number(n.toPrecision(2));
    return { question: `Round ${n} to 2 significant figures.`, expected: { kind: "number", value: rounded } };
  }],
  ["fraction-add", "fractions-decimals-percentages", (r) => {
    const [b, d] = r.pick([[3, 4], [4, 5], [3, 5], [5, 6], [3, 8], [4, 6], [5, 8]] as const);
    const a = r.int(1, b - 1);
    const c = r.int(1, d - 1);
    return { question: `Work out ${a}/${b} + ${c}/${d}`, expected: { kind: "number", value: a / b + c / d, tolerance: 1e-9 } };
  }],
  ["fraction-multiply", "fractions-decimals-percentages", (r) => {
    const [b, d] = r.pick([[3, 4], [4, 5], [5, 6], [7, 8], [3, 7]] as const);
    const a = r.int(1, b - 1);
    const c = r.int(1, d - 1);
    return { question: `Work out ${a}/${b} × ${c}/${d}. Give your answer in its simplest form.`, expected: { kind: "number", value: (a * c) / (b * d), tolerance: 1e-9 } };
  }],
  ["fraction-divide", "fractions-decimals-percentages", (r) => {
    const [b, d] = r.pick([[3, 4], [4, 5], [5, 6], [3, 8]] as const);
    const a = r.int(1, b - 1);
    const c = r.int(1, d - 1);
    return { question: `Work out ${a}/${b} ÷ ${c}/${d}`, expected: { kind: "number", value: (a * d) / (b * c), tolerance: 1e-9 } };
  }],
  ["percentage-of-amount", "fractions-decimals-percentages", (r) => {
    const p = r.pick([15, 35, 45, 65, 12]);
    const amount = r.pick([80, 120, 240, 360, 450]);
    return { question: `Work out ${p}% of £${amount}`, expected: { kind: "number", value: (p * amount) / 100, tolerance: 0.005 } };
  }],
  ["fraction-of-amount", "fractions-decimals-percentages", (r) => {
    const [n, d] = r.pick([[3, 5], [2, 7], [5, 8], [4, 9], [3, 4]] as const);
    const amount = d * r.int(6, 30);
    return { question: `Work out ${n}/${d} of ${amount}`, expected: { kind: "number", value: (n * amount) / d } };
  }],
  ["unitary", "proportion-unitary", (r) => {
    const unit = r.pick([0.35, 0.45, 0.6, 0.7, 1.2, 1.25]);
    const n = r.pick([3, 4, 5, 6]);
    const m = r.pick([7, 8, 9, 11]);
    return {
      question: `${n} pens cost ${money(n * unit)}. How much do ${m} pens cost?`,
      expected: { kind: "number", value: round(m * unit, 2), tolerance: 0.005 },
    };
  }],
  ["negative-subtract", "integers-place-value", (r) => {
    const a = -r.int(2, 9);
    const b = -r.int(2, 8);
    return { question: `Work out ${a} - (${b})`, expected: { kind: "number", value: a - b } };
  }],
  ["negative-multiply", "integers-place-value", (r) => {
    const a = -r.int(2, 9);
    const b = r.pick([-7, -6, -4, -3, 5, 8]);
    return { question: `Work out (${a}) × (${b})`, expected: { kind: "number", value: a * b } };
  }],
  ["order-of-operations", "integers-place-value", (r) => {
    const a = r.int(3, 12);
    const b = r.int(2, 6);
    const c = r.int(3, 7);
    const d = r.int(1, 9);
    return { question: `Work out ${a} + ${b} × ${c} - ${d}`, expected: { kind: "number", value: a + b * c - d } };
  }],

  // ── Algebra ─────────────────────────────────────────────────────────────
  ["linear-both-sides", "linear-equations", (r) => {
    const x = r.nonZero(-5, 9);
    const a = r.int(4, 8);
    const c = r.int(1, a - 2);
    const b = r.int(1, 12);
    const d = (a - c) * x + b;
    return {
      question: `Solve ${poly([[a, "x"], [b, ""]])} = ${poly([[c, "x"], [d, ""]])}`,
      expected: { kind: "assign", values: { x } },
    };
  }],
  ["linear-brackets", "linear-equations", (r) => {
    const x = r.nonZero(-4, 9);
    const a = r.int(2, 6);
    const b = r.nonZero(-5, 6);
    return {
      question: `Solve ${a}(x ${b < 0 ? "-" : "+"} ${Math.abs(b)}) = ${a * (x + b)}`,
      expected: { kind: "assign", values: { x } },
    };
  }],
  ["linear-fraction-answer", "linear-equations", (r) => {
    const a = r.pick([2, 4, 5, 8]);
    const top = r.pick([1, 3, 7, 9]);
    const b = r.int(1, 9);
    // a·x + b = top + b, so x = top/a.
    return { question: `Solve ${a}x + ${b} = ${top + b}`, expected: { kind: "assign", values: { x: top / a }, tolerance: 1e-9 } };
  }],
  ["simultaneous", "simultaneous-equations", (r) => {
    const x = r.nonZero(-3, 6);
    const y = r.nonZero(-3, 6);
    const [a, b, c, d] = r.pick([[3, 2, 1, 1], [2, 3, 1, 2], [5, 2, 3, 1], [4, 3, 2, 1], [2, 5, 3, 2]] as const);
    return {
      question: `Solve the simultaneous equations ${a}x + ${b}y = ${a * x + b * y} and ${c === 1 ? "" : c}x - ${d === 1 ? "" : d}y = ${c * x - d * y}`,
      expected: { kind: "assign", values: { x, y } },
    };
  }],
  ["quadratic-factorise-solve", "quadratic-equations", (r) => {
    const p = r.nonZero(-7, 7);
    let q = r.nonZero(-7, 7);
    if (q === p) q = -p;
    return {
      question: `Solve ${poly([[1, "x^2"], [-(p + q), "x"], [p * q, ""]])} = 0`,
      expected: { kind: "assign", values: { x: [p, q] } },
    };
  }],
  ["quadratic-formula", "quadratic-formula", (r) => {
    const a = r.pick([1, 1, 2, 3]);
    const b = r.int(3, 8);
    const c = -r.int(1, 7);
    const root = Math.sqrt(b * b - 4 * a * c);
    return {
      question: `Solve ${poly([[a, "x^2"], [b, "x"], [c, ""]])} = 0. Give your answers to 2 decimal places.`,
      expected: { kind: "assign", values: { x: [(-b + root) / (2 * a), (-b - root) / (2 * a)] }, tolerance: 0.006 },
    };
  }],
  ["expand-double", "expanding-brackets", (r) => {
    const a = r.nonZero(-7, 7);
    const b = r.nonZero(-7, 7);
    return {
      question: `Expand and simplify ${bracket(a)}${bracket(b)}`,
      expected: { kind: "expression", expr: `x^2 + (${a + b})x + (${a * b})`, vars: ["x"], form: "expanded" },
    };
  }],
  ["expand-and-collect", "expanding-brackets", (r) => {
    const a = r.int(2, 6);
    const b = r.int(1, 7);
    const c = r.int(2, 5);
    const d = r.int(1, 6);
    return {
      question: `Expand and simplify ${a}(x + ${b}) + ${c}(x - ${d})`,
      expected: { kind: "expression", expr: `${a + c}x + (${a * b - c * d})`, vars: ["x"], form: "expanded" },
    };
  }],
  ["factorise-quadratic", "factorising", (r) => {
    const a = r.nonZero(-6, 7);
    const b = r.nonZero(-6, 7);
    return {
      question: `Factorise ${poly([[1, "x^2"], [a + b, "x"], [a * b, ""]])}`,
      expected: { kind: "expression", expr: `(x + (${a}))(x + (${b}))`, vars: ["x"], form: "factorised" },
    };
  }],
  ["factorise-common-factor", "factorising", (r) => {
    const g = r.pick([3, 4, 5, 6, 7]);
    const [p, q] = r.pick([[2, 3], [2, 5], [3, 4], [3, 5], [4, 5], [2, 7]] as const);
    return {
      question: `Factorise fully ${g * p}x + ${g * q}`,
      expected: { kind: "expression", expr: `${g}(${p}x + ${q})`, vars: ["x"], form: new RegExp(`^${g}\\(`) },
    };
  }],
  ["difference-of-squares", "factorising", (r) => {
    const k = r.int(2, 9);
    return {
      question: `Factorise x^2 - ${k * k}`,
      expected: { kind: "expression", expr: `(x + ${k})(x - ${k})`, vars: ["x"], form: "factorised" },
    };
  }],
  ["collect-like-terms", "simplifying-expressions", (r) => {
    const a = r.int(2, 9);
    const b = r.int(2, 9);
    const c = r.int(2, 9);
    const d = r.int(2, 9);
    return {
      question: `Simplify ${a}x - ${b}y + ${c}x + ${d}y`,
      expected: { kind: "expression", expr: `${a + c}x + (${d - b})y`, vars: ["x", "y"], form: "expanded" },
    };
  }],
  ["nth-term", "sequences", (r) => {
    const a = r.int(2, 7);
    const b = r.nonZero(-5, 9);
    const terms = [1, 2, 3, 4].map((n) => a * n + b);
    return {
      question: `Find the nth term of the sequence ${terms.join(", ")}`,
      expected: { kind: "expression", expr: `${a}n + (${b})`, vars: ["n"] },
    };
  }],
  ["inequality", "inequalities", (r) => {
    const a = r.int(2, 6);
    const x0 = r.nonZero(-4, 8);
    const b = r.int(1, 9);
    const op = r.pick(["<", ">", "≤", "≥"] as const);
    const asOp = ({ "<": "<", ">": ">", "≤": "<=", "≥": ">=" } as const)[op];
    return {
      question: `Solve ${a}x - ${b} ${op} ${a * x0 - b}`,
      expected: { kind: "inequality", variable: "x", op: asOp, value: x0 },
    };
  }],
  ["function-value", "function-notation", (r) => {
    const a = r.int(2, 7);
    const b = r.nonZero(-9, 9);
    const k = r.nonZero(-4, 6);
    return {
      question: `f(x) = ${poly([[a, "x"], [b, ""]])}. Find f(${k}).`,
      expected: { kind: "number", value: a * k + b },
    };
  }],
  ["function-value-squared", "function-notation", (r) => {
    const a = r.int(1, 9);
    const k = -r.int(2, 6);
    return { question: `g(x) = x^2 - ${a}. Find g(${k}).`, expected: { kind: "number", value: k * k - a } };
  }],
  ["composite-function", "inverse-composite-functions", (r) => {
    const a = r.int(2, 5);
    const b = r.int(1, 7);
    return {
      question: `f(x) = ${a}x + ${b} and g(x) = x^2. Find fg(x).`,
      expected: { kind: "expression", expr: `${a}x^2 + ${b}`, vars: ["x"] },
    };
  }],
  ["inverse-function", "inverse-composite-functions", (r) => {
    const a = r.int(2, 6);
    const b = r.int(1, 9);
    return {
      question: `f(x) = ${a}x - ${b}. Find the inverse function f^-1(x).`,
      expected: { kind: "expression", expr: `(x + ${b})/${a}`, vars: ["x"] },
    };
  }],
  ["rearrange", "rearranging-formulae", (r) => {
    const a = r.int(2, 7);
    const b = r.int(1, 9);
    return {
      question: `Make x the subject of y = ${a}x + ${b}`,
      expected: { kind: "expression", expr: `(y - ${b})/${a}`, vars: ["y"] },
    };
  }],
  ["complete-the-square", "completing-the-square", (r) => {
    const p = r.int(1, 6);
    const q = r.int(1, 12);
    return {
      question: `Write x^2 + ${2 * p}x + ${q} in the form (x + a)^2 + b.`,
      expected: { kind: "expression", expr: `(x + ${p})^2 + (${q - p * p})`, vars: ["x"], form: /\)\^/ },
    };
  }],
  ["iteration", "iteration", (r) => {
    const k = r.pick([5, 7, 9, 11]);
    const x1 = (1 + k) / 2;
    const x2 = (x1 + k) / 2;
    const x3 = (x2 + k) / 2;
    return {
      question: `Use the iteration x_{n+1} = (x_n + ${k}) / 2 with x_0 = 1 to find x_1, x_2 and x_3.`,
      expected: { kind: "numbers", values: [x1, x2, x3], tolerance: 1e-6 },
    };
  }],
  ["substitution", "simplifying-expressions", (r) => {
    const a = r.int(2, 5);
    const b = -r.int(2, 6);
    const p = r.int(2, 4);
    const q = r.int(2, 5);
    return {
      question: `Find the value of ${p}a^2 - ${q}b when a = ${a} and b = ${b}.`,
      expected: { kind: "number", value: p * a * a - q * b },
    };
  }],
  ["algebraic-fraction", "algebraic-fractions", (r) => {
    const k = r.int(2, 7);
    return {
      question: `Simplify (x^2 + ${k}x) / (x + ${k})`,
      expected: { kind: "expression", expr: "x", vars: ["x"], form: /^x$/ },
    };
  }],

  // ── Ratio, proportion and rates of change ───────────────────────────────
  ["share-in-ratio", "sharing-in-a-ratio", (r) => {
    const [a, b] = r.pick([[2, 3], [3, 5], [1, 4], [2, 7], [3, 4], [5, 7]] as const);
    const part = r.pick([6, 8, 12, 15, 20]);
    return {
      question: `Share £${part * (a + b)} between Amy and Ben in the ratio ${a} : ${b}.`,
      expected: { kind: "numbers", values: [part * a, part * b] },
    };
  }],
  ["simplify-ratio", "simplifying-ratios", (r) => {
    const [a, b] = r.pick([[2, 3], [3, 4], [3, 5], [4, 5], [2, 5], [5, 7], [4, 7]] as const);
    const g = r.pick([3, 4, 6, 8, 9, 12]);
    return { question: `Simplify the ratio ${g * a} : ${g * b}`, expected: { kind: "ratio", parts: [a, b] } };
  }],
  ["percentage-decrease", "percentage-change", (r) => {
    const price = r.pick([60, 80, 120, 250, 340]);
    const p = r.pick([15, 20, 35, 12]);
    return {
      question: `A coat costs £${price}. It is reduced by ${p}% in a sale. Work out the sale price.`,
      expected: { kind: "number", value: round(price * (1 - p / 100), 2), tolerance: 0.005 },
    };
  }],
  ["percentage-increase", "percentage-change", (r) => {
    const price = r.pick([40, 150, 220, 480]);
    const p = r.pick([5, 15, 30, 8]);
    return {
      question: `A rent of £${price} is increased by ${p}%. Work out the new rent.`,
      expected: { kind: "number", value: round(price * (1 + p / 100), 2), tolerance: 0.005 },
    };
  }],
  ["reverse-percentage", "percentage-change", (r) => {
    const original = r.pick([50, 80, 120, 250, 400]);
    const p = r.pick([10, 20, 25]);
    return {
      question: `After a ${p}% increase, a coat costs ${money(original * (1 + p / 100))}. Work out the price before the increase.`,
      expected: { kind: "number", value: original, tolerance: 0.005 },
    };
  }],
  ["compound-interest", "compound-interest", (r) => {
    const principal = r.pick([1500, 2000, 4000, 5000]);
    const rate = r.pick([2, 3, 4, 5]);
    const years = r.pick([2, 3]);
    return {
      question: `£${principal} is invested at ${rate}% compound interest per year. Work out the value of the investment after ${years} years.`,
      expected: { kind: "number", value: principal * (1 + rate / 100) ** years, tolerance: 0.006 },
    };
  }],
  ["depreciation", "growth-and-decay", (r) => {
    const value = r.pick([8000, 12000, 15000, 20000]);
    const p = r.pick([10, 15, 20]);
    return {
      question: `A car is worth £${value}. It loses ${p}% of its value each year. Work out its value after 2 years.`,
      expected: { kind: "number", value: value * (1 - p / 100) ** 2, tolerance: 0.006 },
    };
  }],
  ["doubling", "growth-and-decay", (r) => {
    const start = r.pick([300, 500, 800, 1200]);
    const hours = r.int(3, 6);
    return {
      question: `A population of ${start} bacteria doubles every hour. How many bacteria are there after ${hours} hours?`,
      expected: { kind: "number", value: start * 2 ** hours },
    };
  }],
  ["speed", "speed-distance-time", (r) => {
    const speed = r.pick([40, 48, 60, 64, 72]);
    const [hours, minutes] = r.pick([[1, 30], [2, 30], [1, 15], [2, 15], [1, 45]] as const);
    const distance = speed * (hours + minutes / 60);
    return {
      question: `A car travels ${distance} miles in ${hours} hour${hours === 1 ? "" : "s"} ${minutes} minutes. Work out its average speed in miles per hour.`,
      expected: { kind: "number", value: speed, tolerance: 0.005 },
    };
  }],
  ["direct-proportion", "direct-inverse-proportion", (r) => {
    const k = r.pick([3, 4, 5, 7, 2.5]);
    const x1 = r.pick([2, 4, 6]);
    const x2 = r.pick([7, 9, 10, 12]);
    return {
      question: `y is directly proportional to x. When x = ${x1}, y = ${k * x1}. Find y when x = ${x2}.`,
      expected: { kind: "assign", values: { y: k * x2 }, tolerance: 1e-9 },
    };
  }],
  ["inverse-proportion", "direct-inverse-proportion", (r) => {
    const [x1, y1, x2] = r.pick([[4, 6, 8], [3, 10, 5], [2, 18, 9], [5, 12, 4], [6, 8, 16]] as const);
    return {
      question: `y is inversely proportional to x. When x = ${x1}, y = ${y1}. Find y when x = ${x2}.`,
      expected: { kind: "assign", values: { y: (x1 * y1) / x2 }, tolerance: 1e-9 },
    };
  }],
  ["gradient", "rates-of-change", (r) => {
    const m = r.pick([2, 3, 4, -2, -3, 0.5]);
    const x1 = r.int(0, 3);
    const y1 = r.int(1, 6);
    const run = r.pick([2, 4, 6]);
    return {
      question: `Work out the gradient of the straight line through (${x1}, ${y1}) and (${x1 + run}, ${y1 + m * run}).`,
      expected: { kind: "number", value: m, tolerance: 1e-9 },
    };
  }],
  ["density", "speed-distance-time", (r) => {
    const density = r.pick([2.7, 7.8, 0.9, 8.9, 1.2]);
    const volume = r.pick([50, 200, 250, 400]);
    return {
      question: `A block has a mass of ${round(density * volume, 1)} g and a volume of ${volume} cm³. Work out its density in g/cm³.`,
      expected: { kind: "number", value: density, tolerance: 0.005 },
    };
  }],

  // ── Geometry and measures ───────────────────────────────────────────────
  ["pythagoras-hypotenuse", "pythagoras", (r) => {
    const [a, b] = r.pick([[5, 12], [8, 15], [6, 9], [4, 7], [5, 8], [7, 10], [9, 11]] as const);
    return {
      question: `A right-angled triangle has shorter sides of ${a} cm and ${b} cm. Work out the length of the longest side. Give your answer to 1 decimal place.`,
      expected: { kind: "number", value: Math.hypot(a, b), tolerance: 0.051 },
    };
  }],
  ["pythagoras-shorter-side", "pythagoras", (r) => {
    const [c, a] = r.pick([[13, 5], [10, 6], [15, 9], [12, 7], [11, 4], [9, 5]] as const);
    return {
      question: `A right-angled triangle has a hypotenuse of ${c} cm and one shorter side of ${a} cm. Work out the length of the other shorter side. Give your answer to 1 decimal place.`,
      expected: { kind: "number", value: Math.sqrt(c * c - a * a), tolerance: 0.051 },
    };
  }],
  ["trig-opposite", "trigonometry", (r) => {
    const angle = r.pick([28, 35, 42, 51, 63]);
    const h = r.pick([8, 12, 15, 20]);
    return {
      question: `In a right-angled triangle, one angle is ${angle}° and the hypotenuse is ${h} cm. Work out the length of the side opposite the ${angle}° angle. Give your answer to 1 decimal place.`,
      expected: { kind: "number", value: h * Math.sin((angle * Math.PI) / 180), tolerance: 0.051 },
    };
  }],
  ["trig-angle", "trigonometry", (r) => {
    const [opposite, adjacent] = r.pick([[5, 8], [7, 4], [6, 11], [9, 5], [3, 10]] as const);
    return {
      question: `In a right-angled triangle, the side opposite angle x is ${opposite} cm and the side adjacent to angle x is ${adjacent} cm. Work out the size of angle x. Give your answer to 1 decimal place.`,
      expected: { kind: "number", value: (Math.atan(opposite / adjacent) * 180) / Math.PI, tolerance: 0.051 },
    };
  }],
  ["cosine-rule", "sine-cosine-rules", (r) => {
    const [a, b, angle] = r.pick([[7, 9, 60], [5, 8, 40], [6, 11, 75], [10, 12, 50], [8, 13, 110]] as const);
    const side = Math.sqrt(a * a + b * b - 2 * a * b * Math.cos((angle * Math.PI) / 180));
    return {
      question: `In triangle ABC, AB = ${a} cm, AC = ${b} cm and angle A = ${angle}°. Use the cosine rule to work out the length of BC. Give your answer to 1 decimal place.`,
      expected: { kind: "number", value: side, tolerance: 0.051 },
    };
  }],
  ["triangle-area-sine", "sine-cosine-rules", (r) => {
    const [a, b, angle] = r.pick([[7, 9, 30], [6, 10, 50], [8, 11, 72], [5, 12, 110]] as const);
    return {
      question: `In triangle ABC, AB = ${a} cm, AC = ${b} cm and angle A = ${angle}°. Work out the area of the triangle. Give your answer to 1 decimal place.`,
      expected: { kind: "number", value: 0.5 * a * b * Math.sin((angle * Math.PI) / 180), tolerance: 0.051 },
    };
  }],
  ["circle-area-pi", "circles", (r) => {
    const radius = r.int(3, 9);
    return {
      question: `Work out the area of a circle with radius ${radius} cm. Give your answer in terms of π.`,
      expected: { kind: "number", value: radius * radius * Math.PI, tolerance: 1e-6, form: /pi/ },
    };
  }],
  ["circle-circumference", "circles", (r) => {
    const diameter = r.pick([7, 9, 12, 15, 22]);
    return {
      question: `A circle has a diameter of ${diameter} cm. Work out its circumference. Give your answer to 1 decimal place.`,
      expected: { kind: "number", value: Math.PI * diameter, tolerance: 0.051 },
    };
  }],
  ["arc-length", "arcs-sectors", (r) => {
    const [radius, angle] = r.pick([[6, 60], [9, 40], [12, 45], [10, 72], [8, 90], [15, 120]] as const);
    return {
      question: `A sector of a circle has radius ${radius} cm and angle ${angle}°. Work out the arc length. Give your answer in terms of π.`,
      expected: { kind: "number", value: (angle / 360) * 2 * Math.PI * radius, tolerance: 1e-6, form: /pi/ },
    };
  }],
  ["sector-area", "arcs-sectors", (r) => {
    const [radius, angle] = r.pick([[6, 60], [12, 30], [9, 80], [10, 36], [8, 45]] as const);
    return {
      question: `A sector of a circle has radius ${radius} cm and angle ${angle}°. Work out the area of the sector. Give your answer in terms of π.`,
      expected: { kind: "number", value: (angle / 360) * Math.PI * radius * radius, tolerance: 1e-6, form: /pi/ },
    };
  }],
  ["trapezium-area", "area-perimeter", (r) => {
    const a = r.int(4, 9);
    const b = a + r.int(2, 8);
    const h = r.int(3, 8);
    return {
      question: `A trapezium has parallel sides of ${a} cm and ${b} cm. The distance between them is ${h} cm. Work out its area.`,
      expected: { kind: "number", value: ((a + b) / 2) * h },
    };
  }],
  ["triangle-area", "area-perimeter", (r) => {
    const base = r.int(5, 14);
    const height = r.int(3, 11);
    return {
      question: `A triangle has a base of ${base} cm and a perpendicular height of ${height} cm. Work out its area.`,
      expected: { kind: "number", value: (base * height) / 2 },
    };
  }],
  ["cylinder-volume", "volume-surface-area", (r) => {
    const radius = r.int(2, 6);
    const height = r.pick([5, 8, 10, 12]);
    return {
      question: `A cylinder has radius ${radius} cm and height ${height} cm. Work out its volume. Give your answer in terms of π.`,
      expected: { kind: "number", value: Math.PI * radius * radius * height, tolerance: 1e-6, form: /pi/ },
    };
  }],
  ["cuboid-surface-area", "volume-surface-area", (r) => {
    const l = r.int(4, 9);
    const w = r.int(2, 6);
    const h = r.int(2, 7);
    return {
      question: `A cuboid is ${l} cm long, ${w} cm wide and ${h} cm high. Work out its total surface area.`,
      expected: { kind: "number", value: 2 * (l * w + l * h + w * h) },
    };
  }],
  ["sphere-volume", "volume-surface-area", (r) => {
    const radius = r.pick([3, 6, 9]);
    return {
      question: `Work out the volume of a sphere with radius ${radius} cm. Give your answer in terms of π.`,
      expected: { kind: "number", value: (4 / 3) * Math.PI * radius ** 3, tolerance: 1e-6, form: /pi/ },
    };
  }],
  ["triangle-angle", "angles", (r) => {
    const a = r.int(35, 80);
    const b = r.int(30, 70);
    return {
      question: `Two angles of a triangle are ${a}° and ${b}°. Work out the size of the third angle.`,
      expected: { kind: "number", value: 180 - a - b },
    };
  }],
  ["polygon-interior-angle", "angles", (r) => {
    const [name, n] = r.pick([["pentagon", 5], ["hexagon", 6], ["octagon", 8], ["nonagon", 9], ["decagon", 10]] as const);
    return {
      question: `Work out the size of each interior angle of a regular ${name}.`,
      expected: { kind: "number", value: ((n - 2) * 180) / n },
    };
  }],
  ["polygon-exterior-angle", "angles", (r) => {
    const n = r.pick([5, 8, 9, 12, 15, 18]);
    return {
      question: `A regular polygon has ${n} sides. Work out the size of each exterior angle.`,
      expected: { kind: "number", value: 360 / n },
    };
  }],
  ["angle-at-centre", "circle-theorems", (r) => {
    const centre = r.pick([84, 96, 110, 128, 146]);
    return {
      question: `A, B and C are points on a circle with centre O. Angle AOB is ${centre}°. Use a circle theorem to work out angle ACB.`,
      expected: { kind: "number", value: centre / 2 },
    };
  }],
  ["back-bearing", "bearings", (r) => {
    const bearing = r.pick([35, 70, 112, 205, 248, 310]);
    return {
      question: `The bearing of B from A is ${String(bearing).padStart(3, "0")}°. Work out the bearing of A from B.`,
      expected: { kind: "number", value: (bearing + 180) % 360 },
    };
  }],
  ["vector-sum", "vectors", (r) => {
    const a = [r.nonZero(-4, 6), r.nonZero(-5, 5)];
    const b = [r.nonZero(-3, 4), r.nonZero(-2, 6)];
    const k = r.pick([2, 3]);
    return {
      question: `a = (${a[0]}, ${a[1]}) and b = (${b[0]}, ${b[1]}) are column vectors. Work out a + ${k}b.`,
      expected: { kind: "numbers", values: [a[0] + k * b[0], a[1] + k * b[1]] },
    };
  }],
  ["similar-triangles", "congruence-similarity", (r) => {
    const [small, large] = r.pick([[4, 10], [3, 12], [5, 8], [6, 15], [4, 14]] as const);
    const other = r.pick([6, 8, 10]);
    return {
      question: `Two similar triangles have corresponding sides of ${small} cm and ${large} cm. Another side of the smaller triangle is ${other} cm. Work out the corresponding side of the larger triangle.`,
      expected: { kind: "number", value: (other * large) / small, tolerance: 0.005 },
    };
  }],

  // ── Statistics ──────────────────────────────────────────────────────────
  ["mean", "averages", (r) => {
    const values = [r.int(2, 9), r.int(4, 12), r.int(6, 15), r.int(8, 19), r.int(10, 24)];
    const sum = values.reduce((a, b) => a + b, 0);
    values[4] += (5 - (sum % 5)) % 5; // a whole-number mean
    return {
      question: `Work out the mean of ${values.join(", ")}.`,
      expected: { kind: "number", value: values.reduce((a, b) => a + b, 0) / 5 },
    };
  }],
  ["median-even", "averages", (r) => {
    const start = r.int(2, 9);
    const sorted = [start, start + r.int(1, 3), start + 5, start + 5 + r.pick([1, 3]), start + 11, start + 14];
    const shown = [sorted[3], sorted[0], sorted[5], sorted[2], sorted[4], sorted[1]];
    return {
      question: `Work out the median of ${shown.join(", ")}.`,
      expected: { kind: "number", value: (sorted[2] + sorted[3]) / 2 },
    };
  }],
  ["range", "averages", (r) => {
    const low = r.int(3, 20);
    const high = low + r.int(15, 40);
    const shown = [low + 7, high, low + 2, low, low + 11];
    return { question: `Work out the range of ${shown.join(", ")}.`, expected: { kind: "number", value: high - low } };
  }],
  ["mean-from-table", "frequency-tables-grouped-data", (r) => {
    const freqs = [r.int(2, 6), r.int(4, 9), r.int(5, 10), r.int(2, 6)];
    const total = freqs.reduce((a, b) => a + b, 0);
    const sum = freqs.reduce((a, f, i) => a + f * (i + 1), 0);
    return {
      question: `A frequency table shows: score 1 with frequency ${freqs[0]}, score 2 with frequency ${freqs[1]}, score 3 with frequency ${freqs[2]}, score 4 with frequency ${freqs[3]}. Work out the mean score. Give your answer to 2 decimal places.`,
      expected: { kind: "number", value: sum / total, tolerance: 0.006 },
    };
  }],
  ["stratified-sample", "sampling", (r) => {
    const [boys, girls, sample] = r.pick([[300, 200, 50], [240, 360, 60], [450, 150, 40], [320, 480, 100]] as const);
    return {
      question: `A school has ${boys} boys and ${girls} girls. A stratified sample of ${sample} students is taken. How many boys should be in the sample?`,
      expected: { kind: "number", value: (boys / (boys + girls)) * sample },
    };
  }],
  ["pie-chart-angle", "charts-diagrams", (r) => {
    const [total, chosen] = r.pick([[60, 15], [72, 18], [90, 20], [120, 45], [180, 35]] as const);
    return {
      question: `In a survey of ${total} people, ${chosen} chose red. Work out the angle for red on a pie chart.`,
      expected: { kind: "number", value: (chosen / total) * 360 },
    };
  }],
  ["interquartile-range", "cumulative-frequency-box-plots", (r) => {
    const lower = r.int(8, 20);
    const upper = lower + r.int(9, 24);
    return {
      question: `From a cumulative frequency graph, the lower quartile is ${lower} and the upper quartile is ${upper}. Work out the interquartile range.`,
      expected: { kind: "number", value: upper - lower },
    };
  }],
  ["frequency-density", "histograms", (r) => {
    const [from, to] = r.pick([[10, 30], [20, 25], [0, 40], [30, 80], [5, 15]] as const);
    const density = r.pick([1.5, 2, 2.4, 3, 0.8]);
    return {
      question: `In a histogram, the class ${from} to ${to} has a frequency of ${density * (to - from)}. Work out the frequency density of this class.`,
      expected: { kind: "number", value: density, tolerance: 1e-9 },
    };
  }],

  // ── Probability ─────────────────────────────────────────────────────────
  ["single-event", "basic-probability", (r) => {
    const red = r.int(2, 6);
    const blue = r.int(3, 7);
    const green = r.int(1, 5);
    return {
      question: `A bag contains ${red} red, ${blue} blue and ${green} green counters. One counter is chosen at random. Work out the probability that it is blue.`,
      expected: { kind: "number", value: blue / (red + blue + green), tolerance: 0.0006, orPercent: true },
    };
  }],
  ["not-event", "basic-probability", (r) => {
    const p = r.pick([0.35, 0.28, 0.6, 0.15, 0.72]);
    return {
      question: `The probability that it rains tomorrow is ${p}. Work out the probability that it does not rain tomorrow.`,
      expected: { kind: "number", value: round(1 - p, 2), tolerance: 1e-9, orPercent: true },
    };
  }],
  ["with-replacement-one-of-each", "probability-trees", (r) => {
    const red = r.int(2, 6);
    const blue = r.int(3, 7);
    const n = red + blue;
    return {
      question: `A bag has ${red} red counters and ${blue} blue counters. One counter is taken out, put back, and then another is taken out. Work out the probability of getting one of each colour.`,
      expected: { kind: "number", value: (2 * red * blue) / (n * n), tolerance: 0.0006, orPercent: true },
    };
  }],
  ["without-replacement-both", "probability-trees", (r) => {
    const red = r.int(3, 6);
    const blue = r.int(2, 6);
    const n = red + blue;
    return {
      question: `A bag has ${red} red counters and ${blue} blue counters. Two counters are taken out without replacement. Work out the probability that both are red.`,
      expected: { kind: "number", value: (red * (red - 1)) / (n * (n - 1)), tolerance: 0.0006, orPercent: true },
    };
  }],
  ["two-dice-total", "combined-events", (r) => {
    const total = r.pick([4, 5, 6, 7, 8, 9, 10]);
    const ways = 6 - Math.abs(7 - total);
    return {
      question: `Two fair dice are rolled. Work out the probability that the total is ${total}.`,
      expected: { kind: "number", value: ways / 36, tolerance: 0.0006, orPercent: true },
    };
  }],
  ["expected-frequency", "relative-frequency", (r) => {
    const p = r.pick([0.15, 0.2, 0.35, 0.4]);
    const trials = r.pick([80, 200, 300, 500]);
    return {
      question: `The probability that a spinner lands on red is ${p}. The spinner is spun ${trials} times. How many times would you expect it to land on red?`,
      expected: { kind: "number", value: p * trials, tolerance: 1e-6 },
    };
  }],
  ["relative-frequency", "relative-frequency", (r) => {
    const [trials, hits] = r.pick([[200, 46], [150, 36], [250, 85], [400, 132], [80, 28]] as const);
    return {
      question: `A spinner is spun ${trials} times and lands on red ${hits} times. Work out the relative frequency of red.`,
      expected: { kind: "number", value: hits / trials, tolerance: 0.0006, orPercent: true },
    };
  }],
  ["venn-neither", "venn-diagrams", (r) => {
    const both = r.int(3, 7);
    const french = both + r.int(6, 12);
    const spanish = both + r.int(4, 9);
    const neither = r.int(2, 8);
    const total = french + spanish - both + neither;
    return {
      question: `In a class of ${total} students, ${french} study French, ${spanish} study Spanish and ${both} study both. Work out how many students study neither language.`,
      expected: { kind: "number", value: neither },
    };
  }],
  ["given-that", "conditional-probability", (r) => {
    const both = r.int(3, 8);
    const french = both + r.int(7, 13);
    const spanish = both + r.int(4, 9);
    const total = french + spanish - both + r.int(2, 6);
    return {
      question: `In a class of ${total} students, ${french} study French, ${spanish} study Spanish and ${both} study both. A student is chosen at random. Given that the student studies French, find the probability that they also study Spanish.`,
      expected: { kind: "number", value: both / french, tolerance: 0.0006, orPercent: true },
    };
  }],
  ["mutually-exclusive", "basic-probability", (r) => {
    const [a, b] = r.pick([[0.25, 0.4], [0.3, 0.15], [0.12, 0.5], [0.35, 0.2]] as const);
    return {
      question: `A spinner can land on red, blue or green. The probability of red is ${a} and the probability of blue is ${b}. Work out the probability that it lands on red or blue.`,
      expected: { kind: "number", value: round(a + b, 2), tolerance: 1e-9, orPercent: true },
    };
  }],
];

/** How many kinds of question the bank can write. */
export const BANK_SIZE = MAKERS.length;

/** The topics the bank has at least one question on. */
export const BANK_TOPICS = [...new Set(MAKERS.map(([, topic]) => topic))];

/**
 * A paper: `perMaker` questions from every maker, from one seed. `only`
 * narrows it to makers or topics whose name contains the text.
 */
export function buildPaper(seed: number, perMaker = 1, only?: string[]): BankQuestion[] {
  const paper: BankQuestion[] = [];
  MAKERS.forEach(([name, topic, make], index) => {
    if (only && only.length > 0 && !only.some((text) => name.includes(text) || topic.includes(text))) return;
    for (let copy = 0; copy < perMaker; copy++) {
      // Each maker has its own run of numbers, so adding a maker later does
      // not change the questions the others write for the same seed.
      const rng = seeded(seed * 7919 + index * 104729 + copy * 15485863);
      const made = make(rng);
      paper.push({ id: `${name}#${seed}.${copy}`, topic, ...made });
    }
  });
  return paper;
}
