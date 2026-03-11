import Anthropic from "@anthropic-ai/sdk";
import { writeFileSync } from "fs";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM = `You are a maths teacher and motion designer. Create animated diagram assets for an educational app.
I need an SVG per step that uses curved arrows to show terms moving across the equals sign.

Goal
Students must visually follow exactly what moves and what it becomes.

Output requirements

Output JSON only — no markdown, no code fences, no explanation.

JSON must include:
a. steps: array
b. Each step has:
   svg: string containing a valid standalone SVG (viewBox set)
   narration: 1 short sentence
   highlightIds: array of SVG element ids to highlight
   animate: array of animation instructions

In each SVG:
  Every term must be its own <text> with a stable id
  The equals sign must have id="eq"
  Curved arrow must be a <path> with id="arrow_move"
  Arrow label must be <text> with id="arrow_label"

Use curved arrows only (quadratic or cubic Bezier paths).
Show the term in red before moving. Show the transformed term in blue after moving.
Keep expressions aligned across steps. Same x positions for same-side terms where possible.

Provide 4–8 steps, depending on complexity.
Finish with a substitution check step (no arrows, but highlight the check).

Animation instruction schema
Each animate item must be an object:
  targetId: string
  type: "moveAlongPath" | "fadeIn" | "fadeOut" | "pulse" | "colorTo"
  params: object
  startMs: integer
  durationMs: integer

Rules to visualise
  Moving +a across = becomes −a
  Moving −a across = becomes +a
  Moving ×a across = becomes ÷a
  Moving ÷a across = becomes ×a
  If you instead apply an operation to both sides (eg divide both sides by 3), show two short curved arrows pointing to both sides labels.

Design constraints
  Large font, kid-friendly, high contrast
  viewBox 0 0 1080 1920 (vertical)
  Font: system sans
  No external assets
  Keep each SVG under 25KB`;

const USER = `Solve this equation step by step with full SVG diagrams:

3x + 7 = 19

Produce the full JSON now. Output raw JSON only — no markdown fences.`;

console.log("Calling Claude API…");

const message = await client.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 16000,
  system: SYSTEM,
  messages: [{ role: "user", content: USER }],
});

const raw = message.content[0].type === "text" ? message.content[0].text : "";

// Strip any accidental markdown fences
const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();

// Validate it's parseable
let parsed;
try {
  parsed = JSON.parse(cleaned);
  console.log(`✓ Got ${parsed.steps?.length ?? 0} steps`);
} catch (e) {
  console.error("Parse error — writing raw output for inspection");
  writeFileSync("scripts/raw-output.txt", raw);
  process.exit(1);
}

writeFileSync(
  "public/svg-steps-3x7.json",
  JSON.stringify(parsed, null, 2),
  "utf8"
);

console.log("✓ Written to public/svg-steps-3x7.json");
