import { describe, test, expect } from "vitest";
import { findWinner } from "@/lib/comparison";
import type { AwardLetter } from "@/lib/schema";

const make = (over: Partial<AwardLetter> & { name: string; netPrice: number; loans?: number; valueScore?: number }): AwardLetter => ({
  college_name: over.name,
  total_cost_of_attendance: over.netPrice + 10000,
  direct_costs: { tuition: over.netPrice, housing: 8000, fees: 2000 },
  grants_scholarships: { institutional_merit: 10000, pell_grant: 0, state_grant: 0, total_gift_aid: 10000 },
  loans: { federal_subsidized: over.loans ?? 0, federal_unsubsidized: 0, parent_plus: 0, private_loans: 0 },
  work_study: 0,
  net_price: over.netPrice,
  out_of_pocket_payment: over.netPrice - (over.loans ?? 0),
  analysis: { debt_warning: "Low", value_score: over.valueScore ?? 50 },
});

describe("findWinner", () => {
  test("picks lowest out-of-pocket when not declining loans", () => {
    const a = make({ name: "A", netPrice: 30000, loans: 5000 }); // OOP 25000
    const b = make({ name: "B", netPrice: 28000, loans: 0 }); // OOP 28000
    expect(findWinner([a, b], false)?.college_name).toBe("A");
  });

  test("declining loans flips the winner if loans were the difference", () => {
    const a = make({ name: "A", netPrice: 30000, loans: 5000 });
    const b = make({ name: "B", netPrice: 28000, loans: 0 });
    expect(findWinner([a, b], true)?.college_name).toBe("B");
  });

  test("tie on cost is broken by value_score", () => {
    const a = make({ name: "A", netPrice: 25000, loans: 0, valueScore: 60 });
    const b = make({ name: "B", netPrice: 25000, loans: 0, valueScore: 80 });
    expect(findWinner([a, b], false)?.college_name).toBe("B");
  });

  test("returns null on empty input", () => {
    expect(findWinner([], false)).toBeNull();
  });
});
