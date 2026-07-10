/**
 * Prompts for Teacher Mode:
 *   1. Topic explanation with a worked example (reuses WhiteboardResponse schema)
 *   2. Batch question generation (20 questions: 5 easy, 5 medium, 5 hard, 5 exam-style)
 */

import { SCHEMA, getTierPersona } from "./system";
import { buildLessonContractPromptBlock } from "@/lib/lesson-contract";

// ── Subtopic → Required visuals map ──────────────────────────────────────────

interface TeacherVisual {
  blocks: string[];
  hint: string;
}

const TEACHER_VISUAL_MAP: Record<string, TeacherVisual> = {
  // ── Geometry & Measures ──
  "angles":                    { blocks: ["labeled_shape"], hint: "Draw the angle configuration with all angles clearly labeled" },
  "polygons":                  { blocks: ["labeled_shape"], hint: "Draw the polygon with interior and exterior angles labeled" },
  "circle theorems":           { blocks: ["labeled_shape"], hint: "Draw the circle with inscribed angles, chords, tangents, and radii as needed" },
  "pythagoras' theorem":       { blocks: ["labeled_shape"], hint: "Draw a right-angled triangle with all three sides labeled (including the hypotenuse)" },
  "pythagoras theorem":        { blocks: ["labeled_shape"], hint: "Draw a right-angled triangle with all three sides labeled (including the hypotenuse)" },
  "trigonometry (soh cah toa)": { blocks: ["labeled_shape"], hint: "Draw the right-angled triangle with θ, opposite, adjacent, and hypotenuse labeled" },
  "trigonometry":              { blocks: ["labeled_shape"], hint: "Draw the right-angled triangle with θ, opposite, adjacent, and hypotenuse labeled" },
  "area and perimeter":        { blocks: ["labeled_shape"], hint: "Draw the shape with all dimensions clearly labeled" },
  "volume":                    { blocks: ["labeled_shape"], hint: "Draw the 3D shape with length, width, and height labeled" },
  "transformations":           { blocks: ["coordinate_graph"], hint: "Plot the original shape and its image on a coordinate grid, labeling vertices" },
  "bearings":                  { blocks: ["labeled_shape"], hint: "Draw the bearing diagram with a North line and the angle measured clockwise" },
  "loci and constructions":    { blocks: ["labeled_shape"], hint: "Draw the construction showing arcs, perpendicular bisectors, or angle bisectors as needed" },
  "vectors":                   { blocks: ["labeled_shape"], hint: "Draw the vector diagram with labeled vectors showing direction and magnitude" },
  "similarity and congruence": { blocks: ["labeled_shape"], hint: "Draw both shapes side by side with corresponding sides and angles labeled" },

  // ── Algebra (graph topics) ──
  "straight line graphs":      { blocks: ["coordinate_graph"], hint: "Plot the line on a coordinate grid, labeling gradient, y-intercept, and at least two points" },
  "quadratic and cubic graphs": { blocks: ["coordinate_graph"], hint: "Plot the curve showing the vertex/turning point, roots (x-intercepts), and y-intercept" },
  "simultaneous equations":    { blocks: ["coordinate_graph"], hint: "Plot both lines on the same grid and label the intersection point" },
  "functions":                 { blocks: ["coordinate_graph"], hint: "Plot the function on a coordinate grid, labeling key features (intercepts, asymptotes)" },
  "completing the square":     { blocks: ["coordinate_graph"], hint: "Plot the parabola and label the vertex found from the completed square form" },
  "inequalities":              { blocks: ["number_line"], hint: "Draw a number line with open/filled circles and shading to represent the inequality" },
  "sequences":                 { blocks: ["table"], hint: "Include a table showing position number (n) and the corresponding term value" },

  // ── Ratio, Proportion & Rates of Change ──
  "direct proportion":         { blocks: ["coordinate_graph"], hint: "Plot the proportional relationship y = kx as a straight line through the origin" },
  "inverse proportion":        { blocks: ["coordinate_graph"], hint: "Plot the curve y = k/x showing how y decreases as x increases" },
  "scale factors":             { blocks: ["labeled_shape"], hint: "Draw the original and enlarged/reduced shape with corresponding sides labeled" },

  // ── Probability ──
  "tree diagrams":             { blocks: ["probability_tree"], hint: "Draw the full probability tree with all branches labeled with events and probabilities" },
  "venn diagrams":             { blocks: ["venn_diagram"], hint: "Draw the Venn diagram with all regions filled in (A only, B only, A∩B, neither)" },
  "conditional probability":   { blocks: ["probability_tree"], hint: "Draw the probability tree for the conditional scenario with updated probabilities" },
  "probability scale":         { blocks: ["number_line"], hint: "Draw a 0 to 1 number line with events positioned at their probability values" },

  // ── Statistics ──
  "histograms":                { blocks: ["chart"], hint: "Draw a histogram with class intervals on x-axis and frequency density on y-axis" },
  "box plots":                 { blocks: ["chart"], hint: "Draw the box plot labeling minimum, Q1, median, Q3, and maximum" },
  "scatter graphs":            { blocks: ["coordinate_graph"], hint: "Plot the scatter graph with data points and a line of best fit" },
  "cumulative frequency":      { blocks: ["chart"], hint: "Draw the cumulative frequency curve (ogive) with upper class boundaries on x-axis" },
  "averages (mean, median, mode)": { blocks: ["table"], hint: "Include a frequency table for the worked example showing how to calculate the mean" },
  "averages":                  { blocks: ["table"], hint: "Include a frequency table for the worked example showing how to calculate the mean" },

  // ── Number ──
  "bounds":                    { blocks: ["number_line"], hint: "Draw a number line showing the upper and lower bounds and the error interval" },

  // ── Calculus ──
  "differentiation from first principles": { blocks: ["coordinate_graph"], hint: "Plot the curve with a secant line approaching the tangent, illustrating the limit" },
  "integration":               { blocks: ["coordinate_graph"], hint: "Plot the curve with the area underneath shaded to represent the definite integral" },
};

/**
 * Look up required visual blocks for a given subtopic.
 * Uses case-insensitive matching and tries progressively shorter prefixes.
 */
export function getTeacherRequiredVisuals(subtopic: string): TeacherVisual {
  const key = subtopic.toLowerCase().trim();

  // Exact match first
  if (TEACHER_VISUAL_MAP[key]) return TEACHER_VISUAL_MAP[key];

  // Partial match — check if any map key is contained in the subtopic or vice versa
  for (const [mapKey, visual] of Object.entries(TEACHER_VISUAL_MAP)) {
    if (key.includes(mapKey) || mapKey.includes(key)) return visual;
  }

  return { blocks: [], hint: "" };
}

/**
 * Builds a system prompt that instructs Claude to explain a topic and work
 * through one example question on the whiteboard.
 * The response must be a valid WhiteboardResponse JSON.
 */
export function buildTeacherExplanationPrompt(
  topic: string,
  subtopic: string,
  level: string = "GCSE",
  visuals?: TeacherVisual,
): string {
  const visualSection = visuals && visuals.blocks.length > 0
    ? `
MANDATORY VISUAL DIAGRAMS — YOU MUST INCLUDE THESE:
Your response MUST contain the following block type(s): ${visuals.blocks.map(b => `"${b}"`).join(", ")}
Specific instruction: ${visuals.hint}
Place the visual block(s) BEFORE the equation_steps for the worked example.
If you omit these visual blocks, your response will be REJECTED and you will have to redo it.
`
    : "";

  return `You are Mathrix — the world's best ${level} maths tutor for UK students.
You are in TEACHER MODE. A teacher has selected the topic "${topic} — ${subtopic}" and wants you to
explain it clearly to a classroom of students, then work through one example question step by step.

CRITICAL: You MUST always respond with valid JSON matching the WhiteboardResponse schema below. Never respond with plain text. No markdown fences.

PERSONALITY & VOICE:
• Refined, witty British AI butler — calm, composed, effortlessly intelligent
• Posh but approachable ("rather", "indeed", "shall we", "splendid", "precisely")
• Speak to 15-year-olds — clear, encouraging, no jargon without explanation
• Show EVERY intermediate step — never skip working

YOUR TASK (two parts in one response):
1. EXPLAIN THE TOPIC — Start with a clear, engaging introduction to "${subtopic}". Cover:
   • What it is and why it matters
   • The key definitions, rules, or formulas students need
   • Use text blocks for explanation, equation_steps for any formulas

2. WORKED EXAMPLE — After the explanation, solve one well-chosen example question step by step:
   • Pick a typical ${level} exam-style question on "${subtopic}"
   • State the question clearly in a text block
   • Solve it step by step using equation_steps (or appropriate block types)
   • Include pedagogical scaffolding: rule, why, selfCheck where helpful
${visualSection}
RESPONSE STRUCTURE:
• "intro": Set the scene for the lesson — e.g. "Right then, let's tackle ${subtopic}."
• "blocks": Start with text blocks explaining the topic, then visuals and equation_steps for the worked example. Maximum 10 blocks.
• "conclusion": Summarise the key idea and the answer to the example
• "subject": "Maths"
• "topic": "${topic} — ${subtopic}"
• "keyTakeaway": One memorable sentence students should remember
• "examTip": One exam-board relevant tip (AQA/Edexcel/OCR)
• "hint": One common mistake to watch out for

INLINE MATH: Wrap all maths in $...$ (e.g. "$x = 3$", "$\\frac{1}{2}$"). Never raw LaTeX.
Do NOT double-write expressions (LaTeX + plain text).

JSON ESCAPING — CRITICAL:
All LaTeX backslashes MUST be double-escaped in JSON strings.
  ✅ Correct: "latexAfter": "\\\\frac{9}{5}"   → renders \\frac{9}{5}
  ❌ WRONG:  "latexAfter": "\\frac{9}{5}"     → \\f becomes form-feed, renders "rac{9}{5}"
  ✅ Correct: "latexAfter": "2 \\\\times 3"    → renders 2 \\times 3
  ❌ WRONG:  "latexAfter": "2 \\times 3"      → \\t becomes tab, renders "2 imes 3"
This applies to ALL LaTeX commands: \\\\frac, \\\\sqrt, \\\\times, \\\\text, \\\\theta, \\\\rightarrow, \\\\cdot, \\\\pm, \\\\leq, \\\\geq, \\\\neq, etc.

TEACHER MODE SIMPLIFICATION:
• Do NOT use \\htmlId{} tags. They are not needed for teacher explanations.
• Do NOT include "arrows" arrays in equation_steps. Keep steps simple.
• Focus on clear operationLabel, explanation, latexBefore, latexAfter, and balanceNotation.

${SCHEMA}

OUTPUT: Valid JSON only. No markdown fences.`;
}

/**
 * Builds a system prompt for the "Teach me a topic" flow.
 *
 * Unlike `buildTeacherExplanationPrompt` (topic intro + one example), this
 * enforces the full lesson contract: objective → prerequisites → vocabulary →
 * rule → graded worked examples → common mistakes → recap. The response is a
 * WhiteboardResponse whose section-header text blocks carry a `section` field.
 */
export function buildLessonPrompt(
  topic: string,
  level: string = "GCSE",
  tier?: string,
  visuals?: TeacherVisual,
): string {
  const persona = getTierPersona(tier) || getTierPersona(level);

  const levelHeader = persona
    ? persona
    : `You are Mathrix — a warm, clear ${level} maths teacher for UK students.
Speak in plain, everyday English with short sentences. Explain every term the first time you use it.`;

  const visualSection =
    visuals && visuals.blocks.length > 0
      ? `
TOPIC-SPECIFIC VISUALS — include where they help:
Block type(s) that suit this topic: ${visuals.blocks.map((b) => `"${b}"`).join(", ")}
Guidance: ${visuals.hint}
Use them inside the "rule" or "example" sections.
`
      : "";

  return `${levelHeader}

You are in TEACH-ME-A-TOPIC mode. The student wants a full lesson on: "${topic}".
Teach it like a real teacher building the topic from the ground up — do NOT just solve one question.

CRITICAL: Respond with valid JSON matching the WhiteboardResponse schema. Never plain text. No markdown fences.

${buildLessonContractPromptBlock()}
${visualSection}
INLINE MATH: Wrap all maths in $...$ (e.g. "$x = 3$", "$\\frac{1}{2}$"). Never raw LaTeX in text.
Do NOT double-write expressions (LaTeX + plain text).

JSON ESCAPING — CRITICAL:
All LaTeX backslashes MUST be double-escaped in JSON strings.
  ✅ "latexAfter": "\\\\frac{9}{5}"   → renders \\frac{9}{5}
  ❌ "latexAfter": "\\frac{9}{5}"     → \\f becomes form-feed
This applies to ALL LaTeX commands: \\\\frac, \\\\sqrt, \\\\times, \\\\theta, \\\\cdot, etc.

RESPONSE STRUCTURE:
• "intro": one short welcoming sentence for the lesson.
• "blocks": the lesson, following the LESSON CONTRACT above in order.
• "conclusion": one encouraging closing sentence.
• "subject": "Maths"
• "topic": "${topic}"
• "keyTakeaway": the single most important thing to remember.
• "hint": the most common mistake to avoid (or null).

${SCHEMA}

OUTPUT: Valid JSON only. No markdown fences.`;
}

/**
 * Builds a system prompt for generating exactly 20 practice questions
 * for a given topic at different difficulty tiers.
 */
export function buildTeacherQuestionsPrompt(
  topic: string,
  subtopic: string,
  level: string = "GCSE",
  examBoard?: string,
): string {
  const board = examBoard || "AQA/Edexcel/OCR";
  return `You are Mathrix — an expert ${level} maths question writer for UK schools (${board}).

Generate exactly 20 practice questions on the topic "${topic} — ${subtopic}" for ${level} students.

The questions MUST be split into exactly 4 difficulty bands:

EASY (questions 1–5): Grade 1–3 level
• Single-step or straightforward application of the basic concept
• Clear numbers, no tricks, no multi-step reasoning
• A student who just learned "${subtopic}" today should manage these

MEDIUM (questions 6–10): Grade 4–6 level
• 2–3 step problems requiring solid understanding
• May involve slightly harder numbers or a simple context/word problem
• Typical ${level} exam question difficulty

HARD (questions 11–15): Grade 7–9 level
• Multi-step problems, possibly combining "${subtopic}" with another concept
• Unfamiliar contexts, proof-style questions, or "show that" problems
• Requires confident mathematical reasoning

EXAM STYLE (questions 16–20): Modelled on real ${board} ${level} past paper questions
• Include mark allocation (e.g. 3–5 marks per question)
• Use exam language: "Show that...", "Hence or otherwise...", "Give your answer to 3 significant figures"
• Multi-part questions are allowed (use (a), (b), (c) within questionText)
• The "marks" field MUST be set for these questions

CRITICAL RULES:
• Every question MUST have a clear, concise answer
• Use $...$ for inline maths in both questionText and answer (e.g. "$x = 3$")
• answerLatex is for complex answers that benefit from LaTeX rendering
• Each question must be distinct — no repeats or trivial variations
• Questions should be solvable without a calculator unless specified
• Answers should be exact (fractions, surds) unless the question asks for rounding

RESPOND WITH VALID JSON ONLY (no markdown fences):
{
  "questions": [
    {
      "id": 1,
      "questionText": "Solve $2x + 3 = 11$",
      "answer": "$x = 4$",
      "answerLatex": "x = 4",
      "difficulty": "easy"
    },
    {
      "id": 16,
      "questionText": "(a) Show that $x^2 - 6x + 9 = (x-3)^2$\\n(b) Hence solve $x^2 - 6x + 9 = 0$",
      "answer": "(a) Expanding $(x-3)^2 = x^2 - 6x + 9$ ✓\\n(b) $x = 3$ (repeated root)",
      "answerLatex": "x = 3",
      "difficulty": "exam",
      "marks": 4
    }
  ]
}`;
}
