import type { AwardLetter } from "@/lib/schema";
import { calcOutOfPocket } from "@/lib/money";

/**
 * Pick the "best value" college: lowest 4-year out-of-pocket cost,
 * factoring in whether the family is declining loans.
 * Tie-breaker: higher value_score.
 */
export function findWinner(letters: AwardLetter[], declineLoans: boolean): AwardLetter | null {
  if (letters.length === 0) return null;
  return [...letters].sort((a, b) => {
    const aOop = calcOutOfPocket(a, declineLoans) * 4;
    const bOop = calcOutOfPocket(b, declineLoans) * 4;
    if (aOop !== bOop) return aOop - bOop;
    return b.analysis.value_score - a.analysis.value_score;
  })[0];
}
