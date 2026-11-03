# Final letter rendering correction

Found the real cause of the missing final t: the converter serialized one valid floating-point coordinate as NaN, causing SVG rendering to stop early. Regenerated the paths using finite-coordinate validation and direct decimal serialization. A close Edge screenshot now visibly shows the complete word start. Earlier padding-only changes did not resolve this malformed path. TypeScript, web export and all 36 tests passed.

# Lower welcome prompt and full lettering

Moved the prompt independently near the bottom above the footer. Regenerated the rounded vector text without outline optimization, preserving the final t, and increased padding around its bounds. Width and height scale together. TypeScript and web export passed. Edge checks at desktop, tablet, phone and short landscape sizes verified the text path fits its SVG, lower placement, no overflow, corner tapping and keyboard entry; phone screenshot confirms the full word start. Android APK unchanged.

# Subtle tap-anywhere prompt

Changed the rounded welcome prompt to lowercase tap anywhere to start at 50% opacity. Accessible activation label matches. TypeScript, web export and responsive Edge checks passed, including corner tapping and keyboard navigation. Android APK is unchanged.

# Smaller rounded welcome prompt

Start Orders!! uses rounded Fredoka lettering at 30px, bundled as vector paths with the SIL font license. White fill, pink outline and tap-anywhere entry remain. TypeScript, production web export and Edge checks passed across desktop, tablet, phone and landscape layouts, including corner tapping and keyboard navigation. Android APK is unchanged.

# Outlined welcome text

The welcome prompt reads Start Orders!! in large white letters with a pink outline, drawn with native SVG text for browser and Android support. No button border or background. TypeScript and web export passed. Edge checks passed at 1440, 800, 390 and landscape 844 pixels; empty-corner tapping and keyboard entry still open Menu. Android APK has not been rebuilt for this visual revision.

# Borderless welcome prompt

Start orders is now plain rose text with an arrow, without a border or fill. The whole welcome screen remains the accessible activation target. TypeScript and web export passed. Edge checks passed at desktop, tablet, phone and landscape sizes; tapping an empty top-left corner opens Menu, as does keyboard Tab/Enter after reload.

# Welcome action refinement

Changed the welcome action to Start orders with a transparent fill, 2px brand-pink outline, and darker rose text/arrow. The accessible button name and browser smoke selectors match the visible label. TypeScript passed.

# Rositrus welcome branding

Replaced the navy/cup welcome design with the supplied brand's mint and pink flowing background and a transparent yellow/white Rositrus wordmark including the lemon. The waves use native SVG and remain static. The entire welcome screen still opens Menu, with the existing supporting copy and Tap to start action.

TypeScript and the production web export passed. Edge screenshots checked at 1440x900, 800x900, 390x844 and 844x390: logo visible, no clipping or horizontal overflow. Keyboard Tab/Enter entry opens Menu and no page errors were observed. Browser preview updated at localhost:8081. This visual revision has not been rebuilt into the Android APK.

# Finalized receipts and animated insertion

Done is now terminal in UI, domain validation, the status service and SQLite. Completed cards have a lock/Finalized label, no Move action and a disabled drag gesture; Details remains available. Schema v4 adds a completion guard without modifying existing receipt data. TypeScript and 36 regression tests passed, including a v3-to-v4 upgrade preserving every saved row and rejecting both status and completion-time changes through service and direct SQL. Backup payload v4 accepts prior v1-v3 imports.

Edge checks passed: finalized drag attempts produce no preview or status change; valid target hovering opens a receipt-height space and moves an existing receipt down through intermediate animation frames; cancelling closes the space without changing either order; committing inserts the incoming receipt at the top. Arrival ordering persists after reload, including an older invoice arriving above a newer invoice. Reduced-motion dropping, existing payment/history/analytics and product-management checks passed. Screenshots include receipt-insertion-animation.png and finalized-receipt.png. Android release built successfully and its signature verified; physical-device motion acceptance remains separate.

# Pipeline heading emphasis

Column headings now render at 14px and weight 800 with modest padding. TypeScript and browser export passed; a rendered Edge screenshot was inspected for balance with counts and receipt cards. This style refinement updates shared Android source; the standalone APK remains the preceding receipt-card build.

# White receipt-style order cards

The order board now uses white paper-style cards with scalloped edges, invoice badges, customer headings, dashed item separators and line totals, larger exact totals, staff/date, outlined status and paired Move/Details buttons. Total typography adapts to available paper width. Edge screenshots at 1920, 1440 and 390 pixels were inspected; Move and Details open correctly. Full browser order-flow/drag/status/history checks passed. TypeScript and 35 existing regression tests passed. Android release built successfully and its signature verified. Generated native-library cache hard links were replaced with byte-identical independent cache files after cloud metadata prevented Gradle snapshotting. No order data or payment behavior changed.

# Serving pipeline and responsive board revision

The board now has In Queue, In Progress, Ready, Serving and Done. Desktop columns expand equally across the available width; phone columns stay readable with horizontal scrolling. TypeScript and 35 regression tests passed. A real version-two four-stage SQLite fixture upgraded to v3 with identical orders, paid item references, historical completion timestamps and audits; foreign keys remain enabled and SQL still rejects skipped stages. Serving orders survive encrypted backup/restore and remain outside completed-only metrics.

Edge acceptance passed for drag/Move validation, Serving-to-Done completion, exclusion of Serving sales, history and persistence. An existing browser profile also upgraded and retained its paid order. Screenshots at 1920 and 1440 confirm the final column ends 24px from the right edge; the 390px view scrolls horizontally. Android release APK built and signature verified. This APK includes the recent button-size refinements. Physical-device acceptance remains separate from these browser/build checks.

# Management button sizing refinement

The management buttons now expand to their label widths, with matching 46px heights. Browser inspection at 1024px and 390px confirms both labels stay on one line. TypeScript and browser export passed. This small style change updates the shared Android source; the standalone APK remains the preceding inline-management build.

# Inline product management revision

The separate management-list modal was removed. Menu switches its existing grid into edit mode, with Add drink beside Finish managing in the header. Individual add/edit forms remain unchanged. Search also works in management mode. Edge acceptance passed for inline entry/finish, add/edit/delete/photo selection, receipt/payment and pipeline regressions, and screenshot inspection at desktop and phone widths. No management-list dialog opens. TypeScript and all 33 regression tests passed.

# Warning position refinement

Invalid Order Movement now appears at the bottom-right with 16px insets. An older success toast is cleared on rejection to avoid overlap, and valid moves dismiss the previous warning. Edge verification passed for position, no overlapping toast, unchanged rejected status, preview return and automatic dismissal. TypeScript and all 33 regression tests passed; browser and Android release builds completed and the APK signature verified. Screenshot: artifacts/browser/warning-bottom-right.png.

# Rositrus branding revision

The Rositrus Android release APK built successfully after clearing stale generated resource caches. Its signature verified, and aapt confirms the installed application label is Rositrus - Local POS.

Visible branding now reads Rositrus on the welcome screen, sidebar, receipts, browser title, Android app label and backup filename prefix. The longer wordmark was checked in Edge at desktop and 390px phone widths; it stays on one line. TypeScript and all 33 existing regression tests passed. The original database filename, Android package identity, browser profile and encrypted-backup format identifier remain unchanged for existing data compatibility.

# Menu and order feedback revision - 2026-11-03

Current implementation: Menu replaces Dashboard; management opens from a Menu button; larger two-column product cards with hover/selected feedback; custom confirmation dialogs; bottom-right committed-result toasts; invalid target-column shake and smooth preview return. No cloud service or extra UI dependency was introduced.

Strict TypeScript and 33 shared regression tests passed, including v1-to-v2 database migration without lost orders/audits/invoice sequence, atomic product removal rollback, retained paid receipts for removed drinks, replacement product names, v2 backup round trips, and legacy v1 backup restoration.

Real Edge acceptance passed: photo selection, menu add/edit, cancelling a draft-return confirmation, larger four-product layout, cancelled and confirmed payment, exactly one saved checkout, receipt on demand, success toast auto-dismissal, rejected forward drag, preview return, rejected Move picker action, valid drag, backward correction, completion/history/analytics, reload persistence, and reduced-motion product deletion. No native browser alerts or confirms were allowed by the acceptance script. Saved historical sales remain visible after removing the sold drink. Desktop/tablet/phone screenshots are in artifacts/browser.

Android source uses the same native-compatible components and animation libraries. The final Android release package built successfully for arm64-v8a and x86_64 and passed apksigner v2 signature verification. This revision has not been rerun on an emulator or physical device. Older records below describe earlier app revisions.

## Previous interface and validation records


# Current interface revision

The account/login interface has been replaced by a static Pour welcome screen. Tap opens Dashboard directly into the drink catalog and order summary. The old authentication checks below describe the earlier version and do not describe the current entry flow. Legacy authentication service regression tests remain for compatibility; new actions use Local counter for audit context. Existing data is retained.

Current browser acceptance passed: no username/password on startup; welcome tap opens ordering Dashboard; menu search and no-results; backup-only settings with no current-password field; menu editing; PHP 151.00 checkout and receipt; real mouse drag through the pipeline; history/analytics; saved sale after reload; cancelling return-to-welcome preserves the draft; accepting clears only the draft; screenshots at 1440, 800 and 390 pixels inspected. Strict TypeScript and all 29 shared regression tests passed. The updated Android release APK also built successfully and passed apksigner verification. Stale generated packaging folders in the OneDrive workspace were removed before the successful cached build. This interface revision was exercised in Edge; the earlier emulator workflow below was not rerun for this revision.

# Validation record

## Local browser companion

- Browser export builds successfully. Static server returns HTTP 200 and the COOP/COEP headers required for cross-origin isolation (`crossOriginIsolated === true`). SQLite worker and WASM assets load from the same localhost origin.
- Actual Microsoft Edge / Playwright checks passed: first-use owner setup, sign-in through Web Crypto, empty checkout, editing a price to PHP 75.50, selecting quantity 2, confirming and saving PHP 151.00, displaying a receipt, mouse drag into In Progress, Move fallback to Ready/Done, completed history, matching analytics, and data/account persistence after browser reload and sign-in.
- Browser screenshots at 1440, 800 and 390 pixels inspected in `artifacts/browser/`; no clipping or overlap observed in the checked dashboard layouts. The local browser uses real stored test transactions, not preloaded sample analytics.
- All 29 shared domain/database/account/backup regression tests pass after introducing platform adapters. Browser file download/import, gallery selection, printing and multiple simultaneous tabs need additional browser acceptance; Android backup round-trip checks are recorded separately below.
- The visible browser launcher uses a dedicated local profile outside OneDrive. The local web server stays running for the user-requested session. The browser account is created on first use and is independent of the emulator's test account.

## Executed

- Node 24.20.0: 29 tests passed (domain, database-service SQL, account handling and encrypted backup/restore, through native-service test adapters).
- Verified initial two-drink seed, integer centavos, quantity/amount validation, invoice reservation uniqueness, concurrent repeated checkout idempotency, atomic rollback when payment audit insertion fails, unavailable/repriced drink rejection, immutable receipt snapshots, status transitions/backward corrections, append-only audit triggers, completed-sales analytics, local date ranges and receipt escaping.
- Verified disk database close/reopen retains products, orders, item snapshots, statuses, audits and invoice sequence without reseeding; login failure/success and persisted cooldown; credential replacement; encrypted backup restore with photos, wrong-passphrase rejection, and existing-counter protection. Native Keystore/pickers are represented by adapters in these local tests.
- TypeScript strict check passes. Expo reports native dependency versions aligned.
- Release APK built successfully with bundled Hermes JavaScript for `arm64-v8a` and `x86_64`. Android `apksigner verify --verbose` passed (APK Signature Scheme v2). This is a locally signed test build, using Expo's generated development key.
- Android 15 / API 35 x86_64 emulator in airplane mode: first-device account setup; invalid-password rejection; valid sign-in; initial two drinks; saving a price of PHP 75.50; selecting quantity 2; PHP 151.00 checkout with explicit payment confirmation; original receipt; initial In Queue status; native long-press drag to In Progress; Move control to Ready and Done; completed history; matching sales/average/units; audit invoice search and status records; tablet sidebar collapse/expand; phone drawer and navigation.
- Verified the account and completed order survive an in-place APK update and force-stop/relaunch. Restart requires sign-in. Verified both phone-to-tablet and tablet-to-phone density changes retain loaded sales after fixing native connection reuse: initialization now uses a fresh SQLite handle and runs through the same serialized work queue as business operations.
- Inspected native screenshots at 360dp phone, 800dp intermediate tablet, and 1600dp landscape tablet. Captured QA data is generated by the acceptance flow and is not seeded or included in the APK's initial database. Screenshots are in `artifacts/screenshots/`.
- Native PBKDF2 module checks a known SHA-256 test vector on the device before using Android's provider. A pure JavaScript KDF was replaced after it proved too slow on Hermes during real emulator testing.
- Full Android document-picker backup round trip passed: exported an encrypted `.pour` file to Documents, verified the file existed, reset only the QA emulator app's storage, created a different local owner account, selected the backup through the document picker, and restored the menu, completed invoice and PHP 151.00 sale. The receiving account remained `qarestored`; the historical customer and invoice remained intact. This native round trip used no product photos; photo payload restoration is covered by the service-adapter tests.
- After restore, confirmed the drink price remained PHP 75.50 and the next checkout preview used POS-000004, preserving the exported invoice high-water mark rather than reusing POS-000001 or discarded reservations.
- Dependency audit after patching Zod: 28 reported advisories, including two high-severity transitive build-tool packages (`image-size` and `postcss`). No forced framework downgrade/major migration was applied. Review/update the Expo toolchain before public distribution; the app has no remote data ingestion or CSS build input at runtime.

## Build and device gates

Local checks, native build, signature verification and the emulator checks listed above have run. Physical ARM devices, Android 7's legacy HMAC-provider path, hardware printers/sharing destinations, gallery-photo selection, actual device reboot, accessibility with TalkBack/large text, and real low-storage conditions still need target-device acceptance. The local test suite simulates a failed payment write and verifies rollback, and validates encrypted backup restore with photos using service adapters.

Before real use, install the standalone APK and perform these checks in airplane mode:

- [ ] First-run account setup; no default account; correct/incorrect login; show/hide password; five-failure lockout; logout; changing credentials; restart requires login.
- [ ] Expand/collapse tablet sidebar and phone drawer; Android Back closes drawer; all six navigation destinations work.
- [ ] At 360px phone, intermediate portrait tablet, and wide landscape tablet: readable content, no overlapping controls, 44px touch targets, keyboard-safe checkout/dialogs, long customer/drink names, screen-reader labels, larger system fonts and reduced-motion mode.
- [ ] Exactly two drinks before edits. Edit price/name/description/photo; photo persists after process restart. Add a third drink. Disable a product, confirm it cannot be added or checked out from an older cart.
- [ ] Empty checkout has no fake items/quantity/total. Selecting the same drink increments its one line. Quantity minimum 1/maximum 999; remove item; exact subtotal/total; required names.
- [ ] Choose each payment method. Confirm payment then double-tap Process transaction; exactly one order and receipt. Cancel confirmation; no order/payment saved. No selection cannot submit.
- [ ] Invoice visible before checkout; discard draft, reopen checkout, confirm no reuse. Force-stop after checkout, restart, verify order and audit records remain.
- [ ] Touch drag all four statuses, reject skipped forward stages, use Move fallback, make a backward correction. Source/destination counts and dashboard update. Scroll large columns and horizontally on phone.
- [ ] Done appears in history; moving back removes it. Search invoice/customer; payment and completion-date filters; newest/oldest; original prices after product edits; PDF receipt print/share support.
- [ ] Audit date/action/invoice/product search; full previous/new values; account and staff separate; no edit/delete audit control.
- [ ] Analytics match manually calculated completed-only totals, average, units, drink percentages, daily bars and best-selling date. Compare all presets/custom ranges and empty results. Device local dates around midnight.
- [ ] Export backup via Android folder picker; wrong passphrase, corrupt file and duplicate/inconsistent data reject; restore on a fresh device retains receiving credentials, photos, invoice high-water mark, business data and imported audit entries. Working device restore refuses to overwrite sales.
- [ ] Low storage at checkout/import shows a recoverable error without partial transactions; retry safely. Existing data remains intact.
- [ ] Force-stop, restart device, open app offline, verify all persisted records. Update APK in place with matching package/signing key, verify data retained. Uninstall only after a verified manual backup.

Known v1 boundaries: Cash/card/QR payments are operator-confirmed; no payment gateway; no cancellations/deletions or paid-order edits; receipts are not BIR tax invoices; manual backup size limits; restore only to a fresh counter; no account recovery; no automatic sync or cloud backup.
