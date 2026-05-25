# Review a Flatpack

Use this prompt when asking a coding agent to grade an existing
Flatpack against the standard.

The reviewer's job is honest, not encouraging. Every failed checklist
item is a real fix.

---

## Inputs

- Path to the Flatpack file (or folder).
- Optional: the brief that produced it. The review is stricter with
  a brief, because non-goals and limitations become checkable.

## Output

A short markdown report with three sections:

```
## Verdict
  pass | needs-fixes | rebuild

## Failed checks
  - <category>: <item> — <one-line reason and where in the file>

## Suggested fixes
  Numbered list, smallest change first.
```

That's it. No restatement of what the tool does. No congratulations.

## How to review

1. **Open the file with the network disconnected.** If it pulls a font
   or a script, fail. That is a category-defining violation.
2. **Walk the quality checklist** at
   [`../QUALITY_CHECKLIST.md`](../QUALITY_CHECKLIST.md).
   Every item is binary.
3. **Read `APP_META`.** Does the privacy banner in the UI match it?
   Does the file's actual behaviour match the claims?
4. **Grep the file for the section markers** from
   [`../SPEC.md`](../SPEC.md) §6. All required sections present? In
   order? Each section contains only what its name implies?
5. **Run the tests** by opening the file with `?test=1`. If
   `TEST_CASES` is empty, that's a fail under AI-editability.
6. **Try to break it.** Empty input. Invalid input. Wrong file type.
   Reset mid-edit. Print. Each one should fail gracefully with a
   visible message, not a console error.
7. **Open the print dialog.** The printed page should be a clean
   single-purpose report. If the controls show up in print, fail.
8. **Check for honesty.** "Secure," "encrypted," "compliant," "private"
   without backing behaviour is a fail. "Local-first" is fine when
   true.

## Severity rubric

- **Category-defining violations** → `rebuild`:
  - Any network call.
  - Any external dependency.
  - Embedded secrets or API keys.
  - Telemetry.
  - Claims of security/compliance the tool doesn't implement.

- **Missing core structure** → `needs-fixes`:
  - Missing `FLATPACK:*` markers.
  - No centralised state, schema, or validation.
  - No print stylesheet or `#print-report` section.
  - No sample data or "Load sample" affordance.
  - No `TEST_CASES`.

- **UX or accessibility lapses** → `needs-fixes`:
  - Unlabeled inputs.
  - Clickable `<div>`s instead of `<button>`s.
  - Errors only at the top of the page.
  - `:hover`-only interactions.
  - Print output that includes controls.

- **Code hygiene** → noted in suggested fixes:
  - Logic mixed into rendering.
  - Ad-hoc globals.
  - Misnamed functions.

## Brief template

```
File
  Path to review.

Brief (optional)
  Paste the original brief if you have it. Reviewer will check the
  tool against its stated purpose, inputs, outputs, persistence,
  non-goals, and known limitations.

Focus
  optional — "all" by default, or one of:
    structure | privacy | accessibility | print | exports | tests
```

Hand the file and this prompt to the reviewer agent.
