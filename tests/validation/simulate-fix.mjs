#!/usr/bin/env node
/**
 * Apply reconcileGiftAid to the existing results.json (raw LLM outputs from
 * the 2026-04-24 run) and compute predicted accuracy improvement vs.
 * ground-truth.json. This shows what the production fix WOULD have produced
 * without re-spending the LLM credits.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const truth = JSON.parse(
  fs.readFileSync(path.join(__dirname, "ground-truth.json"), "utf8"),
);
const results = JSON.parse(
  fs.readFileSync(path.join(__dirname, "results.json"), "utf8"),
);

// Inline port of src/lib/reconcile.ts:reconcileGiftAid.
function reconcileGiftAid(letter) {
  const g = letter.grants_scholarships;
  const breakdownSum = g.institutional_merit + g.pell_grant + g.state_grant;
  const diff = g.total_gift_aid - breakdownSum;
  if (Math.abs(diff) < 1) return letter;
  if (diff > 0) {
    return {
      ...letter,
      grants_scholarships: {
        ...g,
        institutional_merit: g.institutional_merit + diff,
      },
    };
  }
  return {
    ...letter,
    grants_scholarships: { ...g, total_gift_aid: breakdownSum },
  };
}

function check(field, expected, actual) {
  return { field, expected, got: actual, pass: actual === expected };
}

function tally(letter, expected) {
  const checks = [];
  const g = letter.grants_scholarships;
  const ge = expected.grants_scholarships;
  for (const k of [
    "institutional_merit",
    "pell_grant",
    "state_grant",
    "total_gift_aid",
  ]) {
    checks.push(check(`grants.${k}`, ge[k], g[k]));
  }
  return checks;
}

let preTotal = 0,
  prePass = 0;
let postTotal = 0,
  postPass = 0;
const rows = [];

for (const [fileName, expected] of Object.entries(truth.letters)) {
  const r = results.find((x) => x.fileName === fileName);
  if (!r || !r.ok) continue;
  const pre = tally(r.letter, expected);
  const post = tally(reconcileGiftAid(r.letter), expected);
  preTotal += pre.length;
  prePass += pre.filter((c) => c.pass).length;
  postTotal += post.length;
  postPass += post.filter((c) => c.pass).length;

  const fixed = pre
    .map((p, i) => ({ pre: p, post: post[i] }))
    .filter(({ pre, post }) => !pre.pass && post.pass)
    .map(({ pre, post }) => `${pre.field}: ${pre.got.toLocaleString()} → ${post.got.toLocaleString()} (expected ${pre.expected.toLocaleString()})`);
  const broke = pre
    .map((p, i) => ({ pre: p, post: post[i] }))
    .filter(({ pre, post }) => pre.pass && !post.pass)
    .map(({ pre, post }) => `${pre.field}: ${pre.got.toLocaleString()} → ${post.got.toLocaleString()} (expected ${pre.expected.toLocaleString()})`);

  rows.push({ fileName, fixed, broke });
}

console.log("Grant-bucket accuracy across 10 synthetic letters:");
console.log(
  `  Before reconciliation: ${prePass}/${preTotal} (${((100 * prePass) / preTotal).toFixed(1)}%)`,
);
console.log(
  `   After reconciliation: ${postPass}/${postTotal} (${((100 * postPass) / postTotal).toFixed(1)}%)`,
);
console.log();

const fixedAny = rows.filter((r) => r.fixed.length > 0);
const brokeAny = rows.filter((r) => r.broke.length > 0);

if (fixedAny.length > 0) {
  console.log("Letters newly passing fields after reconciliation:");
  for (const r of fixedAny) {
    console.log(`  ${r.fileName}`);
    for (const f of r.fixed) console.log(`    ✓ ${f}`);
  }
  console.log();
}
if (brokeAny.length > 0) {
  console.log("Letters NEWLY FAILING after reconciliation (regression):");
  for (const r of brokeAny) {
    console.log(`  ${r.fileName}`);
    for (const f of r.broke) console.log(`    ✗ ${f}`);
  }
} else {
  console.log("No regressions — reconciliation is strictly additive.");
}
