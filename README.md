# Flatpack

[![check](https://github.com/ConceptPending/flatpack/actions/workflows/check.yml/badge.svg)](https://github.com/ConceptPending/flatpack/actions/workflows/check.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![alpha](https://img.shields.io/badge/release-v0.3.0--alpha-orange.svg)](https://github.com/ConceptPending/flatpack/releases)

**A checkable standard for personal AI-built tools: one HTML file,
runs offline, agent-editable, leaves the chat.**

> *Artifacts live in the chat. Flatpacks leave the chat.*

The standard lives at **[flatpack.info](https://flatpack.info)**. This
repo is the source: spec, templates, examples, tooling, agent-rules.

---

## Try one — 10 seconds

**[Open the invoice cleaner in your browser →](https://flatpack.info/try/invoice-cleaner)**

Click *Load sample data*. Use it. Append `?test=1` to the URL to watch
the inline tests run live (`console.table` in DevTools). Right-click →
*Save As* if you want to keep a local copy — once it's on your disk
it works offline forever.

That's the whole onboarding. No install, no account, no setup. The
file is the program.

More to try, each one a single self-contained HTML file:

| Templates | Examples |
|---|---|
| [calculator](https://flatpack.info/try/calculator) | [pricing-calculator](https://flatpack.info/try/pricing-calculator) |
| [csv-cleaner](https://flatpack.info/try/csv-cleaner) | [invoice-cleaner](https://flatpack.info/try/invoice-cleaner) |
| [checklist](https://flatpack.info/try/checklist) | [case-chronology-helper](https://flatpack.info/try/case-chronology-helper) |
| [report-builder](https://flatpack.info/try/report-builder) | |
| [decision-tree](https://flatpack.info/try/decision-tree) | |

## Install Flatpack into your AI agent

Copy one file into your project so your agent produces Flatpacks by default.

```bash
# Claude Code
curl -L https://raw.githubusercontent.com/ConceptPending/flatpack/main/agent-rules/CLAUDE.md > CLAUDE.md
# Cursor
mkdir -p .cursor/rules && curl -L https://raw.githubusercontent.com/ConceptPending/flatpack/main/agent-rules/cursor.mdc > .cursor/rules/flatpack.mdc
# Windsurf
curl -L https://raw.githubusercontent.com/ConceptPending/flatpack/main/agent-rules/windsurf.md > .windsurfrules
# GitHub Copilot
mkdir -p .github && curl -L https://raw.githubusercontent.com/ConceptPending/flatpack/main/agent-rules/copilot-instructions.md > .github/copilot-instructions.md
# Generic AGENTS.md (Codex, Aider, etc.)
curl -L https://raw.githubusercontent.com/ConceptPending/flatpack/main/agent-rules/AGENTS.md > AGENTS.md
```

After this, ask your agent for a small tool — *"a calculator for
project quotes," "a cleaner for these CSVs," "a kickoff checklist"* —
and it should produce a Flatpack-shaped file. See
[`agent-rules/README.md`](agent-rules/README.md) for the per-tool
install paths.

## Verify the shape

Once you have a Flatpack, you can check it mechanically:

```bash
git clone https://github.com/ConceptPending/flatpack
cd flatpack
npm install && npx playwright install   # optional: only for browser smoke test

node tools/check-flatpack.mjs your-flatpack.html --strict
```

The checker confirms: required section markers, manifest shape,
network discipline (no `fetch`, no external resources), HELP block
present, file under size limits, inline tests pass. Lists every
`innerHTML` site for manual XSS review. Zero dependencies; uses only
built-in Node.

CI runs `--strict` on every push.

---

## What this is — and isn't

Flatpack solves the **form factor**, not the generation. Any agent —
ChatGPT, Claude, Cursor, Windsurf, your local model — can produce a
Flatpack. The spec is what makes the output portable, inspectable,
and editable by a different agent later.

> **Flatpack is the file format for personal software.
> Baseplate is the foundation for shared software.**

## Why this exists

AI has made personal software viable. Anyone can ask a model for a
small custom tool and get one. But the output usually lives in a chat
window, which is the worst possible place to keep something you want
to use again next month.

## What a Flatpack is

A single-file, local-first HTML tool with a stable internal structure.

- Opens by double-clicking `index.html`.
- No backend, no build step, no `npm install`.
- No network calls by default.
- No embedded secrets, no telemetry, no external dependencies.
- Standard `FLATPACK:*` section markers so a future agent can edit it
  safely without re-architecting it. **Agent-editable** is the
  load-bearing property — the rarest one, and the reason the format
  compounds over time.
- An inline `FLATPACK:HELP` block consolidating purpose, inputs,
  outputs, limits, and AI editing notes.
- An inline `FLATPACK:MANIFEST` JSON block describing entities,
  validations, exports, archetype, and promotion signals — the bridge
  to Baseplate. Schema in [`manifest.schema.json`](manifest.schema.json).
- An inline `TEST_CASES` block, runnable via `?test=1`, including a
  `bindEvents` smoke test and a `loadState` migration test.

The full constraints live in [`SPEC.md`](SPEC.md). They are not
suggestions. Templates are not a framework: **the shape is the API**.

## What Flatpack is not

- Not a generator. The AI generates; Flatpack is the format the AI
  generates *into*.
- Not a CLI. No `npx flatpack create`. Not yet, possibly not ever.
- Not a hosted product. No accounts. No platform.
- Not a smaller Baseplate. Different category. See "Promotion" below.

## Personal vs shared software

The promotion axis is binary and observable:

| | Flatpack | Baseplate |
|---|---|---|
| Pronoun | **my** tool | **our** tool |
| Users | one (or one at a time) | many, concurrently |
| State | a file on a disk | a database |
| Auth | none | accounts, roles |
| Network | none by default | API + clients |
| Default risk | overbuilding | underbuilding |
| Lifetime | until you stop opening it | until you decommission it |
| Trigger to promote | a second person needs to use it | — |

The "discard" framing is misleading — people rarely consciously
discard a useful tool, they just stop opening it. The honest version:
**personal scope by default; promote when it stops being personal.**

## What's in this repo

```
README.md                  This file
SPEC.md                    What a Flatpack is, precisely
QUALITY_CHECKLIST.md       Pass/fail review checklist
manifest.schema.json       JSON Schema for the inline manifest (docs only)
agent-rules/
  README.md                Install guide: copy one file into your project
  CLAUDE.md                Claude Code
  AGENTS.md                Generic / Codex / Aider
  cursor.mdc               Cursor (.cursor/rules/)
  windsurf.md              Windsurf (.windsurfrules)
  copilot-instructions.md  GitHub Copilot (.github/)
docs/
  archetypes.md            Living vocabulary of whole-app archetypes
  perf-notes.md            Measured limits: 500k-row CSVs in ~1s, honest ceilings
prompts/
  generate-flatpack.md     Pasteable into CLAUDE.md / .cursorrules — the headline artifact
  modify-flatpack.md       How to brief an agent to edit one safely
  review-flatpack.md       How to brief an agent to grade one
  promote-flatpack.md      How to turn a Flatpack into a Baseplate promotion plan
templates/
  calculator.html          Inputs → computed result → printable summary
  csv-cleaner.html         Drop a CSV, validate, export clean + error files
  checklist.html           Sections, progress, notes, local save, print
  report-builder.html      Guided form → Markdown / printable report
  decision-tree.html       Branching questions → recommendation
examples/
  invoice-cleaner.html     CSV cleaner specialised for supplier invoices
  pricing-calculator.html  Client project quote with discount, tax, proposal print
  case-chronology-helper.html  Date-ordered event log with tags, filters, print
tools/
  check-flatpack.mjs       Structural validator (reviewer/CI). Not loaded by Flatpacks.
  run-flatpack-tests.mjs   Inline-test runner. Not loaded by Flatpacks.
  promote.mjs              Reads a Flatpack manifest, emits a promotion-plan skeleton.
  browser-smoke-test.mjs   Playwright-driven cross-browser smoke test.
case-studies/
  invoice-cleaner-promotion/   Worked example: Flatpack → promotion plan → Baseplate target.
.github/workflows/
  check.yml                Runs check-flatpack --strict on push/PR.
```

No CLI, no platform, no hosted service. The repo *is* the product.

## How to use it

### As a human

Open any template via [flatpack.info/try/](https://flatpack.info/try/invoice-cleaner) —
each one runs on its own with sample data. Save a copy, edit the
`APP_META` block at the top, and you have a starting point.

### As an agent (generating)

Read [`SPEC.md`](SPEC.md), pick the closest template, follow
[`prompts/generate-flatpack.md`](prompts/generate-flatpack.md), and
pass [`QUALITY_CHECKLIST.md`](QUALITY_CHECKLIST.md) before declaring done.

If you're an AI coding tool's user (Claude Code, Cursor, Windsurf,
GitHub Copilot, or any agent that reads `AGENTS.md`), copy one file
from [`agent-rules/`](agent-rules/) into your project to install
Flatpack discipline into the agent's context — see
[`agent-rules/README.md`](agent-rules/README.md) for one-line installs.

### As an agent (editing)

Read [`prompts/modify-flatpack.md`](prompts/modify-flatpack.md) first.
The section markers inside the file tell you which regions are safe
to change. Bump `APP_META.version`. Migrate persisted state. Run
`?test=1`.

### As an agent (reviewing)

Read [`prompts/review-flatpack.md`](prompts/review-flatpack.md) and
walk the checklist. Honest, binary, brief.

### As a reviewer or in CI

Two scripts, no dependencies. The checker verifies structure; the
runner exercises the inline tests outside a browser.

```bash
node tools/check-flatpack.mjs                    # structural checks
node tools/check-flatpack.mjs path/to/file.html  # one file
node tools/check-flatpack.mjs --strict           # also runs inline tests
node tools/check-flatpack.mjs --json             # JSON output

node tools/run-flatpack-tests.mjs                # inline TEST_CASES only
```

Both exit 0 on success, 1 on failure. The CI workflow at
[`.github/workflows/check.yml`](.github/workflows/check.yml) runs
`check-flatpack.mjs --strict` on every push/PR. Uses only built-in
Node modules — Flatpack itself remains zero-dependency.

## Promotion

When a Flatpack stops being **my tool** and becomes **our tool**, it is
ready to be **promoted** into a Baseplate project.

> **Flatpack is designed to be promoted, not automatically converted.**

A Flatpack is one HTML file; a Baseplate project is a full stack.
There is no button that transmutes one into the other. What promotes
is the *understanding* embedded in the Flatpack: schema, validation,
core logic, exports, sample data, edge cases, test cases. The inline
`FLATPACK:MANIFEST` JSON block is the bridge that makes that
understanding machine-readable — an agent reads it to produce a
Baseplate promotion plan instead of guessing.

The original Flatpack is preserved as `reference/original-flatpack.html`
inside the new Baseplate project, alongside `reference/promotion-plan.md`.
It stays useful for fast iteration and side-by-side parity checks while
the production version is being built.

> **Flatpack is not a smaller Baseplate. It is the proving ground
> before Baseplate.**
>
> When a tool is just for you, keep it flat. When people start
> depending on it, give it a base.

See [`SPEC.md`](SPEC.md) §8 for the carry-over table,
[`prompts/promote-flatpack.md`](prompts/promote-flatpack.md) for the
agent flow, and
[`case-studies/invoice-cleaner-promotion/`](case-studies/invoice-cleaner-promotion/)
for a worked example end-to-end. The skeleton can be generated
mechanically:

```bash
node tools/promote.mjs examples/invoice-cleaner.html --out plan.md
```

This fills the MANIFEST-ASSERTED sections from the inline manifest;
the CODE-INFERRED and INTERVIEW-REQUIRED sections are deliberately
left as placeholders for the agent (and user) to walk through.

## Branding

Flatpack is a sibling project, lightly endorsed by Baseplate:

```
Flatpack
A Baseplate project
```

Not "Baseplate Flatpack." Part of Flatpack's job is to say *do not use
Baseplate for this yet.*

## License

MIT.

---

Canonical home: **[flatpack.info](https://flatpack.info)**. Source:
this repo. The site is itself a single self-contained HTML file —
the same discipline it advocates for.
