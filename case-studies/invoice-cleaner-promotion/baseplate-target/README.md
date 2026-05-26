# Baseplate target: invoice-review

A sketch of the Baseplate project this Flatpack promotes into. It is
**not** the codebase. It is the receiving end of the
[`promotion-plan.md`](../promotion-plan.md) — what the plan expects
Baseplate to scaffold.

The actual implementation lives in a separate Baseplate-shaped repo
once the plan is approved.

## Shape

Recipe set (per the promotion plan):

- `admin-users` — named reviewers, login
- `audit-log` — for corrections and approvals
- `public-submission-and-admin-queue` (adapted) — upload + queue surfaces

Plus one custom layer:

- Cross-file invoice-number uniqueness — not a Baseplate recipe; written as
  application code against `(supplier_id, invoice_number)` unique index.

## Entities

See [`entities.md`](entities.md) — the four entities the promotion plan
identified, with field types ready to translate into SQLAlchemy models
and Pydantic schemas.

## Recipes

See [`recipes.md`](recipes.md) — which Baseplate recipes apply, what
each one contributes, and where the gaps are.

## What's deliberately not here

- A scaffolded codebase. Promotion is planning, not transformation.
- A `package.json` or `pyproject.toml`. Belongs in the Baseplate repo.
- Inline code. The plan carries validation rules and test cases as
  text; the Baseplate project's tests are where they become executable.

## Status

This directory is **a target sketch**, not a working app. It exists so
a reviewer can see what the promotion produces *before* the Baseplate
work begins. The reader should walk:

1. [`../promotion-plan.md`](../promotion-plan.md) — the plan.
2. [`entities.md`](entities.md) — what gets modelled.
3. [`recipes.md`](recipes.md) — what gets reused vs. built.

Then go look at [Baseplate](https://github.com/ConceptPending/baseplate)
to see what those recipes actually do today.
