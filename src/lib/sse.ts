/**
 * Minimal Server-Sent Events helper for Next.js route handlers.
 *
 * Usage:
 *   const { stream, send, close } = sseStream();
 *   send("progress", { current: 1, total: 3 });
 *   send("result", letter);
 *   close();
 *   return new Response(stream, { headers: sseHeaders });
 */

export const sseHeaders = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  // Prevents proxies (including Vercel's) from buffering the stream.
  "X-Accel-Buffering": "no",
};

export interface SseController {
  stream: ReadableStream<Uint8Array>;
  send: (event: string, data: unknown) => void;
  close: () => void;
}

export function sseStream(): SseController {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController<Uint8Array> | null = null;
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
    cancel() {
      closed = true;
    },
  });

  const send = (event: string, data: unknown) => {
    if (closed || !controller) return;
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    controller.enqueue(encoder.encode(payload));
  };

  const close = () => {
    if (closed || !controller) return;
    closed = true;
    controller.close();
  };

  return { stream, send, close };
}
