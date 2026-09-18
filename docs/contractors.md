# Contractor production

Production > Contractor has a production report and repeating shift assignments. Add your contractors by name; no fictional contractor records are seeded.

Assign Day or Night to a contractor with an effective production date. The rule repeats until a later rule for the same shift starts. Day and Night are independent; one contractor can own both. An Unassigned rule stops attribution from its effective date. Night production uses its saved shift date, even when entries are added after midnight or through shift correction.

Earlier dates remain unchanged when a later rule is added. Editing an older rule intentionally reattributes its date range and requires an explicit confirmation. Assignment history lists upcoming rules too. Reports resolve contractor IDs from these dated rules, not from the current user or current shift. No production rows are rewritten. Concurrent edits to the same rule are rejected when the original contractor no longer matches.

Reports default to the configured current financial year, support a date range and contractor filter, and include unassigned output. MS/GI weights are summed as unit weight times dipping quantity per production entry; non-entry separator rows are excluded. Kilograms and metric tonnes are display units (1 tonne = 1000 kg). Only shifts containing production count toward reported shift totals. The screen report is not a new PDF export.

Default permissions: superadmin and plant manager can view and manage; admin can view; supervisor has no contractor access. Superadmin can grant the two contractor permissions in Users. View access is needed to open the screen; grant both to delegate management. Existing signed-in clients refresh access on reconnect/foreground; log in again if deploying a new permission catalog leaves stale client access.

Deploy backend first and run `npm run migrate`, then deploy the app. New migrations `20260918000300_create_contractors.sql` and `20260918000400_create_contractor_shift_assignments.sql` each contain exactly one additive statement. They create two tables without deleting existing production or changing old migrations.

Automated tests use mock database queries; a live MySQL integration check and Android phone/tablet visual checks remain deployment checks. Verify contractor creation, repeating assignment and a known shift's weights, then change a later effective date and confirm earlier totals remain unchanged. Test another device receiving assignment and production corrections live.
