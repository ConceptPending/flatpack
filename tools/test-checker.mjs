#!/usr/bin/env node
// Self-tests for check-flatpack.mjs. Runs the checker as a black box (via
// --json) over deliberately-bad fixtures and asserts the expected finding
// codes appear, plus a positive control that the reference templates have zero
// errors. Zero dependencies — built-in Node only.
//
// Usage:  node tools/test-checker.mjs
// Exit:   0 if all self-tests pass, 1 otherwise.

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const checker = path.join(here, "check-flatpack.mjs");
const fixtures = path.join(here, "__fixtures__");

function runChecker(args) {
  const res = spawnSync(process.execPath, [checker, ...args, "--json"], {
    encoding: "utf8",
  });
  let data;
  try {
    data = JSON.parse(res.stdout);
  } catch {
    throw new Error(`checker did not emit JSON for ${args.join(" ")}:\n${res.stdout}\n${res.stderr}`);
  }
  const codes = data.reports.flatMap((r) => r.issues.map((i) => i.code));
  return { codes, errors: data.errors, warnings: data.warnings, status: res.status };
}

// Each bad fixture must surface its target finding. error-level fixtures must
// also make the run fail (errors > 0).
const cases = [
  { file: "xss-escaper-undefined.html", expect: "xss-escaper-undefined", level: "error" },
  { file: "xss-raw-sink.html", expect: "xss-raw-innerhtml-sink", level: "error" },
  { file: "manifest-drift.html", expect: "predicate-field-drift", level: "warn" },
];

let failed = 0;

for (const c of cases) {
  const { codes, errors } = runChecker([path.join(fixtures, c.file)]);
  const found = codes.includes(c.expect);
  const errorOk = c.level !== "error" || errors > 0;
  const ok = found && errorOk;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${c.file} -> ${c.expect} ${found ? "found" : "MISSING"}` +
      (c.level === "error" ? ` (errors=${errors})` : ""),
  );
  if (!ok) failed++;
}

// Positive control: the shipped reference templates/examples have zero errors.
{
  const { errors } = runChecker([]);
  const ok = errors === 0;
  console.log(`${ok ? "PASS" : "FAIL"}  reference templates -> ${errors} error(s)`);
  if (!ok) failed++;
}

console.log(failed ? `\n${failed} self-test(s) failed.` : "\nAll checker self-tests passed.");
process.exit(failed ? 1 : 0);
