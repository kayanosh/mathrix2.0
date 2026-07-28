import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // A Supabase outage or missing/invalid config must not 500 every route,
  // including fully public pages that need no session at all — fail safe
  // by treating the request as logged-out rather than throwing.
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            supabaseResponse = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    // Refresh session — MUST be called so cookies stay valid
    await supabase.auth.getUser();
  } catch (error) {
    console.error("proxy: Supabase session refresh failed, continuing logged-out", error);
    // Request URL/method only — no cookies, headers, or body. This is a
    // fail-safe already; Sentry here is for noticing the outage exists.
    Sentry.captureException(error, {
      tags: { component: "proxy", route: request.nextUrl.pathname },
    });
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Run on all routes except static files and images
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
