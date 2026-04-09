import { describe, test, expect } from "vitest";
import { projectFourYear } from "@/lib/projection";
import type { AwardLetter } from "@/lib/schema";

const letter: AwardLetter = {
  college_name: "Test U",
  total_cost_of_attendance: 50000,
  direct_costs: { tuition: 35000, housing: 12000, fees: 3000 },
  grants_scholarships: {
    institutional_merit: 10000,
    pell_grant: 5000,
    state_grant: 0,
    total_gift_aid: 15000,
  },
  loans: {
    federal_subsidized: 3500,
    federal_unsubsidized: 2000,
    parent_plus: 0,
    private_loans: 0,
  },
  work_study: 0,
  net_price: 35000,
  out_of_pocket_payment: 29500,
  analysis: { debt_warning: "Medium", value_score: 65 },
};

describe("projectFourYear", () => {
  test("0% inflation: all years identical", () => {
    const p = projectFourYear(letter, 0);
    expect(p.years.map((y) => y.netPrice)).toEqual([35000, 35000, 35000, 35000]);
    expect(p.totalNetPrice).toBe(140000);
  });

  test("5% inflation: compounds from year 1", () => {
    const p = projectFourYear(letter, 0.05);
    expect(p.years[0].netPrice).toBe(35000);
    expect(p.years[1].netPrice).toBe(Math.round(35000 * 1.05));
    expect(p.years[2].netPrice).toBe(Math.round(35000 * 1.05 * 1.05));
    expect(p.years[3].netPrice).toBe(Math.round(35000 * Math.pow(1.05, 3)));
  });

  test("10% inflation", () => {
    const p = projectFourYear(letter, 0.1);
    expect(p.years[3].netPrice).toBe(Math.round(35000 * Math.pow(1.1, 3)));
    expect(p.totalNetPrice).toBeGreaterThan(140000);
  });

  test("declineLoans raises year 1 out-of-pocket", () => {
    const withLoans = projectFourYear(letter, 0, false);
    const declining = projectFourYear(letter, 0, true);
    expect(withLoans.years[0].outOfPocket).toBe(29500);
    expect(declining.years[0].outOfPocket).toBe(35000);
    expect(declining.totalOutOfPocket).toBeGreaterThan(withLoans.totalOutOfPocket);
  });

  test("returns 4 years", () => {
    const p = projectFourYear(letter, 0.05);
    expect(p.years).toHaveLength(4);
    expect(p.years.map((y) => y.year)).toEqual([1, 2, 3, 4]);
  });
});
