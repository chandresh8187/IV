# Monthly contractor production

Historical implementation notes: the Production contractor screen has since
been replaced with Coming soon. The active Settings directory and per-entry
selection are documented in [production-contractor-defaults.md](production-contractor-defaults.md).
The old report/rotation APIs remain for compatibility; this UI is not exposed.

Deploy the backend with the new `20260919000200_create_contractor_rotations.sql`
migration before releasing the app. Run `npm run migrate` in IV_api (the existing
start command also runs migrations). This adds one table; no production rows,
old assignments, or previously applied migrations are changed. Do not import or
replace the database. Existing fixed assignments stay fixed until a manager
saves a new paired schedule.

## Usage

Production > Contractor opens this calendar month's report for all contractors.
It shows each contractor's MS/GI totals in kg or tonnes, including zero totals,
and date-wise Day/Night production. Previous/Next month, Current month, and
Select month (native date picker; any day selects its month) navigate history.
Month reports can cross the currently configured financial-year selection;
custom date ranges and Full current year still use that selected year.

Under Shift assignments, choose an effective production date, Day contractor,
Night contractor, and Swap every month, then Save shift schedule. Both shifts
are saved atomically. No cron job or app running at midnight is required.

Example: from September 18, Day=Bintu and Night=Bhagat. October has Day=Bhagat
and Night=Bintu; November switches back. September 30 Night remains assigned to
Bhagat even if the shift ends on October 1: attribution uses `shift_date`.

For a mid-month change, save a **new effective date**, not an edit to the older
schedule. This resets the rotation anchor; the next calendar month swaps the
new starting pair. Earlier dates keep their assignments. Keep shifts fixed
disables rotation from the chosen date. Unassigned can be selected per shift.

Editing an existing schedule intentionally recalculates ownership from that
date until the next schedule; a confirmation explains this. Revisions prevent
stale writes from overwriting another manager's changes. If a conflict is shown,
reselect the effective date or the refreshed schedule before editing again.
Production entries themselves are never rewritten by an assignment.

Legacy single-shift rules are retained for historical attribution and old-client
compatibility. The latest effective date wins; a paired schedule wins ties.
A later legacy rule overrides that shift until a newer paired schedule starts.
Update manager devices to the new paired-assignment UI together.

Saving emits the existing `contractors_updated` event. Existing production and
history correction events refresh contractor reports as before.

## Verification

Frontend: `npm test -- --runInBand` and ESLint for changed files.
Backend: `node --test tests/contractors.test.js` covers migration safety, month
boundaries, year rollover, mid-month changes, fixed mode, monthly totals, zero
production, leap February, atomic writes and concurrent edits. Database calls
are mocked; verify migration and totals in staging before production deployment.
