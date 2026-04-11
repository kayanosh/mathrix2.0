/**
 * Validates Claude's response against the whiteboard schema.
 * Runs structural (Zod) + semantic checks + required visuals checks.
 */
import { WhiteboardResponseSchema } from "./schemas";
import type { WhiteboardResponse, ProbabilityTreeBlock, TreeBranch } from "@/types/whiteboard";

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
function repairMangledBackslashes(s: string): string {
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
function deepRepairStrings<T>(obj: T): T {
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
        break;
      }
    }
  }

  return errors;
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

  // Visual errors are hard failures — trigger a retry
  if (visualErrors.length > 0) {
    return { ok: false, data, errors: [...visualErrors, ...semanticErrors] };
  }

  if (semanticErrors.length > 0) {
    // Semantic errors are warnings — still return data but flag them
    return { ok: true, data, errors: semanticErrors };
  }

  return { ok: true, data };
}
