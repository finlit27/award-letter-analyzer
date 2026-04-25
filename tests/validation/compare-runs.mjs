#!/usr/bin/env node
/**
 * Average per-field accuracy across multiple validation runs to wash out
 * LLM variance. Reads results-run1.json … results-runN.json and the
 * ground truth, then reports per-field pass rate over all (run × letter)
 * combinations.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const truth = JSON.parse(
  fs.readFileSync(path.join(__dirname, "ground-truth.json"), "utf8"),
);

const runFiles = fs
  .readdirSync(__dirname)
  .filter((f) => /^results-run\d+\.json$/.test(f))
  .sort();

if (runFiles.length === 0) {
  console.error("No results-run*.json files found.");
  process.exit(1);
}

console.log(`Averaging across ${runFiles.length} runs.\n`);

const runs = runFiles.map((f) =>
  JSON.parse(fs.readFileSync(path.join(__dirname, f), "utf8")),
);

function num(x) {
  return typeof x === "number" && Number.isFinite(x) ? x : null;
}

function checkLetter(expected, letter) {
  const checks = {};
  checks.college_name = Boolean(
    letter.college_name &&
      letter.college_name
        .toLowerCase()
        .includes(
          expected.college_name.split(/[\s,]/).find((w) => w.length > 4).toLowerCase(),
        ),
  );
  checks.total_cost_of_attendance =
    num(letter.total_cost_of_attendance) === expected.total_cost_of_attendance;
  const dc = letter.direct_costs || {};
  const dcSum = (num(dc.tuition) ?? 0) + (num(dc.housing) ?? 0) + (num(dc.fees) ?? 0);
  checks.direct_costs_sum = dcSum === expected.direct_costs_sum;
  const g = letter.grants_scholarships || {};
  for (const k of ["institutional_merit", "pell_grant", "state_grant", "total_gift_aid"]) {
    checks[`grants.${k}`] = num(g[k]) === expected.grants_scholarships[k];
  }
  const l = letter.loans || {};
  for (const k of ["federal_subsidized", "federal_unsubsidized", "parent_plus", "private_loans"]) {
    checks[`loans.${k}`] = num(l[k]) === expected.loans[k];
  }
  checks.work_study = num(letter.work_study) === expected.work_study;
  checks.net_price = num(letter.net_price) === expected.net_price;
  return checks;
}

const fields = [
  "college_name",
  "total_cost_of_attendance",
  "direct_costs_sum",
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

const fieldStats = new Map(fields.map((f) => [f, { pass: 0, total: 0 }]));
let totalChecks = 0,
  totalPass = 0;

// Also track per-letter consistency: which letters are stable across runs
const letterFieldStability = new Map();

for (const [fileName, expected] of Object.entries(truth.letters)) {
  for (const run of runs) {
    const r = run.find((x) => x.fileName === fileName);
    if (!r || !r.ok) continue;
    const checks = checkLetter(expected, r.letter);
    for (const f of fields) {
      const s = fieldStats.get(f);
      s.total++;
      if (checks[f]) s.pass++;
      totalChecks++;
      if (checks[f]) totalPass++;
      const key = `${fileName}|${f}`;
      const ll = letterFieldStability.get(key) || { pass: 0, total: 0 };
      ll.total++;
      if (checks[f]) ll.pass++;
      letterFieldStability.set(key, ll);
    }
  }
}

console.log("Field-level accuracy averaged across runs:\n");
console.log("Field                                      Pass    Rate");
console.log("------------------------------------------------------");
for (const f of fields) {
  const s = fieldStats.get(f);
  const rate = s.total ? ((100 * s.pass) / s.total).toFixed(0) : "—";
  console.log(`${f.padEnd(40)}  ${String(s.pass).padStart(3)}/${String(s.total).padStart(2)}  ${rate.padStart(3)}%`);
}
console.log("------------------------------------------------------");
console.log(
  `OVERALL                                   ${totalPass}/${totalChecks}  ${((100 * totalPass) / totalChecks).toFixed(1)}%`,
);
console.log();

// Surface fields/letters that are unstable (sometimes pass, sometimes fail)
const unstable = [];
for (const [key, s] of letterFieldStability.entries()) {
  if (s.pass > 0 && s.pass < s.total) {
    unstable.push({ key, ...s });
  }
}
if (unstable.length > 0) {
  console.log("Unstable (passes some runs, fails others):");
  for (const u of unstable.sort((a, b) => a.key.localeCompare(b.key))) {
    const [fn, fld] = u.key.split("|");
    console.log(`  ${fn}  →  ${fld}  ${u.pass}/${u.total}`);
  }
  console.log();
}

// Surface fields that consistently fail across all runs
const consistentlyFailing = [];
for (const [key, s] of letterFieldStability.entries()) {
  if (s.pass === 0) consistentlyFailing.push({ key, ...s });
}
if (consistentlyFailing.length > 0) {
  console.log("Consistently failing across all runs (deterministic LLM weakness):");
  for (const u of consistentlyFailing.sort((a, b) => a.key.localeCompare(b.key))) {
    const [fn, fld] = u.key.split("|");
    console.log(`  ${fn}  →  ${fld}`);
  }
}
