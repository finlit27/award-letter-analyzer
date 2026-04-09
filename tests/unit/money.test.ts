import { describe, test, expect } from "vitest";
import {
  formatUSD,
  parseCurrency,
  sumLoans,
  calcNetPrice,
  calcOutOfPocket,
} from "@/lib/money";
import type { AwardLetter } from "@/lib/schema";

const sample: AwardLetter = {
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
  work_study: 2000,
  net_price: 35000,
  out_of_pocket_payment: 29500,
  analysis: { debt_warning: "Medium", value_score: 65 },
};

describe("formatUSD", () => {
  test("formats whole dollars with commas", () => {
    expect(formatUSD(12345)).toBe("$12,345");
  });
  test("rounds cents away", () => {
    expect(formatUSD(99.99)).toBe("$100");
  });
  test("handles zero", () => {
    expect(formatUSD(0)).toBe("$0");
  });
});

describe("parseCurrency", () => {
  test("strips $ and commas", () => {
    expect(parseCurrency("$12,345")).toBe(12345);
  });
  test("handles plain number", () => {
    expect(parseCurrency("5000.50")).toBe(5000.5);
  });
  test("returns 0 on junk", () => {
    expect(parseCurrency("abc")).toBe(0);
    expect(parseCurrency("")).toBe(0);
  });
});

describe("sumLoans", () => {
  test("adds all four loan types", () => {
    expect(sumLoans(sample)).toBe(5500);
  });
});

describe("calcNetPrice", () => {
  test("cost minus gift aid", () => {
    expect(calcNetPrice(sample)).toBe(35000);
  });
  test("never negative", () => {
    const free: AwardLetter = {
      ...sample,
      total_cost_of_attendance: 10000,
      grants_scholarships: { ...sample.grants_scholarships, total_gift_aid: 20000 },
    };
    expect(calcNetPrice(free)).toBe(0);
  });
});

describe("calcOutOfPocket", () => {
  test("with loans: net price − loans", () => {
    expect(calcOutOfPocket(sample, false)).toBe(29500);
  });
  test("declining loans: full net price in cash", () => {
    expect(calcOutOfPocket(sample, true)).toBe(35000);
  });
  test("never negative even if loans exceed net price", () => {
    const weird: AwardLetter = {
      ...sample,
      loans: { ...sample.loans, parent_plus: 100000 },
    };
    expect(calcOutOfPocket(weird, false)).toBe(0);
  });
});
