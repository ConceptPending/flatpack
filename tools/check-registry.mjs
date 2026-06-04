#!/usr/bin/env node
// Flatpack registry / lockfile verifier. Zero dependencies — built-in Node only.
//
// An organisation that adopts Flatpack still has no backend and no platform.
// The lightweight governance primitive is a *lockfile*: a list of "blessed"
// Flatpacks pinned by version and content hash. This tool verifies a directory
// of Flatpacks against such a lockfile so a CI job (or a human) can answer two
// questions mechanically:
//   - Has a blessed file been modified since it was pinned? (hash mismatch)
//   - Is an un-blessed Flatpack circulating in this directory? (untracked file)
//
// Usage:
//   node tools/check-registry.mjs <lockfile> <dir>   # verify dir against lock
//   node tools/check-registry.mjs --init <dir>       # print a fresh lock to stdout
//   node tools/check-registry.mjs --json <lock> <dir>
//
// Exit codes:
//   0 — every blessed file matches its pin and no untracked .html is present
//   1 — a hash/version mismatch, a missing file, or an untracked Flatpack
//   2 — usage error

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const MANIFEST_RE =
  /<script\s+type="application\/json"\s+id="flatpack-manifest">([\s\S]*?)<\/script>/;

function sha256(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function manifestVersion(html) {
  const m = html.match(MANIFEST_RE);
  if (!m) return null;
  try {
    return JSON.parse(m[1]).version ?? null;
  } catch {
    return null;
  }
}

function listFlatpacks(dir) {
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".html"))
    .sort();
}

// --- init: emit a lockfile for a directory -----------------------------------

function initLock(dir) {
  const flatpacks = {};
  for (const file of listFlatpacks(dir)) {
    const abs = path.join(dir, file);
    const buf = fs.readFileSync(abs);
    flatpacks[file.replace(/\.html$/, "")] = {
      file,
      version: manifestVersion(buf.toString("utf8")),
      sha256: sha256(buf),
    };
  }
  return { lockfileVersion: 1, flatpacks };
}

// --- verify: check a directory against a lockfile ----------------------------

function verify(lockPath, dir) {
  const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
  const entries = lock.flatpacks || {};
  const findings = [];
  const blessedFiles = new Set();

  for (const [name, pin] of Object.entries(entries)) {
    const file = pin.file || `${name}.html`;
    blessedFiles.add(file);
    const abs = path.join(dir, file);
    if (!fs.existsSync(abs)) {
      findings.push({ level: "miss", name, msg: `blessed file ${file} is missing from ${dir}` });
      continue;
    }
    const buf = fs.readFileSync(abs);
    const actualHash = sha256(buf);
    if (pin.sha256 && actualHash !== pin.sha256) {
      findings.push({
        level: "miss",
        name,
        msg: `${file} sha256 ${actualHash.slice(0, 12)}… != pinned ${String(pin.sha256).slice(0, 12)}… (file changed since it was blessed)`,
      });
      continue;
    }
    const actualVersion = manifestVersion(buf.toString("utf8"));
    if (pin.version && actualVersion !== pin.version) {
      findings.push({
        level: "miss",
        name,
        msg: `${file} manifest version ${actualVersion} != pinned ${pin.version}`,
      });
      continue;
    }
    findings.push({ level: "ok", name, msg: `${file} matches pin (v${actualVersion})` });
  }

  // Untracked Flatpacks circulating alongside the blessed set.
  for (const file of listFlatpacks(dir)) {
    if (!blessedFiles.has(file)) {
      findings.push({ level: "untracked", name: file, msg: `${file} is not in the lockfile (un-blessed)` });
    }
  }

  return findings;
}

// --- main --------------------------------------------------------------------

function main() {
  const argv = process.argv.slice(2);
  const asJson = argv.includes("--json");
  const args = argv.filter((a) => a !== "--json");

  if (args[0] === "--init") {
    const dir = args[1] || ".";
    if (!fs.existsSync(dir)) {
      console.error(`Directory not found: ${dir}`);
      process.exit(2);
    }
    console.log(JSON.stringify(initLock(dir), null, 2));
    return;
  }

  const [lockPath, dir] = args;
  if (!lockPath || !dir) {
    console.error("Usage: check-registry.mjs <lockfile> <dir>  |  --init <dir>");
    process.exit(2);
  }
  if (!fs.existsSync(lockPath) || !fs.existsSync(dir)) {
    console.error(`Not found: ${!fs.existsSync(lockPath) ? lockPath : dir}`);
    process.exit(2);
  }

  const findings = verify(lockPath, dir);
  const bad = findings.filter((f) => f.level === "miss" || f.level === "untracked");

  if (asJson) {
    console.log(JSON.stringify({ findings, failed: bad.length }, null, 2));
  } else {
    for (const f of findings) {
      const tag = { ok: "OK  ", miss: "MISS", untracked: "UNTRACKED" }[f.level];
      console.log(`${tag}  ${f.msg}`);
    }
    console.log("");
    console.log(
      `Registry: ${findings.filter((f) => f.level === "ok").length} blessed OK, ` +
        `${findings.filter((f) => f.level === "miss").length} mismatched, ` +
        `${findings.filter((f) => f.level === "untracked").length} untracked.`,
    );
  }

  process.exit(bad.length ? 1 : 0);
}

main();
