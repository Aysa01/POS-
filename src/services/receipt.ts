import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { dateTime, escapeHtml, money } from "../utils/domain";
import type { Order } from "../types";

export function receiptHtml(order: Order) {
  const e = escapeHtml;
  return `<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:sans-serif;color:#183d32;padding:28px;max-width:640px;margin:auto}h1{font-size:28px}table{width:100%;border-collapse:collapse}td,th{padding:12px 0;text-align:left;border-bottom:1px solid #dae4de}td:last-child,th:last-child{text-align:right}small{color:#52675f}footer{margin-top:32px}</style></head><body>
  <h1>Rositrus · Payment receipt</h1><p>${e(order.invoice)} · ${e(dateTime(order.createdAt))}</p>
  <p>Customer: ${e(order.customer)}<br>Handled by: ${e(order.staff)}<br>Account: ${e(order.account)}</p>
  <table><thead><tr><th>Drink</th><th>Qty</th><th>Unit price</th><th>Amount</th></tr></thead><tbody>${order.items.map((i) => `<tr><td>${e(i.name)}</td><td>${i.quantity}</td><td>${money(i.price)}</td><td>${money(i.price * i.quantity)}</td></tr>`).join("")}</tbody></table>
  <p>Discount: ${money(0)}<br><strong>Total paid: ${money(order.total)}</strong></p><p>Payment: ${e(order.payment)}<br>Status: ${e(order.status)}${order.completedAt ? `<br>Completed: ${e(dateTime(order.completedAt))}` : ""}</p>
  <footer><small>Payment was confirmed by the operator. This is an order/payment receipt, not a BIR-registered tax invoice.</small></footer></body></html>`;
}
export async function printReceipt(order: Order) {
  await Print.printAsync({ html: receiptHtml(order) });
}
export async function shareReceipt(order: Order) {
  if (!(await Sharing.isAvailableAsync()))
    throw new Error(
      "Sharing is not available on this device. Try printing instead.",
    );
  const file = await Print.printToFileAsync({ html: receiptHtml(order) });
  await Sharing.shareAsync(file.uri, {
    mimeType: "application/pdf",
    dialogTitle: order.invoice,
  });
}
