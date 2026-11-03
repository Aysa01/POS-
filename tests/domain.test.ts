import { test } from "node:test";
import assert from "node:assert/strict";
import {
  analytics,
  canMove,
  escapeHtml,
  inRange,
  localDay,
  parseMoney,
  presetRange,
  totalItems,
  validateRange,
} from "../src/utils/domain.ts";
import type { Item, Order } from "../src/types/index.ts";

const item = (quantity = 1, price = 1255): Item => ({
  productId: "drink-1",
  name: "Drink 1",
  quantity,
  price,
});
const order = (overrides: Partial<Order> = {}): Order => ({
  id: 1,
  invoice: "POS-000001",
  customer: "Customer",
  staff: "Counter",
  account: "owner",
  payment: "Cash",
  status: "Done",
  total: 2510,
  paid: 1,
  createdAt: "2026-11-02T12:00:00",
  completedAt: "2026-11-03T12:00:00",
  items: [item(2)],
  ...overrides,
});
test("money uses exact centavos and rejects malformed or negative prices", () => {
  assert.equal(parseMoney("0.10") + parseMoney("0.20"), 30);
  assert.equal(parseMoney(" 79.9 "), 7990);
  assert.equal(parseMoney("9999999.99"), 999999999);
  for (const invalid of ["-1", "3.999", "1e2", "", "NaN", "10000000", "1,000"])
    assert.throws(() => parseMoney(invalid));
});
test("totals enforce quantities, unique items, centavos and safe amount limits", () => {
  assert.equal(totalItems([item(3)]), 3765);
  assert.throws(() => totalItems([]));
  for (const qty of [0, -1, 1.5, 1000])
    assert.throws(() => totalItems([item(qty)]));
  assert.throws(() => totalItems([item(), item()]));
  assert.throws(() => totalItems([item(2, 999999999)]));
  assert.throws(() => totalItems([item(1, 1.1)]));
});
test("status rules allow adjacent forward steps and backward correction", () => {
  assert.equal(canMove("In Queue", "In Progress"), true);
  assert.equal(canMove("In Queue", "Ready"), false);
  assert.equal(canMove("In Progress", "Done"), false);
  assert.equal(canMove("Ready", "Done"), false);
  assert.equal(canMove("Ready", "Serving"), true);
  assert.equal(canMove("Serving", "Done"), true);
  assert.equal(canMove("Serving", "Ready"), true);
  assert.equal(canMove("Done", "In Queue"), false);
  assert.equal(canMove("Done", "Serving"), false);
  assert.equal(canMove("Ready", "In Queue"), true);
});
test("date ranges reject rollover, missing padding and reversed dates", () => {
  validateRange({ from: "2026-02-01", to: "2026-02-28" });
  for (const range of [
    { from: "2026-02-30", to: "2026-03-01" },
    { from: "2026-2-01", to: "2026-03-01" },
    { from: "2026-03-02", to: "2026-03-01" },
  ])
    assert.throws(() => validateRange(range));
  assert.equal(
    inRange("2026-11-03T23:59:59", { from: "2026-11-03", to: "2026-11-03" }),
    true,
  );
});
test("presets use local calendar boundaries including year rollover", () => {
  assert.deepEqual(presetRange("Last 7 days", new Date(2026, 0, 3, 12)), {
    from: "2025-12-28",
    to: "2026-01-03",
  });
  assert.deepEqual(presetRange("This month", new Date(2026, 10, 3, 12)), {
    from: "2026-11-01",
    to: "2026-11-03",
  });
  assert.equal(localDay(new Date(2026, 10, 3)), "2026-11-03");
});
test("analytics exclude pending, unpaid, reverted and out-of-range transactions", () => {
  const result = analytics(
    [
      order(),
      order({ status: "Ready", completedAt: null }),
      order({ paid: 0 }),
      order({ completedAt: "2026-10-31T12:00:00" }),
    ],
    { from: "2026-11-03", to: "2026-11-03" },
  );
  assert.equal(result.sales, 2510);
  assert.equal(result.count, 1);
  assert.equal(result.units, 2);
  assert.equal(result.average, 2510);
  assert.equal(result.drinks[0].revenue, 2510);
  assert.equal(result.best?.day, "2026-11-03");
});
test("drink ranking aggregates by product identity across renamed snapshots", () => {
  const result = analytics(
    [
      order(),
      order({
        id: 2,
        total: 1255,
        items: [{ ...item(), name: "Renamed drink" }],
        completedAt: "2026-11-04T12:00:00",
      }),
    ],
    { from: "2026-11-01", to: "2026-11-30" },
  );
  assert.equal(result.drinks.length, 1);
  assert.equal(result.drinks[0].units, 3);
  assert.equal(result.drinks[0].revenue, 3765);
  assert.equal(result.best?.sales, 2510);
  assert.equal(result.dates.length, 2);
});
test("no sales means an honest zero state", () => {
  const result = analytics([], { from: "2026-11-01", to: "2026-11-30" });
  assert.equal(result.sales, 0);
  assert.equal(result.average, 0);
  assert.equal(result.best, undefined);
  assert.deepEqual(result.drinks, []);
});
test("receipt content escapes customer-controlled HTML", () => {
  assert.equal(
    escapeHtml("<script>\"&'</script>"),
    "&lt;script&gt;&quot;&amp;&#39;&lt;/script&gt;",
  );
});
