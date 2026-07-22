/**
 * Deterministic fraction-ops builder for Year 5/6.
 * Covers: +/− with common denominators, ×/÷ by an integer, × fraction×fraction.
 * Output: equation_steps board + digit-level TeachingStep script.
 */

import type {
  EquationStep,
  EquationStepBlock,
  VisualBlock,
} from "@/types/whiteboard";
import type { MethodBuildResult, TeachingStep } from "@/lib/methods/types";
import { normalizeMathText } from "@/lib/methods/normalize-math-text";

export interface Fraction {
  n: number;
  d: number;
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

function lcm(a: number, b: number): number {
  return Math.abs(a * b) / gcd(a, b);
}

export function simplify(f: Fraction): Fraction {
  if (f.d === 0) throw new Error("denominator cannot be zero");
  const g = gcd(f.n, f.d);
  let n = f.n / g;
  let d = f.d / g;
  if (d < 0) {
    n = -n;
    d = -d;
  }
  return { n, d };
}

function latex(f: Fraction): string {
  if (f.d === 1) return String(f.n);
  return `\\frac{${f.n}}{${f.d}}`;
}

function plain(f: Fraction): string {
  if (f.d === 1) return String(f.n);
  return `${f.n}/${f.d}`;
}

export type FractionOp = "add" | "subtract" | "multiply" | "divide";

/** A mixed number (2 1/2) or a plain fraction (whole = 0). */
export interface MixedOperand {
  whole: number;
  frac: Fraction;
}

export type FractionOpProblem =
  | { kind?: "binary"; left: Fraction; right: Fraction; op: FractionOp }
  | {
      kind: "mixed_binary";
      left: MixedOperand;
      right: MixedOperand;
      op: "add" | "subtract";
    }
  | { kind: "of_amount"; fraction: Fraction; amount: number }
  | { kind: "to_improper"; whole: number; frac: Fraction }
  | { kind: "to_mixed"; improper: Fraction };

function mixedToImproper(m: MixedOperand): Fraction {
  return { n: m.whole * m.frac.d + m.frac.n, d: m.frac.d };
}

function mixedPlain(m: MixedOperand): string {
  if (m.whole === 0) return plain(m.frac);
  if (m.frac.n === 0) return String(m.whole);
  return `${m.whole} ${plain(m.frac)}`;
}

function mixedLatex(m: MixedOperand): string {
  if (m.whole === 0) return latex(m.frac);
  if (m.frac.n === 0) return String(m.whole);
  return `${m.whole}${latex(m.frac)}`;
}

function buildSteps(
  problem: { left: Fraction; right: Fraction; op: FractionOp },
): { steps: EquationStep[]; teachingSteps: TeachingStep[]; answer: Fraction } {
  const { left, right, op } = problem;
  const teachingSteps: TeachingStep[] = [];
  const steps: EquationStep[] = [];
  let stepNumber = 1;

  const push = (
    title: string,
    explanation: string,
    latexBefore: string,
    latexAfter: string,
    operationLabel: string,
    why?: string,
    showAnswer?: boolean,
  ) => {
    steps.push({
      stepNumber: stepNumber++,
      operationLabel,
      explanation,
      latexBefore,
      latexAfter,
      arrowDirection: "down",
      rule: title,
    });
    teachingSteps.push({
      title,
      explanation,
      why,
      narration: explanation,
      cellKeys: [],
      carryKeys: [],
      noteKeys: [],
      showAnswer,
    });
  };

  const start = `${latex(left)} ${opSymbol(op)} ${latex(right)}`;
  push(
    "Write the calculation",
    `Start with ${plain(left)} ${opSymbol(op)} ${plain(right)}.`,
    start,
    start,
    "Set up",
    "We keep both fractions visible so each step is clear.",
  );

  if (op === "add" || op === "subtract") {
    if (left.d === right.d) {
      const raw =
        op === "add"
          ? { n: left.n + right.n, d: left.d }
          : { n: left.n - right.n, d: left.d };
      const after = latex(raw);
      push(
        op === "add" ? "Add the numerators" : "Subtract the numerators",
        op === "add"
          ? `Same denominator ${left.d}: ${left.n} + ${right.n} = ${raw.n}. Keep ${raw.d}.`
          : `Same denominator ${left.d}: ${left.n} − ${right.n} = ${raw.n}. Keep ${raw.d}.`,
        start,
        after,
        op === "add" ? "Add numerators" : "Subtract numerators",
        "Equal denominators mean the pieces are the same size.",
      );
      const ans = simplify(raw);
      if (ans.n !== raw.n || ans.d !== raw.d) {
        push(
          "Simplify",
          `Simplify ${plain(raw)} to ${plain(ans)}.`,
          after,
          latex(ans),
          "Simplify",
          "Divide numerator and denominator by their highest common factor.",
          true,
        );
      } else {
        teachingSteps[teachingSteps.length - 1].showAnswer = true;
      }
      return { steps, teachingSteps, answer: ans };
    }

    const den = lcm(left.d, right.d);
    const leftEq = { n: left.n * (den / left.d), d: den };
    const rightEq = { n: right.n * (den / right.d), d: den };
    const common = `${latex(leftEq)} ${opSymbol(op)} ${latex(rightEq)}`;
    push(
      "Find a common denominator",
      `Common denominator of ${left.d} and ${right.d} is ${den}. Rewrite as ${plain(leftEq)} ${opSymbol(op)} ${plain(rightEq)}.`,
      start,
      common,
      "Equivalent fractions",
      "Same-size pieces let us add or subtract the numerators.",
    );

    const raw =
      op === "add"
        ? { n: leftEq.n + rightEq.n, d: den }
        : { n: leftEq.n - rightEq.n, d: den };
    push(
      op === "add" ? "Add the numerators" : "Subtract the numerators",
      op === "add"
        ? `${leftEq.n} + ${rightEq.n} = ${raw.n}. Keep denominator ${den}.`
        : `${leftEq.n} − ${rightEq.n} = ${raw.n}. Keep denominator ${den}.`,
      common,
      latex(raw),
      op === "add" ? "Add numerators" : "Subtract numerators",
    );

    const ans = simplify(raw);
    if (ans.n !== raw.n || ans.d !== raw.d) {
      push(
        "Simplify",
        `Simplify ${plain(raw)} to ${plain(ans)}.`,
        latex(raw),
        latex(ans),
        "Simplify",
        "Always give the answer in its simplest form.",
        true,
      );
    } else {
      teachingSteps[teachingSteps.length - 1].showAnswer = true;
    }
    return { steps, teachingSteps, answer: ans };
  }

  if (op === "multiply") {
    const raw = { n: left.n * right.n, d: left.d * right.d };
    push(
      "Multiply numerators and denominators",
      `${left.n} × ${right.n} = ${raw.n} on top; ${left.d} × ${right.d} = ${raw.d} underneath.`,
      start,
      latex(raw),
      "Multiply",
      "Multiplying fractions means 'of' — multiply tops, multiply bottoms.",
    );
    const ans = simplify(raw);
    if (ans.n !== raw.n || ans.d !== raw.d) {
      push(
        "Simplify",
        `Simplify ${plain(raw)} to ${plain(ans)}.`,
        latex(raw),
        latex(ans),
        "Simplify",
        undefined,
        true,
      );
    } else {
      teachingSteps[teachingSteps.length - 1].showAnswer = true;
    }
    return { steps, teachingSteps, answer: ans };
  }

  // divide: a/b ÷ c/d = a/b × d/c
  const reciprocal = { n: right.d, d: right.n };
  const flipped = `${latex(left)} \\times ${latex(reciprocal)}`;
  push(
    "Multiply by the reciprocal",
    `Dividing by ${plain(right)} is the same as multiplying by ${plain(reciprocal)}.`,
    start,
    flipped,
    "Reciprocal",
    "÷ a fraction means × its flip.",
  );
  const raw = { n: left.n * reciprocal.n, d: left.d * reciprocal.d };
  push(
    "Multiply numerators and denominators",
    `${left.n} × ${reciprocal.n} = ${raw.n}; ${left.d} × ${reciprocal.d} = ${raw.d}.`,
    flipped,
    latex(raw),
    "Multiply",
  );
  const ans = simplify(raw);
  if (ans.n !== raw.n || ans.d !== raw.d) {
    push(
      "Simplify",
      `Simplify ${plain(raw)} to ${plain(ans)}.`,
      latex(raw),
      latex(ans),
      "Simplify",
      undefined,
      true,
    );
  } else {
    teachingSteps[teachingSteps.length - 1].showAnswer = true;
  }
  return { steps, teachingSteps, answer: ans };
}

function opSymbol(op: FractionOp): string {
  switch (op) {
    case "add":
      return "+";
    case "subtract":
      return "−";
    case "multiply":
      return "×";
    case "divide":
      return "÷";
  }
}

function buildOfAmount(
  fraction: Fraction,
  amount: number,
): { steps: EquationStep[]; teachingSteps: TeachingStep[]; answerPlain: string } {
  const teachingSteps: TeachingStep[] = [];
  const steps: EquationStep[] = [];
  let stepNumber = 1;
  const push = (
    title: string,
    explanation: string,
    latexBefore: string,
    latexAfter: string,
    why?: string,
    showAnswer?: boolean,
  ) => {
    steps.push({
      stepNumber: stepNumber++,
      operationLabel: title,
      explanation,
      latexBefore,
      latexAfter,
      arrowDirection: "simplify",
      rule: title,
      why,
    });
    teachingSteps.push({
      title,
      explanation,
      why,
      narration: explanation,
      cellKeys: [],
      carryKeys: [],
      noteKeys: [],
      showAnswer,
    });
  };
  const part = amount / fraction.d;
  const result = part * fraction.n;
  push(
    "Fraction of an amount",
    `Find ${plain(fraction)} of ${amount}.`,
    `${latex(fraction)} \\text{ of } ${amount}`,
    `${latex(fraction)} \\times ${amount}`,
    "Of means multiply.",
  );
  push(
    "Divide by the denominator",
    `${amount} ÷ ${fraction.d} = ${part} (one equal part).`,
    `${amount} \\div ${fraction.d}`,
    String(part),
    "The denominator tells you how many equal shares.",
  );
  push(
    "Multiply by the numerator",
    `${part} × ${fraction.n} = ${result}.`,
    `${part} \\times ${fraction.n}`,
    String(result),
    "The numerator tells you how many of those shares.",
    true,
  );
  return { steps, teachingSteps, answerPlain: String(result) };
}

function buildToImproper(
  whole: number,
  frac: Fraction,
): { steps: EquationStep[]; teachingSteps: TeachingStep[]; answerPlain: string } {
  const teachingSteps: TeachingStep[] = [];
  const steps: EquationStep[] = [];
  let stepNumber = 1;
  const improper = { n: whole * frac.d + frac.n, d: frac.d };
  steps.push({
    stepNumber: stepNumber++,
    operationLabel: "Mixed → improper",
    explanation: `Multiply the whole by the denominator, then add the numerator: ${whole} × ${frac.d} + ${frac.n} = ${improper.n}.`,
    rule: "Mixed to improper",
    why: "You're counting all the equal-sized pieces.",
    latexBefore: `${whole}\\ ${latex(frac)}`,
    latexAfter: latex(improper),
    arrowDirection: "simplify",
  });
  teachingSteps.push({
    title: "Mixed → improper",
    explanation: `${whole} ${plain(frac)} = ${plain(improper)}.`,
    why: "Whole × denominator + numerator.",
    narration: `${whole} and ${plain(frac)} is ${plain(improper)}.`,
    cellKeys: [],
    carryKeys: [],
    noteKeys: [],
    showAnswer: true,
  });
  return { steps, teachingSteps, answerPlain: plain(improper) };
}

function buildToMixed(
  improper: Fraction,
): { steps: EquationStep[]; teachingSteps: TeachingStep[]; answerPlain: string } {
  const teachingSteps: TeachingStep[] = [];
  const steps: EquationStep[] = [];
  const whole = Math.floor(improper.n / improper.d);
  const rem = improper.n % improper.d;
  const mixedPlain = rem === 0 ? String(whole) : `${whole} ${rem}/${improper.d}`;
  steps.push({
    stepNumber: 1,
    operationLabel: "Improper → mixed",
    explanation: `Divide ${improper.n} ÷ ${improper.d} = ${whole} remainder ${rem}.`,
    rule: "Improper to mixed",
    why: "The quotient is wholes; the remainder stays as a fraction.",
    latexBefore: latex(improper),
    latexAfter:
      rem === 0
        ? String(whole)
        : `${whole}\\ \\frac{${rem}}{${improper.d}}`,
    arrowDirection: "simplify",
  });
  teachingSteps.push({
    title: "Improper → mixed",
    explanation: `${plain(improper)} = ${mixedPlain}.`,
    why: "Divide numerator by denominator.",
    narration: `${plain(improper)} as a mixed number is ${mixedPlain}.`,
    cellKeys: [],
    carryKeys: [],
    noteKeys: [],
    showAnswer: true,
  });
  return { steps, teachingSteps, answerPlain: mixedPlain };
}

/**
 * Add/subtract mixed numbers via improper fractions. The conversion step is
 * the whole point: LLMs notoriously concatenate the whole number with the
 * numerator (2 1/2 → "21/2"), so this builder teaches whole × denominator +
 * numerator explicitly and computes every line deterministically.
 */
function buildMixedBinary(problem: {
  left: MixedOperand;
  right: MixedOperand;
  op: "add" | "subtract";
}): {
  steps: EquationStep[];
  teachingSteps: TeachingStep[];
  answerPlain: string;
  extraBlocks: VisualBlock[];
} {
  const { left, right, op } = problem;
  const leftImp = mixedToImproper(left);
  const rightImp = mixedToImproper(right);
  if (op === "subtract" && leftImp.n / leftImp.d < rightImp.n / rightImp.d) {
    throw new Error("mixed-number subtraction would go negative");
  }

  const steps: EquationStep[] = [];
  const teachingSteps: TeachingStep[] = [];
  const push = (
    title: string,
    explanation: string,
    latexBefore: string,
    latexAfter: string,
    operationLabel: string,
    why?: string,
    showAnswer?: boolean,
  ) => {
    steps.push({
      stepNumber: steps.length + 1,
      operationLabel,
      explanation,
      latexBefore,
      latexAfter,
      arrowDirection: "down",
      rule: title,
    });
    teachingSteps.push({
      title,
      explanation,
      why,
      narration: explanation,
      cellKeys: [],
      carryKeys: [],
      noteKeys: [],
      showAnswer,
    });
  };

  const start = `${mixedLatex(left)} ${opSymbol(op)} ${mixedLatex(right)}`;
  push(
    "Write the calculation",
    `Start with ${mixedPlain(left)} ${opSymbol(op)} ${mixedPlain(right)}.`,
    start,
    start,
    "Set up",
    "We keep both numbers visible so each step is clear.",
  );

  const whyExample = left.whole > 0 ? left : right;
  const whyImp = left.whole > 0 ? leftImp : rightImp;
  push(
    "Convert to improper fractions",
    `${mixedPlain(left)} = ${plain(leftImp)} and ${mixedPlain(right)} = ${plain(rightImp)}. Multiply the whole number by the denominator, then add the numerator.`,
    start,
    `${latex(leftImp)} ${opSymbol(op)} ${latex(rightImp)}`,
    "Mixed → improper",
    `For ${mixedPlain(whyExample)}: ${whyExample.whole} × ${whyExample.frac.d} + ${whyExample.frac.n} = ${whyImp.n}, so it is ${plain(whyImp)}. The whole number hides extra parts inside it.`,
  );

  // The core working reuses the battle-tested binary builder (common
  // denominator, numerators, simplify) — minus its duplicate set-up line.
  const inner = buildSteps({ left: leftImp, right: rightImp, op });
  steps.push(...inner.steps.slice(1));
  teachingSteps.push(...inner.teachingSteps.slice(1));
  steps.forEach((s, i) => {
    s.stepNumber = i + 1;
  });

  // Inner steps mark their own showAnswer — the true reveal is the mixed
  // number (or the final fraction), decided below.
  for (const s of teachingSteps) s.showAnswer = undefined;

  const ans = inner.answer;
  let answerPlain: string;
  if (ans.d !== 1 && ans.n > ans.d) {
    const whole = Math.floor(ans.n / ans.d);
    const rem = ans.n % ans.d;
    answerPlain = `${whole} ${rem}/${ans.d}`;
    push(
      "Write as a mixed number",
      `${plain(ans)} = ${answerPlain}. ${ans.n} ÷ ${ans.d} is ${whole} remainder ${rem}.`,
      latex(ans),
      `${whole}${latex({ n: rem, d: ans.d })}`,
      "Improper → mixed",
      "An improper fraction is whole numbers plus the leftover part.",
      true,
    );
  } else {
    answerPlain = plain(ans);
    teachingSteps[teachingSteps.length - 1].showAnswer = true;
  }

  const extraBlocks: VisualBlock[] = [];
  if (left.whole > 0 || right.whole > 0) {
    extraBlocks.push({
      type: "table",
      caption: "Rename as improper fractions",
      headers: ["Mixed number", "Improper fraction"],
      rows: [
        [mixedLatex(left), latex(leftImp)],
        [mixedLatex(right), latex(rightImp)],
      ],
      mathColumns: [0, 1],
      highlightCells: [
        [0, 1],
        [1, 1],
      ],
    });
  }

  return { steps, teachingSteps, answerPlain, extraBlocks };
}

export function buildFractionOps(problem: FractionOpProblem): MethodBuildResult {
  if (problem.kind === "mixed_binary") {
    const { steps, teachingSteps, answerPlain, extraBlocks } =
      buildMixedBinary(problem);
    // The final math step already reveals the answer — a separate Answer
    // card would push worked examples past the 6 micro-step cap.
    if (teachingSteps.length <= 5) {
      teachingSteps.push({
        title: "Answer",
        explanation: `So ${mixedPlain(problem.left)} ${opSymbol(problem.op)} ${mixedPlain(problem.right)} = ${answerPlain}.`,
        narration: `The answer is ${answerPlain}.`,
        cellKeys: [],
        carryKeys: [],
        noteKeys: [],
        showAnswer: true,
      });
    }
    return {
      builderId: "fraction_ops",
      block: { type: "equation_steps", steps },
      extraBlocks,
      teachingSteps,
      captions: teachingSteps
        .filter((s) => s.title !== "Answer")
        .map((s) => s.explanation),
      answer: answerPlain,
    };
  }

  if (problem.kind === "of_amount") {
    const { steps, teachingSteps, answerPlain } = buildOfAmount(
      problem.fraction,
      problem.amount,
    );
    teachingSteps.push({
      title: "Answer",
      explanation: `So ${plain(problem.fraction)} of ${problem.amount} = ${answerPlain}.`,
      narration: `The answer is ${answerPlain}.`,
      cellKeys: [],
      carryKeys: [],
      noteKeys: [],
      showAnswer: true,
    });
    return {
      builderId: "fraction_ops",
      block: { type: "equation_steps", steps },
      teachingSteps,
      captions: teachingSteps
        .filter((s) => s.title !== "Answer")
        .map((s) => s.explanation),
      answer: answerPlain,
    };
  }

  if (problem.kind === "to_improper") {
    const { steps, teachingSteps, answerPlain } = buildToImproper(
      problem.whole,
      problem.frac,
    );
    return {
      builderId: "fraction_ops",
      block: { type: "equation_steps", steps },
      teachingSteps,
      captions: teachingSteps.map((s) => s.explanation),
      answer: answerPlain,
    };
  }

  if (problem.kind === "to_mixed") {
    const { steps, teachingSteps, answerPlain } = buildToMixed(problem.improper);
    return {
      builderId: "fraction_ops",
      block: { type: "equation_steps", steps },
      teachingSteps,
      captions: teachingSteps.map((s) => s.explanation),
      answer: answerPlain,
    };
  }

  if (
    !Number.isInteger(problem.left.n) ||
    !Number.isInteger(problem.left.d) ||
    !Number.isInteger(problem.right.n) ||
    !Number.isInteger(problem.right.d) ||
    problem.left.d <= 0 ||
    problem.right.d <= 0
  ) {
    throw new Error("fraction ops require integer numerators and positive denominators");
  }
  if (problem.op === "divide" && problem.right.n === 0) {
    throw new Error("cannot divide by zero");
  }

  const { steps, teachingSteps, answer } = buildSteps(problem);
  const answerPlain = plain(answer);
  teachingSteps.push({
    title: "Answer",
    explanation: `So ${plain(problem.left)} ${opSymbol(problem.op)} ${plain(problem.right)} = ${answerPlain}.`,
    narration: `The answer is ${answerPlain}.`,
    cellKeys: [],
    carryKeys: [],
    noteKeys: [],
    showAnswer: true,
  });

  const block: EquationStepBlock = {
    type: "equation_steps",
    steps,
  };

  return {
    builderId: "fraction_ops",
    block,
    teachingSteps,
    captions: teachingSteps
      .filter((s) => s.title !== "Answer")
      .map((s) => s.explanation),
    answer: answerPlain,
  };
}

const FRAC = String.raw`(\d+)\s*\/\s*(\d+)`;
const OP = String.raw`([+\-−×x*÷/]|plus|minus|times|divided\s+by)`;
const MIXED = String.raw`(\d+)\s+(\d+)\s*\/\s*(\d+)`;

export function parseFractionOp(text: string): FractionOpProblem | null {
  const t = normalizeMathText(text);

  // Find ⅓ of 24 / what is 2/5 of 30
  const ofAmt = t.match(
    new RegExp(
      `(?:find\\s+|what\\s+is\\s+)?${FRAC}\\s+of\\s+(\\d+)|(\\d+)\\s*[×x*]\\s*${FRAC}`,
      "i",
    ),
  );
  if (ofAmt && /\bof\b/i.test(t)) {
    const n = parseInt(ofAmt[1] || ofAmt[4], 10);
    const d = parseInt(ofAmt[2] || ofAmt[5], 10);
    const amount = parseInt(ofAmt[3] || ofAmt[6] || "", 10);
    // Prefer explicit "of" form
    const ofForm = t.match(new RegExp(`${FRAC}\\s+of\\s+(\\d+)`, "i"));
    if (ofForm) {
      return {
        kind: "of_amount",
        fraction: { n: parseInt(ofForm[1], 10), d: parseInt(ofForm[2], 10) },
        amount: parseInt(ofForm[3], 10),
      };
    }
    if (Number.isFinite(n) && Number.isFinite(d) && Number.isFinite(amount)) {
      return { kind: "of_amount", fraction: { n, d }, amount };
    }
  }
  const ofForm2 = t.match(new RegExp(`${FRAC}\\s+of\\s+(\\d+)`, "i"));
  if (ofForm2) {
    return {
      kind: "of_amount",
      fraction: { n: parseInt(ofForm2[1], 10), d: parseInt(ofForm2[2], 10) },
      amount: parseInt(ofForm2[3], 10),
    };
  }

  // Mixed → improper
  if (/\b(improper|mixed\s*(?:number|fraction)?\s*(?:to|as|into)\s*improper|convert.*mixed)\b/i.test(t) ||
      /\bmixed\b.*\bimproper\b/i.test(t)) {
    const mixed = t.match(new RegExp(MIXED));
    if (mixed) {
      return {
        kind: "to_improper",
        whole: parseInt(mixed[1], 10),
        frac: { n: parseInt(mixed[2], 10), d: parseInt(mixed[3], 10) },
      };
    }
  }

  // Improper → mixed
  if (/\b(mixed\s+number|as a mixed|to a mixed|improper.*mixed)\b/i.test(t)) {
    const frac = t.match(new RegExp(FRAC));
    if (frac) {
      const n = parseInt(frac[1], 10);
      const d = parseInt(frac[2], 10);
      if (n >= d) {
        return { kind: "to_mixed", improper: { n, d } };
      }
    }
  }

  // Bare mixed number with convert/write as improper
  const bareMixed = t.match(
    new RegExp(`(?:convert|write|change)\\s+${MIXED}`, "i"),
  );
  if (bareMixed) {
    return {
      kind: "to_improper",
      whole: parseInt(bareMixed[1], 10),
      frac: { n: parseInt(bareMixed[2], 10), d: parseInt(bareMixed[3], 10) },
    };
  }

  // Mixed numbers: 2 1/2 + 1 3/4 (or one mixed + one plain fraction).
  // Must run before the plain-fraction branches so the whole-number part is
  // never mistaken for a numerator. Mixed ×/÷ is not KS2 — return null so no
  // other branch mis-reads the whole numbers either.
  const mm = t.match(new RegExp(`${MIXED}\\s*${OP}\\s*${MIXED}`, "i"));
  if (mm) {
    const op = mapOp(mm[4]);
    if (op !== "add" && op !== "subtract") return null;
    return {
      kind: "mixed_binary",
      left: {
        whole: parseInt(mm[1], 10),
        frac: { n: parseInt(mm[2], 10), d: parseInt(mm[3], 10) },
      },
      right: {
        whole: parseInt(mm[5], 10),
        frac: { n: parseInt(mm[6], 10), d: parseInt(mm[7], 10) },
      },
      op,
    };
  }
  const mf = t.match(new RegExp(`${MIXED}\\s*${OP}\\s*${FRAC}`, "i"));
  if (mf) {
    const op = mapOp(mf[4]);
    if (op !== "add" && op !== "subtract") return null;
    return {
      kind: "mixed_binary",
      left: {
        whole: parseInt(mf[1], 10),
        frac: { n: parseInt(mf[2], 10), d: parseInt(mf[3], 10) },
      },
      right: {
        whole: 0,
        frac: { n: parseInt(mf[5], 10), d: parseInt(mf[6], 10) },
      },
      op,
    };
  }
  const fm = t.match(new RegExp(`${FRAC}\\s*${OP}\\s*${MIXED}`, "i"));
  if (fm) {
    const op = mapOp(fm[3]);
    if (op !== "add" && op !== "subtract") return null;
    return {
      kind: "mixed_binary",
      left: {
        whole: 0,
        frac: { n: parseInt(fm[1], 10), d: parseInt(fm[2], 10) },
      },
      right: {
        whole: parseInt(fm[4], 10),
        frac: { n: parseInt(fm[5], 10), d: parseInt(fm[6], 10) },
      },
      op,
    };
  }

  // a/b op c/d
  const m2 = t.match(
    new RegExp(`${FRAC}\\s*${OP}\\s*${FRAC}`, "i"),
  );
  if (m2) {
    const op = mapOp(m2[3]);
    if (!op) return null;
    return {
      left: { n: parseInt(m2[1], 10), d: parseInt(m2[2], 10) },
      right: { n: parseInt(m2[4], 10), d: parseInt(m2[5], 10) },
      op,
    };
  }
  // a/b op integer  OR  integer op a/b (multiply/divide)
  const mIntR = t.match(
    new RegExp(`${FRAC}\\s*${OP}\\s*(\\d+)(?!\\s*\\/)`, "i"),
  );
  if (mIntR) {
    const op = mapOp(mIntR[3]);
    if (!op) return null;
    return {
      left: { n: parseInt(mIntR[1], 10), d: parseInt(mIntR[2], 10) },
      right: { n: parseInt(mIntR[4], 10), d: 1 },
      op,
    };
  }
  const mIntL = t.match(
    new RegExp(`(\\d+)(?!\\s*\\/)\\s*${OP}\\s*${FRAC}`, "i"),
  );
  if (mIntL) {
    const op = mapOp(mIntL[2]);
    if (!op || (op !== "multiply" && op !== "divide")) return null;
    return {
      left: { n: parseInt(mIntL[1], 10), d: 1 },
      right: { n: parseInt(mIntL[3], 10), d: parseInt(mIntL[4], 10) },
      op,
    };
  }
  return null;
}

function mapOp(raw: string): FractionOp | null {
  const s = raw.toLowerCase().trim();
  if (s === "+" || s === "plus") return "add";
  if (s === "-" || s === "−" || s === "minus") return "subtract";
  if (s === "×" || s === "x" || s === "*" || s === "times") return "multiply";
  if (s === "÷" || s === "/" || s === "divided by") return "divide";
  return null;
}
