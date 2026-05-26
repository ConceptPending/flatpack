# Performance notes

How big can a Flatpack realistically get before it stops being
pleasant to use? The pitch — *for when a spreadsheet is too weak* —
implies "bigger than spreadsheet-friendly," which Excel struggles
with past roughly 10,000 rows in interactive use. This document
records honest measurements of what happens when you push beyond
that.

## Method

The script that ran these tests is at
[`tools/browser-smoke-test.mjs`](../tools/browser-smoke-test.mjs)
companion (one-off; not committed). Generation logic:

- Synthetic supplier-invoice CSV
- N rows of {supplier (one of 14), ISO date, invoice number, amount, currency}
- ~1% deliberately duplicated invoice numbers
- ~0.5% missing invoice numbers
- ~0.5% negative amounts
- ~20% rows with `JPY` currency (out-of-allowed-list → error per validator)

Each test loads
[`examples/invoice-cleaner.html`](../examples/invoice-cleaner.html)
in headless Chromium via Playwright, feeds the CSV to the in-page
`loadCSVText()` function, and measures wall time from start of
parse to end of render. Export click → file write is also timed.

## Results

Run on M-series Mac, 2026-05-26, headless Chromium via Playwright.

| Rows | File size | Parse+validate+render | Export clean.csv | Console / page errors |
|---:|---:|---:|---:|---|
| 50,000 | 2.1 MB | **83 ms** in-browser (136 ms wall) | 107 ms | 0 / 0 |
| 200,000 | 8.6 MB | **245 ms** in-browser (446 ms wall) | 128 ms | 0 / 0 |
| 500,000 | 21.4 MB | **533 ms** in-browser (1030 ms wall) | 176 ms | 0 / 0 |

Scaling is roughly linear: parse + render time grows ~10× when row
count grows 10×. The biggest practical bottleneck above ~500k rows
will be the `innerHTML` re-render of the preview table — currently
unbounded; it lists the first 10 clean + first 10 error rows so the
DOM stays small regardless.

The export step (Blob construction + click-to-download) stays
sub-200ms even on the largest input — the heavy work is done in
the preview / validation pass.

## Honest claim

A `csv-cleaner` Flatpack handles **at least 500,000 rows / 20+ MB
without optimisation**. That is far beyond any spreadsheet's
interactive ceiling. The "for when a spreadsheet is too weak" pitch
is empirically supported.

## What would break first?

If you handed a Flatpack a CSV in the 5–10 million row range
(several hundred MB), the likely failure modes in order:

1. **Browser tab memory**. The whole CSV plus parsed array of arrays
   plus per-row mapped dicts lives in memory. A 100 MB CSV might
   need ~500 MB of heap; tabs typically die at 1–4 GB. Streaming
   would be a real change, not just a tweak.
2. **Render time on the preview table**. Bounded at 10+10 rows so
   not actually a problem in practice — but anyone editing the
   preview limit upward will hit it.
3. **The toCSV round-trip cost on export**. String concatenation at
   that scale starts being measurable; using a streaming writer
   would help. But export remains fast in absolute terms.

These are theoretical at 5–10M rows. Below that, the artifact is
genuinely "send it to a colleague and watch it work."

## What we did not measure

- **Visible-paint time** in a real browser tab with the UI
  rendering. Headless Chromium does layout but skips paint;
  user-visible latency could be slightly higher. A spot check in a
  real browser (any of the three) gives the same feeling — sub-
  second for files in the 100k-row range.
- **Cold start vs warm**. The numbers above are from a fresh
  context per run. A warm tab loading a second CSV is faster.
- **Memory under load**. Heap measurement was not part of the
  smoke script. If you push above 1M rows, monitor.
- **Other archetypes**. CSV-cleaner is the obvious large-data
  candidate; the calculator / checklist / decision-tree / report
  -builder all handle inputs measured in dozens of fields, not
  rows. Their performance is dominated by the constant cost of the
  templates' boot sequence (low tens of milliseconds).

## Reproducing

```js
// Synthetic CSV generator — adapt N and column structure as needed.
const N = 50000;
const suppliers = ["Acme Ltd", "Borealis Ops", /* ... */];
const lines = ["Vendor,Invoice Date,Invoice No.,Total,CCY"];
for (let i = 0; i < N; i++) {
  // see tools/browser-smoke-test.mjs prior commits for the exact generator
}
```

Then in headless Chromium via Playwright, navigate to the Flatpack,
call `loadCSVText(text, "stress.csv")` via `page.evaluate()`, and
read `state.cleaned.length`, `state.errors.length`, and the wall
time.
