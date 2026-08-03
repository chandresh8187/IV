# IV Mobile/Web Parity Update

This mobile source is aligned with the August 2026 IV web/backend workflow while preserving the existing React Native UI.

## Added mobile flows

- Monthly day-by-day production summary on Dashboard.
- Planned, completed and remaining challan quantity on every production entry.
- Supervisor default/undefault challan preference.
- Offline production queue with automatic reconnect sync and idempotent request IDs.
- Superadmin row lock action: choose any active user; only that user receives one-time Edit access.
- Planning target zinc percentage and permanent planning-list deletion wording/behavior.
- Month-based History list.
- Superadmin historical production editing.
- Challan, material and shift production PDF flows.
- Certificate `Needed Coating` filter: five qualifying entries when entered, otherwise the existing ten-entry flow.
- User edit and activate/deactivate controls.
- Profile editing and password change.
- Manual shift control when automatic scheduling is disabled.
- Superadmin Control Panel for native APK upload/publishing, monthly zinc alert,
  shift schedule, maintenance mode and audit log.
- Existing OTA/native update manager retained.

## Backend compatibility

Deploy `IV_api_row_user_unlock.zip` and run the previously supplied `2026_august_production_workflow.sql` migration before using these flows. No additional migration is required for this mobile update.

## Install

Run `npm install` after extracting. The offline sync adds `@react-native-community/netinfo`, which React Native autolinks during the native build.

The supplied project source does not contain generated `android/` or `ios/`
directories. Follow `ANDROID_UPDATER_INTEGRATION.md` when copying the included
native updater files into your complete Android project before building.
