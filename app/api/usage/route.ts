import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const FREE_DAILY_LIMIT = 5;

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get profile for subscription status
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("subscription_status")
      .eq("id", user.id)
      .single();

    const subscriptionStatus = profile?.subscription_status || "free";

    if (subscriptionStatus === "pro") {
      return NextResponse.json({
        canPrompt: true,
        promptsUsed: 0,
        promptsLimit: Infinity,
        subscriptionStatus: "pro",
      });
    }

    // Free user — check daily usage
    const today = new Date().toISOString().split("T")[0];

    const { data: usage } = await supabaseAdmin
      .from("daily_usage")
      .select("prompt_count")
      .eq("user_id", user.id)
      .eq("usage_date", today)
      .single();

    const promptsUsed = usage?.prompt_count || 0;

    return NextResponse.json({
      canPrompt: promptsUsed < FREE_DAILY_LIMIT,
      promptsUsed,
      promptsLimit: FREE_DAILY_LIMIT,
      subscriptionStatus,
    });
  } catch (error) {
    console.error("Usage API error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
