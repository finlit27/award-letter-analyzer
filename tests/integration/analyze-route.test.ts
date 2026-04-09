import { describe, test, expect, vi, beforeEach } from "vitest";
import sharp from "sharp";

// --- Mock KV before importing the route ---
const kvStore = new Map<string, unknown>();
vi.mock("@upstash/redis", () => ({
  Redis: {
    fromEnv: () => ({
      set: vi.fn(async (k: string, v: unknown) => {
        kvStore.set(k, v);
        return "OK";
      }),
      get: vi.fn(async (k: string) => kvStore.get(k) ?? null),
    }),
  },
}));

const validLetter = {
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

let smallJpeg: Buffer;
beforeEach(async () => {
  process.env.N8N_WEBHOOK_URL_V2 = "https://mock-n8n.test/webhook/v2";
  kvStore.clear();
  vi.restoreAllMocks();
  if (!smallJpeg) {
    smallJpeg = await sharp({
      create: { width: 200, height: 200, channels: 3, background: { r: 255, g: 255, b: 255 } },
    })
      .jpeg()
      .toBuffer();
  }
});

async function readSse(body: ReadableStream<Uint8Array>): Promise<Array<{ event: string; data: unknown }>> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value);
  }
  const events: Array<{ event: string; data: unknown }> = [];
  for (const block of buf.split("\n\n")) {
    if (!block.trim()) continue;
    const lines = block.split("\n");
    const eventLine = lines.find((l) => l.startsWith("event: "));
    const dataLine = lines.find((l) => l.startsWith("data: "));
    if (!eventLine || !dataLine) continue;
    events.push({
      event: eventLine.slice(7),
      data: JSON.parse(dataLine.slice(6)),
    });
  }
  return events;
}

function makeRequest(files: Buffer[]) {
  const fd = new FormData();
  for (let i = 0; i < files.length; i++) {
    fd.append("pdfFile", new Blob([files[i]], { type: "image/jpeg" }), `letter-${i}.jpg`);
  }
  return new Request("http://localhost/api/analyze", { method: "POST", body: fd });
}

describe("/api/analyze", () => {
  test("happy path: single file → result + done with shareId", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify(validLetter), { status: 200 }),
      ),
    );
    const { POST } = await import("@/app/api/analyze/route");
    const res = await POST(makeRequest([smallJpeg]) as never);
    expect(res.headers.get("content-type")).toContain("text/event-stream");
    const events = await readSse(res.body!);
    const types = events.map((e) => e.event);
    expect(types).toContain("start");
    expect(types).toContain("result");
    expect(types).toContain("done");
    const done = events.find((e) => e.event === "done")!.data as { shareId: string; results: unknown[] };
    expect(done.results).toHaveLength(1);
    expect(typeof done.shareId).toBe("string");
  });

  test("invalid JSON from n8n → error event, no result", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("not json at all", { status: 200 })),
    );
    const { POST } = await import("@/app/api/analyze/route");
    const res = await POST(makeRequest([smallJpeg]) as never);
    const events = await readSse(res.body!);
    const errEvent = events.find((e) => e.event === "error");
    expect(errEvent).toBeDefined();
    const done = events.find((e) => e.event === "done")!.data as { shareId: string | null; results: unknown[] };
    expect(done.results).toHaveLength(0);
    expect(done.shareId).toBeNull();
  });

  test("schema validation failure → error event", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ college_name: "X" /* missing fields */ }), { status: 200 }),
      ),
    );
    const { POST } = await import("@/app/api/analyze/route");
    const res = await POST(makeRequest([smallJpeg]) as never);
    const events = await readSse(res.body!);
    expect(events.find((e) => e.event === "error")).toBeDefined();
  });

  test("multi-file: 3 results stream in any order", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify(validLetter), { status: 200 }),
      ),
    );
    const { POST } = await import("@/app/api/analyze/route");
    const res = await POST(makeRequest([smallJpeg, smallJpeg, smallJpeg]) as never);
    const events = await readSse(res.body!);
    const results = events.filter((e) => e.event === "result");
    expect(results).toHaveLength(3);
    const done = events.find((e) => e.event === "done")!.data as { results: unknown[] };
    expect(done.results).toHaveLength(3);
  });

  test("n8n 500 → error event, done with empty results", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("server error", { status: 500 })),
    );
    const { POST } = await import("@/app/api/analyze/route");
    const res = await POST(makeRequest([smallJpeg]) as never);
    const events = await readSse(res.body!);
    expect(events.find((e) => e.event === "error")).toBeDefined();
  });

  test("missing env var → 500", async () => {
    delete process.env.N8N_WEBHOOK_URL_V2;
    const { POST } = await import("@/app/api/analyze/route");
    const res = await POST(makeRequest([smallJpeg]) as never);
    expect(res.status).toBe(500);
  });

  test("no files → 400", async () => {
    const { POST } = await import("@/app/api/analyze/route");
    const res = await POST(new Request("http://localhost/api/analyze", { method: "POST", body: new FormData() }) as never);
    expect(res.status).toBe(400);
  });
});
