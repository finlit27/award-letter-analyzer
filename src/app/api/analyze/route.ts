import { NextRequest } from "next/server";
import pLimit from "p-limit";
import { AwardLetterSchema, type AwardLetter } from "@/lib/schema";
import { prepImage } from "@/lib/image-prep-server";
import { saveAnalysis } from "@/lib/kv";
import { sseStream, sseHeaders } from "@/lib/sse";
import { reconcileGiftAid } from "@/lib/reconcile";

export const runtime = "nodejs";
export const maxDuration = 60;

const N8N_TIMEOUT_MS = 55_000;
const PARALLEL_LIMIT = 3;

/**
 * Robustly extract JSON from an LLM response.
 * Handles markdown fences, leading/trailing prose, trailing commas.
 */
function cleanLLMJson(raw: string): string {
  let text = raw.trim();
  text = text.replace(/```json\s*\n?/gi, "").replace(/```\s*/g, "").trim();
  const first = text.search(/[\[{]/);
  const last = Math.max(text.lastIndexOf("]"), text.lastIndexOf("}"));
  if (first !== -1 && last > first) text = text.substring(first, last + 1);
  return text.replace(/,\s*([\]}])/g, "$1");
}

interface AnalyzeOk {
  ok: true;
  fileName: string;
  letter: AwardLetter;
}
interface AnalyzeErr {
  ok: false;
  fileName: string;
  error: string;
}
type AnalyzeOutcome = AnalyzeOk | AnalyzeErr;

async function analyzeOne(file: File, webhookUrl: string): Promise<AnalyzeOutcome> {
  const fileName = file.name || "unknown";
  try {
    // Server-side normalize: EXIF rotate, resize, JPEG re-encode.
    const inputBuffer = Buffer.from(await file.arrayBuffer());
    const prepped = await prepImage(inputBuffer);

    // Forward to n8n as multipart with the field name the workflow expects.
    const blob = new Blob([new Uint8Array(prepped.buffer)], { type: prepped.mime });
    const fd = new FormData();
    fd.append("pdfFile", blob, fileName.replace(/\.[^.]+$/, "") + ".jpg");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), N8N_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(webhookUrl, {
        method: "POST",
        body: fd,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      return { ok: false, fileName, error: `n8n HTTP ${response.status}` };
    }

    const text = await response.text();
    if (!text.trim()) {
      return { ok: false, fileName, error: "empty response from n8n" };
    }

    // n8n may return `{...}` or wrapped in fences/array — be permissive.
    const cleaned = cleanLLMJson(text);
    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return { ok: false, fileName, error: "invalid JSON from n8n" };
    }
    // Unwrap single-element array.
    const candidate = Array.isArray(parsed) ? parsed[0] : parsed;

    const result = AwardLetterSchema.safeParse(candidate);
    if (!result.success) {
      return { ok: false, fileName, error: "schema validation failed" };
    }
    return { ok: true, fileName, letter: reconcileGiftAid(result.data) };
  } catch (err) {
    const msg =
      err instanceof DOMException && err.name === "AbortError"
        ? "timeout"
        : err instanceof Error
          ? err.message
          : "unknown error";
    return { ok: false, fileName, error: msg };
  }
}

export async function POST(req: NextRequest) {
  const webhookUrl = process.env.N8N_WEBHOOK_URL_V2;
  if (!webhookUrl) {
    return new Response(
      JSON.stringify({ error: "N8N_WEBHOOK_URL_V2 not configured" }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }

  const formData = await req.formData();
  const files: File[] = [];
  for (const [key, value] of formData.entries()) {
    if (key === "pdfFile" && value instanceof File) files.push(value);
  }

  if (files.length === 0) {
    return new Response(
      JSON.stringify({ error: "No files provided" }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }

  const { stream, send, close } = sseStream();

  // Run async; the route returns the stream immediately.
  (async () => {
    send("start", { total: files.length });

    const limit = pLimit(PARALLEL_LIMIT);
    const results: AwardLetter[] = [];
    const errors: string[] = [];
    let completed = 0;

    await Promise.all(
      files.map((file) =>
        limit(async () => {
          const outcome = await analyzeOne(file, webhookUrl);
          completed += 1;
          if (outcome.ok) {
            results.push(outcome.letter);
            send("result", { fileName: outcome.fileName, letter: outcome.letter, completed, total: files.length });
          } else {
            errors.push(`${outcome.fileName}: ${outcome.error}`);
            send("error", { fileName: outcome.fileName, error: outcome.error, completed, total: files.length });
          }
        }),
      ),
    );

    let shareId: string | null = null;
    if (results.length > 0) {
      try {
        shareId = await saveAnalysis({ results, errors });
      } catch (err) {
        // Persistence failure shouldn't kill the response — user still gets results.
        console.error("[KV save failed]", err);
      }
    }

    send("done", { shareId, results, errors });
    close();
  })().catch((err) => {
    console.error("[analyze stream fatal]", err);
    send("fatal", { error: err instanceof Error ? err.message : "unknown" });
    close();
  });

  return new Response(stream, { headers: sseHeaders });
}
