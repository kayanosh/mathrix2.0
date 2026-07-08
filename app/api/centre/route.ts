import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  getCallerProfile,
  requireCentreOwner,
  isAuthErr,
  makeCentreCode,
} from "@/lib/centre";

/**
 * GET /api/centre
 * Returns the caller's centre (if any) plus the list of tutors in it.
 * Response: { centre: {...} | null, tutors: [...], role }
 */
export async function GET() {
  const profile = await getCallerProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!profile.centre_id) {
    return NextResponse.json({
      centre: null,
      tutors: [],
      role: profile.role,
      userId: profile.id,
    });
  }

  const { data: centre } = await supabaseAdmin
    .from("centres")
    .select("id, name, slug, owner_id, join_code, subscription_status, created_at")
    .eq("id", profile.centre_id)
    .single();

  const { data: tutors } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("centre_id", profile.centre_id)
    .in("role", ["tutor", "centre_owner"])
    .order("role", { ascending: true });

  return NextResponse.json({
    centre,
    tutors: tutors || [],
    role: profile.role,
    isOwner: centre?.owner_id === profile.id,
    userId: profile.id,
  });
}

/**
 * POST /api/centre
 * Actions:
 *   { action: "create", name }               — create a centre, become its owner
 *   { action: "rename", name }                — owner renames the centre
 *   { action: "regenerateCode" }              — owner rotates the join code
 *   { action: "inviteTutor", email }          — owner adds an existing user as a tutor
 *   { action: "removeTutor", tutorId }        — owner removes a tutor from the centre
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const action: string = body.action || "";

  // ── Create centre: any signed-in user without a centre can create one ──────
  if (action === "create") {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const name = (body.name || "").trim();
    if (!name) return NextResponse.json({ error: "Centre name required" }, { status: 400 });

    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("centre_id")
      .eq("id", user.id)
      .single();
    if (existing?.centre_id) {
      return NextResponse.json({ error: "You already belong to a centre" }, { status: 400 });
    }

    for (let attempt = 0; attempt < 4; attempt++) {
      const { data: centre, error } = await supabaseAdmin
        .from("centres")
        .insert({
          name,
          owner_id: user.id,
          join_code: makeCentreCode(),
          slug: null,
        })
        .select("id, name, join_code, created_at")
        .single();

      if (!error && centre) {
        await supabaseAdmin
          .from("profiles")
          .update({ role: "centre_owner", centre_id: centre.id })
          .eq("id", user.id);
        return NextResponse.json({ centre });
      }
      if (error && !error.message.toLowerCase().includes("duplicate")) {
        console.error("create centre error:", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
      }
    }
    return NextResponse.json({ error: "Could not generate a unique code" }, { status: 500 });
  }

  // ── Everything else requires being the centre owner ────────────────────────
  const auth = await requireCentreOwner();
  if (isAuthErr(auth)) return auth.error;
  const { centreId, user } = auth;

  if (action === "rename") {
    const name = (body.name || "").trim();
    if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });
    await supabaseAdmin.from("centres").update({ name }).eq("id", centreId);
    return NextResponse.json({ ok: true });
  }

  if (action === "regenerateCode") {
    for (let attempt = 0; attempt < 4; attempt++) {
      const code = makeCentreCode();
      const { error } = await supabaseAdmin
        .from("centres")
        .update({ join_code: code })
        .eq("id", centreId);
      if (!error) return NextResponse.json({ joinCode: code });
    }
    return NextResponse.json({ error: "Could not rotate code" }, { status: 500 });
  }

  if (action === "inviteTutor") {
    const email = (body.email || "").trim().toLowerCase();
    if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

    const { data: target } = await supabaseAdmin
      .from("profiles")
      .select("id, centre_id, role")
      .eq("email", email)
      .maybeSingle();
    if (!target) {
      return NextResponse.json(
        { error: "No Mathrix account with that email. Ask them to sign up first." },
        { status: 404 },
      );
    }
    if (target.centre_id && target.centre_id !== centreId) {
      return NextResponse.json({ error: "That user already belongs to another centre" }, { status: 400 });
    }
    // Don't demote a centre owner.
    const newRole = target.role === "centre_owner" ? "centre_owner" : "tutor";
    await supabaseAdmin
      .from("profiles")
      .update({ centre_id: centreId, role: newRole })
      .eq("id", target.id);
    return NextResponse.json({ ok: true });
  }

  if (action === "removeTutor") {
    const tutorId: string = body.tutorId;
    if (!tutorId) return NextResponse.json({ error: "tutorId required" }, { status: 400 });
    if (tutorId === user.id) {
      return NextResponse.json({ error: "You cannot remove yourself as owner" }, { status: 400 });
    }
    await supabaseAdmin
      .from("profiles")
      .update({ centre_id: null, role: "student" })
      .eq("id", tutorId)
      .eq("centre_id", centreId);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
