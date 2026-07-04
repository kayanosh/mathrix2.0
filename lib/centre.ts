import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type CentreRole = "student" | "tutor" | "centre_owner" | "teacher" | "admin";

export interface CentreProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: CentreRole;
  centre_id: string | null;
}

interface AuthOk {
  user: { id: string };
  profile: CentreProfile;
  centreId: string;
}
interface AuthErr {
  error: NextResponse;
}

const TUTOR_ROLES: CentreRole[] = ["tutor", "centre_owner", "admin"];

/** Fetch the caller's profile (role + centre_id). Returns null if not signed in. */
export async function getCallerProfile(): Promise<CentreProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, email, full_name, role, centre_id")
    .eq("id", user.id)
    .single();

  if (!profile) return null;
  return profile as CentreProfile;
}

/**
 * Require a signed-in tutor/centre owner who belongs to a centre.
 * Returns { user, profile, centreId } or an { error } NextResponse to return.
 */
export async function requireTutor(): Promise<AuthOk | AuthErr> {
  const profile = await getCallerProfile();
  if (!profile) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!TUTOR_ROLES.includes(profile.role)) {
    return { error: NextResponse.json({ error: "no_centre" }, { status: 403 }) };
  }
  if (!profile.centre_id) {
    return { error: NextResponse.json({ error: "no_centre" }, { status: 403 }) };
  }
  return { user: { id: profile.id }, profile, centreId: profile.centre_id };
}

/** Require the caller to be the owner (or admin) of their centre. */
export async function requireCentreOwner(): Promise<AuthOk | AuthErr> {
  const profile = await getCallerProfile();
  if (!profile) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (profile.role !== "centre_owner" && profile.role !== "admin") {
    return { error: NextResponse.json({ error: "owner_only" }, { status: 403 }) };
  }
  if (!profile.centre_id) {
    return { error: NextResponse.json({ error: "no_centre" }, { status: 403 }) };
  }
  return { user: { id: profile.id }, profile, centreId: profile.centre_id };
}

export function isAuthErr(result: AuthOk | AuthErr): result is AuthErr {
  return (result as AuthErr).error !== undefined;
}

/** A 6-character human-friendly join code (no ambiguous characters). */
export function makeCentreCode(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

/** Verify a student belongs to the caller's centre. */
export async function studentInCentre(studentId: string, centreId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("students")
    .select("id")
    .eq("id", studentId)
    .eq("centre_id", centreId)
    .maybeSingle();
  return !!data;
}
