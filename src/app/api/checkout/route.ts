import { NextRequest, NextResponse } from "next/server";
import { stripe, MULTI_COMPARE_PRICE_CENTS, PRODUCT_CONFIG } from "@/lib/stripe";

export const runtime = "nodejs";

/**
 * Create a Stripe Checkout session for the $29 Multi-Compare unlock.
 * Redirects the user to Stripe's hosted payment page.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email: string | undefined = body.email;

    const origin =
      req.headers.get("origin") ||
      req.headers.get("referer")?.split("/").slice(0, 3).join("/") ||
      "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: PRODUCT_CONFIG.name,
              description: PRODUCT_CONFIG.description,
            },
            unit_amount: MULTI_COMPARE_PRICE_CENTS,
          },
          quantity: 1,
        },
      ],
      // Route handler verifies + sets cookie, then redirects to /success for display.
      success_url: `${origin}/api/stripe/confirm?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?checkout=cancelled`,
      customer_email: email,
      // Collect address for future tax compliance reporting (free; no Stripe Tax).
      billing_address_collection: "auto",
      // Enable promo codes (e.g., for workshop attendees).
      allow_promotion_codes: true,
    });

    if (!session.url) {
      return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
    }

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error("Checkout session creation failed:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
