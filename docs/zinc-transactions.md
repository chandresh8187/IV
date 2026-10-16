# Zinc transactions and receipt references

Mobile and web transactions and the server-generated PDF share the same report query.
Production movements are grouped by operating date and day/night shift before pagination.
Usage is the sum of production deductions minus production restorations, rounded to 3 decimals.
Negative totals are labelled production returns; zero net totals remain visible.
Receipts, transfers, opening balances and manual corrections remain individual rows.
The original movement ledger, quantities and stock calculation rules are retained.

Summary rows intentionally omit plant/kettle balances: interleaved receipts, transfers and
late corrections mean a shift summary does not have one transaction balance. Individual
rows show their actual balances immediately after that stock movement. Opening and
correction rows show "Balances set" rather than a misleading 0 kg quantity.

Incoming zinc accepts optional batch_number and invoice_number (up to 100 characters each).
References are trimmed, validated, persisted transactionally, included in request identity,
and displayed in both clients and the PDF. Existing clients can still receive zinc without
these fields, and existing receipts remain unchanged.

New production movements snapshot operating date and shift. Existing linked movements
use their production entry's context. On later changes/restorations, linked older movement
context is preserved before deletion can remove the production record. Records already
orphaned before deployment cannot reliably recover their shift; they explicitly show an
unavailable shift and recorded date instead of inventing an operating shift.

Deploy backend first and apply the two additive migrations using `npm run migrate`:
- 20261016000100_add_zinc_receipt_references.sql
- 20261016000200_preserve_zinc_movement_shift.sql

The clean-install schema and migration manifest include both changes. No live migrations
or stock updates were performed during implementation. Validate on staging MySQL and
Android before releasing clients.

## FIFO receipt traceability

The full immutable movement ledger is replayed in movement-ID order, using integer grams.
Each receipt is a separate lot (even when two receipts have identical batch labels).
Plant-to-kettle transfers allocate the oldest available plant lots. Production allocates
the oldest receipt lots present in the kettle. Production returns undo that entry's latest
allocations and restore the original receipt lots. Summaries combine signed allocations
per operating date/shift, retaining the quantity used or returned from each batch/invoice.

Example: receive 5,000 kg from batch 123456, transfer it, use 2,000 kg; 3,000 kg remains.
Receive and transfer 3,000 kg from another batch. The next 5,000 kg production usage
shows 3,000 kg from the first receipt and 2,000 kg from the second, leaving 1,000 kg.

This is an accounting FIFO allocation, not a physical measurement of mixed kettle zinc.
Opening stock, unidentified historical stock and quantities added by physical stock
corrections retain explicit unreferenced labels; they never inherit a newer receipt's ID.
Downward physical stock corrections reduce the oldest lots in that location first.
No stock quantities or historical ledger amounts are rewritten to generate allocations.

The stock screens show overall plant and kettle balances. Batch and invoice breakdowns are shown in transactions and reports only; FIFO tracking remains active.
Mobile and web share reusable transaction displays between Zinc Stock and Monthly Reports.
Monthly stock totals continue using raw movements recorded within the selected calendar
month. Its transaction list/PDF uses those same movements, grouped for readability, but
FIFO is computed from the full prior history before filtering. Thus an October usage can
reference a September receipt. A late correction appears in its recorded month with the
original operating date/shift. Numeric batch and invoice strings retain leading zeroes.

The monthly PDF includes a complete zinc appendix with batch quantities. Large batch
breakdowns continue across pages, without truncating references or dropping allocations.
No additional migrations are needed beyond the two receipt-reference/context migrations
listed above. Run them before deploying the updated clients if they are not already applied.
