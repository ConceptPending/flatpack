# Baseplate target: team-kickoff

A sketch of the Baseplate project this Flatpack promotes into. The
actual implementation lives in
[ConceptPending/flatpack-team-kickoff-example](https://github.com/ConceptPending/flatpack-team-kickoff-example).

## Shape

Recipe set (per the promotion plan):

- `admin-users` — named consultants + a partner role
- `audit-log` — tick / un-tick / template-version-change /
  run-status transitions

Plus the custom layer:

- **`ChecklistTemplate` versioning.** Not a Baseplate recipe — written
  as application code. Templates are immutable per version; runs
  snapshot `template_version` at start; a new template version
  doesn't migrate in-progress runs.

## Entities

See [`entities.md`](entities.md) — the five entities the plan
identified, with field types ready for SQLAlchemy.

## Recipes

See [`recipes.md`](recipes.md) — which Baseplate recipes apply,
what each contributes, and where the gaps are.

## What's deliberately not here

- A scaffolded codebase. Promotion is planning, not transformation.
- Slack / email integrations.
- A graphical template editor (templates edited via JSON or basic
  form for v1).
- Cross-engagement reporting beyond per-run summaries.

## Status

This directory is a target sketch, not a working app. To see the
walked-out version, follow the link to
`flatpack-team-kickoff-example` above.
