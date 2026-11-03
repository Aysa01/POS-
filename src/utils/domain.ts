import type { DateRange, Item, Order, Status } from "../types/index.ts";
import { statuses } from '../types/index.ts';

export const MAX_CENTAVOS = 999_999_999;
export function parseMoney(value: string): number {
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(value.trim()))
    throw new Error(
      "Use a non-negative price with at most two decimal places (up to ₱9,999,999.99).",
    );
  const [whole, fraction = ""] = value.trim().split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (cents > MAX_CENTAVOS) throw new Error("The price is too large.");
  return cents;
}
export const money = (cents: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(
    cents / 100,
  );
export const dateTime = (s: string) =>
  new Date(s).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
export function localDay(d: Date | string = new Date()): string {
  const dt = typeof d === "string" ? new Date(d) : d;
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}
export function validateRange(range: DateRange): void {
  for (const s of [range.from, range.to]) {
    const d = new Date(`${s}T12:00:00`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(s) ||
      Number.isNaN(d.getTime()) ||
      localDay(d) !== s
    )
      throw new Error("Use real dates in YYYY-MM-DD format.");
  }
  if (range.from > range.to)
    throw new Error("The start date must be on or before the end date.");
}
export function presetRange(preset: string, now = new Date()): DateRange {
  const start = new Date(now);
  if (preset === "Last 7 days") start.setDate(start.getDate() - 6);
  if (preset === "Last 30 days") start.setDate(start.getDate() - 29);
  if (preset === "This month") start.setDate(1);
  return { from: localDay(start), to: localDay(now) };
}
export function inRange(at: string, range: DateRange): boolean {
  const day = localDay(at);
  return day >= range.from && day <= range.to;
}
export function totalItems(items: Item[]): number {
  if (!items.length) throw new Error("Select at least one drink.");
  let total = 0;
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.productId)) throw new Error("Duplicate drink in order.");
    seen.add(item.productId);
    if (
      !Number.isSafeInteger(item.price) ||
      item.price < 0 ||
      item.price > MAX_CENTAVOS
    )
      throw new Error("Invalid drink price.");
    if (
      !Number.isSafeInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > 999
    )
      throw new Error("Quantity must be between 1 and 999.");
    total += item.price * item.quantity;
  }
  if (!Number.isSafeInteger(total) || total > MAX_CENTAVOS)
    throw new Error("Order total exceeds ₱9,999,999.99.");
  return total;
}
export function canMove(from: Status, to: Status): boolean {
  if (from === 'Done') return false;
  const stages: readonly Status[] = statuses;
  return stages.indexOf(to) <= stages.indexOf(from) + 1;
}
export function analytics(orders: Order[], range: DateRange) {
  validateRange(range);
  const completed = orders.filter(
    (o) =>
      o.status === "Done" &&
      o.paid === 1 &&
      o.completedAt &&
      inRange(o.completedAt, range),
  );
  const sales = completed.reduce((sum, o) => sum + o.total, 0);
  const drinks = new Map<
    string,
    { id: string; name: string; units: number; revenue: number }
  >();
  const dates = new Map<
    string,
    { day: string; sales: number; count: number; units: number }
  >();
  let units = 0;
  for (const order of completed) {
    const day = localDay(order.completedAt!);
    const row = dates.get(day) ?? { day, sales: 0, count: 0, units: 0 };
    row.sales += order.total;
    row.count++;
    for (const item of order.items) {
      const drink = drinks.get(item.productId) ?? {
        id: item.productId,
        name: item.name,
        units: 0,
        revenue: 0,
      };
      drink.units += item.quantity;
      drink.revenue += item.quantity * item.price;
      drinks.set(item.productId, drink);
      row.units += item.quantity;
      units += item.quantity;
    }
    dates.set(day, row);
  }
  return {
    sales,
    count: completed.length,
    average: completed.length ? Math.round(sales / completed.length) : 0,
    units,
    drinks: [...drinks.values()].sort((a, b) => b.units - a.units),
    dates: [...dates.values()].sort((a, b) => a.day.localeCompare(b.day)),
    best: [...dates.values()].sort((a, b) => b.sales - a.sales)[0],
  };
}
export function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}
