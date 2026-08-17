import { NextResponse } from "next/server";
import { getCallerProfile } from "@/lib/centre";
import { isStaffRole } from "@/lib/ks2-staff-content";

/**
 * The caller's own role.
 *
 * There was no client-readable role source: `app/teacher/classes/page.tsx`
 * inferred staff-ness by making a request and watching for a 403. That works,
 * but it means any surface wanting to show or hide a staff control either has to
 * provoke an error or — as the KS2 lesson panel did — just trust the client.
 *
 * This is for PRESENTATION only. It decides whether to render a staff control,
 * never whether staff content may be sent: that is enforced server-side in
 * `/api/ks2-lesson` via `lessonForRole`. A client that lies to this endpoint
 * gains a button that reveals nothing.
 */
export async function GET() {
  const profile = await getCallerProfile().catch(() => null);
  return NextResponse.json(
    {
      signedIn: !!profile,
      role: profile?.role ?? null,
      isStaff: isStaffRole(profile?.role),
    },
    // Per-user data — must never land in a shared or CDN cache.
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
