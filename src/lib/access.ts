/**
 * Freemium access control — cookie-based, no accounts required.
 *
 * Free tier: 1 full analysis. Tracked via `fla_free_used` cookie.
 * Paid tier: Multi-compare unlocked via `fla_paid_session` cookie (set after Stripe payment).
 *
 * Paid cookie is a signed token containing a session ID that also lives in Redis.
 * Cookie expires in 7 days (generous window for the user to finish their analysis).
 */

import { cookies } from "next/headers";
import crypto from "crypto";

export const COOKIE_FREE_USED = "fla_free_used";
export const COOKIE_PAID_SESSION = "fla_paid_session";

export const PAID_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days
export const FREE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 90; // 90 days

/** Sign a session token so it can't be forged client-side. */
export function signSessionToken(sessionId: string): string {
  const secret = process.env.STRIPE_SECRET_KEY || "dev-fallback-not-for-production";
  const sig = crypto
    .createHmac("sha256", secret)
    .update(sessionId)
    .digest("hex")
    .slice(0, 16);
  return `${sessionId}.${sig}`;
}

/** Verify a signed session token. Returns the sessionId if valid, null otherwise. */
export function verifySessionToken(token: string | undefined): string | null {
  if (!token) return null;
  const [sessionId, sig] = token.split(".");
  if (!sessionId || !sig) return null;
  const expected = signSessionToken(sessionId);
  if (expected !== token) return null;
  return sessionId;
}

/** Server-side check: does the current request have a valid paid session? */
export async function hasPaidAccess(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(COOKIE_PAID_SESSION)?.value;
  return verifySessionToken(token) !== null;
}

/** Server-side check: has this browser already used their free analysis? */
export async function hasUsedFreeAnalysis(): Promise<boolean> {
  const store = await cookies();
  return store.get(COOKIE_FREE_USED)?.value === "1";
}
