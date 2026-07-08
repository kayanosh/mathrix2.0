"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { StudentRow } from "./types";

const STORAGE_KEY = "portal-active-student";

export type StudentFilterMode = "mine" | "all";

interface PortalStudentContextValue {
  students: StudentRow[];
  myStudents: StudentRow[];
  rosterStudents: StudentRow[];
  activeStudentId: string | null;
  activeStudent: StudentRow | null;
  filterMode: StudentFilterMode;
  loading: boolean;
  setActiveStudent: (studentId: string | null) => void;
  setFilterMode: (mode: StudentFilterMode) => void;
  reloadStudents: () => Promise<void>;
}

const PortalStudentContext = createContext<PortalStudentContextValue | null>(null);

export function usePortalStudents(): PortalStudentContextValue {
  const ctx = useContext(PortalStudentContext);
  if (!ctx) {
    throw new Error("usePortalStudents must be used within PortalStudentProvider");
  }
  return ctx;
}

export function PortalStudentProvider({
  userId,
  children,
}: {
  userId: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState<StudentFilterMode>("mine");
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);

  const myStudents = useMemo(
    () => students.filter((s) => s.assigned_tutor_id === userId),
    [students, userId],
  );

  const rosterStudents = useMemo(
    () => (filterMode === "mine" ? myStudents : students),
    [filterMode, myStudents, students],
  );

  const activeStudent = useMemo(
    () => rosterStudents.find((s) => s.id === activeStudentId) || null,
    [rosterStudents, activeStudentId],
  );

  const reloadStudents = useCallback(async () => {
    try {
      const res = await fetch("/api/students");
      const data = await res.json();
      setStudents(data.students || []);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    reloadStudents();
  }, [reloadStudents]);

  const setActiveStudent = useCallback(
    (studentId: string | null) => {
      setActiveStudentId(studentId);

      if (studentId) {
        try {
          sessionStorage.setItem(STORAGE_KEY, studentId);
        } catch {
          /* ignore */
        }
      } else {
        try {
          sessionStorage.removeItem(STORAGE_KEY);
        } catch {
          /* ignore */
        }
      }

      const studentDetailMatch = pathname.match(/^\/portal\/students\/([^/]+)$/);
      if (studentId && studentDetailMatch) {
        router.push(`/portal/students/${studentId}`);
        return;
      }

      const params = new URLSearchParams(searchParams.toString());
      if (studentId) {
        params.set("student", studentId);
      } else {
        params.delete("student");
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    if (loading || rosterStudents.length === 0) return;

    const studentDetailMatch = pathname.match(/^\/portal\/students\/([^/]+)$/);
    if (studentDetailMatch) {
      const routeStudentId = studentDetailMatch[1];
      if (rosterStudents.some((s) => s.id === routeStudentId)) {
        setActiveStudentId(routeStudentId);
        return;
      }
    }

    const fromUrl = searchParams.get("student");
    if (fromUrl && rosterStudents.some((s) => s.id === fromUrl)) {
      setActiveStudentId(fromUrl);
      return;
    }

    let fromStorage: string | null = null;
    try {
      fromStorage = sessionStorage.getItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    if (fromStorage && rosterStudents.some((s) => s.id === fromStorage)) {
      setActiveStudentId(fromStorage);
      return;
    }

    if (!activeStudentId || !rosterStudents.some((s) => s.id === activeStudentId)) {
      setActiveStudentId(rosterStudents[0].id);
    }
  }, [loading, rosterStudents, searchParams, activeStudentId]);

  useEffect(() => {
    if (filterMode === "mine" && myStudents.length === 0 && students.length > 0) {
      setFilterMode("all");
    }
  }, [filterMode, myStudents.length, students.length]);

  const value = useMemo(
    () => ({
      students,
      myStudents,
      rosterStudents,
      activeStudentId,
      activeStudent,
      filterMode,
      loading,
      setActiveStudent,
      setFilterMode,
      reloadStudents,
    }),
    [
      students,
      myStudents,
      rosterStudents,
      activeStudentId,
      activeStudent,
      filterMode,
      loading,
      setActiveStudent,
      reloadStudents,
    ],
  );

  return (
    <PortalStudentContext.Provider value={value}>{children}</PortalStudentContext.Provider>
  );
}
