/**
 * Skill tracking — stores per-topic attempt counts in localStorage.
 * No backend required for v1. Keyed by the topic string from WhiteboardResponse.topic
 * (format: "Algebra — Solving linear equations")
 */

const SKILLS_KEY = "mathrix_skills";

export interface SkillRecord {
  attempts: number;
  correct: number;
  lastSeen: number; // Date.now() timestamp
}

export type SkillData = Record<string, SkillRecord>;

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

export function recordSkillAttempt(topic: string | undefined): void {
  if (!topic || typeof window === "undefined") return;
  try {
    const data = getSkillData();
    const existing = data[topic] || { attempts: 0, correct: 0, lastSeen: 0 };
    data[topic] = { attempts: existing.attempts + 1, correct: existing.correct, lastSeen: Date.now() };
    localStorage.setItem(SKILLS_KEY, JSON.stringify(data));
  } catch {
    // ignore storage errors
  }
}

export function recordCorrect(topic: string): void {
  if (!topic || typeof window === "undefined") return;
  try {
    const data = getSkillData();
    const existing = data[topic] || { attempts: 0, correct: 0, lastSeen: 0 };
    data[topic] = { attempts: existing.attempts + 1, correct: existing.correct + 1, lastSeen: Date.now() };
    localStorage.setItem(SKILLS_KEY, JSON.stringify(data));
  } catch {
    // ignore storage errors
  }
}

export function recordIncorrect(topic: string): void {
  if (!topic || typeof window === "undefined") return;
  try {
    const data = getSkillData();
    const existing = data[topic] || { attempts: 0, correct: 0, lastSeen: 0 };
    data[topic] = { attempts: existing.attempts + 1, correct: existing.correct, lastSeen: Date.now() };
    localStorage.setItem(SKILLS_KEY, JSON.stringify(data));
  } catch {
    // ignore storage errors
  }
}
