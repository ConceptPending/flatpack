# Promote a Flatpack to Baseplate

Use this prompt when a Flatpack has stopped being **my tool** and has
become **our tool**. The job is to turn the Flatpack into a Baseplate
**promotion plan** — not to rewrite it line for line, and not to claim
any automatic conversion.

> **Flatpack is designed to be promoted, not automatically converted.**

A Flatpack is one HTML file; a Baseplate project is a full stack.
What promotes is the understanding embedded in the Flatpack: schema,
validation, core logic, exports, flows, sample data, edge cases. The
inline `FLATPACK:MANIFEST` JSON block is the bridge that makes that
understanding machine-readable.

---

## Inputs

- A Flatpack file (or Packet) that the user has been using.
- Optional: notes from the user on why it is being promoted now —
  who else is using it, what is breaking down.

## Output

Two markdown files dropped next to (or referenced by) the Flatpack:

```
reference/
  promotion-plan.md       The plan you produce. See structure below.
  original-flatpack.html  A copy of the Flatpack, frozen as reference.
```

The promotion plan is the deliverable. Do not generate Baseplate code
in this step. The plan is what an agent (or a human) takes into a
Baseplate scaffold next.

---

## The five-step flow

### 1. Confirm the promotion decision

Ask the user which of these has become true. At least one must be:

- A second person needs to use the tool with shared state.
- Someone is treating the data inside it as a source of truth.
- The use case needs an audit log the end user cannot tamper with.
- It requires accounts, roles, or permissions.
- It requires a server-side API with a secret key.
- The cost of losing the file is now bigger than the cost of rebuilding it.

If none is true, do not promote. Suggest the user keep using the
Flatpack and revisit later.

### 2. Analyse the Flatpack

Read these regions, in order, and extract:

- **`FLATPACK:MANIFEST`** — the canonical list of entities, fields,
  validations, exports, promotion signals, recommended recipe.
  This is the source of truth. If it conflicts with `SCHEMA` or
  `VALIDATION`, flag the conflict — do not silently resolve it.
- **`APP_META`** — name, version, persistence, network claims.
- **`SCHEMA` + `VALIDATION`** — the constraints that survived contact
  with real use. These become backend + frontend validation in
  Baseplate.
- **`CORE_LOGIC`** — the pure functions. These become a shared
  service module on the backend.
- **`IMPORT_EXPORT`** — the file shapes the user already trusts.
  These become API endpoints (and/or background jobs for big files).
- **Sample data + `TEST_CASES`** — seed fixtures and the first round
  of unit/integration tests.
- **The UI flow** — header → inputs → results → exports/print. This
  becomes the first Baseplate screen.
- **The privacy note in the banner** — what the user already
  understood about the tool. The Baseplate version's data model has
  to honour or explicitly supersede that.

### 3. Produce the promotion plan

The plan distinguishes **three confidence tiers** so the reader knows
what's load-bearing vs what's a guess:

- **MANIFEST-ASSERTED** — taken directly from `FLATPACK:MANIFEST`.
  This is what the tool's author or generator deliberately declared.
  Trust it.
- **CODE-INFERRED** — extracted by reading the JS (SCHEMA, VALIDATION,
  CORE_LOGIC, IMPORT_EXPORT). Reliable for behaviour, but not always
  for intent. Worth a second pass with the user.
- **INTERVIEW-REQUIRED** — questions the Flatpack does not answer. The
  agent must not invent these. Examples: who can approve, how long to
  retain data, whether to send notifications.

Every claim in the plan is labelled with its tier.

Translate the manifest's `archetype` into a recommended Baseplate
recipe set. The archetype is a whole-app description, not itself a
recipe — map it to the recipes Baseplate publishes (e.g.
`public-submission-and-admin-queue`, `audit-log`, `sso-oidc`,
`admin-users`, `email-intake`). If Baseplate has no recipe for some
part of the archetype, say so explicitly under
INTERVIEW-REQUIRED.

Write `reference/promotion-plan.md` with this shape:

```markdown
# Promotion plan: <Tool name>

Source: <path to original-flatpack.html>
Manifest version: <APP_META.version>
Date: <ISO>

## Why this is being promoted
<one paragraph — which trigger, who is now involved>
**Tier:** INTERVIEW-REQUIRED

## Archetype and recipe mapping
Archetype (from manifest):  <archetype>           **MANIFEST-ASSERTED**
Recommended Baseplate recipes (composed):
- <recipe-1> — covers <which part of the archetype>
- <recipe-2> — covers <which part>
Gaps not covered by any recipe:
- <gap>                                            **INTERVIEW-REQUIRED**

## Entities
### <EntityName>                                   **MANIFEST-ASSERTED**
Fields:
- <name>: <type>, <constraints>                    **MANIFEST-ASSERTED**
Relations:
- <to other entities>                              **CODE-INFERRED**
Indexes / uniques:
- <e.g. invoiceNumber unique per org>              **MANIFEST-ASSERTED**

## Roles
- <role>: <can do what>                            **INTERVIEW-REQUIRED**

## Required features
- [ ] Auth                                         **INTERVIEW-REQUIRED**
- [ ] Persistent records for <Entity>              **MANIFEST-ASSERTED**
- [ ] Validation per the rules below               **MANIFEST-ASSERTED**
- [ ] Import endpoint mirroring Flatpack I/O       **CODE-INFERRED**
- [ ] Export endpoint mirroring Flatpack I/O       **CODE-INFERRED**
- [ ] Audit log                                    **INTERVIEW-REQUIRED**
- [ ] Admin screen                                 **INTERVIEW-REQUIRED**
- [ ] Seed data from `reference/sample-data.<ext>` **CODE-INFERRED**

## Validation rules (verbatim from the Flatpack)
- <rule 1>                                         **MANIFEST-ASSERTED**
- <rule 2>                                         **CODE-INFERRED**

## UI / screens
- <screen 1>: <purpose>                            **CODE-INFERRED**

## Test cases to carry over
<list from FLATPACK:TEST_CASES — these become unit tests>
                                                   **CODE-INFERRED**

## Open questions for the user                     **INTERVIEW-REQUIRED**
- <decisions the Flatpack does not constrain>
- <e.g. "Should approvers be able to override duplicate detection?">

## What is explicitly out of scope
- <things the Flatpack did not do that the user has not asked for>
```

Anything labelled INTERVIEW-REQUIRED is a question for the user before
scaffolding, not a default to assume.

### 4. Hand off

Output the plan. Do not start scaffolding. The next step belongs to
the Baseplate side: the user (or a Baseplate-aware agent) reads the
plan and runs the appropriate Baseplate recipe.

If the user asks you to scaffold, say so plainly:

> "The promotion plan is ready. Scaffolding is a Baseplate task —
> run the `<recipe-name>` recipe and point it at this plan."

### 5. Preserve the Flatpack

Move (or copy) the original Flatpack into `reference/` inside the
new Baseplate project, alongside the promotion plan and any sample
data files. Add a one-paragraph note in the Baseplate README:

```markdown
This project was promoted from a Flatpack (see `reference/`).
The Flatpack remains useful for fast local iteration and for
verifying behaviour parity while the production version is being
built. Do not delete it until parity is verified.
```

---

## Refusal cases

Decline to promote and explain why if any of these is true:

- The Flatpack has no `FLATPACK:MANIFEST` block. Ask the user to add
  one first (or to use [`generate-flatpack.md`](generate-flatpack.md)
  to regenerate a manifest-aware version). Without the manifest,
  promotion is guesswork.
- The user's stated motivation does not match any trigger in step 1.
  Promotion is reversible only in the sense of "you can keep using
  the Flatpack" — do not push someone into shared infra prematurely.
- The Flatpack contains domain-specific assumptions you cannot
  verify (e.g. regulated workflows, professional advice). Flag this
  and ask the user to bring in a domain reviewer before proceeding.
