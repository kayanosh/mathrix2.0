import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;
        if (userId && session.subscription) {
          await supabaseAdmin
            .from("profiles")
            .update({
              subscription_status: "pro",
              stripe_subscription_id: session.subscription as string,
              stripe_customer_id: session.customer as string,
            })
            .eq("id", userId);
          console.log(`[Stripe] User ${userId} upgraded to pro`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("stripe_subscription_id", subscription.id)
          .single();

        if (profile) {
          await supabaseAdmin
            .from("profiles")
            .update({
              subscription_status: "free",
              stripe_subscription_id: null,
            })
            .eq("id", profile.id);
          console.log(`[Stripe] User ${profile.id} subscription cancelled`);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("stripe_subscription_id", subscription.id)
          .single();

        if (profile) {
          const status = subscription.status === "active" ? "pro" : "free";
          await supabaseAdmin
            .from("profiles")
            .update({ subscription_status: status })
            .eq("id", profile.id);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (profile) {
          console.log(`[Stripe] Payment failed for user ${profile.id}`);
        }
        break;
      }
    }
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
