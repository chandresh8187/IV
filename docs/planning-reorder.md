# Playlist-style production-flow ordering

> Superseded by [manual challan planning](manual-planning.md) on 2026-09-19. Add Production now requires the user's selected pending challan; queue order no longer assigns production. The following describes the earlier workflow only.

## Whole-flow production queue

The Pending list is the saved production queue: the top flow's first unfinished item is used by Add Production. Plant managers and superadmins can drag a whole flow to the top; the order saves immediately on release. Other flows shift down, retaining all completed quantities and linked entries. Without reordering, production finishes each flow's remaining items in sequence before continuing to the next flow. New flows append to the queue. Completed flows remain in the Completed list.

Queue changes notify connected clients. A stale queue snapshot is rejected if another user has reordered, added or completed a flow. An already-open production form cannot save against the wrong active item; reopen it after a priority change. Existing-entry edits retain their original linked item. Shift-correction entries still allow the explicit historical planning selection.

Deploy the backend and run `npm run migrate` before releasing this app update. Migration `20260918000100_add_planning_queue_position.sql` adds queue positions and initializes them to the previously displayed newest-first order, aligning production with that visible order. This can change which existing flow is selected next on deployment; review the queue before production resumes. It does not delete production entries or reset quantities. No new package is needed.

## Items within a flow

Open a plan's Edit form. In Production flow, drag the grip on one item to a new position, then release. Other items shift while keeping their relative order: W Beam → Column → Angle becomes Angle → W Beam → Column when position 3 is moved to position 1. This replaces the previous swap behavior. The list scrolls at its edges during a drag. Accessibility adjustment actions support moving to adjacent positions.

Tap Update Planning to persist the new item order. Closing without saving discards the draft order. Existing item IDs, completed quantities, challans and production-entry links are preserved. The server recalculates completed quantities from entries and assigns sequence numbers from submitted item order; fully completed items are skipped when selecting the next production item. Use the main Pending list to prioritize whole flows instead.


Automated tests cover insertion moves in both directions, preserving identity/progress and the currently edited item, variable row heights, drag completion/cancellation and accessibility actions. Physical-device gesture/keyboard testing remains a release check.
