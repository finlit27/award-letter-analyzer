import { describe, test, expect } from "vitest";
import { AwardLetterSchema, parseAwardLetterResponse } from "@/lib/schema";

const valid = {
  college_name: "State University",
  total_cost_of_attendance: 45000,
  direct_costs: { tuition: 30000, housing: 12000, fees: 3000 },
  grants_scholarships: {
    institutional_merit: 10000,
    pell_grant: 5000,
    state_grant: 2000,
    total_gift_aid: 17000,
  },
  loans: {
    federal_subsidized: 3500,
    federal_unsubsidized: 2000,
    parent_plus: 0,
    private_loans: 0,
  },
  work_study: 2000,
  net_price: 28000,
  out_of_pocket_payment: 28000,
  analysis: { debt_warning: "Medium" as const, value_score: 72 },
};

describe("AwardLetterSchema", () => {
  test("parses a valid payload", () => {
    expect(() => AwardLetterSchema.parse(valid)).not.toThrow();
  });

  test("rejects negative tuition", () => {
    expect(() =>
      AwardLetterSchema.parse({
        ...valid,
        direct_costs: { ...valid.direct_costs, tuition: -1 },
      }),
    ).toThrow();
  });

  test("rejects invalid debt_warning", () => {
    expect(() =>
      AwardLetterSchema.parse({
        ...valid,
        analysis: { debt_warning: "Unknown", value_score: 50 },
      }),
    ).toThrow();
  });

  test("rejects value_score > 100", () => {
    expect(() =>
      AwardLetterSchema.parse({
        ...valid,
        analysis: { debt_warning: "Low", value_score: 150 },
      }),
    ).toThrow();
  });
});

describe("parseAwardLetterResponse", () => {
  test("accepts a single object and returns array of one", () => {
    const result = parseAwardLetterResponse(valid);
    expect(result).toHaveLength(1);
    expect(result[0].college_name).toBe("State University");
  });

  test("accepts an array and returns it", () => {
    const result = parseAwardLetterResponse([valid, { ...valid, college_name: "Other U" }]);
    expect(result).toHaveLength(2);
    expect(result[1].college_name).toBe("Other U");
  });

  test("throws on invalid payload", () => {
    expect(() => parseAwardLetterResponse({ bogus: true })).toThrow();
  });
});
