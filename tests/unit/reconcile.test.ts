import { describe, it, expect } from "vitest";
import { reconcileGiftAid } from "@/lib/reconcile";
import type { AwardLetter } from "@/lib/schema";

function letter(over: Partial<AwardLetter["grants_scholarships"]>): AwardLetter {
  return {
    college_name: "Test U",
    total_cost_of_attendance: 50_000,
    direct_costs: { tuition: 30_000, housing: 15_000, fees: 1_000 },
    grants_scholarships: {
      institutional_merit: 0,
      pell_grant: 0,
      state_grant: 0,
      total_gift_aid: 0,
      ...over,
    },
    loans: {
      federal_subsidized: 0,
      federal_unsubsidized: 0,
      parent_plus: 0,
      private_loans: 0,
    },
    work_study: 0,
    net_price: 50_000,
    out_of_pocket_payment: 50_000,
    analysis: { debt_warning: "Low", value_score: 50 },
  };
}

describe("reconcileGiftAid", () => {
  it("no-ops when breakdown matches total", () => {
    const input = letter({
      institutional_merit: 5_000,
      pell_grant: 7_395,
      state_grant: 12_570,
      total_gift_aid: 24_965,
    });
    const out = reconcileGiftAid(input);
    expect(out.grants_scholarships).toEqual(input.grants_scholarships);
  });

  it("Pomona case: backfills missing $28k into institutional_merit", () => {
    const input = letter({
      institutional_merit: 35_000,
      pell_grant: 7_395,
      state_grant: 9_358,
      total_gift_aid: 79_753,
    });
    const out = reconcileGiftAid(input);
    expect(out.grants_scholarships.institutional_merit).toBe(63_000);
    expect(out.grants_scholarships.total_gift_aid).toBe(79_753);
  });

  it("La Verne case: backfills missing $3k into institutional_merit", () => {
    const input = letter({
      institutional_merit: 22_000,
      pell_grant: 4_500,
      state_grant: 0,
      total_gift_aid: 29_500,
    });
    const out = reconcileGiftAid(input);
    expect(out.grants_scholarships.institutional_merit).toBe(25_000);
    expect(out.grants_scholarships.total_gift_aid).toBe(29_500);
  });

  it("breakdown exceeds total: trusts the breakdown and updates total", () => {
    const input = letter({
      institutional_merit: 10_000,
      pell_grant: 7_000,
      state_grant: 5_000,
      total_gift_aid: 15_000,
    });
    const out = reconcileGiftAid(input);
    expect(out.grants_scholarships.total_gift_aid).toBe(22_000);
    expect(out.grants_scholarships.institutional_merit).toBe(10_000);
  });

  it("all zeros: no-op", () => {
    const input = letter({});
    const out = reconcileGiftAid(input);
    expect(out.grants_scholarships).toEqual(input.grants_scholarships);
  });

  it("sub-dollar drift treated as zero", () => {
    const input = letter({
      institutional_merit: 1_000,
      pell_grant: 2_000,
      state_grant: 3_000,
      total_gift_aid: 6_000.5,
    });
    const out = reconcileGiftAid(input);
    expect(out.grants_scholarships).toEqual(input.grants_scholarships);
  });

  it("preserves all non-grant fields", () => {
    const input = letter({
      institutional_merit: 35_000,
      pell_grant: 7_395,
      state_grant: 9_358,
      total_gift_aid: 79_753,
    });
    const out = reconcileGiftAid(input);
    expect(out.college_name).toBe(input.college_name);
    expect(out.loans).toEqual(input.loans);
    expect(out.work_study).toBe(input.work_study);
    expect(out.net_price).toBe(input.net_price);
    expect(out.analysis).toEqual(input.analysis);
  });
});
