# Current financial year

Deploy the backend and run `npm run migrate` (the existing start command already does this) before using the updated app.

New additive migration: `20260913000100_create_current_financial_year.sql`. It creates a singleton selection table with a foreign key; it does not rename, delete, truncate, or reassign existing production/planning data. Existing migration files are unchanged.

In Settings → Financial Year, tap **Set as current** and confirm. The selection is shared across users, persists on the server, and is broadcast through `financial_years_updated`. The current year cannot be deleted while selected.

New production plans use the selected year ID and challan prefix. Editing an existing plan retains its original linked year. Before a manual selection is saved, the previously configured calendar financial year is used for backward compatibility.

History uses production operating dates from April 1 through March 31, not the creation date of the plan. For example, 2025-26 displays production dated 2025-04-01 through 2026-03-31, including legacy entries without a linked plan. Changing the year resets the history navigation and cache; the list, date picker, summaries, and shift reports stay within that year. Planning/challan PDF reports intentionally retain their full lifetime scope.

Checks: frontend Jest suite and ESLint; backend `node --test tests/financialYear.test.js`. Database migration execution and real multi-device testing are deployment checks, not performed by these unit tests.
