import { describe, test, expect, vi, beforeEach } from "vitest";

const store = new Map<string, unknown>();
const setMock = vi.fn(async (key: string, value: unknown) => {
  store.set(key, value);
  return "OK";
});
const getMock = vi.fn(async (key: string) => store.get(key) ?? null);

vi.mock("@upstash/redis", () => ({
  Redis: {
    fromEnv: () => ({ set: setMock, get: getMock }),
  },
}));

import { saveAnalysis, loadAnalysis } from "@/lib/kv";
import type { AwardLetter } from "@/lib/schema";

const sampleLetter: AwardLetter = {
  college_name: "Test U",
  total_cost_of_attendance: 40000,
  direct_costs: { tuition: 28000, housing: 10000, fees: 2000 },
  grants_scholarships: {
    institutional_merit: 8000,
    pell_grant: 0,
    state_grant: 0,
    total_gift_aid: 8000,
  },
  loans: {
    federal_subsidized: 0,
    federal_unsubsidized: 0,
    parent_plus: 0,
    private_loans: 0,
  },
  work_study: 0,
  net_price: 32000,
  out_of_pocket_payment: 32000,
  analysis: { debt_warning: "Low", value_score: 80 },
};

beforeEach(() => {
  store.clear();
  setMock.mockClear();
  getMock.mockClear();
});

describe("kv", () => {
  test("saveAnalysis returns a short id and persists the record", async () => {
    const id = await saveAnalysis({ results: [sampleLetter], errors: [] });
    expect(id).toMatch(/^[A-Za-z0-9_-]{10}$/);
    expect(setMock).toHaveBeenCalledTimes(1);
    const [key, value, options] = setMock.mock.calls[0];
    expect(key).toBe(`analysis:${id}`);
    expect(options).toEqual({ ex: 60 * 60 * 24 * 30 });
    expect((value as { results: unknown[] }).results).toHaveLength(1);
  });

  test("loadAnalysis round-trips a saved record", async () => {
    const id = await saveAnalysis({ results: [sampleLetter], errors: ["one failed"] });
    const loaded = await loadAnalysis(id);
    expect(loaded).not.toBeNull();
    expect(loaded!.results[0].college_name).toBe("Test U");
    expect(loaded!.errors).toEqual(["one failed"]);
    expect(typeof loaded!.createdAt).toBe("number");
  });

  test("loadAnalysis returns null for missing id", async () => {
    expect(await loadAnalysis("nonexistent")).toBeNull();
  });
});
