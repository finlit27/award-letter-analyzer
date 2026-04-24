#!/usr/bin/env node
/**
 * LLM extraction validator.
 * For each PDF: render page 1 to PNG via pdftoppm, POST to /api/analyze,
 * parse the SSE stream, and collect the parsed AwardLetter result.
 *
 * Outputs raw results to results.json. A second script (report.mjs) diffs
 * against ground-truth.json and writes the markdown report.
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PDF_DIR =
  "/Users/christopherjackson/Documents/3_Da-Vinci-Schools/PDFs/App AWARD LETTERS/files";
const API_URL =
  process.env.API_URL || "https://analyzer.finlitgarden.com/api/analyze";
const RESULTS_PATH = path.join(__dirname, "results.json");

const truth = JSON.parse(
  fs.readFileSync(path.join(__dirname, "ground-truth.json"), "utf8"),
);
const letterNames = Object.keys(truth.letters);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "award-val-"));
console.log(`[validator] tmp: ${tmp}`);
console.log(`[validator] API: ${API_URL}`);
console.log(`[validator] letters: ${letterNames.length}\n`);

function renderPage1(pdfPath, outPrefix) {
  // pdftoppm -png -r 150 -f 1 -l 1 input.pdf outPrefix  →  outPrefix-1.png
  execFileSync(
    "pdftoppm",
    ["-png", "-r", "150", "-f", "1", "-l", "1", pdfPath, outPrefix],
    { stdio: "pipe" },
  );
  const out = `${outPrefix}-1.png`;
  if (!fs.existsSync(out)) throw new Error(`pdftoppm produced no ${out}`);
  return out;
}

async function analyze(pngPath, fileName) {
  const buf = fs.readFileSync(pngPath);
  const blob = new Blob([buf], { type: "image/png" });
  const fd = new FormData();
  fd.append("pdfFile", blob, fileName);

  const started = Date.now();
  const res = await fetch(API_URL, { method: "POST", body: fd });
  if (!res.ok) {
    return { ok: false, error: `HTTP ${res.status}`, ms: Date.now() - started };
  }
  if (!res.body) {
    return { ok: false, error: "no response body", ms: Date.now() - started };
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let letter = null;
  let sseError = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const block = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const eventLine = block
        .split("\n")
        .find((l) => l.startsWith("event: "));
      const dataLine = block.split("\n").find((l) => l.startsWith("data: "));
      if (!eventLine || !dataLine) continue;
      const event = eventLine.slice(7).trim();
      let data;
      try {
        data = JSON.parse(dataLine.slice(6));
      } catch {
        continue;
      }
      if (event === "result") letter = data.letter;
      else if (event === "error") sseError = data.error;
      else if (event === "done") {
        // `done` includes results array — but we already captured per-file.
      }
    }
  }

  const ms = Date.now() - started;
  if (letter) return { ok: true, letter, ms };
  return { ok: false, error: sseError || "no result event", ms };
}

const all = [];
for (let i = 0; i < letterNames.length; i++) {
  const name = letterNames[i];
  const pdfPath = path.join(PDF_DIR, name);
  const outPrefix = path.join(tmp, name.replace(/\.pdf$/, ""));
  const label = `[${i + 1}/${letterNames.length}] ${name}`;
  try {
    const png = renderPage1(pdfPath, outPrefix);
    process.stdout.write(`${label} analyzing... `);
    const r = await analyze(png, name.replace(/\.pdf$/, ".png"));
    if (r.ok) {
      console.log(`ok (${r.ms}ms) — ${r.letter.college_name}`);
      all.push({ fileName: name, ok: true, letter: r.letter, ms: r.ms });
    } else {
      console.log(`FAIL (${r.ms}ms) — ${r.error}`);
      all.push({ fileName: name, ok: false, error: r.error, ms: r.ms });
    }
  } catch (err) {
    console.log(`ERROR — ${err.message}`);
    all.push({ fileName: name, ok: false, error: err.message });
  }
}

fs.writeFileSync(RESULTS_PATH, JSON.stringify(all, null, 2));
console.log(`\n[validator] wrote ${RESULTS_PATH}`);
console.log(
  `[validator] ok: ${all.filter((x) => x.ok).length}/${all.length}`,
);
