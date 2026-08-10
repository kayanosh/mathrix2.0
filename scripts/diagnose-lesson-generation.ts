/**
 * Diagnose why a lesson shows "I need to rebuild this lesson before teaching it".
 *
 * Runs the REAL prompt, the REAL validators and the route's single retry, then
 * reports which gate rejected the lesson — the generic failure card tells the
 * pupil (and the developer) nothing about which of validateResponse,
 * validateLessonContract or validateGcseLessonQuality actually failed.
 *
 * Falls back to gpt-4o exactly as app/api/chat/route.ts does when
 * ANTHROPIC_API_KEY is absent, so the generator may differ from production —
 * the VALIDATOR behaviour it reports does not.
 *
 * Usage: npx tsx scripts/diagnose-lesson-generation.ts "<topic>" [GCSE|A-Level]
 */
import { buildLessonPrompt } from "@/lib/prompts/teacher";
import { getTeacherRequiredVisuals } from "@/lib/prompts/teacher";
import { validateResponse } from "@/lib/validate";
import { validateLessonContract } from "@/lib/lesson-contract";
import { validateGcseLessonQuality, normalizeLessonForDisplay } from "@/lib/gcse-lesson-quality";

import { claudeSolve, convertToAnthropicMessages } from "@/lib/claude-solver";

const topic = process.argv[2] || "circle theorm";
const level = process.argv[3] || "GCSE";

async function main() {
const visuals = getTeacherRequiredVisuals(topic);
console.log(`topic=${JSON.stringify(topic)} level=${level}`);
console.log(`prompt requires blocks: [${visuals.blocks.join(", ") || "none"}]`);

const sys = buildLessonPrompt(topic, level, undefined as any, visuals);
const userMsg = `Teach me a full lesson on: "${topic}". Follow the lesson contract exactly.`;
// Mirrors runLesson() in app/api/chat/route.ts, including its OpenAI fallback.
let raw = "";
try {
  const r = await claudeSolve(sys, convertToAnthropicMessages([{ role: "user", content: userMsg }]), {
    thinkingBudget: 2048,
    maxTokens: 10000,
  });
  raw = r.content;
  console.log("(generator: claude)");
} catch {
  const OpenAI = (await import("openai")).default;
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const fb = await client.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 8192,
    response_format: { type: "json_object" },
    messages: [{ role: "system", content: sys }, { role: "user", content: userMsg }],
  });
  raw = fb.choices[0]?.message?.content || "";
  console.log("(generator: gpt-4o fallback — no ANTHROPIC_API_KEY locally)");
}
const r = { content: raw };

const res = validateResponse(r.content, visuals.blocks, { requireAlgebraArrows: false });
const data = res.data ? normalizeLessonForDisplay(res.data) : null;
const contract = validateLessonContract(data ?? { intro: "", blocks: [], conclusion: "" } as any);
const quality = validateGcseLessonQuality(data ?? { intro: "", blocks: [], conclusion: "" } as any, topic);

console.log(`\nblocks emitted: ${(data?.blocks ?? []).map((b: any) => b.type).join(", ")}`);
console.log(`\nvalidateResponse.ok = ${res.ok}`);
(res.errors ?? []).forEach((e) => console.log(`   ERR ${e}`));
console.log(`contract.ok = ${contract.ok}  missing=[${contract.missing.join(", ")}]`);
contract.errors.forEach((e) => console.log(`   ERR ${e}`));
console.log(`quality.ok = ${quality.ok}`);
quality.errors.forEach((e) => console.log(`   ERR ${e}`));
// Mirror the route's single retry, so this reports what a pupil ACTUALLY sees.
let finalOk = res.ok && !!data && contract.teachable && quality.ok;
let finalContract = contract, finalQuality = quality, finalRes = res, finalData = data;
if (!(res.ok && data && contract.ok && quality.ok)) {
  const issues = [...(res.errors || []), ...contract.errors, ...quality.errors];
  const { buildLessonRetryMessage } = await import("@/lib/lesson-contract");
  const retryMsg = `${buildLessonRetryMessage(contract.missing)}${
    issues.length ? `\n\nFix every validation problem below:\n${issues.map((i) => `• ${i}`).join("\n")}` : ""
  }\n\nReturn the full corrected lesson as JSON only.`;
  console.log("\n--- retrying (as the route does) ---");
  const OpenAI = (await import("openai")).default;
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const fb = await client.chat.completions.create({
    model: "gpt-4o", max_tokens: 8192, response_format: { type: "json_object" },
    messages: [
      { role: "system", content: sys },
      { role: "user", content: userMsg },
      { role: "assistant", content: raw },
      { role: "user", content: retryMsg },
    ],
  });
  const r2 = validateResponse(fb.choices[0]?.message?.content || "", visuals.blocks, { requireAlgebraArrows: false });
  const d2 = r2.data ? normalizeLessonForDisplay(r2.data) : null;
  if (d2) {
    const c2 = validateLessonContract(d2), q2 = validateGcseLessonQuality(d2, topic);
    console.log(`retry: validateResponse.ok=${r2.ok} contract.teachable=${c2.teachable} (missing=[${c2.missing.join(", ")}] core=[${c2.missingCore.join(", ")}]) quality.ok=${q2.ok}`);
    q2.errors.forEach((e) => console.log(`   ERR ${e}`));
    if (r2.ok && c2.teachable && q2.ok) { finalOk = true; finalContract = c2; finalQuality = q2; finalRes = r2; finalData = d2; }
  } else {
    console.log(`retry: could not parse — ${(r2.errors || []).join(" | ")}`);
  }
}
console.log(`\n=> PUPIL SEES: ${finalOk ? "THE LESSON" : "THE FAILURE CARD"}`);
if (finalOk && finalContract.missing.length) {
  console.log(`   (served with supporting sections missing: ${finalContract.missing.join(", ")} — reported as a warning, not a blank screen)`);
}
}
main().catch((e) => { console.error(e); process.exit(1); });
