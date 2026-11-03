import { receiptHtml } from './receiptContent';
import type { Order } from '../types';
export { receiptHtml } from './receiptContent';
export async function printReceipt(order: Order) {
  const tab = window.open('', '_blank', 'width=760,height=850');
  if (!tab) throw new Error('Allow pop-ups for localhost to print a receipt.');
  tab.document.write(receiptHtml(order)); tab.document.close(); tab.focus();
  tab.addEventListener('load', () => tab.print(), { once: true });
}
export async function shareReceipt(order: Order) {
  const blob = new Blob([receiptHtml(order)], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = `${order.invoice}.html`; document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
