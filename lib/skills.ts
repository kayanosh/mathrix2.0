/**
 * Skill tracking — per-topic attempt counts.
 *
 * Reads/writes localStorage for instant, offline-friendly UI (and anonymous
 * users). When the student is signed in, every attempt is ALSO persisted to
 * Supabase via /api/progress so it survives across devices and can be viewed by
 * parents through the student login (see app/progress).
 *
 * Skill keys use the "Topic — subtopic" convention.
 */

const SKILLS_KEY = "mathrix_skills";

export interface SkillRecord {
  attempts: number;
  correct: number;
  lastSeen: number; // Date.now() timestamp
}

export type SkillData = Record<string, SkillRecord>;

/** Optional metadata persisted alongside an attempt (used by KS2 sections). */
export interface SkillMeta {
  section?: string;
  subject?: string;
  year?: string;
  /** KS2 target: 'curriculum' | 'sats' | 'eleven_plus' */
  target?: string;
  /** KS2 tier: 'developing' | 'secure' | 'greater_depth' */
  tier?: string;
}

export type MasteryLevel = "unseen" | "learning" | "practiced" | "confident" | "mastered";

export function getMastery(record: SkillRecord | undefined): MasteryLevel {
  if (!record || record.attempts === 0) return "unseen";
  const accuracy = record.attempts > 0 ? record.correct / record.attempts : 0;
  if (record.attempts <= 2) return "learning";
  if (record.attempts <= 4) return accuracy >= 0.6 ? "confident" : "practiced";
  return accuracy >= 0.7 ? "mastered" : "confident";
}

/** Convenience: get accuracy as a 0-100 percentage */
export function getAccuracy(record: SkillRecord | undefined): number {
  if (!record || record.attempts === 0) return 0;
  return Math.round((record.correct / record.attempts) * 100);
}

export function getSkillData(): SkillData {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(SKILLS_KEY);
    return raw ? (JSON.parse(raw) as SkillData) : {};
  } catch {
    return {};
  }
}

function writeSkillData(data: SkillData): void {
  try {
    localStorage.setItem(SKILLS_KEY, JSON.stringify(data));
  } catch {
    // ignore storage errors
  }
}

/** Fire-and-forget POST to the progress API. Silently no-ops for anon users (401). */
function persistToServer(
  skillKey: string,
  kind: "attempt" | "correct" | "incorrect",
  meta?: SkillMeta,
): void {
  if (typeof window === "undefined") return;
  try {
    void fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skillKey, kind, ...meta }),
      keepalive: true,
    }).catch(() => {
      /* offline / anonymous — localStorage already has the record */
    });
  } catch {
    /* ignore */
  }
}

export function recordSkillAttempt(topic: string | undefined, meta?: SkillMeta): void {
  if (!topic || typeof window === "undefined") return;
  const data = getSkillData();
  const existing = data[topic] || { attempts: 0, correct: 0, lastSeen: 0 };
  data[topic] = { attempts: existing.attempts + 1, correct: existing.correct, lastSeen: Date.now() };
  writeSkillData(data);
  persistToServer(topic, "attempt", meta);
}

export function recordCorrect(topic: string, meta?: SkillMeta): void {
  if (!topic || typeof window === "undefined") return;
  const data = getSkillData();
  const existing = data[topic] || { attempts: 0, correct: 0, lastSeen: 0 };
  data[topic] = { attempts: existing.attempts + 1, correct: existing.correct + 1, lastSeen: Date.now() };
  writeSkillData(data);
  persistToServer(topic, "correct", meta);
}

export function recordIncorrect(topic: string, meta?: SkillMeta): void {
  if (!topic || typeof window === "undefined") return;
  const data = getSkillData();
  const existing = data[topic] || { attempts: 0, correct: 0, lastSeen: 0 };
  data[topic] = { attempts: existing.attempts + 1, correct: existing.correct, lastSeen: Date.now() };
  writeSkillData(data);
  persistToServer(topic, "incorrect", meta);
}

/**
 * Mark a topic as mastered at a given target/tier. Records locally and on the
 * server (the server stores the highest standard reached — see /api/progress).
 */
export function markTopicMastered(topicKey: string, meta?: SkillMeta): void {
  if (!topicKey || typeof window === "undefined") return;
  const data = getSkillData();
  const existing = data[topicKey] || { attempts: 0, correct: 0, lastSeen: 0 };
  // Ensure the topic registers as attempted/mastered locally.
  data[topicKey] = {
    attempts: Math.max(existing.attempts, 5),
    correct: Math.max(existing.correct, 5),
    lastSeen: Date.now(),
  };
  writeSkillData(data);
  if (typeof window !== "undefined") {
    try {
      void fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillKey: topicKey, kind: "mastered", ...meta }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      /* ignore */
    }
  }
}

/** A progress row as returned by GET /api/progress. */
export interface ServerProgressRow {
  skill_key: string;
  section: string | null;
  subject: string | null;
  year: string | null;
  target: string | null;
  tier: string | null;
  mastered_at: string | null;
  attempts: number;
  correct: number;
  last_seen: string;
}

/**
 * Fetch the signed-in user's progress from the server and merge it into
 * localStorage (server is the source of truth where it has more attempts).
 * Returns the merged SkillData, or null if not signed in / offline.
 */
export async function syncSkillsFromServer(): Promise<SkillData | null> {
  if (typeof window === "undefined") return null;
  try {
    const res = await fetch("/api/progress");
    if (!res.ok) return null;
    const { progress } = (await res.json()) as { progress: ServerProgressRow[] };
    const local = getSkillData();
    for (const row of progress) {
      const existing = local[row.skill_key];
      // Server wins when it has at least as many attempts (cross-device truth).
      if (!existing || row.attempts >= existing.attempts) {
        local[row.skill_key] = {
          attempts: row.attempts,
          correct: row.correct,
          lastSeen: new Date(row.last_seen).getTime(),
        };
      }
    }
    writeSkillData(local);
    return local;
  } catch {
    return null;
  }
}
