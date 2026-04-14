import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import type Stripe from "stripe";

export const runtime = "nodejs";

/**
 * Stripe webhook handler.
 * Verifies the signature, then logs successful checkouts so we have a server-side
 * record independent of the success-page cookie flow.
 *
 * Local testing: pipe events with `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
 * then copy the printed `whsec_...` into STRIPE_WEBHOOK_SECRET in .env.local.
 */
export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    console.error("Webhook received with missing signature or secret");
    return NextResponse.json(
      { error: "Webhook signature or secret missing" },
      { status: 400 },
    );
  }

  // Stripe requires the raw body to verify the signature.
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown signature error";
    console.error("Webhook signature verification failed:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // Handle events we care about.
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log("Paid session completed:", {
        sessionId: session.id,
        email: session.customer_details?.email,
        amount: session.amount_total,
        currency: session.currency,
      });
      // In the future, persist to Redis / Supabase / Airtable for lead nurture.
      break;
    }
    case "charge.refunded":
    case "charge.dispute.created":
      console.log(`Stripe event needs attention: ${event.type}`, event.data.object);
      break;
    default:
      // Silently acknowledge other events.
      break;
  }

  return NextResponse.json({ received: true });
}
