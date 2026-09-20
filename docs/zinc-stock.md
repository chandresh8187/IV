# Zinc Stock

Production > Zinc Stock has Stock in Plant and Stock in Kettle options.

On first use, a manager enters separate opening balances. Nothing is prefilled with example stock. Kettle opening stock can be entered in kg or as fill height in mm measured from the bottom. Existing kettle zinc does not deduct from the opening plant balance. The configured geometry uses the supplied dimensions as internal dimensions: length 5 m, width 1 m, depth 1.25 m.

Add zinc to plant records incoming kg. Add zinc to kettle transfers kg from plant into the kettle. For example, 9,989 kg plant stock minus a 1,000 kg transfer leaves 8,989 kg in plant and adds 1,000 kg to kettle stock. Entries accept up to three decimal places. The transfer form previews the resulting balances and estimated level.

Managers can use Change plant and kettle stock after setup to replace both recorded balances following a physical stock verification. Current values are prefilled; kettle stock may be entered in kg or measured fill height in mm. The correction is saved as a stock movement with the actor, resulting balances and optional note. It does not erase earlier movement history.

The cutaway tank illustration scales its liquid height to recorded kettle stock. It uses the configured zinc density of 7.13 g/cm³ (7,130 kg/m³):

- Footprint = 5 m × 1 m = 5 m².
- Zinc per mm = 5 × 0.001 × 7,130 = 35.65 kg/mm.
- Estimated fill height = kettle kg / 35.65.
- Full geometric volume = 6.25 m³, corresponding to 44,562.5 kg at this density.
- Adding 1,000 kg raises the estimate by approximately 28.1 mm.

This is an inventory-based estimate, not a sensor reading or an operating fill limit. Temperature, actual internal geometry, dross and immersed objects can affect the physical level. Production consumption/dross are not automatically deducted; this version records opening stock, receipts, corrections and transfers only.

Backend endpoints:

- GET /api/zinc-stock: current balances, revision and calculated tank values.
- GET /api/zinc-stock/movements: latest 50 movements, actors and resulting balances.
- POST /api/zinc-stock/movements: initialize, adjust, receive or transfer.

Balances and the ledger are saved in one transaction under a row lock. Revision checks reject stale writes. A stable request ID makes network retries idempotent. Stock cannot become negative or exceed the configured geometric kettle capacity. Stock is shared and carries across financial years. Successful saves emit zinc_stock_updated for multi-device refresh.

Permissions: zinc_stock.view defaults to superadmin, plant manager and admin; zinc_stock.manage defaults to superadmin and plant manager. Superadmin may grant these in Users. Both are needed to manage stock.

Deploy the API first, applying the two additive migrations through the existing migration runner:

- 20260920000100_create_zinc_stock.sql
- 20260920000200_create_zinc_stock_movements.sql

No existing production tables or applied migrations are changed. No live migrations or opening stock values were applied during implementation. Release the mobile app after the API. Tests cover transaction rollback, repeat requests, stale revisions, balances, opening levels, capacities, permissions and UI errors. The tank illustration was rendered and visually checked at empty, 1,000 kg, 30,000 kg and full geometric capacity. Physical-device and live-MySQL validation remain unperformed.
