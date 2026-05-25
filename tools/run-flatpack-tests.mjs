#!/usr/bin/env node
// Run the inline FLATPACK:TEST_CASES of every Flatpack outside a browser.
//
// Each Flatpack's last <script> block is extracted and evaluated in a sandbox
// that stubs the browser globals it touches at boot (document, localStorage,
// window, navigator.clipboard, URL, Blob, FormData, location, URLSearchParams).
// The stubs are intentionally minimal — TEST_CASES are pure logic by spec, and
// the bindEvents/loadState smoke tests self-mock what they need.
//
// Usage:
//   node tools/run-flatpack-tests.mjs                    # all templates/ + examples/
//   node tools/run-flatpack-tests.mjs path/to/file.html  # one file
//   node tools/run-flatpack-tests.mjs --json             # JSON output
//
// Exit code 0 if every test passes. Exit code 1 if any test fails.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function gatherTargets(argv) {
  const explicit = argv.filter(a => !a.startsWith("--"));
  if (explicit.length) return explicit.map(a => path.resolve(a));
  const targets = [];
  for (const dir of ["templates", "examples"]) {
    const abs = path.join(REPO_ROOT, dir);
    if (!fs.existsSync(abs)) continue;
    for (const entry of fs.readdirSync(abs)) {
      if (entry.endsWith(".html")) targets.push(path.join(abs, entry));
    }
  }
  return targets.sort();
}

function extractMainScript(html) {
  const re = /<script(\s+[^>]*)?>([\s\S]*?)<\/script>/gi;
  let m, last = null;
  while ((m = re.exec(html)) !== null) {
    const attrs = m[1] || "";
    if (/type\s*=\s*["']application\/json["']/i.test(attrs)) continue;
    last = m[2];
  }
  return last;
}

function makeStubGlobals() {
  const noop = () => {};
  return {
    document: {
      addEventListener: noop,
      removeEventListener: noop,
      querySelector: () => null,
      querySelectorAll: () => [],
      getElementById: () => null,
      createElement: () => ({ style: {}, setAttribute: noop, appendChild: noop, click: noop, remove: noop }),
      body: { appendChild: noop },
    },
    localStorage: {
      _d: {},
      getItem(k) { return Object.prototype.hasOwnProperty.call(this._d, k) ? this._d[k] : null; },
      setItem(k, v) { this._d[k] = String(v); },
      removeItem(k) { delete this._d[k]; },
      clear() { this._d = {}; },
    },
    window: { print: noop, alert: noop, confirm: () => true },
    navigator: { clipboard: { writeText: async () => {} } },
    location: { search: "" },
    URL: { createObjectURL: () => "blob:stub", revokeObjectURL: () => {} },
    URLSearchParams: globalThis.URLSearchParams,
    Blob: globalThis.Blob || class Blob { constructor(parts, opts) { this.parts = parts; this.opts = opts; } },
    FormData: globalThis.FormData || class FormData {},
    Intl: globalThis.Intl,
    structuredClone: globalThis.structuredClone,
    // Suppress per-file console.table noise — the harness prints its own summary.
    console: { ...console, table: () => {}, log: () => {}, warn: () => {} },
    Math, Number, String, JSON, Date, Array, Object,
    setTimeout, clearTimeout,
    Boolean,
  };
}

function runFile(filePath) {
  const html = fs.readFileSync(filePath, "utf8");
  const src = extractMainScript(html);
  if (!src) return { filePath, error: "no <script> block found", results: [] };
  const stubs = makeStubGlobals();
  const wrapped = `(function(globals){\n  const { ${Object.keys(stubs).join(", ")} } = globals;\n${src}\n  return (typeof runTests === "function") ? runTests() : null;\n})`;
  try {
    // eslint-disable-next-line no-eval
    const fn = (0, eval)(wrapped);
    const results = fn(stubs);
    if (!results) return { filePath, error: "no runTests() in file", results: [] };
    return { filePath, results };
  } catch (e) {
    return { filePath, error: String(e), results: [] };
  }
}

function main() {
  const argv = process.argv.slice(2);
  const asJson = argv.includes("--json");
  const targets = gatherTargets(argv);
  if (!targets.length) {
    console.error("No .html files to test.");
    process.exit(2);
  }

  const reports = targets.map(runFile);
  let passed = 0, failed = 0, errored = 0;
  for (const r of reports) {
    if (r.error) { errored++; continue; }
    for (const t of r.results) {
      if (t.passed) passed++; else failed++;
    }
  }

  if (asJson) {
    console.log(JSON.stringify({ reports, passed, failed, errored }, null, 2));
  } else {
    for (const r of reports) {
      const rel = path.relative(REPO_ROOT, r.filePath) || r.filePath;
      if (r.error) {
        console.log(`ERROR  ${rel} — ${r.error}`);
        continue;
      }
      const p = r.results.filter(t => t.passed).length;
      const f = r.results.length - p;
      const tag = f ? "FAIL " : "OK   ";
      console.log(`${tag}  ${rel}: ${p}/${r.results.length}`);
      for (const t of r.results) {
        if (!t.passed) console.log(`        FAIL: ${t.name}${t.error ? " — " + t.error : ""}`);
      }
    }
    console.log("");
    console.log(`Total: ${passed} passed, ${failed} failed, ${errored} file(s) errored.`);
  }

  process.exit((failed + errored) > 0 ? 1 : 0);
}

main();
