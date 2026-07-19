import Stripe from "stripe";

// Lazy client: constructing Stripe at module top level throws when
// STRIPE_SECRET_KEY is absent, crashing `next build` page-data collection.
// A missing key should fail the billing request, not the whole build.
let client: Stripe | null = null;

export function getStripe(): Stripe {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("Stripe is not configured: set STRIPE_SECRET_KEY.");
    }
    client = new Stripe(key, {
      apiVersion: "2026-02-25.clover",
      typescript: true,
    });
  }
  return client;
}
