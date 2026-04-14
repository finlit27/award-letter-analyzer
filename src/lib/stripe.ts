import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set. Add it to .env.local");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-03-25.dahlia",
  typescript: true,
});

/** The price of a Multi-Compare unlock, in cents. */
export const MULTI_COMPARE_PRICE_CENTS = 2900;

/** Product metadata — used when creating Checkout sessions. */
export const PRODUCT_CONFIG = {
  name: "Award Letter Multi-Compare",
  description:
    "Compare up to 6 college award letters side-by-side. Full CFO analysis, 4-year cost projections, decline-loans scenario, and PDF export.",
};
