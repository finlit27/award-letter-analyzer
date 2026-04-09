import type { AwardLetter } from "@/lib/schema";

/** Format a number as USD, no cents. */
export function formatUSD(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

/** Parse "$12,345" or "12345.67" into a number. Returns 0 on junk. */
export function parseCurrency(input: string): number {
  if (!input) return 0;
  const cleaned = input.replace(/[^0-9.-]/g, "");
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

/** Sum all loan categories for a letter. */
export function sumLoans(letter: AwardLetter): number {
  const l = letter.loans;
  return l.federal_subsidized + l.federal_unsubsidized + l.parent_plus + l.private_loans;
}

/** Net price = total cost − total gift aid. Never negative. */
export function calcNetPrice(letter: AwardLetter): number {
  return Math.max(
    0,
    letter.total_cost_of_attendance - letter.grants_scholarships.total_gift_aid,
  );
}

/**
 * Out-of-pocket the family actually pays.
 * If declineLoans is true, subtract loans (family pays more cash but takes no debt).
 * If declineLoans is false, loans cover part of net price (but are still debt).
 */
export function calcOutOfPocket(letter: AwardLetter, declineLoans: boolean): number {
  const netPrice = calcNetPrice(letter);
  if (declineLoans) {
    // Family pays the full net price in cash; no loans taken.
    return netPrice;
  }
  // Loans offset net price; family pays the remainder in cash.
  return Math.max(0, netPrice - sumLoans(letter));
}
