# Rositrus · Android beverage POS

## Run in your computer's browser

The project now also has a local browser version. Run these in two terminals:

```powershell
npm run web
```

```powershell
npm run web:open
```

The first command serves **http://localhost:8081** and builds the browser files automatically if needed. Keep that terminal running. The second opens a maximized Microsoft Edge window using a dedicated local counter profile in `%LOCALAPPDATA%/PourPOS/BrowserProfile`, outside OneDrive. Tap the Rositrus logo welcome screen to open the menu. There is no login or account setup.

Browser records persist in SQLite through the browser's origin-private filesystem. Browser images persist with the product records. Encrypted backups can be downloaded and imported through file selection; they use the same portable format as Android and retain the receiving counter's local audit trail. Printing uses the browser print dialog (including Save as PDF); Download receipt saves a printable HTML receipt. Browser and Android databases are independent, with no automatic sync. Clearing the browser profile or site data removes that profile's local records.

This is a local browser companion; nothing is published online. The local server serves application files and does not hold or upload customer records. Use `npm run build:web` after changing application code, then refresh the page. For live development, `npm run web:dev` uses port 8082; that is a different browser origin with separate local data.

An offline, single-device Android application built with TypeScript, React Native and Expo SDK 54. The app contains a static tap-to-enter welcome screen, ordering menu, menu editing and POS checkout, a draggable order board, completed order history, append-only audit logs, analytics, PDF receipts, and manual encrypted backups. No backend, online login or cloud database is used.

## Run and build

Use Node 24, JDK 17 or 21, and the Android SDK. On Windows, use a short checkout folder name such as `POS` to keep native compiler paths short. Install dependencies from this folder:

```powershell
npm install
npx expo install --fix
npm run typecheck
npm test
```

The lockfile records the installed dependency versions. `expo install --fix` aligns native modules with the installed Expo SDK. All downloads are build-time only. The installed app's core features work offline.

If Android Studio is already installed, set `ANDROID_HOME` to its SDK directory. Alternatively, the included optional script installs a checked Android command-line tool archive and SDK components into `.tools/android-sdk`:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/setup-android.ps1
$env:ANDROID_HOME = Join-Path (Get-Location) '.tools/android-sdk'
npm run build:apk
```

The APK build script runs type checks and tests, generates the Android project, builds **release with bundled JavaScript** for 64-bit ARM and x86 Android, and copies the result to `artifacts/pour-pos.apk`. On Windows it temporarily maps two unused drive letters to shorten native compiler paths and keeps Gradle's cache outside OneDrive in the temporary directory; it removes the mappings afterward. It does not require Metro to run on the phone. This local build uses Expo's generated development signing key; preserve `android/app/debug.keystore` for compatible test updates. Do not delete the generated Android directory or use `expo prebuild --clean` without preserving its signing key. For public distribution, configure a private production signing key and preserve it securely.

For EAS cloud builds, which require an Expo account and upload **source code** (not the device's business data):

```powershell
npx eas-cli login
npx eas-cli build --platform android --profile production
```

`eas.json` explicitly requests APK output. EAS manages a production signing key during setup. Builds signed with different keys cannot update one another. See [Expo APK builds](https://docs.expo.dev/build-reference/apk/).

## Install and first use

1. Copy `artifacts/pour-pos.apk` to a 64-bit Android 7+ phone/tablet, open it, and allow installation from that file source if Android asks. Or use `adb install -r artifacts/pour-pos.apk` with USB debugging enabled. For a legacy 32-bit Android device, rebuild with the appropriate ABI using `scripts/build-apk.ps1 -Architectures armeabi-v7a` in a short-path checkout.
2. Tap anywhere on the static Rositrus welcome screen to open the ordering menu. No username or password is required.
3. Open **Menu** and press **Manage drinks**, edit the two initial drinks (Drink 1 and Drink 2), set names/prices, optionally select photos, and mark availability. Initial prices are deliberately PHP 0.00, visibly flagged. Add more drinks when needed.
4. Return to **Menu**. Select drinks, change quantities, enter customer/staff, choose a payment method, and press **Process transaction**. Confirm only after receiving payment. A paid order starts **In Queue**, never Done automatically. Payment confirmation uses an in-app dialog; saved payments show a bottom-right toast. Press **View receipt** to open the receipt.
5. In **Orders**, long-press a card for 350ms and drag it into the next column. Scroll horizontally on phones. **Move** provides a tap alternative and enforces the same rules. Forward moves go one stage at a time; backward corrections before Done are permitted and audited.
6. Orders at **Done** appear in **Order History** and analytics. Completed receipts cannot be reopened or moved. History filters use completion date, and receipts retain creation/completion timestamps.

**Card and QR are operator-confirmed payment records, not integrations with a card terminal, bank or QR provider.** Cash is also confirmed by the operator. Receipts are payment/order records and are not BIR-registered tax invoices.

## Welcome and counter identity

The app opens on a static branded background. Tap or press Enter on the welcome screen to enter the menu, which combines the drink menu and order summary. **Welcome screen** in the sidebar returns there; it asks before discarding an unsaved cart. This screen is not an authentication lock.

New business actions use **Local counter** as the counter identity in the audit trail. The staff name entered at checkout remains separate order metadata. Historical operator names and all existing business records are preserved. Account setup, sign-in and credential editing are no longer part of the interface.

Encrypted backups still require a separate passphrase. PBKDF2 runs through Web Crypto in browsers and the native Android module in `modules/pour-crypto` for Android. Expo Go does not contain this module; use the built APK or a native development build.

## Data retention and manual backup

**Uninstalling Rositrus or clearing its storage normally deletes the database and product photos.** Each phone has a separate local database. Keeping the same package identity (`com.pour.localpos`) and signing key permits compatible APK updates in place. Do not uninstall as an upgrade step. Android automatic backup is explicitly disabled; there is no automatic synchronization.

In **Device settings and backup**, choose a separate backup passphrase of 12–128 characters and confirm it. **Export encrypted backup** opens Android's folder picker and saves a portable `.pour` file. Copy that file off the device yourself. It includes schema version, invoice high-water mark, products, permanent photo bytes, orders, item snapshots and audit logs. Encryption uses AES-256-GCM and a PBKDF2-HMAC-SHA256 600,000-iteration passphrase key with random salt and nonce. No plaintext passwords or login verifier are exported. Limits: 50 MB plaintext backup, 35 MB combined photo bytes, 5 MB per photo.

To restore, install Rositrus on a fresh device, tap to open the counter, and **before editing the menu or making any orders**, use **Import encrypted backup**. Enter the original backup passphrase and select the file with Android's document picker. The app checks the authenticated encryption, schema version, dates, totals, quantities, product references, duplicate IDs/names and invoice sequence before a transaction imports any business data. Photos are copied into private permanent storage before commit, with rollback cleanup on failure. Existing local audit records are retained; imported records are appended with their original log IDs in descriptions. No login credentials are required. A forgotten backup passphrase cannot be recovered.

Restore deliberately refuses to overwrite a working counter. To move a live counter, export and verify a backup, then restore to a fresh app/device. The backup contains customer details, so keep its passphrase and file secure.

## Architecture

| Location              | Responsibility                                                                            |
| --------------------- | ----------------------------------------------------------------------------------------- |
| `App.tsx`             | Startup/migration gate, tap-to-enter navigation, responsive sidebar/drawer, global feedback  |
| `src/screens/`        | Welcome, ordering menu, menu management, orders, history, audits and analytics             |
| `src/components/`     | Accessible form controls, dialogs, date filters, receipts, settings, statuses             |
| `src/database/`       | Versioned SQLite schema, serialized work queue, transactional checkout/status/menu writes |
| `src/services/`       | Legacy account compatibility, permanent images, receipts, encrypted backup/restore             |
| `src/store/`          | Zustand UI cache and draft cart; SQLite remains the source of truth                       |
| `src/utils/domain.ts` | Integer money, status rules, local date filtering and completed-sales aggregation         |
| `tests/`              | Domain tests and real database-service tests using Node's SQLite adapter                  |

The SQLite database `pour.db` lives in Expo SQLite's **app-private internal storage**. Foreign keys, WAL, a busy timeout, checks, unique constraints and migration versioning protect it. Reads/writes are serialized and multi-record mutations use exclusive transactions. See [Expo SQLite](https://docs.expo.dev/versions/v54.0.0/sdk/sqlite/).

| Table         | Contents/invariants                                                                                   |
| ------------- | ----------------------------------------------------------------------------------------------------- |
| `settings`    | Seed marker, legacy credential settings; schema version uses `PRAGMA user_version`                     |
| `products`    | Name, description, integer-centavo price, availability, permanent private image URI                   |
| `invoices`    | AUTOINCREMENT reservations; unused reservations create intentional gaps                               |
| `orders`      | Unique invoice, customer, staff, counter identity, payment, status, total, timestamps            |
| `order_items` | Immutable original name/price/quantity snapshots; foreign keys to order/product                       |
| `audits`      | Append-only counter identity + separate staff field, action, related entity, previous/new values |

Checkout revalidates current product availability and price, computes the total, and writes paid order/items/audit events atomically. The reserved invoice ID is an idempotency key. A failed write rolls back the whole transaction, allowing the same reservation to be safely retried. Successful payment does not complete an order. Database triggers enforce sequential forward statuses and prevent normal audit/receipt updates or deletions. Product edits cannot rewrite paid receipts. Cancellation/deletion and editing already-paid order details are intentionally not offered in v1.

Revenue uses **paid orders currently Done, filtered by completion date in device local time**. Product ranking aggregates snapshot quantities by stable product ID. Average order value is rounded to centavos for display. Discount is zero; no tax or service charge is added. No order or analytics data is seeded.

## Verification

Run `npm test` under Node 24. These tests exercise the application's actual database service and schema against Node SQLite, including a simulated failure during the payment audit insert to prove transaction rollback. They do **not** validate the Expo native bridge, native gestures, Keystore, Android pickers, printing or on-device process persistence. Run the device acceptance checks in [VALIDATION.md](VALIDATION.md) before using real customer transactions.

The two reference image files linked in the supplied brief were not present; the interface follows the described POS and Kanban layouts. It uses explicit cup placeholders until local product photos are chosen.

## Menu and order feedback

Menu is the main ordering destination. The **Manage drinks** button at the upper right switches the existing product grid into inline management mode. Large two-column cards are intended for a catalog of 4-8 drinks and become one column on phones. Removing a product hides it from the menu while retaining its historical row, photos and paid receipts. Existing v1 databases upgrade in place to schema v2; no records are reset. New backup payloads use v2 and retain removed products; old v1 backups remain importable.

Custom dialogs replace native browser confirmations. Success/error toasts appear at the bottom right, dismiss after about four seconds, and do not capture pointer events outside their close button. After payment the receipt opens on demand, so a receipt modal does not cover the success message. Invalid forward status drops show a three-second warning, shake only the target column, and return the preview to its measured source. The Move picker uses the same validation. Backward moves remain allowed before Done. Reduced-motion settings disable optional scaling, sliding and shaking.

Rositrus branding retains the existing Android package ID, SQLite filename, browser profile and backup encryption identifier for compatibility with saved counters. These internal identifiers should not be renamed when changing visible branding. New exported backup filenames begin with rositrus-backup; the .pour extension remains supported.

Product management takes place directly on the Menu grid. An Add drink button sits beside Finish managing in the header. There is no separate management-list popup; individual add/edit forms keep their existing dialogs.

Order pipeline: In Queue, In Progress, Ready, Serving, Done. Serving sits between Ready and Done and does not count as completed revenue. Columns grow equally to fill the available desktop board width; compact screens retain readable horizontally scrolling columns. Schema v4 upgrades existing orders in place, preserving IDs, paid items, completion timestamps and audits. New backups use payload v4; v1-v3 backups remain accepted.

Finalized receipts: Done is terminal. Its drag gesture and Move action are unavailable, and the service plus a schema-v4 SQLite trigger reject changes to its status or completion timestamp. Existing completed records remain intact. Before Done, backward correction still works. A valid drag destination opens an animated receipt-height insertion slot, pushing the other receipts down. The arriving order takes the slot at the top; persisted audit sequence keeps arrival order after refresh. Invalid/cancelled drags close the slot without changing records. Reduced motion makes the same placement immediate. Backup payload v4 remains compatible with earlier v1-v3 imports.
