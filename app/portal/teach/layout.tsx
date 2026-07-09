"use client";

import { Suspense } from "react";
import PortalShell, { type PortalContext } from "@/components/portal/PortalShell";
import TeachSessionProvider from "@/components/portal/TeachSessionProvider";
import StudentSessionBar from "@/components/portal/StudentSessionBar";
import TeachRouteTracker from "@/components/portal/TeachRouteTracker";

function TeachLayoutInner({ ctx, children }: { ctx: PortalContext; children: React.ReactNode }) {
  return (
    <TeachSessionProvider centreId={ctx.centre.id} tutorId={ctx.userId}>
      <Suspense fallback={null}>
        <StudentSessionBar />
        <TeachRouteTracker />
      </Suspense>
      {children}
    </TeachSessionProvider>
  );
}

export default function TeachLayout({ children }: { children: React.ReactNode }) {
  return <PortalShell>{(ctx) => <TeachLayoutInner ctx={ctx}>{children}</TeachLayoutInner>}</PortalShell>;
}
