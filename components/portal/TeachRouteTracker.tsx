"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useTeachSession } from "./TeachSessionProvider";
import { normalizeTeachRoute, saveStudentTeachRoute } from "@/lib/portal-teach-session";

/** Persists each student's last teach URL as they navigate. */
export default function TeachRouteTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { activeStudentId, centreId, tutorId } = useTeachSession();

  useEffect(() => {
    if (!activeStudentId || !pathname.startsWith("/portal/teach")) return;
    const search = searchParams.toString();
    const route = normalizeTeachRoute(pathname, search);
    saveStudentTeachRoute(centreId, tutorId, activeStudentId, route);
  }, [pathname, searchParams, activeStudentId, centreId, tutorId]);

  return null;
}
