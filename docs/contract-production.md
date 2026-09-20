# Contract Production

Production > Contract Production opens the current month name within the financial year selected in Settings > Financial Year. All contractors are shown, including contractors with no production, alongside a combined monthly total. MS and GI production are calculated as the sum of each entry's unit weight multiplied by dipping quantity; quantity is shown in NOS. Weight display can switch between kg and tonnes.

Fetch Previous Production opens a 12-month dropdown ordered April through March. Select a month and tap Fetch Production. January through March belong to the ending calendar year of the selected financial year. Change the year in Settings > Financial Year to view earlier years. Changing that setting resets this report to the current month name in the newly selected year.

Only the contractor ID saved on the production entry determines attribution. Entries without a contractor do not contribute to these totals, and old shift assignments/rotations are not used. Reports use the production shift date, including corrected and overnight production. Renaming a contractor preserves attribution by ID.

The app uses GET /api/contractors/production with month (1-12) and financial_year_id. The backend uses the configured financial year and rejects a stale year ID. Access uses the existing contractors.view permission. Existing legacy report and rotation endpoints remain unchanged.

Deploy the updated API before the mobile app. No new database migration is introduced by this feature; the previously added production_entries.contractor_id column must already exist. Automated checks cover screen month selection, year changes, errors, zero totals, report attribution, and all 12 financial-year months including leap February. Live database and physical-device checks were not performed.
