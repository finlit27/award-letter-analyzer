import { describe, test, expect } from "vitest";
import { sseStream } from "@/lib/sse";

async function readAll(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let out = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    out += decoder.decode(value);
  }
  return out;
}

describe("sseStream", () => {
  test("emits event/data frames in SSE format", async () => {
    const { stream, send, close } = sseStream();
    send("progress", { current: 1, total: 3 });
    send("result", { college_name: "State U" });
    close();

    const text = await readAll(stream);
    expect(text).toContain("event: progress\n");
    expect(text).toContain('data: {"current":1,"total":3}\n\n');
    expect(text).toContain("event: result\n");
    expect(text).toContain('data: {"college_name":"State U"}\n\n');
  });

  test("send after close is a no-op", async () => {
    const { stream, send, close } = sseStream();
    send("a", { x: 1 });
    close();
    send("b", { x: 2 });

    const text = await readAll(stream);
    expect(text).toContain("event: a\n");
    expect(text).not.toContain("event: b\n");
  });
});
