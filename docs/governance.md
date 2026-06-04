# Governance: blessing and pinning Flatpacks in an org

A Flatpack has no backend, no platform, and no auto-update. That is the point —
it is a file. But the moment more than one person in an organisation relies on
the *same* tool, you need to answer two questions without a server:

1. **Is this the approved version?** (Did someone hand-edit a copy?)
2. **Is this file the one we reviewed?** (Did it change since we blessed it?)

The answer is a **lockfile** — `flatpack-lock.json` — plus the zero-dependency
`tools/check-registry.mjs` verifier. No database, no service; just a pinned list
and a hash check you can run in CI or on a laptop.

> This is governance for *distribution*, not a step toward shared state. If the
> tool needs shared state, accounts, or a tamper-proof audit log, that is a
> **promotion event** — see [`../SPEC.md`](../SPEC.md) §8. A lockfile governs
> which personal files are blessed; it does not make them a system.

## The lockfile

```json
{
  "lockfileVersion": 1,
  "flatpacks": {
    "invoice-cleaner": {
      "file": "invoice-cleaner.html",
      "version": "0.2.0",
      "sha256": "7340a795115a2a3befe8e7f29d874e25128d5e8a684a8836b0898593d579aa34"
    }
  }
}
```

Each entry pins a blessed Flatpack by its **manifest `version`** and the
**sha256 of the exact file** that was reviewed. See
[`../examples/flatpack-lock.json`](../examples/flatpack-lock.json) for a real one.

## Workflow

```bash
# 1. Bless the current contents of a directory: generate a lockfile.
node tools/check-registry.mjs --init path/to/blessed-flatpacks > flatpack-lock.json

# 2. Verify a directory against the lockfile (run in CI or before distribution).
node tools/check-registry.mjs flatpack-lock.json path/to/blessed-flatpacks
```

The verifier reports:

- **OK** — file present, hash matches, manifest version matches the pin.
- **MISS** — a blessed file is missing, its hash changed (hand-edited since
  blessing), or its manifest version drifted from the pin.
- **UNTRACKED** — a `.html` Flatpack is sitting in the directory but is not in
  the lockfile (an un-blessed tool circulating alongside the approved set).

It exits non-zero on any MISS or UNTRACKED, so it gates a pipeline cleanly.

## Re-blessing after a change

When a Flatpack is legitimately updated (a new version reviewed and approved):

1. Bump the manifest `version` in the file (the checker enforces semver).
2. Re-run `--init` to regenerate the lockfile, or update that one entry's
   `version` + `sha256`.
3. Commit the new `flatpack-lock.json` — the diff *is* the audit record of what
   was blessed and when.

## What this does and does not give you

- ✅ Tamper-evidence: a changed file fails the hash check.
- ✅ Version pinning: the approved version is named, not assumed.
- ✅ Drift detection: un-blessed tools in the shared folder are surfaced.
- ❌ Not access control — anyone with the file can still open and edit their own
  copy. The lockfile governs the *blessed distribution*, not private copies.
- ❌ Not auto-update — distribution (shared drive, intranet, email) is still
  manual. The lockfile tells you *which* version is current.

See [`adoption-policy.md`](adoption-policy.md) for a policy template that wraps
this mechanism in a who-approves-what process.
