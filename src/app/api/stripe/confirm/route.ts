import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import {
  COOKIE_PAID_SESSION,
  PAID_COOKIE_MAX_AGE_SECONDS,
  signSessionToken,
} from "@/lib/access";

export const runtime = "nodejs";

/**
 * GET /api/stripe/confirm?session_id=...
 *
 * Stripe Checkout redirects here after a successful payment.
 * We verify the session server-side, set a signed access cookie,
 * then redirect to /success for display.
 *
 * Cookies must be set from a Route Handler or Server Action in Next.js 15+,
 * which is why this exists separately from the /success page.
 */
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id");
  const origin = req.nextUrl.origin;

  if (!sessionId) {
    return NextResponse.redirect(new URL("/?checkout=missing", origin));
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // "no_payment_required" is Stripe's status when a 100% promo code is applied.
    if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
      return NextResponse.redirect(new URL("/?checkout=unpaid", origin));
    }

    const token = signSessionToken(session.id);

    const response = NextResponse.redirect(
      new URL(`/success?session_id=${encodeURIComponent(session.id)}`, origin),
    );
    response.cookies.set(COOKIE_PAID_SESSION, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: PAID_COOKIE_MAX_AGE_SECONDS,
      path: "/",
    });
    return response;
  } catch (err) {
    console.error("Failed to confirm Stripe session:", err);
    return NextResponse.redirect(new URL("/?checkout=error", origin));
  }
}
