import { z } from "zod";

/**
 * Canonical schema for a single analyzed award letter.
 * This is the single source of truth — types/index.ts re-exports from here.
 */

export const DebtWarningSchema = z.enum(["Low", "Medium", "High", "Critical"]);

export const DirectCostsSchema = z.object({
  tuition: z.number().nonnegative(),
  housing: z.number().nonnegative(),
  fees: z.number().nonnegative(),
});

export const GrantsSchema = z.object({
  institutional_merit: z.number().nonnegative(),
  pell_grant: z.number().nonnegative(),
  state_grant: z.number().nonnegative(),
  total_gift_aid: z.number().nonnegative(),
});

export const LoansSchema = z.object({
  federal_subsidized: z.number().nonnegative(),
  federal_unsubsidized: z.number().nonnegative(),
  parent_plus: z.number().nonnegative(),
  private_loans: z.number().nonnegative(),
});

export const AnalysisMetaSchema = z.object({
  debt_warning: DebtWarningSchema,
  value_score: z.number().min(0).max(100),
});

export const AwardLetterSchema = z.object({
  college_name: z.string().min(1),
  total_cost_of_attendance: z.number().nonnegative(),
  direct_costs: DirectCostsSchema,
  grants_scholarships: GrantsSchema,
  loans: LoansSchema,
  work_study: z.number().nonnegative(),
  net_price: z.number().nonnegative(),
  out_of_pocket_payment: z.number().nonnegative(),
  analysis: AnalysisMetaSchema,
});

export type AwardLetter = z.infer<typeof AwardLetterSchema>;
export type DebtWarning = z.infer<typeof DebtWarningSchema>;

/** Accepts either a single object or an array; returns an array. */
export function parseAwardLetterResponse(raw: unknown): AwardLetter[] {
  if (Array.isArray(raw)) {
    return raw.map((item) => AwardLetterSchema.parse(item));
  }
  return [AwardLetterSchema.parse(raw)];
}
