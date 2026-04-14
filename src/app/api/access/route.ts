import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  COOKIE_FREE_USED,
  COOKIE_PAID_SESSION,
  FREE_COOKIE_MAX_AGE_SECONDS,
  verifySessionToken,
} from "@/lib/access";

export const runtime = "nodejs";

/**
 * GET /api/access
 * Returns the user's current tier and remaining free usage.
 */
export async function GET() {
  const store = await cookies();
  const paidToken = store.get(COOKIE_PAID_SESSION)?.value;
  const freeUsed = store.get(COOKIE_FREE_USED)?.value === "1";

  const paid = verifySessionToken(paidToken) !== null;

  return NextResponse.json({
    paid,
    freeUsed,
    canAnalyzeFree: !paid && !freeUsed,
  });
}

/**
 * POST /api/access/consume-free
 * Marks the free analysis as used. Called after a successful first analysis.
 */
export async function POST() {
  const store = await cookies();
  // If already paid, don't consume the free slot.
  const paidToken = store.get(COOKIE_PAID_SESSION)?.value;
  if (verifySessionToken(paidToken)) {
    return NextResponse.json({ consumed: false, reason: "paid" });
  }

  store.set(COOKIE_FREE_USED, "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: FREE_COOKIE_MAX_AGE_SECONDS,
    path: "/",
  });

  return NextResponse.json({ consumed: true });
}
