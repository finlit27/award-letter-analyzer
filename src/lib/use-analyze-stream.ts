"use client";

import { useCallback, useState } from "react";
import type { AwardLetter } from "@/lib/schema";

export interface AnalyzeStreamState {
  status: "idle" | "uploading" | "streaming" | "done" | "error";
  total: number;
  completed: number;
  results: Array<{ fileName: string; letter: AwardLetter }>;
  errors: Array<{ fileName: string; error: string }>;
  shareId: string | null;
  fatalError: string | null;
}

const initial: AnalyzeStreamState = {
  status: "idle",
  total: 0,
  completed: 0,
  results: [],
  errors: [],
  shareId: null,
  fatalError: null,
};

/**
 * Hook to call POST /api/analyze and consume its SSE stream.
 * Updates state per event so the UI can show per-letter progress.
 */
export function useAnalyzeStream() {
  const [state, setState] = useState<AnalyzeStreamState>(initial);

  const reset = useCallback(() => setState(initial), []);

  const start = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    setState({ ...initial, status: "uploading", total: files.length });

    const fd = new FormData();
    for (const f of files) fd.append("pdfFile", f);

    let res: Response;
    try {
      res = await fetch("/api/analyze", { method: "POST", body: fd });
    } catch (err) {
      setState((s) => ({ ...s, status: "error", fatalError: err instanceof Error ? err.message : "network error" }));
      return;
    }

    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => "");
      setState((s) => ({ ...s, status: "error", fatalError: text || `HTTP ${res.status}` }));
      return;
    }

    setState((s) => ({ ...s, status: "streaming" }));

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });

      // Process complete SSE blocks (separated by blank line).
      let idx: number;
      while ((idx = buf.indexOf("\n\n")) !== -1) {
        const block = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        const eventLine = block.split("\n").find((l) => l.startsWith("event: "));
        const dataLine = block.split("\n").find((l) => l.startsWith("data: "));
        if (!eventLine || !dataLine) continue;
        const event = eventLine.slice(7);
        let data: unknown;
        try {
          data = JSON.parse(dataLine.slice(6));
        } catch {
          continue;
        }
        applyEvent(event, data);
      }
    }
  }, []);

  const applyEvent = (event: string, data: unknown) => {
    setState((s) => {
      const d = data as Record<string, unknown>;
      switch (event) {
        case "start":
          return { ...s, total: Number(d.total) || s.total };
        case "result": {
          const fileName = String(d.fileName);
          const letter = d.letter as AwardLetter;
          return {
            ...s,
            completed: Number(d.completed) || s.completed + 1,
            results: [...s.results, { fileName, letter }],
          };
        }
        case "error": {
          const fileName = String(d.fileName);
          const error = String(d.error);
          return {
            ...s,
            completed: Number(d.completed) || s.completed + 1,
            errors: [...s.errors, { fileName, error }],
          };
        }
        case "done": {
          const shareId = (d.shareId as string | null) ?? null;
          return { ...s, status: "done", shareId };
        }
        case "fatal":
          return { ...s, status: "error", fatalError: String(d.error) };
        default:
          return s;
      }
    });
  };

  return { state, start, reset };
}
