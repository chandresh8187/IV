# Contractor selection and production defaults

Settings > Contractors supports add, search, edit, and confirmed delete. Names
are unique. Contractors referenced by production or retained shift schedules
cannot be deleted; rename them instead. Deleting an unused contractor clears
any personal default pointing to it. Production > Contractor remains Coming soon.

Add Production has independent challan/material and contractor dropdowns.
Use Make default below either dropdown to remember that selection for your
account. Remove default clears only that default, not the current form value.
Defaults are server-backed and scoped to the signed-in user, including across
devices. A temporary selection does not change a saved default.

The challan default identifies the exact planning material item, not just its
parent plan. Completed/deleted/unavailable items are not automatically selected.
Old parent-only defaults must be selected and saved once using the new control.
Defaults only prefill new entries, never existing edits or past production.

Each full production entry saves nullable `contractor_id` in the same database
transaction as its production values. Selecting no contractor leaves it null.
The backend verifies selected IDs. Live edits load the saved contractor, not the
user's default. History edits preserve the contractor link and display its name.
Names are read by ID, so contractor renames do not break associations. The
retained contractor report API prioritizes explicit entry selections over old
shift-based assignments. Existing unlinked entries are not backfilled.

## Deployment

Deploy IV_api and run `npm run migrate` before updating the Android app. The
existing `npm start` also runs migrations. New single-statement additive files:

- `20260919000300_link_production_contractor.sql`
- `20260919000400_default_planning_item.sql`
- `20260919000500_default_contractor.sql`

These add nullable links to existing tables, with matching foreign-key types;
they do not truncate, delete or rewrite existing production. Do not edit old
applied migrations or replace/import the whole database. Back up and validate
the migration on staging as usual. Migrations have not been applied by Codex.

Supervisors use the production-scoped contractor lookup and do not need access
to Settings. Contractor management retains `contractors.manage`; selecting
contractors does not grant that permission. Realtime updates refresh contractor
names, defaults and lists without changing selections in an already open form.

Tests cover add/edit/delete, confirmation and errors, exact default selection,
clearing defaults independently, stale contractor IDs, production persistence,
old-client edit compatibility, permissions, and single-statement migrations.
Database tests use mocked connections; verify on a device and staging database
before deploying to live users.
