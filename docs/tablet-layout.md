# Tablet layouts

The shared layout helpers adapt to window resizing, rotation, and split-screen. Tablets use wider content workspaces (920dp portrait / 1120dp landscape, up to 1440dp for registers), while short forms remain capped at 680dp.

- Wide landscape tablets (at least 1100dp wide) use a 180dp navigation rail. Phone, portrait and enlarged-text layouts retain bottom navigation. Role filtering is unchanged.
- Production entry and production planning forms place related sections side by side when the measured content width permits. Historical editing fields can use two columns. Resizing does not remount fields or clear form state.
- Planning lists, material/planning/party summaries, and history shift cards use measured-width card grids. Large text reduces the number of columns.
- Dashboard and module-menu density adapt to larger text. Production tables retain readable fixed-width columns and horizontal scrolling; columns are not compressed to fit a tablet.
- Settings, users, profile, controls, archive and other screens inherit the wider centered content limits. Certificate and short editing forms retain narrower readable widths. PDF preview continues to fill its available viewer area.

Automated coverage includes phone, tablet portrait, landscape, split-screen, enlarged text, navigation mode, grid sizing and preserving mounted content during resizing. A real tablet check is still needed for keyboard behavior, native pickers, PDF rendering and system bars; unit tests do not replace on-device visual verification.
