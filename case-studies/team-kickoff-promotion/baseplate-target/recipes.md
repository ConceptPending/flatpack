# Recipes

What Baseplate recipes the promotion plan composes for `team-kickoff`,
and what each contributes.

## Composed recipe set

| Recipe | What it gives us | What it doesn't |
|---|---|---|
| `admin-users` | Named consultants + login. Existing user table; the partner is a flagged admin. | Doesn't separate partner-vs-consultant role; we add a role flag on top. |
| `audit-log` | Append-only log; query API; admin viewer | Doesn't decide which events to record — application code chooses. |

## Adaptations

### `admin-users` → partner / consultant roles

The base recipe gives you `is_admin: bool`. For this use case:

- `is_admin == True` → partner (sees all runs, manages templates,
  reads the audit log).
- `is_admin == False` → consultant (creates and runs own checklists;
  can see other consultants' runs read-only).

Plan keeps it at this simple two-tier split — no `Reporter`-style
third role yet (per `decisions.md` v1 scope).

### `audit-log` events to record

The recipe's contract is "record events"; the application decides
which. For this use case:

- `template.created(template_id, name, version, user_id)`
- `template.activated(template_id, replaces_version, user_id)`
- `run.started(run_id, template_id, template_version, owner_id, project_handle)`
- `run.status_changed(run_id, from, to, user_id)`
- `progress.ticked(progress_id, run_id, item_id, user_id)`
- `progress.unticked(progress_id, run_id, item_id, user_id)`
- `progress.note_edited(progress_id, run_id, item_id, user_id, length)`

The audit log is *stubbed* (table created, hooks as `# TODO`) in the
scaffold per the same convention as the invoice-cleaner worked
example. Full recipe walk is a follow-up.

## Gaps not covered by any recipe

Application code:

- **`ChecklistTemplate` versioning.** Templates are immutable per
  version. A new draft is a new version; activating it deactivates
  the prior version's `is_active` flag. In-progress runs continue
  on their original `template_version`. This is general enough that
  it might become a future Baseplate recipe — see "Suggested future
  recipes" in `docs/recipes/README.md`.

- **Run snapshot of template content.** When a `Run` starts, the
  service layer creates one `ChecklistProgress` per `ChecklistItem`
  in the current snapshot. The Flatpack's "blank progress on new
  items" migration becomes explicit at this step.

- **Markdown export.** `ChecklistRunService.to_markdown(run_id)` ports
  the Flatpack's `toMarkdown()` function. Tested as carry-over from
  the Flatpack's `TEST_CASES`.

- **Per-item tick endpoint.** `PATCH /api/admin/runs/{id}/progress/{item_id}`
  with `{ done: bool }` or `{ note: str }`. Emits an audit event.

## What we are *not* applying

- `sso-oidc` — small firm, email+password is enough for v1.
- `email-intake` — checklists aren't emailed.
- `public-submission-and-admin-queue` — no public submission surface
  in this archetype.

## Verification

After scaffold, the Baseplate-side
`backend/scripts/verify_promotion.py reference/original-flatpack.html`
should pass on:

- Manifest entities: `ChecklistSection`, `ChecklistItem` — exact match.
- Promoted entities (from `reference/promoted-entities.json`):
  `ChecklistTemplate`, `ChecklistRun`, `ChecklistProgress`.
- Validation predicates (added at promotion time to the manifest's
  frozen copy): `name`, `version`, `project_handle`, `owner_id`
  required.
- Exports: `markdown` ↔ a server endpoint that returns the rendered
  Markdown for a run.

Expected residuals:

- `print_pdf` and `json` exports will WARN as "may be client-side"
  if the scaffold doesn't expose them as server endpoints. That's a
  reasonable v1 choice.
