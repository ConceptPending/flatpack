# Flatpack quality checklist

Run every generated Flatpack through this before declaring it done.
Each item is binary: pass or fix.

## Functional

- [ ] Opens by double-clicking `index.html`. No build step. No server.
- [ ] Works with the network disconnected.
- [ ] Handles empty input without crashing.
- [ ] Handles invalid input with a useful, field-level error message.
- [ ] Ships with a "Load sample data" button or equivalent.
- [ ] Exports produce a file that re-imports cleanly (round-trip).
- [ ] "Reset" clears state without reloading the page.
- [ ] `window.print()` produces a clean, single-purpose report.

## Technical

- [ ] All required `FLATPACK:*` section markers present and in order
      (see [`SPEC.md`](SPEC.md) §6).
- [ ] `FLATPACK:HELP` block present with purpose, inputs, outputs,
      limits, and AI editing notes (see [`SPEC.md`](SPEC.md) §6.2).
- [ ] `FLATPACK:MANIFEST` block present, parses as JSON, and has the
      required fields (`name`, `artifactType`, `version`, `scope`,
      `persistence`, `network`). See [`SPEC.md`](SPEC.md) §6.1 and
      [`manifest.schema.json`](manifest.schema.json).
- [ ] Manifest `version`, `persistence`, and `network` agree with
      `APP_META`. Manifest entities/validations agree with the actual
      `SCHEMA` and `VALIDATION` code.
- [ ] Manifest has an `archetype` (free-text whole-app description, not
      a Baseplate recipe).
- [ ] `APP_META` is the single source of truth for name, version,
      `dataPolicy`, `persistence`, and `network`.
- [ ] No external scripts, stylesheets, fonts, or images.
- [ ] No `fetch()` calls, no `XMLHttpRequest`, no `WebSocket`, no
      `sendBeacon`, no `EventSource`.
- [ ] State is centralised. No ad-hoc globals scattered through handlers.
- [ ] Validation lives in one `validate()` function used by every input path.
- [ ] Core logic is pure: no DOM access, no state mutation.
- [ ] Rendering is deterministic: `render()` can be called any time and
      produce the correct DOM from current state.
- [ ] `localStorage` / `IndexedDB` use is gracefully degraded if disabled
      (e.g. private browsing).
- [ ] Storage keys are versioned (`flatpack:<tool-slug>:vN`).

## UX

- [ ] The tool's purpose is obvious within five seconds of opening it.
- [ ] The primary action is visually distinct.
- [ ] A privacy banner discloses the persistence model in plain English.
- [ ] Form labels are real `<label>` elements associated with inputs.
- [ ] Errors appear next to the offending field, not just at the top.
- [ ] The page is usable at narrow widths (tablet, narrow laptop).
- [ ] Focus is visible on every interactive element.
- [ ] All interactive elements are reachable with the keyboard.
- [ ] No `:hover`-only interactions.
- [ ] Buttons are `<button>` elements, not clickable `<div>`s.

## AI-editability

- [ ] AI editing notes live in the `FLATPACK:HELP` block, not scattered.
- [ ] Each `FLATPACK:*` section contains only what its name implies.
- [ ] Function names describe behaviour, not implementation.
- [ ] `TEST_CASES` includes at least one core-logic test, one
      `bindEvents` smoke test, and one `loadState` migration /
      malformed-data test.
- [ ] `?test=1` runs them; pass count is logged via `console.table`.
- [ ] Reading the file top-to-bottom tells you what the tool does
      without needing to run it.

## Honesty

- [ ] No claims of "secure," "encrypted," or "compliant" unless the
      tool actually implements those controls.
- [ ] No embedded API keys, tokens, or secrets.
- [ ] No telemetry of any kind.
- [ ] If the data is sensitive enough that "anyone with the file can
      read the code" is a problem, the tool is not a Flatpack and the
      user should be redirected to Baseplate.

## Promotion signals (informational)

A Flatpack that triggers any of these is doing its job and is ready
to be **promoted** into a Baseplate project (see [`SPEC.md`](SPEC.md) §8).
Promotion is not code conversion — it is restarting the work on
Baseplate, using the Flatpack's manifest and code as the behavioural
spec. See [`prompts/promote-flatpack.md`](prompts/promote-flatpack.md)
for the agent flow.

- A second person now needs to use this with shared state.
- Someone is treating the data inside it as a source of truth.
- The use case needs an audit log the end user cannot tamper with.
- It requires accounts, roles, or permissions.
- It requires a server-side API with a secret key.
- The cost of losing the file is now bigger than the cost of rebuilding it.
