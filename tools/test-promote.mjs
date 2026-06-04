#!/usr/bin/env node
// Golden-file + smoke test for promote.mjs. Runs the promoter on the
// invoice-cleaner example and asserts the output matches a committed golden
// plan. The only non-deterministic line (Date) is normalised before comparing.
// Zero dependencies — built-in Node only.
//
// To re-bless after an intentional change to promote.mjs:
//   node tools/promote.mjs examples/invoice-cleaner.html \
//     | sed 's/^\*\*Date:\*\* .*/**Date:** <DATE>/' \
//     > tools/__fixtures__/promote-invoice-cleaner.golden.md
//
// Usage:  node tools/test-promote.mjs
// Exit:   0 if the plan matches the golden, 1 otherwise.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "..");
const promoter = path.join(here, "promote.mjs");
// Pass the source as a repo-relative path (run with cwd=repo) so the plan's
// "Source:" line is stable regardless of where the checkout lives.
const source = "examples/invoice-cleaner.html";
const goldenPath = path.join(here, "__fixtures__", "promote-invoice-cleaner.golden.md");

function normalise(text) {
  return text.replace(/^\*\*Date:\*\* .*$/m, "**Date:** <DATE>");
}

const res = spawnSync(process.execPath, [promoter, source], {
  cwd: repo,
  encoding: "utf8",
});

// Smoke: the promoter must succeed and emit a recognisable plan.
if (res.status !== 0) {
  console.error(`FAIL  promote.mjs exited ${res.status}\n${res.stderr}`);
  process.exit(1);
}
if (!res.stdout.startsWith("# Promotion plan:")) {
  console.error("FAIL  output is not a promotion plan");
  process.exit(1);
}

const actual = normalise(res.stdout);
const golden = fs.readFileSync(goldenPath, "utf8");

if (actual !== golden) {
  // Show the first differing line for a quick diagnosis.
  const a = actual.split("\n");
  const g = golden.split("\n");
  const i = a.findIndex((line, idx) => line !== g[idx]);
  console.error("FAIL  promotion plan does not match golden.");
  console.error(`  first diff at line ${i + 1}:`);
  console.error(`    golden: ${JSON.stringify(g[i])}`);
  console.error(`    actual: ${JSON.stringify(a[i])}`);
  console.error("  If this change is intentional, re-bless the golden (see header).");
  process.exit(1);
}

console.log("PASS  promote.mjs output matches golden (invoice-cleaner).");
process.exit(0);
