#!/usr/bin/env node
// Browser smoke test for every Flatpack across Chromium, Firefox, and WebKit.
//
// Tests nine properties per file × engine:
//   1. Page loads without console errors or unhandled exceptions.
//   2. The sample-data button works without throwing.
//   3. ?test=1 runs runTests() and all assertions pass.
//   4. Export buttons trigger downloads.
//   5. Print stylesheet hides .no-print elements.
//   6. Reload while offline still renders.
//   7. Tab key cycles all interactive elements.
//   8. <dialog> opens correctly (chronology only).
//   9. No external resource requests at any point.
//
// Usage:
//   node tools/browser-smoke-test.mjs                     # all files, all engines
//   node tools/browser-smoke-test.mjs --engine chromium   # one engine
//   node tools/browser-smoke-test.mjs --file templates/calculator.html  # one file
//
// Prerequisite: `npm install` + `npx playwright install`.
//
// Exit code 0 if all checks pass (skips are fine). Exit code 1 on any fail.

import { chromium, firefox, webkit } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// -----------------------------------------------------------------------------
// Per-file configuration. Inventoried by hand because button IDs vary.
// -----------------------------------------------------------------------------
const FILE_CONFIG = {
  "templates/calculator.html":           { sampleBtn: "#sample-btn", exports: ["#export-json-btn"] },
  "templates/csv-cleaner.html":          { sampleBtn: "#sample-btn", exports: ["#export-clean", "#export-errors"] },
  "templates/checklist.html":            { sampleBtn: null,          exports: ["#export-md-btn", "#export-json-btn"] },
  "templates/report-builder.html":       { sampleBtn: "#sample-btn", exports: ["#export-md-btn"] },
  "templates/decision-tree.html":        { sampleBtn: null,          exports: [] },
  "examples/pricing-calculator.html":    { sampleBtn: "#sample-btn", exports: ["#export-json-btn"] },
  "examples/invoice-cleaner.html":       { sampleBtn: "#sample-btn", exports: ["#export-clean", "#export-errors"] },
  "examples/case-chronology-helper.html": {
    sampleBtn: "#sample-btn",
    exports: ["#export-json-btn", "#export-csv-btn"],
    dialog: { trigger: '[data-action="edit"]', selector: "#edit-dialog" },
  },
};

const ENGINES = [
  { name: "chromium", launcher: chromium },
  { name: "firefox",  launcher: firefox  },
  { name: "webkit",   launcher: webkit   },
];

// -----------------------------------------------------------------------------
// One file × one engine = one Report. Each property is "ok" | "fail" | "skip".
// -----------------------------------------------------------------------------

function pass(detail = "") { return { state: "ok", detail }; }
function fail(detail = "") { return { state: "fail", detail }; }
function skip(detail = "") { return { state: "skip", detail }; }

async function smokeOne(engineName, browser, filePath, config) {
  const fileUrl = "file://" + filePath;
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleErrors = [];
  const pageErrors = [];
  const externalRequests = [];

  page.on("console", msg => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", err => pageErrors.push(err.message));
  page.on("request", req => {
    const url = req.url();
    // Allowed protocols: file:, data:, blob:, about:.
    if (!/^(file|data|blob|about):/i.test(url)) externalRequests.push(url);
  });

  const r = {};

  // 1. Load
  try {
    await page.goto(fileUrl, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(150); // let BOOT settle
    r.load = (consoleErrors.length === 0 && pageErrors.length === 0)
      ? pass()
      : fail(`console=${consoleErrors.length} pageerror=${pageErrors.length}: ${[...consoleErrors, ...pageErrors].slice(0, 2).join(" | ")}`);
  } catch (e) {
    r.load = fail(e.message.split("\n")[0]);
  }

  // 9. No external requests so far (continue tracking throughout)
  //    Recorded after all interaction; placeholder for now.

  // 2. Sample button
  if (config.sampleBtn) {
    const errorsBefore = pageErrors.length;
    try {
      await page.click(config.sampleBtn, { timeout: 3000 });
      await page.waitForTimeout(200);
      r.sample = pageErrors.length === errorsBefore
        ? pass()
        : fail(`error after click: ${pageErrors[pageErrors.length - 1]}`);
    } catch (e) {
      r.sample = fail(e.message.split("\n")[0]);
    }
  } else {
    r.sample = skip("no sample button");
  }

  // 3. ?test=1 runs and all pass
  const testPage = await context.newPage();
  const testPageErrors = [];
  testPage.on("pageerror", e => testPageErrors.push(e.message));
  testPage.on("request", req => {
    const url = req.url();
    if (!/^(file|data|blob|about):/i.test(url)) externalRequests.push(url);
  });
  try {
    await testPage.goto(fileUrl + "?test=1", { waitUntil: "domcontentloaded" });
    await testPage.waitForTimeout(400); // boot runs runTests via DOMContentLoaded
    const results = await testPage.evaluate(() => {
      return typeof runTests === "function" ? runTests() : null;
    });
    if (!results || !Array.isArray(results)) {
      r.tests = fail("runTests() not available or returned non-array");
    } else {
      const passed = results.filter(x => x.passed).length;
      const total = results.length;
      r.tests = passed === total
        ? pass(`${passed}/${total}`)
        : fail(`${passed}/${total}; failed: ${results.filter(x => !x.passed).map(x => x.name).join(", ")}`);
    }
  } catch (e) {
    r.tests = fail(e.message.split("\n")[0]);
  } finally {
    await testPage.close();
  }

  // 4. Exports trigger downloads
  if (config.exports && config.exports.length) {
    const failures = [];
    for (const sel of config.exports) {
      try {
        // Some exports require state — sample button already clicked above.
        const button = page.locator(sel);
        const isDisabled = await button.isDisabled().catch(() => false);
        if (isDisabled) {
          failures.push(`${sel}: disabled`);
          continue;
        }
        const dlPromise = page.waitForEvent("download", { timeout: 3000 });
        await button.click();
        const dl = await dlPromise;
        if (!dl.suggestedFilename()) failures.push(`${sel}: no filename`);
      } catch (e) {
        failures.push(`${sel}: ${e.message.split("\n")[0]}`);
      }
    }
    r.exports = failures.length === 0
      ? pass(`${config.exports.length} exports`)
      : fail(failures.join("; "));
  } else {
    r.exports = skip("no exports declared");
  }

  // 5. Print stylesheet hides .no-print
  try {
    const noPrintCount = await page.locator(".no-print").count();
    if (noPrintCount === 0) {
      r.print = skip("no .no-print elements");
    } else {
      await page.emulateMedia({ media: "print" });
      await page.waitForTimeout(100);
      // Take the first visible .no-print before the switch.
      const stillDisplayed = await page.locator(".no-print").evaluateAll(
        els => els.filter(el => {
          const cs = window.getComputedStyle(el);
          return cs.display !== "none" && cs.visibility !== "hidden";
        }).length
      );
      r.print = stillDisplayed === 0
        ? pass()
        : fail(`${stillDisplayed} .no-print elements still visible in print media`);
      await page.emulateMedia({ media: "screen" });
    }
  } catch (e) {
    r.print = fail(e.message.split("\n")[0]);
  }

  // 6. Offline reload still works.
  // WebKit + Playwright: setOffline(true) followed by reload() on a file://
  // page produces an internal error. Not a Flatpack bug — a known
  // Playwright/WebKit interaction. Skip on WebKit and rely on the network
  // check (#9) to enforce no-network discipline.
  if (engineName === "webkit") {
    r.offline = skip("setOffline+reload on file:// errors in webkit (Playwright limitation)");
  } else {
    try {
      await context.setOffline(true);
      const consoleBefore = consoleErrors.length;
      const pageErrBefore = pageErrors.length;
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForTimeout(150);
      const newConsole = consoleErrors.length - consoleBefore;
      const newPageErr = pageErrors.length - pageErrBefore;
      r.offline = (newConsole === 0 && newPageErr === 0)
        ? pass()
        : fail(`reload introduced console=${newConsole} pageerror=${newPageErr}`);
      await context.setOffline(false);
    } catch (e) {
      r.offline = fail(e.message.split("\n")[0]);
    }
  }

  // 7. Keyboard tab reaches a meaningful share of focusable elements.
  //
  // The strict "every focusable element reachable" claim isn't enforceable
  // by this driver because:
  //   - Playwright + WebKit doesn't move focus from document.body on Tab
  //     keypresses for most file:// pages — confirmed empirically across
  //     every file in this repo. A real Safari user sees normal tab
  //     traversal; the driver doesn't. We skip the check on WebKit.
  //   - Some focusable elements are rendered after first paint and would
  //     be skipped by initial Tab cycles.
  //
  // On Chromium and Firefox we assert that at least 50% of the counted
  // focusable elements are reached. This catches "refactor removed the
  // only interactive element" and "Tab throws" without overclaiming
  // accessibility coverage. A real a11y audit (axe-core, manual NVDA/
  // VoiceOver pass) is a separate exercise.
  if (engineName === "webkit") {
    r.keyboard = skip("Tab-from-body doesn't move focus in webkit driver (Playwright limitation)");
  } else {
    try {
      const expected = await page.evaluate(() => {
        const selectors = "button:not([disabled]), input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";
        const all = Array.from(document.querySelectorAll(selectors));
        return all.filter(el => {
          const cs = window.getComputedStyle(el);
          if (cs.display === "none" || cs.visibility === "hidden") return false;
          if (el.hidden) return false;
          let parent = el.parentElement;
          while (parent) {
            const pcs = window.getComputedStyle(parent);
            if (pcs.display === "none" || pcs.visibility === "hidden" || parent.hidden) return false;
            parent = parent.parentElement;
          }
          return true;
        }).length;
      });
      if (expected === 0) {
        r.keyboard = skip("no focusable elements");
      } else {
        await page.evaluate(() => document.body.focus());
        const visited = new Set();
        const presses = Math.min(expected + 4, 40);
        for (let i = 0; i < presses; i++) {
          await page.keyboard.press("Tab");
          const id = await page.evaluate(() => {
            const el = document.activeElement;
            if (!el || el === document.body) return null;
            return el.id || `${el.tagName}:${(el.textContent || "").trim().slice(0, 24)}`;
          });
          if (id) visited.add(id);
        }
        const reached = visited.size;
        const threshold = Math.max(1, Math.ceil(expected * 0.5));
        r.keyboard = reached >= threshold
          ? pass(`${reached}/${expected}`)
          : fail(`only ${reached}/${expected} reached (threshold ${threshold})`);
      }
    } catch (e) {
      r.keyboard = fail(e.message.split("\n")[0]);
    }
  }

  // 8. <dialog> opens correctly
  if (config.dialog) {
    try {
      await page.click(config.dialog.trigger, { timeout: 3000 });
      await page.waitForTimeout(100);
      const visible = await page.locator(config.dialog.selector).isVisible();
      r.dialog = visible ? pass() : fail("dialog did not become visible");
    } catch (e) {
      r.dialog = fail(e.message.split("\n")[0]);
    }
  } else {
    r.dialog = skip("no <dialog> in file");
  }

  // 9. No external requests anywhere during the run.
  r.network = externalRequests.length === 0
    ? pass()
    : fail(`external requests: ${externalRequests.slice(0, 3).join(", ")}${externalRequests.length > 3 ? ` (+${externalRequests.length - 3})` : ""}`);

  await context.close();
  return r;
}

// -----------------------------------------------------------------------------
// Reporting
// -----------------------------------------------------------------------------

const COLS = ["load", "sample", "tests", "exports", "print", "offline", "keyboard", "dialog", "network"];

function tag(state) {
  return { ok: "OK", fail: "✗ ", skip: "- " }[state] || "? ";
}

function colourise(state, text) {
  // ANSI: red 31, green 32, dim 2.
  const isTTY = process.stdout.isTTY;
  if (!isTTY) return text;
  if (state === "ok") return `\x1b[32m${text}\x1b[0m`;
  if (state === "fail") return `\x1b[31m${text}\x1b[0m`;
  if (state === "skip") return `\x1b[2m${text}\x1b[0m`;
  return text;
}

function relativise(p) { return path.relative(REPO_ROOT, p) || p; }

function summarise(results) {
  let fails = 0;
  for (const engine of Object.keys(results)) {
    for (const file of Object.keys(results[engine])) {
      const r = results[engine][file];
      for (const col of COLS) {
        if (r[col] && r[col].state === "fail") fails++;
      }
    }
  }
  return fails;
}

function render(results) {
  for (const engineName of Object.keys(results)) {
    console.log(`\n=== ${engineName.toUpperCase()} ===`);
    const files = Object.keys(results[engineName]);
    const maxLen = Math.max(...files.map(f => f.length));
    for (const file of files) {
      const r = results[engineName][file];
      const cells = COLS.map(c => {
        const cell = r[c];
        if (!cell) return colourise("skip", "  --   ");
        return colourise(cell.state, ` ${tag(cell.state)} ${c.padEnd(7)}`);
      });
      console.log(`  ${file.padEnd(maxLen + 2)} ${cells.join("")}`);
    }
    // Print fail details below the table.
    for (const file of files) {
      const r = results[engineName][file];
      for (const col of COLS) {
        if (r[col] && r[col].state === "fail") {
          console.log(`    [fail] ${file} :: ${col} — ${r[col].detail}`);
        }
      }
    }
  }
}

// -----------------------------------------------------------------------------
// Entry
// -----------------------------------------------------------------------------

function parseArgs() {
  const argv = process.argv.slice(2);
  const out = { engineFilter: null, fileFilter: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--engine" && argv[i + 1]) { out.engineFilter = argv[++i]; continue; }
    if (argv[i] === "--file"   && argv[i + 1]) { out.fileFilter   = argv[++i]; continue; }
    if (argv[i] === "--help" || argv[i] === "-h") {
      console.log("Usage: node tools/browser-smoke-test.mjs [--engine NAME] [--file PATH]");
      process.exit(0);
    }
  }
  return out;
}

async function main() {
  const { engineFilter, fileFilter } = parseArgs();

  let files = Object.keys(FILE_CONFIG);
  if (fileFilter) {
    const norm = path.relative(REPO_ROOT, path.resolve(fileFilter));
    files = files.filter(f => f === norm || f === fileFilter);
    if (!files.length) {
      console.error(`No matching file: ${fileFilter}`);
      process.exit(2);
    }
  }
  const engines = engineFilter
    ? ENGINES.filter(e => e.name === engineFilter)
    : ENGINES;
  if (!engines.length) {
    console.error(`Unknown engine: ${engineFilter}`);
    process.exit(2);
  }

  const results = {};
  for (const eng of engines) {
    process.stderr.write(`\nLaunching ${eng.name}…`);
    const browser = await eng.launcher.launch();
    results[eng.name] = {};
    for (const file of files) {
      const abs = path.join(REPO_ROOT, file);
      const cfg = FILE_CONFIG[file] || {};
      process.stderr.write(` ${file}`);
      try {
        results[eng.name][file] = await smokeOne(eng.name, browser, abs, cfg);
      } catch (e) {
        // Catastrophic per-file failure shouldn't abort the run.
        results[eng.name][file] = { load: fail(e.message.split("\n")[0]) };
      }
    }
    await browser.close();
    process.stderr.write("\n");
  }

  render(results);

  const fails = summarise(results);
  console.log(`\nTotal: ${fails} failure${fails === 1 ? "" : "s"} across ${files.length} files × ${engines.length} engine(s).`);
  process.exit(fails > 0 ? 1 : 0);
}

main();
