import type { AwardLetter } from "./schema";

/**
 * Post-LLM reconciliation pass.
 *
 * The LLM (Haiku 4.5) reliably extracts `total_gift_aid` correctly but
 * sometimes drops a sub-grant from the breakdown — e.g. it sees a $28k
 * Pomona Grant, adds it to the total, but never assigns it to
 * `institutional_merit`. The breakdown then visibly fails to add up.
 *
 * Trust the total, back-fill the diff into institutional_merit (the only
 * bucket the LLM's prompt makes a judgment call on; pell and state grants
 * are name-pattern matches and very rarely wrong).
 */
export function reconcileGiftAid(letter: AwardLetter): AwardLetter {
  const g = letter.grants_scholarships;
  const breakdownSum = g.institutional_merit + g.pell_grant + g.state_grant;
  const diff = g.total_gift_aid - breakdownSum;

  if (Math.abs(diff) < 1) return letter;

  if (diff > 0) {
    return {
      ...letter,
      grants_scholarships: {
        ...g,
        institutional_merit: g.institutional_merit + diff,
      },
    };
  }

  return {
    ...letter,
    grants_scholarships: {
      ...g,
      total_gift_aid: breakdownSum,
    },
  };
}
