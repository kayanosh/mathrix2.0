/**
 * Validates Claude's response against the whiteboard schema.
 * Runs structural (Zod) + semantic checks + required visuals checks.
 */
import { WhiteboardResponseSchema } from "./schemas";
import type {
  WhiteboardResponse,
  ProbabilityTreeBlock,
  TreeBranch,
  EquationStep,
  EquationStepBlock,
} from "@/types/whiteboard";

export interface ValidationResult {
  ok: boolean;
  data?: WhiteboardResponse;
  errors?: string[];
}

// ── LaTeX repair ────────────────────────────────────────────────────────────

/**
 * Fix strings mangled by JSON backslash escaping.
 *
 * When a model outputs  \frac  inside a JSON string value (instead of \\frac),
 * JSON.parse interprets  \f  as U+000C (form-feed),  \t  as U+0009 (tab), etc.
 * This reverses those common manglings so LaTeX renders correctly.
 */
/** Fix strings mangled by JSON backslash escaping (e.g. \\times → tab + "imes"). */
export function repairMangledBackslashes(s: string): string {
  return s
    .replace(/\f/g, "\\f")              // form-feed  → \f  (fixes \frac, \forall, \flat)
    .replace(/\t/g, "\\t")              // tab        → \t  (fixes \times, \text, \theta, \tan, \to)
    .replace(/\r/g, "\\r")              // CR         → \r  (fixes \rightarrow, \rho, \Rightarrow)
    .replace(/\x08/g, "\\b")            // backspace  → \b  (fixes \binom, \boxed, \begin, \beta)
    .replace(/(?<!\\)htmlId/g, "\\htmlId"); // bare htmlId (invalid \h escape stripped backslash)
}

/**
 * Recursively walk a parsed object and repair every string value.
 */
export function deepRepairStrings<T>(obj: T): T {
  if (typeof obj === "string") return repairMangledBackslashes(obj) as T;
  if (Array.isArray(obj)) return obj.map(deepRepairStrings) as T;
  if (obj && typeof obj === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = deepRepairStrings(v);
    }
    return out as T;
  }
  return obj;
}

/**
 * Sanitise a WhiteboardResponse, repairing any LaTeX that was mangled during
 * JSON serialisation / parsing.  Safe to call on any WhiteboardResponse.
 */
export function sanitizeWhiteboardResponse(
  data: WhiteboardResponse,
): WhiteboardResponse {
  return deepRepairStrings(data);
}

/**
 * Parse raw JSON text from Claude, stripping markdown fences if present.
 */
function extractJSON(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  return (fenced ? fenced[1] : raw).trim();
}

/**
 * Check that probability branches at each level sum to ~1.
 */
function validateProbabilityBranches(branches: TreeBranch[], path: string): string[] {
  const errors: string[] = [];
  const sum = branches.reduce((s, b) => s + b.probabilityValue, 0);
  if (Math.abs(sum - 1) > 0.01) {
    errors.push(`Probability branches at ${path} sum to ${sum}, expected 1`);
  }
  branches.forEach((b, i) => {
    if (b.children && b.children.length > 0) {
      errors.push(...validateProbabilityBranches(b.children as TreeBranch[], `${path}[${i}]`));
    }
  });
  return errors;
}

/**
 * Run semantic checks beyond what Zod can validate.
 */
function semanticChecks(data: WhiteboardResponse): string[] {
  const errors: string[] = [];

  for (const block of data.blocks) {
    switch (block.type) {
      case "probability_tree": {
        const ptb = block as ProbabilityTreeBlock;
        errors.push(...validateProbabilityBranches(ptb.branches, "root"));
        break;
      }
      case "labeled_shape": {
        if (block.shape === "triangle" && block.angles) {
          const total = block.angles.reduce((s, a) => s + a.degrees, 0);
          // Only check if all 3 angles are provided
          if (block.angles.length === 3 && Math.abs(total - 180) > 1) {
            errors.push(`Triangle angles sum to ${total}°, expected 180°`);
          }
        }
        break;
      }
      case "equation_steps": {
        if (block.steps.length === 0) {
          errors.push("equation_steps block has no steps");
        }
        errors.push(...validateAlgebraArrows(block as EquationStepBlock));
        break;
      }
    }
  }

  return errors;
}

// ── Algebra arrow / step-block / language checks ──────────────────────────────

/** Strip \htmlId{id}{...} wrappers so we can compare bare LaTeX strings. */
function stripHtmlIds(s: string): string {
  return s.replace(/\\htmlId\{[^}]*\}\{([^}]*)\}/g, "$1");
}

/** Split a LaTeX equation on the FIRST `=` into [lhs, rhs]. */
function splitOnEquals(latex: string): [string, string] | null {
  const cleaned = stripHtmlIds(latex);
  const idx = cleaned.indexOf("=");
  if (idx < 0) return null;
  return [cleaned.slice(0, idx), cleaned.slice(idx + 1)];
}

/**
 * Extract additive/subtractive constant tokens like "+5", "-12" from a side.
 * Returns absolute values (numbers) regardless of sign.
 */
function extractConstantMagnitudes(side: string): number[] {
  // Look for ±NN appearing at term boundaries (after start, +, -, *, /, =, {, (, space)
  const out: number[] = [];
  const re = /(?:^|[\s+\-*/=({,])\s*([+\-]?\d+(?:\.\d+)?)\b(?!\s*x)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(side)) !== null) {
    const n = Math.abs(parseFloat(m[1]));
    if (Number.isFinite(n)) out.push(n);
  }
  return out;
}

/**
 * Heuristic: does a step look like a term has crossed the = sign?
 *
 * We compare the *constants* on each side of latexBefore vs latexAfter.
 * If a number magnitude that was on the LHS in latexBefore now appears on the
 * RHS in latexAfter (or vice versa), we treat that as a term-crossing.
 */
function stepHasTermCrossing(step: EquationStep): boolean {
  if (!step.latexBefore || !step.latexAfter) return false;
  const before = splitOnEquals(step.latexBefore);
  const after = splitOnEquals(step.latexAfter);
  if (!before || !after) return false;

  const beforeL = extractConstantMagnitudes(before[0]);
  const beforeR = extractConstantMagnitudes(before[1]);
  const afterL = extractConstantMagnitudes(after[0]);
  const afterR = extractConstantMagnitudes(after[1]);

  // A constant on LHS in before that is now on RHS in after (and wasn't on RHS before)
  for (const n of beforeL) {
    if (!beforeR.includes(n) && afterR.includes(n) && !afterL.includes(n)) {
      return true;
    }
  }
  for (const n of beforeR) {
    if (!beforeL.includes(n) && afterL.includes(n) && !afterR.includes(n)) {
      return true;
    }
  }
  return false;
}

/**
 * Enforce the algebra-arrow contract on an equation_steps block:
 *   1. Every step where a term physically crosses the = sign MUST declare an
 *      `arrows` entry with a non-empty fromTerm/toTerm.
 *   2. Every declared arrow MUST be anchored with matching `\htmlId{<id>-from}`
 *      in latexBefore and `\htmlId{<id>-to}` in latexAfter.
 */
export function validateAlgebraArrows(block: EquationStepBlock): string[] {
  const errors: string[] = [];

  block.steps.forEach((step) => {
    const hasArrows = !!(step.arrows && step.arrows.length > 0);

    // (1) Term-crossing requires arrows
    if (!hasArrows && stepHasTermCrossing(step)) {
      errors.push(
        `Step ${step.stepNumber}: a term appears to cross the = sign but no \`arrows\` entry is declared. Add an arrow with fromTerm/toTerm and \\htmlId tags.`,
      );
    }

    // (2) Every declared arrow needs matching \htmlId pair
    if (hasArrows && step.arrows) {
      for (const arrow of step.arrows) {
        const fromTag = `\\htmlId{${arrow.id}-from}`;
        const toTag = `\\htmlId{${arrow.id}-to}`;
        if (!step.latexBefore || !step.latexBefore.includes(fromTag)) {
          errors.push(
            `Step ${step.stepNumber}, arrow "${arrow.id}": latexBefore is missing \`${fromTag}\` tag.`,
          );
        }
        if (!step.latexAfter.includes(toTag)) {
          errors.push(
            `Step ${step.stepNumber}, arrow "${arrow.id}": latexAfter is missing \`${toTag}\` tag.`,
          );
        }
      }
    }
  });

  return errors;
}

// ── Step continuity ("no missing steps") ──────────────────────────────────────

/** Normalise a LaTeX expression so two "identical" steps compare equal. */
function normalizeLatexForCompare(s: string): string {
  return stripHtmlIds(s)
    .replace(/\\left|\\right/g, "")
    .replace(/\\,|\\;|\\!|\\quad|\\qquad|~/g, "")
    .replace(/\\cdot/g, "*")
    .replace(/\\times/g, "*")
    .replace(/\$/g, "")
    .replace(/\s+/g, "")
    .trim();
}

/**
 * Enforce "no unexplained jumps" across an equation_steps block:
 *   1. Every non-first step should have a written reason (`explanation`).
 *   2. When a step provides `latexBefore`, it must match the previous step's
 *      `latexAfter` — otherwise the working jumped over a step.
 *
 * These are returned as non-blocking warnings so the critic/retry loop can
 * nudge the model without hard-failing an otherwise-correct solution.
 */
export function validateStepContinuity(block: EquationStepBlock): string[] {
  const warnings: string[] = [];

  block.steps.forEach((step, i) => {
    const isFirst = i === 0;

    // (1) Every step past the first needs a reason.
    if (!isFirst && (!step.explanation || step.explanation.trim().length === 0)) {
      warnings.push(
        `Step ${step.stepNumber}: no explanation given — every step needs a one-line reason (no unexplained jumps).`,
      );
    }

    // (2) latexBefore must continue the previous step's latexAfter.
    if (!isFirst) {
      const prev = block.steps[i - 1];
      if (
        step.latexBefore &&
        step.latexBefore.trim().length > 0 &&
        prev.latexAfter &&
        prev.latexAfter.trim().length > 0
      ) {
        const before = normalizeLatexForCompare(step.latexBefore);
        const prevAfter = normalizeLatexForCompare(prev.latexAfter);
        if (before && prevAfter && before !== prevAfter) {
          warnings.push(
            `Step ${step.stepNumber}: jumps from the previous line. Its latexBefore ("${step.latexBefore}") should match Step ${prev.stepNumber}'s latexAfter ("${prev.latexAfter}") — show the missing step in between.`,
          );
        }
      }
    }
  });

  return warnings;
}

/**
 * Run step-continuity checks across every equation_steps block in a response.
 */
export function validateNoMissingSteps(data: WhiteboardResponse): string[] {
  const warnings: string[] = [];
  for (const block of data.blocks) {
    if (block.type === "equation_steps") {
      warnings.push(...validateStepContinuity(block as EquationStepBlock));
    }
  }
  return warnings;
}

/**
 * Hard rule: a maths question (response contains any `=` in equation_steps,
 * or any block at all besides `text`) must NOT consist only of `text` blocks.
 */
export function validateExplanationsAreSteps(data: WhiteboardResponse): string[] {
  if (data.blocks.length === 0) return [];

  const allText = data.blocks.every((b) => b.type === "text");
  if (!allText) return [];

  // Detect maths intent from text content: any `=` in intro/conclusion/text body.
  const combined = [
    data.intro,
    data.conclusion,
    ...data.blocks.map((b) => (b.type === "text" ? b.content : "")),
  ]
    .join(" ");
  const looksLikeMaths =
    /=|\\frac|\\sqrt|\bx\s*[+\-*/=]/.test(combined) ||
    /\bsolve\b|\bequation\b|\bcalculate\b|\bsimplify\b/i.test(combined);

  if (looksLikeMaths) {
    return [
      "Response uses only text blocks for a maths question. Add a structured block (equation_steps, labeled_shape, coordinate_graph, etc.) — never answer maths with prose only.",
    ];
  }
  return [];
}

/** Ornate vocabulary that violates the "plain English" rule. Warnings only. */
const FORBIDDEN_ORNATE_WORDS = [
  "splendid",
  "indeed",
  "shall we",
  "precisely",
  "remarkably",
  "rather neat",
  "rather elegant",
  "jolly",
  "alas",
  "quite manageable",
  "let us",
];

export function validateSimpleLanguage(data: WhiteboardResponse): string[] {
  const warnings: string[] = [];
  const sources: { label: string; text: string }[] = [
    { label: "intro", text: data.intro || "" },
    { label: "conclusion", text: data.conclusion || "" },
    { label: "hint", text: data.hint || "" },
  ];
  for (const block of data.blocks) {
    if (block.type === "equation_steps") {
      block.steps.forEach((s) => {
        sources.push({
          label: `equation_steps step ${s.stepNumber} explanation`,
          text: s.explanation || "",
        });
      });
    }
  }
  for (const { label, text } of sources) {
    if (!text) continue;
    const lower = text.toLowerCase();
    for (const word of FORBIDDEN_ORNATE_WORDS) {
      if (lower.includes(word)) {
        warnings.push(
          `Language: "${label}" uses ornate word/phrase "${word}" — rewrite in plain everyday English.`,
        );
      }
    }
  }
  return warnings;
}

/**
 * Check that all required visual block types are present in the response.
 * Returns error messages for missing blocks.
 */
function validateRequiredVisuals(
  data: WhiteboardResponse,
  requiredBlockTypes: string[]
): string[] {
  if (!requiredBlockTypes || requiredBlockTypes.length === 0) return [];

  const presentTypes = new Set<string>(data.blocks.map((b) => b.type));
  const errors: string[] = [];

  for (const required of requiredBlockTypes) {
    if (!presentTypes.has(required)) {
      errors.push(
        `Missing required visual block: "${required}". This topic requires a ${required} diagram. Add a "${required}" block to your response.`
      );
    }
  }

  return errors;
}

/**
 * Validate Claude's raw text response into a typed WhiteboardResponse.
 *
 * @param rawText - The raw text from the LLM
 * @param requiredBlockTypes - Optional list of block types that must be present
 */
export function validateResponse(
  rawText: string,
  requiredBlockTypes?: string[]
): ValidationResult {
  // 1. Extract JSON
  let jsonStr: string;
  try {
    jsonStr = extractJSON(rawText);
  } catch {
    return { ok: false, errors: ["Could not extract JSON from response"] };
  }

  // 2. Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    return { ok: false, errors: [`JSON parse error: ${String(e)}`] };
  }

  // 3. Zod validation
  const result = WhiteboardResponseSchema.safeParse(parsed);
  if (!result.success) {
    const zodErrors = result.error.issues.map(
      (e) => `${(e.path as (string | number)[]).join(".")}: ${e.message}`
    );
    return { ok: false, errors: zodErrors };
  }

  // 4. Repair mangled LaTeX
  const data = sanitizeWhiteboardResponse(result.data as WhiteboardResponse);

  // 5. Semantic validation
  const semanticErrors = semanticChecks(data);

  // 6. Required visuals validation
  const visualErrors = validateRequiredVisuals(
    data,
    requiredBlockTypes || []
  );

  // 7. Structure check: never reply to a maths question with prose only
  const structureErrors = validateExplanationsAreSteps(data);

  // 8. Simple-language warnings (do NOT block — surface to critic/retry loop)
  const languageWarnings = validateSimpleLanguage(data);

  // 8b. Step-continuity warnings ("no missing steps" / no unexplained jumps)
  const continuityWarnings = validateNoMissingSteps(data);

  // Arrow contract violations (term crossings without arrows, missing \htmlId
  // pairs) live inside semanticErrors and are hard failures. Differentiate
  // them so we know whether to fail or just warn.
  const arrowFailures = semanticErrors.filter(
    (e) => e.startsWith("Step ") && (e.includes("cross") || e.includes("\\htmlId")),
  );
  const otherSemantic = semanticErrors.filter((e) => !arrowFailures.includes(e));

  const hardErrors = [...visualErrors, ...structureErrors, ...arrowFailures];
  if (hardErrors.length > 0) {
    return {
      ok: false,
      data,
      errors: [...hardErrors, ...otherSemantic, ...languageWarnings, ...continuityWarnings],
    };
  }

  if (otherSemantic.length > 0 || languageWarnings.length > 0 || continuityWarnings.length > 0) {
    // Non-blocking warnings — still return data but flag them.
    return {
      ok: true,
      data,
      errors: [...otherSemantic, ...languageWarnings, ...continuityWarnings],
    };
  }

  return { ok: true, data };
}
