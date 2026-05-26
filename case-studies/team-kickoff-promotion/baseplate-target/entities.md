# Entities

Five entities. Two come from the Flatpack manifest verbatim; three
are introduced during promotion to support the multi-user, versioned,
attribution-aware shape the use case demands.

## `ChecklistTemplate` **CODE-INFERRED**

The Flatpack's `checklist` constant becomes a database entity so it
can be edited centrally and versioned.

```python
class ChecklistTemplate(Base, TimestampMixin):
    id:            UUID                 # primary key
    name:          str                  # required
    version:       int                  # required; monotonic per name
    is_active:     bool                 # only one active per name
    created_by_id: UUID                 # FK → users.id
```

Constraints:

- `UNIQUE (name, version)`.
- Application code enforces "only one active per name" via a partial
  index or a service-layer guard.

## `ChecklistSection` **MANIFEST-ASSERTED**

Mirrors the Flatpack manifest's entity. Stored per-template-version
so editing a template doesn't break in-progress runs.

```python
class ChecklistSection(Base):
    id:          str                    # primary key, scope: (template_id, id)
    template_id: UUID                   # FK
    title:       str                    # required
    position:    int                    # required; ordering
```

## `ChecklistItem` **MANIFEST-ASSERTED**

```python
class ChecklistItem(Base):
    id:         str                     # primary key, scope: (section_id, id)
    section_id: str                     # FK
    text:       str                     # required
    why:        str | None              # explanatory text
    position:   int                     # required; ordering within section
```

## `ChecklistRun` **INTERVIEW-REQUIRED**

One walk-through of a template, by a consultant, for an engagement.

```python
class ChecklistRun(Base, TimestampMixin):
    id:               UUID
    template_id:      UUID
    template_version: int               # snapshot at start
    owner_id:         UUID              # FK → users.id
    project_handle:   str               # free-text e.g. "Acme Q2 kickoff"
    status:           enum("in_progress", "completed", "abandoned")
    started_at:       datetime
    completed_at:     datetime | None
```

Why both `template_id` and `template_version`: the FK gives you the
template's identity; the snapshot tells you which content was current
when the run started. A new template version doesn't migrate this run.

## `ChecklistProgress` **CODE-INFERRED**

One row per (run, item). The Flatpack's `state.progress[id] = {done, note}`
becomes a real table with attribution.

```python
class ChecklistProgress(Base, TimestampMixin):
    id:          UUID
    run_id:      UUID                   # FK
    item_id:     str                    # refs ChecklistItem.id
    done:        bool                   # default false
    note:        str | None
    done_by_id:  UUID | None            # FK → users.id; nullable until ticked
    done_at:     datetime | None        # set when done flips to true
```

Constraint: `UNIQUE (run_id, item_id)`.

Lifecycle: `Progress` rows are created when a `Run` is started — one
per `ChecklistItem` in the snapshotted template version. The Flatpack's
"new items get blank progress" auto-migration becomes explicit at run
creation time.

## What is *not* an entity

- **`Engagement`** or **`Project`**. The plan's open question 5 flags
  this — the partner's quarterly view would benefit from a real
  `Engagement` entity. v1 keeps `project_handle` as free-text on the
  Run. Promoting to a real entity is a v2 question.
- **Section-level sign-off**. The Flatpack treats sections as
  organisational, not as approvable units. The Baseplate version
  preserves that.
- **Comments / threads** beyond the per-item `note`. Out of scope.
- **Per-template ACLs**. Partner-vs-consultant is the only access
  control; templates are visible to everyone in the firm.
