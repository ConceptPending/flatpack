# Agent rules — install Flatpack into your AI tool

The Flatpack standard works best when the AI coding agent you use
already knows it before you ask. These files install that knowledge
into the major tools. Each one is self-contained — copy the file
into the right location in **your own project** (not this repo) and
your agent will produce Flatpacks by default.

You don't need to clone or vendor the Flatpack repo. The agent-rules
files include the rules inline and link out to the canonical spec
for depth.

## Pick your agent

| Tool | Source file | Where to put it in your project |
|---|---|---|
| [Claude Code](https://claude.com/claude-code) | `CLAUDE.md` | `CLAUDE.md` at the repo root |
| [Cursor](https://cursor.com) | `cursor.mdc` | `.cursor/rules/flatpack.mdc` |
| [Windsurf](https://windsurf.com) | `windsurf.md` | `.windsurfrules` or `.windsurf/rules/flatpack.md` |
| [GitHub Copilot](https://docs.github.com/copilot) | `copilot-instructions.md` | `.github/copilot-instructions.md` |
| Generic / Codex / Aider | `AGENTS.md` | `AGENTS.md` at the repo root |

## One-liner installs

From a project where you want Flatpack discipline:

```bash
# Claude Code
curl -L https://raw.githubusercontent.com/ConceptPending/flatpack/main/agent-rules/CLAUDE.md > CLAUDE.md

# Cursor
mkdir -p .cursor/rules && \
  curl -L https://raw.githubusercontent.com/ConceptPending/flatpack/main/agent-rules/cursor.mdc > .cursor/rules/flatpack.mdc

# Windsurf
curl -L https://raw.githubusercontent.com/ConceptPending/flatpack/main/agent-rules/windsurf.md > .windsurfrules

# GitHub Copilot
mkdir -p .github && \
  curl -L https://raw.githubusercontent.com/ConceptPending/flatpack/main/agent-rules/copilot-instructions.md > .github/copilot-instructions.md

# Generic AGENTS.md
curl -L https://raw.githubusercontent.com/ConceptPending/flatpack/main/agent-rules/AGENTS.md > AGENTS.md
```

You can install more than one — they don't conflict. Many people
add both `CLAUDE.md` (for Claude Code) and `AGENTS.md` (for other
agents).

## What they all do

Each file tells your agent:

- When the user asks for a small tool, produce a **single HTML file**
  (a Flatpack), not a Node/React project.
- The **hard rules**: zero dependencies, no network calls, no
  embedded secrets, no telemetry, no build step.
- The **required structure**: `FLATPACK:*` section markers, a
  `<script type="application/json" id="flatpack-manifest">` block,
  inline tests, a privacy banner, print styles.
- The **process**: copy the closest template from
  [flatpack/templates](https://github.com/ConceptPending/flatpack/tree/main/templates) —
  don't start from scratch.
- The **refusal cases**: if the user asks for login / shared
  state / audit log / roles, stop and point them at Baseplate.

## Why not one file for everyone?

The content is ~80% the same across all five — only the framing
("for Claude Code", file location, frontmatter for Cursor) differs.
Keeping them separate makes the install instruction simple ("copy
this one file") rather than ("copy this file and rename the front
matter and remove these lines").

The trade-off is duplicate content to maintain. Acceptable for a
v0 — they all source-of-truth back to
[prompts/generate-flatpack.md](https://github.com/ConceptPending/flatpack/blob/main/prompts/generate-flatpack.md).
If the prompt changes substantively, update the five files together.

## What if my agent isn't here?

Most agents either:

- Read `AGENTS.md` (the emerging convention). Try that one first.
- Accept a system-prompt paste. Open
  [prompts/generate-flatpack.md](https://github.com/ConceptPending/flatpack/blob/main/prompts/generate-flatpack.md) —
  it's 96 lines, designed to fit comfortably in a system prompt.

If you're using something that doesn't fit either pattern, open an
issue and we'll add a file for it.
