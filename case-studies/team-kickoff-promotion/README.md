# Case study: Promoting `checklist` (team kickoff)

A second worked example of the **promotion** path from Flatpack to
Baseplate. The first (`invoice-cleaner-promotion`) covered the
`import-validate-store` archetype. This one covers
`workflow-with-checklist`.

Two worked examples make the pattern visible. One could be an
accident; two suggest a shape.

## The situation

A consulting firm has been using the `checklist.html` Flatpack for
project kickoffs since the start of the year. Each consultant ran
their own copy locally — fill in scope, people, risks, cadence;
tick items; send the printable report to the client; move on.

Last month:

- Three consultants are running two engagements each.
- The partner asked "how many kickoffs completed this quarter, what
  notes did the team leave?"
- A new template draft (added "regulatory check") needs to roll out
  to everyone. Slack has not been a good distribution mechanism.

Three triggers from the Flatpack's `promotionSignals` are now firing:
multiple people running the same template, central template editing
and rollout, per-user attribution.

This is the **promotion event**.

## What's in this directory

```
README.md                  This file
original-flatpack.html     Frozen copy of templates/checklist.html v0.1.0
promotion-plan.md          The plan with three confidence tiers
baseplate-target/
  README.md                Receiving project sketch
  entities.md              5 entities (Template, Section, Item, Run, Progress)
  recipes.md               Recipe set composed from the archetype
```

## A worked promotion exists

The plan in this directory was walked end-to-end. The receiving
Baseplate project lives at
**[ConceptPending/flatpack-team-kickoff-example](https://github.com/ConceptPending/flatpack-team-kickoff-example)**.

In that repo:

- `reference/original-flatpack.html` — the frozen Flatpack with
  `validation_predicates` added at promotion time.
- `reference/promotion-plan.md` — the plan from this directory.
- `reference/promoted-entities.json` — Template, Run, Progress.
- `reference/decisions.md` — answers to INTERVIEW-REQUIRED items.
- `backend/` — the actual FastAPI app, 26 passing tests, `make
  verify-promotion` returns 29 OK / 3 MISS / 5 WARN (all MISSes
  documented legitimate semantic divergences).

The "What we learned" section in that repo lists the new bridge
issues this second worked example surfaced — none catastrophic,
two minor:

- The `markdown` export hint map was missing `/markdown`. Fixed
  upstream during the build.
- The `validation_predicates` schema doesn't support promoted-entity
  predicates. Worth filing as a follow-up.
- JS camelCase ↔ Python snake_case at the boundary causes literal
  field-name mismatches. Worth a normalisation pass in the verifier.

## How this case study differs from `invoice-cleaner-promotion`

If you've read the first case study, here's what's new:

| | invoice-cleaner | team-kickoff |
|---|---|---|
| Archetype | `import-validate-store` | `workflow-with-checklist` |
| Recipes applied | `admin-users` + audit-log stub + adapted `public-submission-and-admin-queue` | `admin-users` + audit-log stub |
| Promotion's signature move | Factoring `supplier_name` into a `Supplier` FK | Factoring the hardcoded `checklist` constant into a versioned `ChecklistTemplate` |
| New entity not in the Flatpack manifest | `Supplier`, `ReviewBatch`, `ValidationError` | `ChecklistTemplate`, `ChecklistRun`, `ChecklistProgress` |
| External-facing surface | CSV upload + downloads | Markdown export endpoint + a tick API |
| Custom code not covered by a recipe | Cross-file dedup + currency normaliser | Template versioning + run snapshot of `template_version` |

The differences confirm the archetype mapping is doing real
discrimination: different archetypes produce different recipe sets,
different entity factorings, and different custom-code surfaces.

## What this case study demonstrates that the first didn't

1. **Versioned reference data is a recipe gap.** Both worked
   examples needed some kind of "versioned definition + immutable
   runs against snapshotted definitions" pattern (suppliers' alias
   lists; templates' content). Baseplate doesn't have a recipe for
   this yet. Filed as a bridge issue.

2. **Per-user attribution as a first-class column.** The Flatpack's
   `progress[id]` had no concept of "who ticked this." The Baseplate
   version makes `done_by_id` + `done_at` real columns. This is a
   stronger version of "promotion makes attribution explicit" than
   the invoice-cleaner showed.

3. **The "templates need rollout" trigger.** Subtler than the
   invoice-cleaner's "second user needs shared state." Some
   archetypes' triggers are about *administration*, not
   *collaboration*. Worth naming.

## Related

- [`prompts/promote-flatpack.md`](../../prompts/promote-flatpack.md)
  — the agent flow this case study walks.
- [`SPEC.md`](../../SPEC.md) §8 — when to promote, what carries over.
- [`docs/archetypes.md`](../../docs/archetypes.md) — the
  `workflow-with-checklist` entry.
- [First case study: invoice-cleaner-promotion](../invoice-cleaner-promotion/)
  — the same flow for a different archetype.
