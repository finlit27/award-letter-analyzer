#!/usr/bin/env node
/**
 * Diff LLM results (results.json) against ground-truth.json and emit a
 * markdown report to ../../../outputs/llm-extraction-validation-<date>.md.
 *
 * Fields checked per letter:
 *   - college_name                          (fuzzy: exact or substring match)
 *   - total_cost_of_attendance              (exact)
 *   - direct_costs_sum (tuition+housing+fees)  (exact — LLM may split freely)
 *   - grants_scholarships.*                 (exact per field)
 *   - loans.*                               (exact per field)
 *   - work_study                            (exact)
 *   - net_price                             (exact)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../../../outputs");
const today = new Date().toISOString().slice(0, 10);
const REPORT_PATH = path.join(
  OUT_DIR,
  `llm-extraction-validation-${today}.md`,
);

const truth = JSON.parse(
  fs.readFileSync(path.join(__dirname, "ground-truth.json"), "utf8"),
);
const results = JSON.parse(
  fs.readFileSync(path.join(__dirname, "results.json"), "utf8"),
);

const byName = new Map(results.map((r) => [r.fileName, r]));

function num(x) {
  return typeof x === "number" && Number.isFinite(x) ? x : null;
}

function checkLetter(fileName, expected, actual) {
  const checks = [];
  const push = (field, exp, got, pass, note = "") =>
    checks.push({ field, expected: exp, got, pass, note });

  // college_name — fuzzy substring match on a distinctive token
  const nameToken = expected.college_name.split(/[\s,]/).find((w) => w.length > 4);
  const namePass = Boolean(
    actual.college_name &&
      (actual.college_name === expected.college_name ||
        actual.college_name.toLowerCase().includes(nameToken.toLowerCase())),
  );
  push("college_name", expected.college_name, actual.college_name ?? "—", namePass);

  // total_cost_of_attendance
  const coaGot = num(actual.total_cost_of_attendance);
  push(
    "total_cost_of_attendance",
    expected.total_cost_of_attendance,
    coaGot ?? "—",
    coaGot === expected.total_cost_of_attendance,
  );

  // direct_costs_sum
  const dc = actual.direct_costs || {};
  const dcSum = (num(dc.tuition) ?? 0) + (num(dc.housing) ?? 0) + (num(dc.fees) ?? 0);
  push(
    "direct_costs_sum (tuition+housing+fees)",
    expected.direct_costs_sum,
    dcSum,
    dcSum === expected.direct_costs_sum,
    `split as tuition=${num(dc.tuition) ?? "—"} housing=${num(dc.housing) ?? "—"} fees=${num(dc.fees) ?? "—"}`,
  );

  // grants
  const gExp = expected.grants_scholarships;
  const gGot = actual.grants_scholarships || {};
  for (const k of ["institutional_merit", "pell_grant", "state_grant", "total_gift_aid"]) {
    push(`grants.${k}`, gExp[k], num(gGot[k]) ?? "—", num(gGot[k]) === gExp[k]);
  }

  // loans
  const lExp = expected.loans;
  const lGot = actual.loans || {};
  for (const k of ["federal_subsidized", "federal_unsubsidized", "parent_plus", "private_loans"]) {
    push(`loans.${k}`, lExp[k], num(lGot[k]) ?? "—", num(lGot[k]) === lExp[k]);
  }

  push("work_study", expected.work_study, num(actual.work_study) ?? "—", num(actual.work_study) === expected.work_study);
  push("net_price", expected.net_price, num(actual.net_price) ?? "—", num(actual.net_price) === expected.net_price);

  return checks;
}

const letters = Object.entries(truth.letters);
const rows = [];
const fieldStats = new Map();

for (const [fileName, expected] of letters) {
  const result = byName.get(fileName);
  if (!result || !result.ok) {
    rows.push({ fileName, expected, error: result?.error || "no result", checks: null });
    continue;
  }
  const checks = checkLetter(fileName, expected, result.letter);
  rows.push({ fileName, expected, actual: result.letter, ms: result.ms, checks });
  for (const c of checks) {
    const prev = fieldStats.get(c.field) || { pass: 0, fail: 0 };
    prev[c.pass ? "pass" : "fail"]++;
    fieldStats.set(c.field, prev);
  }
}

// ===== render markdown =====
const md = [];
md.push(`# LLM Extraction Validation — ${today}`);
md.push("");
md.push(
  `**Dataset:** ${letters.length} synthetic award letters (page 1 only) rendered at 150 DPI and sent to \`${process.env.API_URL || "https://analyzer.finlitgarden.com/api/analyze"}\`. Pipeline: sharp JPEG prep → n8n → Claude Haiku 4.5 (Sonnet 4.6 fallback if JSON invalid).`,
);
md.push("");
md.push("**Validation rules:**");
md.push("");
md.push("- `total_cost_of_attendance`, all grant/loan/work_study/net_price fields: **exact match** required.");
md.push("- `direct_costs_sum` (tuition+housing+fees): exact sum required; LLM has latitude on how to split between the three.");
md.push("- `college_name`: substring match on a distinctive token.");
md.push("");

// summary
const totalAnalyzed = rows.filter((r) => r.checks).length;
const totalChecks = Array.from(fieldStats.values()).reduce((a, b) => a + b.pass + b.fail, 0);
const totalPass = Array.from(fieldStats.values()).reduce((a, b) => a + b.pass, 0);
const fullyClean = rows.filter((r) => r.checks && r.checks.every((c) => c.pass)).length;

md.push("## Headline");
md.push("");
md.push(`- **${totalAnalyzed}/${letters.length}** letters returned a parseable result.`);
md.push(`- **${totalPass}/${totalChecks}** field-level checks passed (${((100 * totalPass) / Math.max(1, totalChecks)).toFixed(1)}%).`);
md.push(`- **${fullyClean}/${totalAnalyzed}** letters passed every field check cleanly.`);
md.push("");

// per-field accuracy table
md.push("## Field-level accuracy (across all analyzed letters)");
md.push("");
md.push("| Field | Pass | Fail | Rate |");
md.push("|---|---:|---:|---:|");
const fieldOrder = [
  "college_name",
  "total_cost_of_attendance",
  "direct_costs_sum (tuition+housing+fees)",
  "grants.institutional_merit",
  "grants.pell_grant",
  "grants.state_grant",
  "grants.total_gift_aid",
  "loans.federal_subsidized",
  "loans.federal_unsubsidized",
  "loans.parent_plus",
  "loans.private_loans",
  "work_study",
  "net_price",
];
for (const f of fieldOrder) {
  const s = fieldStats.get(f);
  if (!s) continue;
  const total = s.pass + s.fail;
  const rate = total ? ((100 * s.pass) / total).toFixed(0) + "%" : "—";
  md.push(`| ${f} | ${s.pass} | ${s.fail} | ${rate} |`);
}
md.push("");

// per-letter detail
md.push("## Per-letter detail");
md.push("");
for (const row of rows) {
  md.push(`### ${row.fileName}`);
  md.push("");
  md.push(`_${row.expected.notes}_`);
  md.push("");
  if (!row.checks) {
    md.push(`**FAILED to analyze:** ${row.error}`);
    md.push("");
    continue;
  }
  md.push(`_${row.ms}ms — extracted college_name: \`${row.actual.college_name}\`_`);
  md.push("");
  md.push("| Field | Expected | Got | Pass |");
  md.push("|---|---:|---:|:-:|");
  for (const c of row.checks) {
    const mark = c.pass ? "✓" : "✗";
    const expStr = typeof c.expected === "number" ? c.expected.toLocaleString() : c.expected;
    const gotStr = typeof c.got === "number" ? c.got.toLocaleString() : c.got;
    md.push(`| ${c.field} | ${expStr} | ${gotStr} | ${mark} |`);
  }
  md.push("");
  const misses = row.checks.filter((c) => !c.pass);
  if (misses.length > 0) {
    md.push(`**Misses:** ${misses.length}/${row.checks.length}`);
    for (const m of misses) {
      if (m.note) md.push(`- \`${m.field}\`: ${m.note}`);
    }
    md.push("");
  }
}

// failures / hallucinations surface
md.push("## Misses by type");
md.push("");
const misses = rows
  .filter((r) => r.checks)
  .flatMap((r) => r.checks.filter((c) => !c.pass).map((c) => ({ fileName: r.fileName, ...c })));
if (misses.length === 0) {
  md.push("_None — every field on every letter matched ground truth._");
} else {
  md.push("| File | Field | Expected | Got |");
  md.push("|---|---|---:|---:|");
  for (const m of misses) {
    md.push(
      `| ${m.fileName} | ${m.field} | ${typeof m.expected === "number" ? m.expected.toLocaleString() : m.expected} | ${typeof m.got === "number" ? m.got.toLocaleString() : m.got} |`,
    );
  }
}
md.push("");

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(REPORT_PATH, md.join("\n"));
console.log(`[report] wrote ${REPORT_PATH}`);
console.log(
  `[report] ${totalPass}/${totalChecks} checks passed across ${totalAnalyzed}/${letters.length} letters`,
);
