# Design contract

Welcome tagline: “refresh your day the rositrus way” uses large 48px Fredoka lettering, solid white with a pink (#D96B7C) outline. Bundled SVG paths in src/assets/tagline.ts keep it available offline. Center it below the wordmark; use two centered lines on phones and one line on wider screens, scaling to fit without clipping.

Surface: Operate. A beverage counter operator selects drinks, verifies quantities and payment, then moves orders through preparation. The supplied restaurant POS reference determines the composition: light narrow sidebar, bordered product cards, navy controls, and a right-hand order summary. There is no workspace top header; page content begins at the top. Refresh and device settings live at the bottom of the sidebar. Phones open the navigation drawer from a bottom navigation button. Use the existing beverage catalog and real stored data.

Entry: a static mint (#7EDFCF) background with full-screen pink (#D96B7C) flowing swirls based on the supplied Rositrus badge. Center only the yellow, white-outlined Rositrus wordmark with its lemon; omit the circular border and cup icon. Keep the supporting line and a subtle lowercase tap anywhere to start prompt below it in rounded Fredoka lettering at 30px and 50% opacity, with white letters and a pink outline, without a button border or background. The transparent wordmark is bundled in src/assets and scales to fit desktop, tablet and phone. The whole welcome surface is an accessible button. Tap or keyboard activation opens Menu. No credential form or account settings appear. Returning to welcome asks before clearing an unsaved cart.

Menu is the main ordering menu. Desktop catalog and order summary scroll independently; narrow screens stack them. Search filters names/descriptions with an empty-results state. Manage drinks supports editing and photos. Cup icons clearly mark missing photos. Availability uses text plus a colored dot. No fabricated imagery, restaurant dishes, revenue or orders.

Visual character: white sidebar and panels, pale neutral workspace, navy ink/actions, fine gray borders and restrained radii. Lucide icons and native sans type; tabular amounts. Touch targets at least 44px. Phone drawer navigation. Respect reduced motion in drawer/modal transitions. The welcome background never animates.

Protect against double charging and partial writes with serialized transactions, persisted invoice reservations and explicit payment confirmation. Preserve exact centavos, paid snapshots and completed-only metrics. Required states: startup/retry, welcome, empty order, unavailable drink, search empty state, form errors, saving/success, receipt, empty reports and backup validation errors. Keep inputs after failures.

Finish gate: strict TypeScript, shared database/domain/backup regressions, real Edge welcome-to-checkout flow, mouse status drag, receipt and reload persistence, screenshots at 1440/800/390 pixels. Native build checks cover the shared-source Android artifact. Distinguish historical emulator checks from this interface revision in VALIDATION.md.

Small-catalog refinement: Menu is the sole ordering destination. Manage drinks opens from the upper-right button as an inline management mode, never a sidebar module. Product cards use a portrait format: cap desktop card width at 300px, with 3:4 photo wells and 20-22px names/prices. Wrap cards with 16px gaps; stack them on phones with a 360px maximum width. Photos and placeholders share the same portrait proportions in ordering and management modes. Selection outlines and hover scale provide restrained feedback. Custom shared confirmations replace browser dialogs. Bottom-right, pass-through success/error toasts show only committed results and dismiss in 4.2 seconds. Pipeline invalid drops show a three-second warning, shake only the target column for 350ms, then return the preview to its measured origin in 220ms. Reduced motion disables scaling, shaking and sliding.

Invalid movement warnings use the bottom-right notification position with 16px insets, a 340px maximum width and responsive phone sizing. They replace any older toast so neither notification covers the other. A successful status move dismisses the old warning.

Product management takes place directly on the Menu grid. An Add drink button sits beside Finish managing in the header. There is no separate management-list popup; individual add/edit forms keep their existing dialogs.

The Add drink and Finish managing header buttons use natural label widths with 24px horizontal padding, no flex shrinking, and a shared 46px height. Labels stay on one line; the action group may wrap on very narrow screens.

Order pipeline: In Queue, In Progress, Ready, Serving, Done. Serving sits between Ready and Done and does not count as completed revenue. Columns grow equally to fill the available desktop board width; compact screens retain readable horizontally scrolling columns. Schema v4 upgrades existing orders in place, preserving IDs, paid items, completion timestamps and audits. New backups use payload v4; v1-v3 backups remain accepted.

Order-board cards use a white receipt treatment: scalloped paper edges, navy invoice badge and real order number, customer heading, dashed item separators with line totals, a large exact total, staff/date and outlined status, and equally sized dark Move / outlined Details actions. No table number is fabricated. Existing dragging, records and action behavior are unchanged.

Pipeline column headings use 14px, weight 800 type and modestly expanded badge padding to establish workflow hierarchy. Standard detail badges use the compact 12px treatment.

Finalized receipts: Done is terminal. Its drag gesture and Move action are unavailable, and the service plus a schema-v4 SQLite trigger reject changes to its status or completion timestamp. Existing completed records remain intact. Before Done, backward correction still works. A valid drag destination opens an animated receipt-height insertion slot, pushing the other receipts down. The arriving order takes the slot at the top; persisted audit sequence keeps arrival order after refresh. Invalid/cancelled drags close the slot without changing records. Reduced motion makes the same placement immediate. Backup payload v4 remains compatible with earlier v1-v3 imports.

Welcome prompt lettering is bundled as SVG paths in src/assets/start-orders.ts, derived from Fredoka (SIL Open Font License in src/assets/Fredoka-OFL.txt). It renders consistently offline without a runtime font download.

The tap-anywhere prompt sits independently near the bottom (14% inset, 64px on short screens), above the footer. Preserve every font outline command and leave SVG padding around all letters so the final t remains intact. Scale width and height together on narrow screens.

Serialize prompt path coordinates directly as finite decimal numbers; reject NaN and Infinity. The font converter's decimal formatter produced a NaN in the last t and must not be used for these paths.
