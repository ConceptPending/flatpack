# Case study: Promoting `invoice-cleaner`

This is a worked example of the **promotion** path from Flatpack to
Baseplate. It exists to prove that the protocol described in
[`SPEC.md`](../../SPEC.md) §8 and
[`prompts/promote-flatpack.md`](../../prompts/promote-flatpack.md)
produces something concrete.

## The situation

Three months ago, someone in finance asked an AI agent for a tool
that would clean supplier-invoice CSVs before they went into the
accounting system. The agent produced
[`examples/invoice-cleaner.html`](../../examples/invoice-cleaner.html).
The user double-clicked it, it worked, they stopped opening it for a
week, then noticed they kept opening it for every monthly batch. It
stayed personal.

Then last month two more reviewers joined. The single-user assumption
started breaking down:

- Three people emailing each other JSON exports of column mappings.
- Two batches with the same invoice number, one per file, not caught.
- Finance lead asked "who approved correcting this one?"

That is the **promotion event**. The Flatpack has stopped being *my
tool* and become *our tool*.

## What's in this directory

```
README.md                  This file
original-flatpack.html     Frozen copy of examples/invoice-cleaner.html v0.2.0
                           — the artifact at the moment of promotion
promotion-plan.md          The plan produced by the promotion-time
                           agent. Every claim labelled with a
                           confidence tier.
baseplate-target/
  README.md                What the receiving Baseplate project looks like
  entities.md              Four entities (Invoice, Supplier, ReviewBatch,
                           ValidationError) with constraints
  recipes.md               Recipe set composed from the archetype, plus
                           gaps that need fresh code
```

## How to read it

In order:

1. **`original-flatpack.html`** — open it in a browser. Use the
   "Load sample data" button. Try `?test=1`. This is the artefact
   that worked for one user for three months and the artefact whose
   manifest the plan draws from.
2. **`promotion-plan.md`** — the agent's output. Note that every
   structural claim is labelled `MANIFEST-ASSERTED`, every behavioural
   inference is labelled `CODE-INFERRED`, and every question the
   Flatpack does not answer is labelled `INTERVIEW-REQUIRED`. The
   plan is *honest about what it knows*.
3. **`baseplate-target/`** — the receiving end. Three short documents
   showing what the new Baseplate project gets scaffolded as, and
   what new code is needed beyond the recipes.

## What this case study does not include

- **A working Baseplate codebase.** Promotion is a planning step, not
  a code transformation. The target sketch tells you what the project
  becomes; the project itself lives in the Baseplate repo once
  scaffolded.
- **A finished decision on every open question.** The
  `INTERVIEW-REQUIRED` items in the plan are deliberately left as
  questions. They are what the team should answer *before* scaffolding,
  not after. Treating them as defaults would defeat the purpose of the
  confidence tiers.
- **A verifier.** A `tools/verify-promotion.mjs` script on the
  Baseplate side would close the loop by asserting the live app
  honours the manifest. That's the next item on the Baseplate side of
  the v0.3 gap list.

## What this case study demonstrates

Three things:

1. **The manifest is doing work.** Half the promotion plan
   (`MANIFEST-ASSERTED` sections) is generated mechanically from the
   manifest. The agent is not guessing entities or validation rules.
2. **The archetype maps to a recipe set, not a single recipe.**
   `import-validate-store` becomes `admin-users` + `audit-log` +
   adapted-`public-submission-and-admin-queue`. The mapping is the
   agent's job; the archetype catalogue is the reference.
3. **The Flatpack is not the codebase.** The original HTML file is
   preserved alongside the plan and the target. It stays useful for
   fast local iteration and side-by-side parity while the Baseplate
   version is being built. It is **not** "compiled into" the new app.

## Related reading

- [`prompts/promote-flatpack.md`](../../prompts/promote-flatpack.md)
  — the agent flow this case study walks.
- [`SPEC.md`](../../SPEC.md) §8 — when to promote, what carries over.
- [`docs/archetypes.md`](../../docs/archetypes.md) — the archetype
  catalogue (`import-validate-store` entry).
