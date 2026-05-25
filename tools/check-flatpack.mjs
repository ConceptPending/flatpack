#!/usr/bin/env node
// Flatpack checker. No dependencies — uses only built-in Node modules.
//
// Usage:
//   node tools/check-flatpack.mjs                    # checks templates/ + examples/
//   node tools/check-flatpack.mjs path/to/file.html  # checks one file
//   node tools/check-flatpack.mjs --json             # JSON output
//   node tools/check-flatpack.mjs --strict           # also runs run-flatpack-tests.mjs
//
// Exit codes:
//   0 — all files pass with no errors (warnings allowed) and, under --strict,
//       all inline tests pass
//   1 — at least one file has an error, or (under --strict) at least one
//       inline test failed
//
// This script is for reviewers and CI. It is NOT loaded by the Flatpacks
// themselves. Flatpacks remain zero-dependency artifacts.

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const REQUIRED_MARKERS = [
  "FLATPACK:HELP",
  "FLATPACK:STYLES",
  "FLATPACK:HTML",
  "FLATPACK:MANIFEST",
  "FLATPACK:METADATA",
  "FLATPACK:SCHEMA",
  "FLATPACK:STATE",
  "FLATPACK:IMPORT_EXPORT",
  "FLATPACK:CORE_LOGIC",
  "FLATPACK:RENDERING",
  "FLATPACK:EVENTS",
  "FLATPACK:TEST_CASES",
  "FLATPACK:BOOT",
];
// VALIDATION is required for any file with user input. Most tools have it.
// We warn rather than error if it's missing — some pure-display tools may not need it.

const REQUIRED_MANIFEST_FIELDS = ["name", "artifactType", "version", "scope", "persistence", "network"];
const ALLOWED_SCOPE = ["personal", "shared-read-only"];
const ALLOWED_PERSISTENCE = ["none", "localStorage", "indexedDB"];
const ALLOWED_NETWORK = ["none", "user-supplied-endpoint"];

const FORBIDDEN_NETWORK_APIS = [
  { re: /\bfetch\s*\(/, name: "fetch()" },
  { re: /\bXMLHttpRequest\b/, name: "XMLHttpRequest" },
  { re: /\bWebSocket\b/, name: "WebSocket" },
  { re: /\bsendBeacon\b/, name: "sendBeacon" },
  { re: /\bEventSource\b/, name: "EventSource" },
];

const FORBIDDEN_EXTERNAL = [
  { re: /<script[^>]+src\s*=\s*["']https?:\/\//i, name: "<script src=https?://>" },
  { re: /<link[^>]+href\s*=\s*["']https?:\/\//i, name: "<link href=https?://>" },
  { re: /<img[^>]+src\s*=\s*["']https?:\/\//i, name: "<img src=https?://>" },
  { re: /<iframe[^>]+src\s*=\s*["']https?:\/\//i, name: "<iframe src=https?://>" },
];

const STALE_FIELDS = ["recommendedBaseplateRecipe"];

const FILE_SIZE_WARN_BYTES = 50 * 1024;   // 50 KB
const FILE_SIZE_ERROR_BYTES = 200 * 1024; // 200 KB — at this point the form factor is breaking

// -----------------------------------------------------------------------------

function checkFile(filePath) {
  const issues = [];
  const html = fs.readFileSync(filePath, "utf8");
  const bytes = Buffer.byteLength(html, "utf8");

  // 1. Required section markers.
  for (const marker of REQUIRED_MARKERS) {
    if (!html.includes(marker)) issues.push({ level: "error", code: "missing-marker", msg: `Missing required section marker: ${marker}` });
  }
  if (!html.includes("FLATPACK:VALIDATION")) {
    issues.push({ level: "warn", code: "missing-validation-marker", msg: "FLATPACK:VALIDATION marker not found — confirm this tool has no user input to validate." });
  }

  // 2. Manifest extracts and parses.
  const manifestMatch = html.match(/<script\s+type="application\/json"\s+id="flatpack-manifest">([\s\S]*?)<\/script>/);
  let manifest = null;
  if (!manifestMatch) {
    issues.push({ level: "error", code: "no-manifest", msg: "No <script type=\"application/json\" id=\"flatpack-manifest\"> block." });
  } else {
    try {
      manifest = JSON.parse(manifestMatch[1]);
    } catch (e) {
      issues.push({ level: "error", code: "manifest-invalid-json", msg: `Manifest is not valid JSON: ${e.message}` });
    }
  }

  // 3. Manifest required fields + value constraints.
  if (manifest) {
    for (const f of REQUIRED_MANIFEST_FIELDS) {
      if (!(f in manifest)) issues.push({ level: "error", code: "manifest-missing-field", msg: `Manifest missing required field: ${f}` });
    }
    if (manifest.scope && !ALLOWED_SCOPE.includes(manifest.scope)) {
      issues.push({ level: "error", code: "manifest-bad-scope", msg: `Manifest scope "${manifest.scope}" not in ${ALLOWED_SCOPE.join(" | ")}` });
    }
    if (manifest.persistence && !ALLOWED_PERSISTENCE.includes(manifest.persistence)) {
      issues.push({ level: "error", code: "manifest-bad-persistence", msg: `Manifest persistence "${manifest.persistence}" not in ${ALLOWED_PERSISTENCE.join(" | ")}` });
    }
    if (manifest.network && !ALLOWED_NETWORK.includes(manifest.network)) {
      issues.push({ level: "error", code: "manifest-bad-network", msg: `Manifest network "${manifest.network}" not in ${ALLOWED_NETWORK.join(" | ")}` });
    }
    if (manifest.version && !/^\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?$/.test(manifest.version)) {
      issues.push({ level: "warn", code: "manifest-bad-version", msg: `Manifest version "${manifest.version}" is not semver.` });
    }
    if (!manifest.archetype) {
      issues.push({ level: "warn", code: "manifest-no-archetype", msg: "Manifest has no archetype. Recommended for promotion plans (see docs/archetypes.md)." });
    }
    // Entities subset check.
    if (manifest.entities !== undefined) {
      if (!Array.isArray(manifest.entities)) {
        issues.push({ level: "error", code: "manifest-entities-not-array", msg: "Manifest entities must be an array." });
      } else {
        manifest.entities.forEach((e, i) => {
          if (!e.name) issues.push({ level: "error", code: "manifest-entity-no-name", msg: `Manifest entity[${i}] missing name.` });
          if (!Array.isArray(e.fields)) issues.push({ level: "error", code: "manifest-entity-no-fields", msg: `Manifest entity[${i}] (${e.name || "?"}) fields must be an array.` });
        });
      }
    }
  }

  // 4. Stale fields anywhere in the file.
  for (const stale of STALE_FIELDS) {
    if (html.includes(stale)) issues.push({ level: "error", code: "stale-field", msg: `Stale field present: ${stale}. Rename it.` });
  }

  // 5. External resources (anywhere in the file).
  for (const { re, name } of FORBIDDEN_EXTERNAL) {
    if (re.test(html)) issues.push({ level: "error", code: "external-resource", msg: `Forbidden external resource: ${name}` });
  }

  // 6. Forbidden network APIs (only inside <script> blocks).
  const scriptBodies = extractScriptBodies(html);
  for (const body of scriptBodies) {
    for (const { re, name } of FORBIDDEN_NETWORK_APIS) {
      if (re.test(body)) issues.push({ level: "error", code: "forbidden-network-api", msg: `Forbidden network API: ${name}` });
    }
  }

  // 7. TEST_CASES present and non-empty.
  const lastScript = scriptBodies[scriptBodies.length - 1] || "";
  if (!/const\s+TEST_CASES\s*=\s*\[/.test(lastScript)) {
    issues.push({ level: "error", code: "no-test-cases", msg: "No `const TEST_CASES = [...]` array found in main script block." });
  } else {
    // Crude: at least one `name: "..."` in the test array region.
    const m = lastScript.match(/const\s+TEST_CASES\s*=\s*\[([\s\S]*?)\];\s*function\s+runTests/);
    if (m) {
      const count = (m[1].match(/name\s*:\s*["']/g) || []).length;
      if (count === 0) issues.push({ level: "error", code: "empty-test-cases", msg: "TEST_CASES array is empty." });
      else if (count < 2) issues.push({ level: "warn", code: "few-test-cases", msg: `TEST_CASES has only ${count} entry. Spec recommends at least core-logic + bindEvents + loadState.` });
    }
    if (!/bindEvents/.test(lastScript) || !/attaches\s+listeners/i.test(lastScript)) {
      issues.push({ level: "warn", code: "no-bindevents-smoke", msg: "No bindEvents smoke test detected." });
    }
    if (!/loadState\s+tolerates|malformed\s+stored\s+data/i.test(lastScript)) {
      issues.push({ level: "warn", code: "no-loadstate-test", msg: "No loadState malformed-data test detected." });
    }
  }

  // 8. HELP block subsections.
  const helpMatch = html.match(/<!--\s*FLATPACK:HELP([\s\S]*?)-->/);
  if (!helpMatch) {
    // Already reported as missing marker, but be specific.
  } else {
    const body = helpMatch[1];
    if (!/HUMAN HELP/i.test(body)) issues.push({ level: "warn", code: "help-no-human", msg: "HELP block has no `HUMAN HELP` section." });
    if (!/AI EDITING NOTES/i.test(body)) issues.push({ level: "warn", code: "help-no-ai-notes", msg: "HELP block has no `AI EDITING NOTES` section." });
    for (const key of ["Purpose", "Persistence"]) {
      if (!new RegExp(`\\b${key}\\b`, "i").test(body)) issues.push({ level: "warn", code: `help-no-${key.toLowerCase()}`, msg: `HELP block has no ${key} line.` });
    }
  }

  // 9. innerHTML sites (warning — for manual review).
  const innerHTMLSites = [];
  const scriptForLines = scriptBodies.join("\n//<--script-break-->\n");
  const lines = scriptForLines.split("\n");
  lines.forEach((line, i) => {
    if (/\.innerHTML\s*=/.test(line)) innerHTMLSites.push(`line ${i + 1}: ${line.trim().slice(0, 80)}`);
  });
  if (innerHTMLSites.length) {
    issues.push({
      level: "warn",
      code: "innerhtml-sites",
      msg: `${innerHTMLSites.length} innerHTML assignment(s) — review each for XSS safety. All user-supplied strings must pass through escapeHtml().`,
      detail: innerHTMLSites.slice(0, 5)
    });
  }

  // 10. File size.
  if (bytes > FILE_SIZE_ERROR_BYTES) {
    issues.push({ level: "error", code: "file-too-large", msg: `File is ${(bytes / 1024).toFixed(1)} KB — over the ${FILE_SIZE_ERROR_BYTES / 1024} KB ceiling. The form factor is breaking.` });
  } else if (bytes > FILE_SIZE_WARN_BYTES) {
    issues.push({ level: "warn", code: "file-large", msg: `File is ${(bytes / 1024).toFixed(1)} KB — above the ${FILE_SIZE_WARN_BYTES / 1024} KB recommended cap. Consider trimming.` });
  }

  return { filePath, bytes, manifest, issues };
}

function extractScriptBodies(html) {
  const out = [];
  // Match <script> blocks WITHOUT type="application/json" (those are manifests, not code).
  const re = /<script(\s+[^>]*)?>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const attrs = m[1] || "";
    if (/type\s*=\s*["']application\/json["']/i.test(attrs)) continue;
    out.push(m[2]);
  }
  return out;
}

function gatherTargets(argv) {
  const explicit = argv.filter(a => !a.startsWith("--")).map(a => path.resolve(a));
  if (explicit.length) return explicit;
  // Default: scan templates/ and examples/ in repo root.
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

function relativise(p) {
  return path.relative(REPO_ROOT, p) || p;
}

function runStrictTests(argv) {
  // Re-invoke the standalone tests runner with the same file targets and the
  // same --json flag, so --strict composes cleanly.
  const runner = path.join(REPO_ROOT, "tools", "run-flatpack-tests.mjs");
  const forwarded = argv.filter(a => a !== "--strict");
  const res = spawnSync(process.execPath, [runner, ...forwarded], { stdio: "inherit" });
  return res.status === 0;
}

function main() {
  const argv = process.argv.slice(2);
  const asJson = argv.includes("--json");
  const strict = argv.includes("--strict");
  const targets = gatherTargets(argv);
  if (!targets.length) {
    console.error("No .html files to check.");
    process.exit(2);
  }

  const reports = targets.map(checkFile);
  let errors = 0, warnings = 0;
  for (const r of reports) {
    for (const i of r.issues) {
      if (i.level === "error") errors++;
      else if (i.level === "warn") warnings++;
    }
  }

  if (asJson) {
    console.log(JSON.stringify({ reports, errors, warnings }, null, 2));
  } else {
    for (const r of reports) {
      const rel = relativise(r.filePath);
      const sizeKB = (r.bytes / 1024).toFixed(1);
      const errs = r.issues.filter(i => i.level === "error").length;
      const warns = r.issues.filter(i => i.level === "warn").length;
      const tag = errs ? "FAIL" : warns ? "WARN" : "OK  ";
      console.log(`${tag}  ${rel}  (${sizeKB} KB, ${errs} err, ${warns} warn)`);
      for (const i of r.issues) {
        console.log(`        [${i.level}] ${i.code}: ${i.msg}`);
        if (i.detail) for (const d of i.detail) console.log(`            ${d}`);
      }
    }
    console.log("");
    console.log(`Total: ${reports.length} file(s), ${errors} error(s), ${warnings} warning(s).`);
  }

  let testsOk = true;
  if (strict) {
    console.log("");
    console.log("--- Running inline tests (--strict) ---");
    testsOk = runStrictTests(argv);
  }

  const exitCode = (errors > 0 || !testsOk) ? 1 : 0;
  process.exit(exitCode);
}

main();
