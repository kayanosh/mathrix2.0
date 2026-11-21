/**
 * End-to-end check of the SymPy path: question → strict reader → HTTP call to
 * the Python solver → normalised answer → merged with Nerdamer → compared with
 * a board.
 *
 *   SYMPY_INTERNAL_SECRET=… NEXT_PUBLIC_APP_URL=https://your-site npx tsx scripts/check-sympy-end-to-end.ts
 *
 * Run it after setting SYMPY_INTERNAL_SECRET in Vercel to confirm the solver is
 * reachable and answering. It only reads; it changes nothing. Exits non-zero if
 * any row is wrong.
 */
import { inferSympyTask, sympySolve } from "@/lib/sympy-solver";
import { casSolve } from "@/lib/cas-solver";
import { buildGroundTruth } from "@/lib/ground-truth";

const CASES: Array<{ question: string; expect: string[] | null; source?: string }> = [
  { question: "Solve 3x + 5 = 20", expect: ["x = 5"], source: "both" },
  { question: "Solve x² − 5x − 6 = 0", expect: ["x = -1", "x = 6"], source: "both" },
  { question: "Calculate 3 + 4 × 2", expect: ["11"], source: "both" },
  { question: "What is 25% of 80?", expect: ["20"], source: "both" },
  { question: "What is 2 1/4 × 3?", expect: ["27/4"], source: "both" },
  { question: "Expand (x + 2)(x - 3)", expect: ["-6-x+x^2"], source: "both" },
  { question: "Factorise 2x^2 + 7x + 3", expect: ["(x + 3)*(2*x + 1)"], source: "sympy" },
  { question: "Factorise x^2 + 6x + 9", expect: ["(x + 3)^2"], source: "sympy" },
  { question: "Solve the simultaneous equations 2x + y = 7 and x - y = 2", expect: ["x = 3", "y = 1"], source: "both" },
  { question: "Find the area of a rectangle with length 5 cm and width 3 cm.", expect: ["15"], source: "sympy" },
  { question: "Find the area of a circle with radius 7 cm", expect: ["≈153.938040025900"], source: "sympy" },
  { question: "Solve x^2 + 1 = 0", expect: null },
  { question: "Calculate the area of a circle with diameter 10", expect: null },
  { question: "What is the value of x if 2x = 10?", expect: null },
];

async function main() {
  if (!process.env.SYMPY_INTERNAL_SECRET) {
    console.error("SYMPY_INTERNAL_SECRET is not set — the solver would refuse every call.");
    process.exit(2);
  }
  let failures = 0;
  for (const { question, expect, source } of CASES) {
    const task = inferSympyTask(question);
    const sympy = task
      ? await sympySolve(task.expression, task.type, task.variable, task.expressions)
      : null;
    const truth = buildGroundTruth(sympy, casSolve(question));
    const got = truth.verified ? [...truth.answers].sort() : null;
    const want = expect ? [...expect].sort() : null;
    const ok =
      JSON.stringify(got) === JSON.stringify(want) && (!source || !want || truth.source === source);
    if (!ok) failures += 1;
    console.log(
      `${ok ? "ok  " : "FAIL"} ${question.slice(0, 58).padEnd(59)} ${String(truth.source).padEnd(9)} ` +
        `${got ? got.join(" | ") : "(no ground truth)"}` +
        (ok ? "" : `   expected ${want ? want.join(" | ") : "(none)"} from ${source ?? "-"}`),
    );
  }
  console.log(failures === 0 ? "\nAll rows correct." : `\n${failures} row(s) wrong.`);
  process.exit(failures === 0 ? 0 : 1);
}

void main();
