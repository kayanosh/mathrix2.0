"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { StudentRow } from "./types";
import {
  MAX_ROSTER,
  loadTeachSession,
  saveTeachSession,
  loadStudentTeachPrefs,
  saveStudentTeachPrefs,
  type StudentTeachPrefs,
} from "@/lib/portal-teach-session";

interface TeachSessionContextValue {
  rosterStudentIds: string[];
  activeStudentId: string | null;
  activeStudent: StudentRow | null;
  rosterStudents: StudentRow[];
  allStudents: StudentRow[];
  loading: boolean;
  addToRoster: (studentId: string) => void;
  removeFromRoster: (studentId: string) => void;
  setActiveStudent: (studentId: string) => void;
  clearSession: () => void;
  getPrefs: (studentId: string) => StudentTeachPrefs | null;
  savePrefs: (studentId: string, prefs: StudentTeachPrefs) => void;
}

const TeachSessionContext = createContext<TeachSessionContextValue | null>(null);

export function useTeachSession(): TeachSessionContextValue {
  const ctx = useContext(TeachSessionContext);
  if (!ctx) throw new Error("useTeachSession must be used within TeachSessionProvider");
  return ctx;
}

export function useTeachSessionOptional(): TeachSessionContextValue | null {
  return useContext(TeachSessionContext);
}

export default function TeachSessionProvider({
  centreId,
  tutorId,
  children,
}: {
  centreId: string;
  tutorId: string;
  children: React.ReactNode;
}) {
  const [rosterStudentIds, setRosterStudentIds] = useState<string[]>([]);
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
  const [allStudents, setAllStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = loadTeachSession(centreId, tutorId);
    setRosterStudentIds(stored.rosterStudentIds);
    setActiveStudentId(stored.activeStudentId);
    setHydrated(true);
  }, [centreId, tutorId]);

  useEffect(() => {
    fetch("/api/students")
      .then((r) => r.json())
      .then((d) => setAllStudents((d.students || []).filter((s: StudentRow) => !s.archived)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const persist = useCallback(
    (roster: string[], active: string | null) => {
      saveTeachSession(centreId, tutorId, {
        rosterStudentIds: roster,
        activeStudentId: active,
      });
    },
    [centreId, tutorId],
  );

  const studentsById = useMemo(
    () => new Map(allStudents.map((s) => [s.id, s])),
    [allStudents],
  );

  const rosterStudents = useMemo(
    () =>
      rosterStudentIds
        .map((id) => studentsById.get(id))
        .filter((s): s is StudentRow => !!s),
    [rosterStudentIds, studentsById],
  );

  const activeStudent = activeStudentId ? studentsById.get(activeStudentId) ?? null : null;

  const addToRoster = useCallback(
    (studentId: string) => {
      let next = rosterStudentIds;
      if (!rosterStudentIds.includes(studentId)) {
        if (rosterStudentIds.length >= MAX_ROSTER) return;
        next = [...rosterStudentIds, studentId];
      }
      setRosterStudentIds(next);
      setActiveStudentId(studentId);
      persist(next, studentId);
    },
    [rosterStudentIds, persist],
  );

  const removeFromRoster = useCallback(
    (studentId: string) => {
      const next = rosterStudentIds.filter((id) => id !== studentId);
      const newActive =
        activeStudentId === studentId ? (next[0] ?? null) : activeStudentId;
      setRosterStudentIds(next);
      setActiveStudentId(newActive);
      persist(next, newActive);
    },
    [rosterStudentIds, activeStudentId, persist],
  );

  const setActiveStudent = useCallback(
    (studentId: string) => {
      setActiveStudentId(studentId);
      persist(rosterStudentIds, studentId);
    },
    [rosterStudentIds, persist],
  );

  const clearSession = useCallback(() => {
    setRosterStudentIds([]);
    setActiveStudentId(null);
    persist([], null);
  }, [persist]);

  const getPrefs = useCallback(
    (studentId: string) => loadStudentTeachPrefs(centreId, tutorId, studentId),
    [centreId, tutorId],
  );

  const savePrefs = useCallback(
    (studentId: string, prefs: StudentTeachPrefs) => {
      saveStudentTeachPrefs(centreId, tutorId, studentId, prefs);
    },
    [centreId, tutorId],
  );

  const value = useMemo(
    () => ({
      rosterStudentIds,
      activeStudentId,
      activeStudent,
      rosterStudents,
      allStudents,
      loading: loading || !hydrated,
      addToRoster,
      removeFromRoster,
      setActiveStudent,
      clearSession,
      getPrefs,
      savePrefs,
    }),
    [
      rosterStudentIds,
      activeStudentId,
      activeStudent,
      rosterStudents,
      allStudents,
      loading,
      hydrated,
      addToRoster,
      removeFromRoster,
      setActiveStudent,
      clearSession,
      getPrefs,
      savePrefs,
    ],
  );

  return (
    <TeachSessionContext.Provider value={value}>{children}</TeachSessionContext.Provider>
  );
}
