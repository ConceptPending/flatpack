# Modify an existing Flatpack

Use this prompt when asking a coding agent to edit a Flatpack the user
already has. The agent should read [`../SPEC.md`](../SPEC.md) and the
file's own `AI EDITING NOTES` block before changing anything.

---

## Before editing

1. Open the file. Find the `AI EDITING NOTES` comment block near the
   top. It will tell you which `FLATPACK:*` sections are safe to edit
   and which to leave alone.
2. Read `APP_META`. The persistence model and network policy live here.
   Do not change them without explicit instruction.
3. Run the existing tests by opening the file with `?test=1`. If they
   fail before you touch anything, fix that first and tell the user.

## Editing rules

- **Stay within the marked sections.** Don't move code from one section
  to another to make a diff look nicer.
- **Don't add dependencies.** No `<script src="...">`. No imports from
  npm. If you genuinely need one, stop and ask the user.
- **Don't add network calls.** A Flatpack is local-first. If the change
  needs a server, it's a promotion event, not an edit.
- **Don't add telemetry.** Ever.
- **Update `APP_META.version`** when you change behaviour. Patch bump
  for fixes, minor bump for new features, major bump for breaking
  schema or persistence changes.
- **Migrate `localStorage` if the state shape changes.** Add a
  versioned key or a migration step in `loadState()`. Don't silently
  break a user's saved state.
- **Add a `TEST_CASES` entry** for any new core-logic behaviour.
  Run `?test=1` after the change.
- **Re-walk the quality checklist** for anything you changed:
  [`../QUALITY_CHECKLIST.md`](../QUALITY_CHECKLIST.md).

## What counts as a promotion event

If the user asks for any of the following, stop editing the Flatpack
and tell them this is a Baseplate-shaped change, not a Flatpack edit:

- A login or per-user state.
- A server-side API with a secret key.
- A database shared between users.
- An audit log the end user cannot tamper with.
- Roles or permissions.

The tool has stopped being **my tool** and become **our tool**. Point
the user at `SPEC.md` §8 — the next move is to start a Baseplate
project using this Flatpack as the behavioural spec, not to bolt the
new requirement on.

## Common edit recipes

### "Add a field to the input form"

1. Add it to `SCHEMA` with type and constraints.
2. Add the `<input>` to the `HTML` section, with a real `<label>`.
3. Add the corresponding `state.inputs.<field>` reference.
4. Update `validate()` if there's a non-obvious rule.
5. Update the calculation in `CORE_LOGIC` if it uses the new field.
6. Update the printable section so it appears in the report.
7. Add a `TEST_CASES` entry that exercises the new field.

### "Change the calculation"

1. Edit the relevant function in `CORE_LOGIC` only.
2. Update or add a `TEST_CASES` entry with the new expected output.
3. Run `?test=1`. Don't ship a failing test.

### "Add an export format"

1. Add the helper to `IMPORT_EXPORT` (e.g., `exportMarkdown()`).
2. Add the button to the `HTML` section, near the existing exports.
3. Wire up the handler in `EVENTS`.
4. Make sure the new file downloads as a `Blob`, not via a remote URL.

### "Change the persistence model"

This is a careful change. Update `APP_META.persistence`, update the
privacy banner copy in `RENDERING`, write a migration in `loadState()`
if there is existing user data on disk, and bump `APP_META.version`.

---

## Brief template for an edit

```
File
  Path to the Flatpack you want changed.

Change requested
  One paragraph describing what the user wants.

In scope (sections to touch)
  e.g., CORE_LOGIC, RENDERING, SCHEMA.

Out of scope (do not touch)
  e.g., IMPORT_EXPORT, METADATA, persistence model.

New behaviour to test
  At least one concrete input → expected output.

Backwards compatibility
  Does existing saved state need to keep working? If yes, the agent
  must add a migration in loadState().
```
