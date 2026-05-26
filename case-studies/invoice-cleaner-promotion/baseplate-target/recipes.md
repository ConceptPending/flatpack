# Recipes

What Baseplate recipes the promotion plan composes for `invoice-review`,
and what each one contributes. Recipes today live in
[`baseplate/docs/recipes/`](https://github.com/ConceptPending/baseplate).

## Composed recipe set

| Recipe | What it gives us | What it doesn't |
|---|---|---|
| `admin-users` | Named reviewers; login via email + password; bcrypt + JWT; CSRF; per-endpoint rate limiting | Doesn't give us roles beyond a single admin set — the `Reviewer` role is added on top |
| `audit-log` | Append-only log of who did what when; query API; admin-facing log viewer | Doesn't decide *which* events get logged — that's app code |
| `public-submission-and-admin-queue` (adapted) | Upload endpoint, queue UI, status workflow | Default version assumes anonymous submission; we authenticate the upload |

## Adaptations

### `public-submission-and-admin-queue` → authenticated upload

The default recipe gives:

- A public, rate-limited `/submit` form for anonymous submitters.
- An admin queue at `/admin/submissions` with `pending | approved | rejected`.
- Reviewer notes on each submission.

For invoice-review we keep the queue and status workflow, but:

- The submit surface is at `/upload`, requires login (a reviewer or
  admin), and accepts CSVs not single submissions.
- A successful upload creates a `ReviewBatch` plus N `Invoice` and M
  `ValidationError` records.
- The admin queue lists *batches*, not individual rows. Per-row
  correction happens inside a batch detail view.

The CSRF middleware addition the example feedback app made — exempting
the public endpoint — is **not** needed here. Our upload is
authenticated, so CSRF protection stays on.

### `audit-log` events to record

The recipe's contract is "record events"; the application decides
which. From the promotion plan's open questions, the high-value
events are:

- `batch.uploaded(batch_id, user_id, filename, row_count)`
- `batch.status_changed(batch_id, from, to, user_id)`
- `validation_error.resolved(error_id, user_id, resolution, corrected_to)`
- `duplicate.override(invoice_id, user_id, reason)` — if open question 4
  is answered "yes, allow override"
- `supplier.created(supplier_id, name, user_id)`
- `supplier.alias_added(supplier_id, alias, user_id)`

## Gaps not covered by any recipe

Application code, written fresh for this project:

- **Cross-file invoice-number uniqueness.** A `UNIQUE (supplier_id,
  invoice_number)` index plus an upload-time check that surfaces the
  prior `Invoice` row to the reviewer. The Flatpack only enforced
  per-file uniqueness; this is the actual user need.
- **Column-mapping suggester.** The Flatpack's `autoMap` function
  (with supplier-invoice synonyms) carries over as a service the
  upload UI calls.
- **Currency normalisation + warning.** Carried over from the
  Flatpack's `normaliseCurrency` and the warn-not-error logic.
- **Per-currency totals view.** New screen, not a recipe. Reads
  `Invoice` aggregated by currency.

## What we are *not* applying

Resist the temptation to pull in:

- `sso-oidc` — the team is small enough that email + password is fine.
  Add it later if the team grows past the threshold the recipe was
  written for.
- `email-intake` — invoices arrive as CSV uploads, not as emails. If
  finance later wants suppliers to email PDFs that get OCR'd into
  invoices, that is a future second promotion, not part of this one.

## Verification

Once the project is scaffolded, the Baseplate-side
`tools/verify-promotion.mjs` (when written — see the Flatpack v0.3
gap analysis) should be pointed at this project's `reference/`
directory. It reads `reference/original-flatpack.html`'s manifest and
asserts:

- Every manifest entity has a matching SQLAlchemy model.
- Every validation rule in the manifest appears in the validator code.
- Every export in the manifest has a matching API endpoint.
- The project keeps the original Flatpack reachable for parity checks.
