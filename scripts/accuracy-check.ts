/**
 * Ask the running app a paper of questions whose answers are known, and mark it.
 *
 * The paper comes from lib/accuracy/bank.ts: about 95 kinds of GCSE question,
 * each with fresh numbers and an answer computed by code. The marking is
 * lib/accuracy/grade.ts, which reads the line the pupil is shown as the answer.
 * No model marks anything.
 *
 * What it reports:
 *   - how many answers were right, by topic;
 *   - every wrong answer, with what the app said and what it should have said;
 *   - the number that matters most: answers that were WRONG and that the app
 *     showed with a "checked" badge. A wrong answer with a warning on it is a
 *     fault. A wrong answer with a green tick is a pupil being taught wrong.
 *
 * Usage (the app must be running):
 *   npx tsx scripts/accuracy-check.ts                      one paper, a new seed
 *   npx tsx scripts/accuracy-check.ts --seed 7             the same paper again
 *   npx tsx scripts/accuracy-check.ts --per 3              three of each kind
 *   npx tsx scripts/accuracy-check.ts --only ratio,surd    some topics only
 *   npx tsx scripts/accuracy-check.ts --url https://www.mathrix.co.uk
 *   npx tsx scripts/accuracy-check.ts --min 95             exit 1 below 95%
 *
 * Each question is one real answer from the app, so a full paper costs what
 * about 95 pupil questions cost. A new seed is never served from saved answers.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { buildPaper, type BankQuestion } from "@/lib/accuracy/bank";
import { markBoard, type BoardLike } from "@/lib/accuracy/grade";

const args = process.argv.slice(2);
const option = (name: string) => {
  const at = args.indexOf(`--${name}`);
  return at >= 0 ? args[at + 1] : undefined;
};

const url = (option("url") ?? process.env.ACCURACY_URL ?? "http://localhost:3000").replace(/\/$/, "");
const seed = Number(option("seed") ?? Math.floor(Date.now() / 1000) % 100000);
const per = Number(option("per") ?? 1);
const only = option("only")?.split(",").map((s) => s.trim()).filter(Boolean);
const atOnce = Number(option("at-once") ?? 4);
const minimum = option("min") ? Number(option("min")) : null;
const outDir = option("out") ?? path.join("accuracy-reports", `seed-${seed}`);

interface Result {
  id: string;
  topic: string;
  question: string;
  verdict: "right" | "wrong" | "no answer";
  where: string;
  said: string;
  read: string;
  confidence: string;
  seconds: number;
}

async function ask(q: BankQuestion, n: number): Promise<Result> {
  const started = Date.now();
  const base = { id: q.id, topic: q.topic, question: q.question };
  try {
    const res = await fetch(`${url}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Signed-out visitors get a few questions a day per address. A paper is
        // one visitor asking many, so each question says it is a different one.
        "X-Forwarded-For": `10.${50 + (n % 150)}.${Math.floor(Date.now() / 1000) % 250}.${(n % 250) + 1}`,
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: q.question }],
        level: "GCSE",
        examBoard: "AQA",
        tier: "higher",
        subject: "Maths",
      }),
    });
    const raw = await res.text();
    let board: BoardLike | undefined;
    let confidence = "-";
    let failure = "";
    for (const chunk of raw.split("\n\n")) {
      const data = chunk.match(/^data: (.+)$/m)?.[1];
      if (!data) continue;
      try {
        const parsed = JSON.parse(data) as { whiteboard?: BoardLike; verification?: { confidence?: string }; error?: string };
        if (parsed.whiteboard) board = parsed.whiteboard;
        if (parsed.verification?.confidence) confidence = parsed.verification.confidence;
        if (parsed.error) failure = parsed.error;
      } catch {
        /* a partial line */
      }
    }
    const seconds = Math.round((Date.now() - started) / 1000);
    if (!board) {
      return { ...base, verdict: "no answer", where: "", said: failure || `HTTP ${res.status}`, read: "", confidence, seconds };
    }
    writeFileSync(path.join(outDir, `${q.id.replace(/[^a-z0-9.-]+/gi, "_")}.json`), JSON.stringify({ ...q, expected: describe(q), board }, null, 1));
    const mark = markBoard(q.expected, q.question, board);
    return {
      ...base,
      verdict: mark.right ? "right" : "wrong",
      where: mark.where,
      said: String(board.conclusion ?? "").replace(/\s+/g, " ").slice(0, 110),
      read: mark.found,
      confidence,
      seconds,
    };
  } catch (error) {
    return { ...base, verdict: "no answer", where: "", said: String((error as Error).message), read: "", confidence: "-", seconds: Math.round((Date.now() - started) / 1000) };
  }
}

/** The expected answer in words, for the report. */
function describe(q: BankQuestion): string {
  const e = q.expected;
  const n = (v: number) => String(+v.toFixed(4));
  switch (e.kind) {
    case "number":
      return `${n(e.value)}${e.form ? " (in the form asked for)" : ""}`;
    case "numbers":
      return e.values.map(n).join(" and ");
    case "assign":
      return Object.entries(e.values).map(([k, v]) => `${k} = ${([] as number[]).concat(v).map(n).join(" or ")}`).join(", ");
    case "expression":
      return `${e.expr}${e.form ? " (in the form asked for)" : ""}`;
    case "ratio":
      return e.parts.join(" : ");
    case "inequality":
      return `${e.variable} ${e.op} ${e.value}`;
    case "primeFactors":
      return `${e.n} as a product of primes`;
    case "text":
      return e.patterns.map(String).join(" and ");
  }
}

const paper = buildPaper(seed, per, only);
if (paper.length === 0) {
  console.error("No questions match --only.");
  process.exit(2);
}
mkdirSync(outDir, { recursive: true });
console.log(`Paper: seed ${seed}, ${paper.length} questions, asked at ${url}\n`);

const results: Result[] = new Array(paper.length);
let next = 0;
await Promise.all(
  Array.from({ length: Math.max(1, atOnce) }, async () => {
    while (next < paper.length) {
      const n = next++;
      results[n] = await ask(paper[n], n);
      const r = results[n];
      console.log(`${r.verdict === "right" ? "right    " : r.verdict === "wrong" ? "WRONG    " : "NO ANSWER"} ${r.id.padEnd(34)} ${String(r.seconds).padStart(3)}s ${r.confidence.padEnd(6)} ${r.where === "working" ? "[only in the working] " : ""}${r.said}`);
    }
  }),
);

const right = results.filter((r) => r.verdict === "right");
const wrong = results.filter((r) => r.verdict === "wrong");
const none = results.filter((r) => r.verdict === "no answer");
const percent = (a: number, b: number) => (b === 0 ? "-" : `${Math.round((a / b) * 100)}%`);

console.log("\n── By topic ─────────────────────────────────────────────");
const topics = [...new Set(results.map((r) => r.topic))].sort();
for (const topic of topics) {
  const all = results.filter((r) => r.topic === topic);
  const ok = all.filter((r) => r.verdict === "right").length;
  if (ok < all.length) console.log(`${topic.padEnd(34)} ${ok}/${all.length}`);
}
console.log(`(every other topic: all right)`);

if (wrong.length > 0) {
  console.log("\n── Wrong answers ────────────────────────────────────────");
  for (const r of wrong) {
    const q = paper.find((p) => p.id === r.id)!;
    console.log(`\n${r.id}  [the app's own check: ${r.confidence}]`);
    console.log(`  asked    : ${r.question}`);
    console.log(`  should be: ${describe(q)}`);
    console.log(`  app said : ${r.said}`);
    console.log(`  read as  : ${r.read}`);
  }
}
if (none.length > 0) {
  console.log("\n── No answer ────────────────────────────────────────────");
  for (const r of none) console.log(`${r.id}: ${r.said}`);
}

const onlyInWorking = right.filter((r) => r.where === "working");
console.log("\n── Summary ──────────────────────────────────────────────");
console.log(`Right: ${right.length}/${results.length} (${percent(right.length, results.length)})   wrong: ${wrong.length}   no answer: ${none.length}`);
if (onlyInWorking.length > 0) {
  console.log(`Right, but the answer line did not state it (found in the working): ${onlyInWorking.length}`);
}
console.log("\nHow the app's own check rated its answers:");
for (const level of ["high", "medium", "low", "-"]) {
  const all = results.filter((r) => r.confidence === level && r.verdict !== "no answer");
  if (all.length === 0) continue;
  const bad = all.filter((r) => r.verdict === "wrong").length;
  console.log(`  ${level.padEnd(6)} ${String(all.length).padStart(3)} answers, ${bad} wrong`);
}
const dangerous = wrong.filter((r) => r.confidence === "high");
console.log(
  dangerous.length > 0
    ? `\nWRONG AND SHOWN AS CHECKED: ${dangerous.length}. These are the ones a pupil would trust: ${dangerous.map((r) => r.id).join(", ")}`
    : "\nNo wrong answer was shown as checked.",
);

writeFileSync(path.join(outDir, "_report.json"), JSON.stringify({ seed, url, per, asked: results.length, right: right.length, wrong: wrong.length, noAnswer: none.length, results }, null, 1));
console.log(`\nSaved to ${outDir}. Run it again with --seed ${seed} to ask the same paper.`);

if (minimum !== null && (right.length / results.length) * 100 < minimum) process.exit(1);
