"use client";

import PortalShell, { type PortalContext } from "@/components/portal/PortalShell";
import TeachSessionProvider from "@/components/portal/TeachSessionProvider";
import StudentSessionBar from "@/components/portal/StudentSessionBar";

function TeachLayoutInner({ ctx, children }: { ctx: PortalContext; children: React.ReactNode }) {
  return (
    <TeachSessionProvider centreId={ctx.centre.id} tutorId={ctx.userId}>
      <StudentSessionBar />
      {children}
    </TeachSessionProvider>
  );
}

export default function TeachLayout({ children }: { children: React.ReactNode }) {
  return <PortalShell>{(ctx) => <TeachLayoutInner ctx={ctx}>{children}</TeachLayoutInner>}</PortalShell>;
}
