# Entities

Four entities. The first comes straight from the Flatpack manifest;
the next three are introduced by the promotion plan to address the
triggers that fired (cross-file dedup, audit, batch state).

Each entity below shows fields, constraints, and which confidence
tier they originate from.

---

## `Invoice` **MANIFEST-ASSERTED**

The unit of work in the Flatpack. Promoted directly.

```python
class Invoice(Base):
    id:              UUID                                  # new in Baseplate
    supplier_id:     FK(Supplier)                          # was free-text in Flatpack
    invoice_number:  str                                   # required
    invoice_date:    date                                  # required; not future
    amount:          Decimal                               # required; > 0
    currency:        str                                   # default "GBP"
    batch_id:        FK(ReviewBatch)                       # new in Baseplate
    created_at:      datetime
    updated_at:      datetime
```

Constraints:

- `UNIQUE (supplier_id, invoice_number)` — strengthens the Flatpack's
  per-file rule to cross-file (CODE-INFERRED, matches the user's
  actual need per the promotion plan).
- `CHECK (amount > 0)`.
- `CHECK (invoice_date <= CURRENT_DATE)`.
- Index on `invoice_date` for per-period reporting.

Validation rules carried over from the manifest:

- All required fields validated server-side (Pydantic) AND
  client-side (matching the Flatpack's UX).
- Currency is normalised (`upper().strip()`) before persist.
- Out-of-list currency is a warning surfaced to the reviewer, not a
  rejection.

---

## `Supplier` **CODE-INFERRED**

The Flatpack treated `supplier_name` as a string. The promotion plan
identifies suppliers as a reference list — promoted as its own entity
so two batches can refer to the same supplier without spelling drift.

```python
class Supplier(Base):
    id:         UUID
    name:       str                                        # required, unique
    aliases:    list[str]                                  # other spellings seen
    created_at: datetime
```

Constraints:

- `UNIQUE (name)`.
- `aliases` is a string[] column (Postgres) — used at import time to
  auto-match incoming `supplier_name` to an existing Supplier.

Open question (INTERVIEW-REQUIRED): auto-match by alias, or require
reviewer confirmation the first time a new alias appears? Plan assumes
the latter.

---

## `ReviewBatch` **INTERVIEW-REQUIRED**

Introduced by the promotion plan to give the audit trigger something
to hang off. Each CSV upload becomes a ReviewBatch.

```python
class ReviewBatch(Base):
    id:              UUID
    uploaded_by:     FK(User)                              # admin-users recipe
    uploaded_at:     datetime
    source_filename: str
    status:          enum("pending", "approved", "rejected")
    clean_count:     int    # derived; cached
    error_count:     int    # derived; cached
```

Status workflow: `pending → approved | rejected`. An admin moves the
batch through states; the audit log records the transition.

---

## `ValidationError` **CODE-INFERRED**

The Flatpack holds errors in memory (`state.errors`). The Baseplate
version persists them so a reviewer can come back to a row tomorrow
and correct it.

```python
class ValidationError(Base):
    id:              UUID
    batch_id:        FK(ReviewBatch)
    original_row:    json    # the raw CSV row as a dict
    reasons:         list[str]                             # straight from validateRow()
    resolution:      enum("unresolved", "corrected", "dismissed")
    resolved_by:     FK(User, nullable=True)
    resolved_at:     datetime, nullable=True
    resolved_to:     json, nullable=True                   # the corrected row
```

Lifecycle: created at import time; mutated as the reviewer corrects
or dismisses. When a row is corrected, an `Invoice` is created from
the `resolved_to` payload and this row's `resolution` flips to
`corrected`.

---

## What is *not* an entity

Drawing the line on what stays out:

- **InvoiceLineItem.** The Flatpack treats invoices as single amounts.
  The Baseplate version preserves that. Line items would be a separate
  promotion.
- **Approval.** No separate Approval entity — batch status transitions
  are recorded in the audit log directly.
- **Organisation.** Single-tenant. If multi-tenancy becomes a
  requirement, that is a second promotion event.
- **Currency.** A string field, not an entity. The allowed list lives
  in code.
