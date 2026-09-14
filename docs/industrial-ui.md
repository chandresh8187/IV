# IV reference-led mobile interface

The current visual direction follows the three references supplied on 13 September: light project-list surfaces, a violet header above a rounded content sheet, compact icon cards, and restrained coral actions. This replaces the earlier graphite / square-card direction. Production data remains the focus.

## Shared foundations

- Palette and Paper input theme: `src/assets/Colors.js`.
- Production and settings directories: `src/components/ModuleMenu.js`. Permission filtering stays in the screen.
- All production registers, including legacy report views: `src/components/ProductionTable.js`.
- Shared stack header and role-independent bottom navigation: `AppHeader.js` and `tabOptions.js`.

Use the shared color and radius tokens for future screens. Favor white cards, subtle shadows, soft lavender selection states, 12px control corners and 18–26px card corners. Violet is the navigation/primary accent; coral highlights the main entry action. Use green for successful/completed states, amber for attention/correction mode and red for errors/destructive actions. Labels must communicate status without relying on color. Do not copy the references' tiny text, fake charts or unrelated travel/project content.

## Interaction and data

Keep production table text centered, numeric values tabular, headers separated from cell borders, and weights/coating units explicit. Empty states belong inside the visible viewport, not the center of an off-screen horizontal table.

Primary actions and close/edit controls need comfortable touch targets. Long names, material descriptions and modal titles must wrap without displacing adjacent controls. Forms retain native date/time pickers and existing validation.

Business rules, permissions, sockets, shift correction, database relationships and generated PDF documents are outside this styling change.

## Verification

`npm test -- --runInBand` covers formatting, permissions, module navigation, register columns, empty states and palette contrast.

`npx eslint src __tests__/IndustrialUI.test.js` checks the frontend source.

`npx expo export --platform android --output-dir .expo/industrial-ui-check` checks the Android JavaScript bundle. It does not replace a signed APK build.

Before release, also walk through planning add/edit, correction/resume, certificate generation, permissions and PDF sharing on the supported device sizes. Spot-check large text, keyboard visibility, long material descriptions and both empty and populated lists.
