# Flatpack adoption policy (template)

Copy this into your team wiki and edit the **[bracketed]** parts. It is a
starting point for adopting Flatpack as the form factor for internal,
low-stakes, personal tools — and for knowing when a tool must graduate to
[Baseplate](https://github.com/ConceptPending/baseplate) instead.

The whole policy fits the Flatpack philosophy: lightweight, inspectable, no
platform. The enforcement primitive is a `flatpack-lock.json` checked by
[`../tools/check-registry.mjs`](../tools/check-registry.mjs) — see
[`governance.md`](governance.md).

---

## 1. Scope — what Flatpack is for here

Flatpack is approved for tools that are:

- **Personal or send-a-copy** — one person at a time; no shared live state.
- **Low-stakes** — losing the file means re-running it, not a business incident.
- **Local-first** — runs offline, owns its data on the user's device.

Examples we encourage: [calculators, CSV cleaners, checklists, decision logs,
one-off data shaping].

## 2. Hard limits — when a Flatpack is the wrong tool

Stop and **promote to Baseplate** (do not stretch a Flatpack) when any of these
become true — they are the promotion triggers from [`../SPEC.md`](../SPEC.md) §8:

- A second person needs to use it **with shared state**.
- The data inside it is treated as a **source of truth**.
- It needs an **audit log the end user cannot tamper with**.
- It needs **accounts, roles, or permissions**.
- It needs a **server-side API with a secret key**.
- The cost of losing the file now exceeds the cost of rebuilding it.

Agents are already briefed to refuse these (see
[`../agent-rules/`](../agent-rules/)); this policy is the human-side mirror.

## 3. Review gate — before a Flatpack is "blessed"

Before a tool is added to the shared `flatpack-lock.json`, a reviewer
([role: e.g. team lead / any engineer]) confirms:

- [ ] `node tools/check-flatpack.mjs <file> --strict` passes (structure,
      network discipline, escaping rules, inline tests).
- [ ] [`../QUALITY_CHECKLIST.md`](../QUALITY_CHECKLIST.md) behavioural items
      (UX, accessibility, honesty) walked by a human.
- [ ] No sensitive data is hardcoded; the persistence disclosure is accurate.
- [ ] None of the §2 promotion triggers apply.

On pass: bump/confirm the manifest `version`, re-run `--init`, commit the
updated `flatpack-lock.json`.

## 4. Distribution

- Blessed Flatpacks live at **[location: shared drive / intranet path / repo]**.
- The canonical version is whatever the committed `flatpack-lock.json` pins.
- CI (or a scheduled job) runs `check-registry.mjs` against that directory so a
  hand-edited or un-blessed file is caught: **[link to the CI job]**.
- Updates are communicated via **[channel: Slack #tools / email list]**. There
  is no auto-update — re-download the current version.

## 5. Ownership

- Each blessed Flatpack has a named **owner** ([who maintains it]).
- The owner is responsible for re-blessing after changes and for noticing when a
  tool has hit a promotion trigger.
- Un-owned tools are candidates for retirement at the next review.

## 6. Retirement

A Flatpack is retired by removing its entry from `flatpack-lock.json` and the
shared directory. Because it is a single file with no backend, retirement has no
operational tail — but note it in **[changelog / wiki]** so users stop relying
on it.

---

*This policy governs distribution of personal tools. It is deliberately not a
software development lifecycle. If a tool needs one, it is no longer a Flatpack.*
