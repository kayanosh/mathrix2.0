/**
 * Skill tracking — stores per-topic attempt counts in localStorage.
 * No backend required for v1. Keyed by the topic string from WhiteboardResponse.topic
 * (format: "Algebra — Solving linear equations")
 */

const SKILLS_KEY = "mathrix_skills";

export interface SkillRecord {
  attempts: number;
  lastSeen: number; // Date.now() timestamp
}

export type SkillData = Record<string, SkillRecord>;

export type MasteryLevel = "unseen" | "learning" | "practiced" | "mastered";

export function getMastery(attempts: number): MasteryLevel {
  if (attempts === 0) return "unseen";
  if (attempts <= 2) return "learning";
  if (attempts <= 4) return "practiced";
  return "mastered";
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
    const existing = data[topic] || { attempts: 0, lastSeen: 0 };
    data[topic] = { attempts: existing.attempts + 1, lastSeen: Date.now() };
    localStorage.setItem(SKILLS_KEY, JSON.stringify(data));
  } catch {
    // ignore storage errors
  }
}
