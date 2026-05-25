# Generate a Flatpack

Self-contained brief for any coding agent. Pasteable into `CLAUDE.md`,
`.cursorrules`, system prompt, or chat. **A Flatpack is one HTML file
that runs offline, has no dependencies, and can be edited later by a
different agent without breaking.**

## Brief (fill every field)

```
Purpose:       one sentence — what the tool does, for whom
Inputs:        fields or files the user provides (types, ranges, columns)
Outputs:       what the user gets back, in what formats
Persistence:   none | localStorage | indexedDB (and why)
Validation:    the non-obvious rules — what gets rejected, how it's explained
Sample data:   at least one realistic example, inline as a Load Sample button
Non-goals:     what the tool must not try to do
Limitations:   what to disclose up front (e.g. file-size limits)
```

## Must / must not

The file MUST:

- Open by double-clicking `index.html`. Run offline. No build, no server.
- Carry every `FLATPACK:*` section marker in the order shown below.
- Include a `FLATPACK:HELP` comment block (help text + AI editing notes).
- Include a `FLATPACK:MANIFEST` `<script type="application/json">` block.
- Centralise state, schema, validation, rendering — one `validate()`,
  one `render()`. Core logic pure. Rendering deterministic from state.
- Show a privacy banner matching `APP_META.persistence` and `network`.
- Include a Load Sample button, a Reset button, print styles, and a
  `#print-report` section.
- Include `TEST_CASES` runnable via `?test=1`: core-logic coverage, one
  `bindEvents` smoke test, one `loadState`/migration test for malformed
  stored data.
- Pass `QUALITY_CHECKLIST.md`.

The file MUST NOT:

- Add any dependency, CDN script, remote font, or external resource.
- Make any network call (`fetch`, `XMLHttpRequest`, `WebSocket`,
  `sendBeacon`, `EventSource`, remote `<img>`).
- Embed secrets, API keys, or tokens.
- Emit telemetry.
- Claim "secure" / "encrypted" / "compliant" without implementing those
  controls.

If the user asks for any of these, stop — the tool has reached a
promotion event (see `SPEC.md` §8).

## Process

1. Copy the closest template (`calculator`, `csv-cleaner`, `checklist`,
   `report-builder`, `decision-tree`). **Do not start from scratch** —
   templates are not a framework; the shape is the API.
2. Update `APP_META`, `FLATPACK:MANIFEST`, and `FLATPACK:HELP` together.
3. Replace `SCHEMA`, `VALIDATION`, `CORE_LOGIC` (pure), `RENDERING`
   (deterministic from state), sample data, and `TEST_CASES`.
4. Walk `QUALITY_CHECKLIST.md` before declaring done.

## Anatomy (markers in order)

```
FLATPACK:HELP            help text + AI editing notes (HTML comment)
FLATPACK:STYLES          CSS, print styles
FLATPACK:HTML            static DOM
FLATPACK:MANIFEST        <script type="application/json"> block
FLATPACK:METADATA        APP_META constant
FLATPACK:SCHEMA          field/record shape
FLATPACK:STATE           state + loadState/saveState
FLATPACK:VALIDATION      single validate()
FLATPACK:IMPORT_EXPORT   file helpers (CSV/JSON/Markdown/clipboard)
FLATPACK:CORE_LOGIC      pure functions
FLATPACK:RENDERING       DOM updates from state
FLATPACK:EVENTS          handlers mutate state, then call render()
FLATPACK:TEST_CASES      inline tests, runnable via ?test=1
FLATPACK:BOOT            DOMContentLoaded startup
```

## Manifest

Required fields: `name`, `artifactType`, `version`, `scope`
(`personal` | `shared-read-only`), `persistence`, `network`.
Recommended: `entities`, `validations`, `exports`, `promotionSignals`,
`archetype`. Schema: `manifest.schema.json`.

`archetype` is free-text whole-app description — `internal-tool`,
`import-validate-store`, `decision-log`, `case-workspace`,
`workflow-with-checklist`, `branching-questionnaire`, or a new one.
**It is not a Baseplate recipe.**

## References

`SPEC.md` · `QUALITY_CHECKLIST.md` · `manifest.schema.json` ·
`prompts/{modify,review,promote}-flatpack.md`
