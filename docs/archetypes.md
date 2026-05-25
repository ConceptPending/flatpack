# Flatpack archetypes

A **living vocabulary** of whole-app archetypes that personal AI-built
tools commonly fit into. The `archetype` field in
[`manifest.schema.json`](../manifest.schema.json) is deliberately
free-text, not an enum — drift is worse than naming friction. This
file is the reference list a generator or reviewer should reach for
first; coin a new archetype when none fits.

An archetype is **not** a Baseplate recipe. Baseplate recipes are
modifications layered onto a base app
([`audit-log`](https://github.com/ConceptPending/baseplate),
`public-submission-and-admin-queue`, `sso-oidc`, `admin-users`,
`email-intake`). Archetypes describe a whole app. The mapping
*archetype → recipe set* is the job of the promotion-time agent
(see [`../prompts/promote-flatpack.md`](../prompts/promote-flatpack.md)).

Each entry below has the same shape:

- **What the Flatpack usually does**
- **Likely entities**
- **Common promotion triggers**
- **Likely Baseplate recipe set**
- **What not to assume**

---

## `internal-tool`

**What the Flatpack usually does.** A self-contained calculator,
estimator, or single-purpose form-and-result tool used by one person
to produce a number, a quote, a recommendation, or a summary they send
on. The classic "spreadsheet but not fragile" case.

**Likely entities.** One: the input record (`Quote`, `Estimate`,
`Scenario`). Sometimes a small history.

**Common promotion triggers.**
- Multiple people maintain or review the same set of records.
- Records need to be stored centrally and versioned.
- An approval workflow is needed before something goes out.
- A customer-facing readout becomes useful.

**Likely Baseplate recipe set.** `admin-users` + `audit-log`.
Optionally `email-intake` if records arrive from outside.

**What not to assume.** That the user wants any history at all. Many
internal tools are stateless across sessions — the result, not the
inputs, is the deliverable.

---

## `import-validate-store`

**What the Flatpack usually does.** Take a file (usually CSV), validate
rows against a schema, surface the broken ones, export the clean ones
plus an errors file. Cleaning data before it goes anywhere else.

**Likely entities.** One main record per row (`Invoice`, `Transaction`,
`Lead`). Optional reference data (`Supplier`, `Account`).

**Common promotion triggers.**
- Multiple reviewers share an import batch.
- Validated records must be stored centrally and de-duplicated across
  files, not just within one file.
- Audit history of imports and edits is required.
- Reference data (suppliers, currencies, account codes) becomes
  shared and reused across batches.

**Likely Baseplate recipe set.** `admin-users` + `audit-log` +
`public-submission-and-admin-queue` (where "public" is internal
authenticated upload).

**What not to assume.** That the schema is fixed. Real imports often
need column mapping per file; carry the mapping into Baseplate as
per-source configuration, not as schema rigidity.

---

## `workflow-with-checklist`

**What the Flatpack usually does.** A sectioned checklist that someone
walks through for a single project, matter, or kickoff. Progress is
tracked; notes attach to items; the output is usually a print-ready
report or a Markdown export.

**Likely entities.** `ChecklistSection`, `ChecklistItem`, optional
`Run` (one walk-through).

**Common promotion triggers.**
- Multiple people work the same checklist at the same time.
- Checklist progress is tracked across many projects or matters
  (so the entity is now `Project` or `Matter`, with the checklist as
  a child).
- Per-user attribution or sign-off is required.
- Checklist templates need to be edited centrally and rolled out to
  teams; versioning matters.

**Likely Baseplate recipe set.** `admin-users` + `audit-log`. Add
`sso-oidc` if it lives inside an internal portal.

**What not to assume.** That every item must be ticked. Many
real-world checklists allow "N/A" — make that explicit in the
promoted schema.

---

## `decision-log`

**What the Flatpack usually does.** A guided form that produces a
structured written decision — title, context, options considered,
recommendation, risks, next steps. Usually output as Markdown for
pasting into a doc, or print for circulation.

**Likely entities.** `Decision`, optional `Option`, optional `Risk`,
optional `Stakeholder`.

**Common promotion triggers.**
- Decisions need to be reviewed and signed off by named people.
- A searchable history of past decisions is needed.
- Versions or revisions of a decision are tracked.
- Commenting or threaded review is required.

**Likely Baseplate recipe set.** `admin-users` + `audit-log`.
`public-submission-and-admin-queue` if non-admins can propose
decisions for review.

**What not to assume.** That every field stays the same across
decisions. Some teams want different shapes for technical decisions,
hiring decisions, and policy decisions — make `type` explicit early.

---

## `branching-questionnaire`

**What the Flatpack usually does.** Walk the user through a
decision tree of questions; each answer routes to the next node;
leaves carry a recommendation with reason and a record of the path.
Used for routing ("is my case eligible?"), assessment, or guided
diagnosis.

**Likely entities.** `TreeNode` (or `Question` + `Answer`),
`DecisionPath` (one walk-through), `Recommendation`.

**Common promotion triggers.**
- Multiple users need to share their path and recommendation.
- Recommendations must be logged for audit.
- The tree itself becomes editable by a team and needs versioning.
- Recommendations need to trigger downstream actions (tickets, emails,
  workflows).

**Likely Baseplate recipe set.** `admin-users` + `audit-log`.
Versioning of the tree is a custom layer on top.

**What not to assume.** That paths are short or that the tree is a
true tree. Some routing logic is a DAG; some has loops. Carry the
walk-through as the source of truth, not the tree structure.

---

## `case-workspace`

**What the Flatpack usually does.** A working file for a single matter
— a chronology, a deal log, an incident dossier. The user adds dated
events, tags them, filters, exports, prints. Built for one person's
research/preparation phase, not for collaboration.

**Likely entities.** `Matter` or `Case`, `Event`, `Tag`. Often
references to external documents or exhibits.

**Common promotion triggers.**
- Multiple people contribute events to the same matter.
- The matter becomes a discoverable record across many users.
- Tagging vocabulary needs to be standardised across users.
- Per-user attribution and timestamping of changes is required.
- Linking events to other systems (documents, exhibits, parties) is
  needed.

**Likely Baseplate recipe set.** `admin-users` + `audit-log` +
`email-intake` (events arriving by email). Document storage is its
own concern.

**What not to assume.** That a chronology has a canonical truth. Two
people working the same matter often disagree about which events
matter and how to characterise them — promotion needs to decide
whether to merge or fork views.

---

## `searchable-lookup`

**What the Flatpack usually does.** Hold a body of reference data — a
playbook, a glossary, a regulation extract, an internal FAQ — and let
the user search it. No input data; the data is the artifact. Output
is "find the relevant entry."

**Likely entities.** `Entry` (with `title`, `body`, `tags`,
optionally `references`).

**Common promotion triggers.**
- Multiple authors need to edit entries without merging HTML files.
- Entries need to be versioned or have a change log.
- Access control on sensitive entries.
- Cross-linking or backlinks become useful.
- The body of data outgrows what fits in a single HTML file.

**Likely Baseplate recipe set.** `admin-users` + `audit-log`.
`sso-oidc` if it's an internal knowledge base.

**What not to assume.** That the data is small. Some lookups grow
fast — Flatpack stops working well past a few hundred entries unless
the HTML is generated rather than hand-edited.

---

## `customer-readout`

**What the Flatpack usually does.** Take internal data (often pasted
in, or filled into a form) and produce a polished client-facing
document — a proposal, a status report, a board pack. The "sendable"
half of internal tooling.

**Likely entities.** `Readout` or `Proposal`, with rich nested
content (line items, sections, attachments).

**Common promotion triggers.**
- Approved readouts need to be sent as numbered, branded PDFs.
- Readouts need to feed into invoicing, CRM, or follow-up workflows.
- A customer-facing acceptance/sign-off flow is required.
- Templates need to be edited centrally with brand control.

**Likely Baseplate recipe set.** `admin-users` + `audit-log` +
something customer-facing (a small acceptance flow, often a custom
recipe).

**What not to assume.** That browser print is good enough for the
customer-facing version. Most real readouts need server-side PDF
generation for typography and branding control.

---

## Coining a new archetype

Add a new entry when you see a Flatpack that genuinely doesn't fit
the eight above. Use the same five-section shape. Keep entries short
and concrete.

The bar:

- A new archetype is justified if the **promotion triggers** or the
  **likely entities** are meaningfully different from every existing
  entry. Renaming an existing archetype is rarely worth it.
- If a Flatpack fits two archetypes equally well, pick one and note
  the other in the manifest's `note` field. Don't try to fix it with
  a hybrid name.
- Submit additions as PRs against this file. Manifests in the wild
  using free-text archetypes the catalogue doesn't list are not
  errors — they are signal that the catalogue needs to grow.
