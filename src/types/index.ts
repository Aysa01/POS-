export const statuses = ["In Queue", "In Progress", "Ready", "Serving", "Done"] as const;
export type Status = (typeof statuses)[number];
export const payments = ["Cash", "Debit/Credit Card", "QR Payment"] as const;
export type Payment = (typeof payments)[number];
export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  available: number;
  image: string | null;
  deleted?: number;
};
export type Item = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
};
export type Order = {
  id: number;
  invoice: string;
  customer: string;
  staff: string;
  account: string;
  payment: Payment;
  status: Status;
  total: number;
  paid: number;
  createdAt: string;
  completedAt: string | null;
  items: Item[];
};
export type Audit = {
  id: number;
  at: string;
  account: string;
  staff: string;
  action: string;
  related: string;
  previous: string;
  next: string;
  description: string;
};
export type Account = {
  username: string;
  salt: string;
  hash: string;
  iterations: number;
};
export type DateRange = { from: string; to: string };
export type Data = { products: Product[]; orders: Order[]; audits: Audit[] };
