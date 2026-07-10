/**
 * Pure, dependency-free helpers to derive a *stable* key for a rendered lesson
 * / solution so a student's playback position can be saved and resumed.
 *
 * The key is a content hash: the same lesson content always produces the same
 * key (independent of the random per-message id), so resume survives reloads
 * and re-asks of the same question. Runs in the browser, so it uses a small
 * synchronous non-crypto hash (collision resistance is not security-critical
 * here — a collision would at worst resume the wrong lesson to a similar spot).
 */

export interface LessonKeyInput {
  topic?: string;
  subject?: string;
  intro: string;
  conclusion: string;
  blockTypes: string[];
  blockCount: number;
}

function normalize(s: string | undefined): string {
  return (s || "").replace(/\s+/g, " ").trim().toLowerCase();
}

/** FNV-1a 32-bit hash → unsigned int. */
function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** djb2 hash → unsigned int (decorrelated from FNV to lower collisions). */
function djb2(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(h, 33) ^ str.charCodeAt(i)) >>> 0;
  }
  return h >>> 0;
}

/** Combine two 32-bit hashes into a 16-char hex string. */
export function stableHash(input: string): string {
  const a = fnv1a(input).toString(16).padStart(8, "0");
  const b = djb2(input).toString(16).padStart(8, "0");
  return a + b;
}

export function buildLessonKeyInput(data: {
  topic?: string;
  subject?: string;
  intro?: string;
  conclusion?: string;
  blocks?: Array<{ type: string }>;
}): LessonKeyInput {
  const blocks = data.blocks || [];
  return {
    topic: data.topic,
    subject: data.subject,
    intro: data.intro || "",
    conclusion: data.conclusion || "",
    blockTypes: blocks.map((b) => b.type),
    blockCount: blocks.length,
  };
}

/**
 * Derive the stable content key for a lesson/solution.
 */
export function lessonContentKey(data: {
  topic?: string;
  subject?: string;
  intro?: string;
  conclusion?: string;
  blocks?: Array<{ type: string }>;
}): string {
  const k = buildLessonKeyInput(data);
  const parts = [
    normalize(k.topic),
    normalize(k.subject),
    normalize(k.intro),
    normalize(k.conclusion),
    k.blockTypes.join(","),
    String(k.blockCount),
  ];
  return stableHash(parts.join("|"));
}
