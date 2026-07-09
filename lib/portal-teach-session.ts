import type {
  CurriculumStageId,
  CurriculumSubjectId,
  ExamBoardId,
  ScienceTrack,
} from "@/lib/curriculum";

export const MAX_ROSTER = 8;

export interface TeachSessionState {
  rosterStudentIds: string[];
  activeStudentId: string | null;
}

export interface StudentTeachPrefs {
  stageId: CurriculumStageId | null;
  subjectId: CurriculumSubjectId | null;
  board: ExamBoardId | null;
  scienceTrack: ScienceTrack | null;
}

function sessionKey(centreId: string, tutorId: string): string {
  return `mathrix-teach-session:${centreId}:${tutorId}`;
}

function prefsKey(centreId: string, tutorId: string, studentId: string): string {
  return `mathrix-teach-prefs:${centreId}:${tutorId}:${studentId}`;
}

export function loadTeachSession(centreId: string, tutorId: string): TeachSessionState {
  if (typeof window === "undefined") {
    return { rosterStudentIds: [], activeStudentId: null };
  }
  try {
    const raw = sessionStorage.getItem(sessionKey(centreId, tutorId));
    if (!raw) return { rosterStudentIds: [], activeStudentId: null };
    const parsed = JSON.parse(raw) as TeachSessionState;
    return {
      rosterStudentIds: Array.isArray(parsed.rosterStudentIds) ? parsed.rosterStudentIds : [],
      activeStudentId: parsed.activeStudentId ?? null,
    };
  } catch {
    return { rosterStudentIds: [], activeStudentId: null };
  }
}

export function saveTeachSession(
  centreId: string,
  tutorId: string,
  state: TeachSessionState,
): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(sessionKey(centreId, tutorId), JSON.stringify(state));
}

export function loadStudentTeachPrefs(
  centreId: string,
  tutorId: string,
  studentId: string,
): StudentTeachPrefs | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(prefsKey(centreId, tutorId, studentId));
    if (!raw) return null;
    return JSON.parse(raw) as StudentTeachPrefs;
  } catch {
    return null;
  }
}

export function saveStudentTeachPrefs(
  centreId: string,
  tutorId: string,
  studentId: string,
  prefs: StudentTeachPrefs,
): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(prefsKey(centreId, tutorId, studentId), JSON.stringify(prefs));
}

function routeKey(centreId: string, tutorId: string, studentId: string): string {
  return `mathrix-teach-route:${centreId}:${tutorId}:${studentId}`;
}

function lessonPackKey(
  centreId: string,
  tutorId: string,
  studentId: string,
  topicId: string,
): string {
  return `mathrix-teach-pack:${centreId}:${tutorId}:${studentId}:${topicId}`;
}

export interface StudentTopicPack {
  level: string;
  count: number;
  lesson: unknown | null;
  worksheet: unknown | null;
}

/** Store route without the student query param; re-applied on switch. */
export function normalizeTeachRoute(pathname: string, search: string): string {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  params.delete("student");
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function buildStudentTeachRoute(storedRoute: string, studentId: string): string {
  const qIndex = storedRoute.indexOf("?");
  const pathname = qIndex >= 0 ? storedRoute.slice(0, qIndex) : storedRoute;
  const params = new URLSearchParams(qIndex >= 0 ? storedRoute.slice(qIndex + 1) : "");
  params.set("student", studentId);
  return `${pathname}?${params.toString()}`;
}

export function saveStudentTeachRoute(
  centreId: string,
  tutorId: string,
  studentId: string,
  route: string,
): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(routeKey(centreId, tutorId, studentId), route);
}

export function loadStudentTeachRoute(
  centreId: string,
  tutorId: string,
  studentId: string,
): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(routeKey(centreId, tutorId, studentId));
}

export function saveStudentTopicPack(
  centreId: string,
  tutorId: string,
  studentId: string,
  topicId: string,
  pack: StudentTopicPack,
): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(
    lessonPackKey(centreId, tutorId, studentId, topicId),
    JSON.stringify(pack),
  );
}

export function loadStudentTopicPack(
  centreId: string,
  tutorId: string,
  studentId: string,
  topicId: string,
): StudentTopicPack | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(lessonPackKey(centreId, tutorId, studentId, topicId));
    if (!raw) return null;
    return JSON.parse(raw) as StudentTopicPack;
  } catch {
    return null;
  }
}

export function addStudentToSession(
  centreId: string,
  tutorId: string,
  studentId: string,
): TeachSessionState {
  const state = loadTeachSession(centreId, tutorId);
  if (!state.rosterStudentIds.includes(studentId)) {
    if (state.rosterStudentIds.length >= MAX_ROSTER) return state;
    state.rosterStudentIds = [...state.rosterStudentIds, studentId];
  }
  state.activeStudentId = studentId;
  saveTeachSession(centreId, tutorId, state);
  return state;
}

export function studentTabLabel(fullName: string, yearGroup: string | null): string {
  const first = fullName.trim().split(/\s+/)[0] || fullName;
  const yearShort = yearGroupToShort(yearGroup);
  return yearShort ? `${first} · ${yearShort}` : first;
}

export function yearGroupToShort(yearGroup: string | null): string | null {
  if (!yearGroup) return null;
  const y = yearGroup.trim();
  const yearMatch = y.match(/year\s*(\d+)/i) || y.match(/^y\s*(\d+)$/i);
  if (yearMatch) return `Y${yearMatch[1]}`;
  if (/gcse/i.test(y)) return "GCSE";
  if (/a[- ]?level/i.test(y)) return "A-Lvl";
  if (y.length <= 8) return y;
  return y.slice(0, 8);
}
