import { create } from "zustand";
import { readAll } from "../database/db";
import type { Data, Item, Product } from "../types";

export type Notice = { title: string; message?: string; tone?: 'success' | 'error'; id: number };
type NoticeInput = string | Omit<Notice, 'id'>;
let noticeId = 0;
type State = Data & {
  account: string | null;
  cart: Item[];
  revision: number;
  toast: Notice | null;
  setAccount: (account: string | null) => void;
  refresh: () => Promise<void>;
  add: (product: Product) => void;
  quantity: (id: string, delta: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  notify: (message: NoticeInput) => void;
};
export const usePOS = create<State>((set, get) => ({
  account: null,
  products: [],
  orders: [],
  audits: [],
  cart: [],
  revision: 0,
  toast: null,
  setAccount: (account) =>
    set({ account, cart: [], products: [], orders: [], audits: [] }),
  refresh: async () => {
    const data = await readAll();
    set((s) => ({ ...data, revision: s.revision + 1 }));
  },
  add: (p) => {
    if (!p.available) return;
    const cart = get().cart;
    const old = cart.find((i) => i.productId === p.id);
    if (old) get().quantity(p.id, 1);
    else
      set({
        cart: [
          ...cart,
          { productId: p.id, name: p.name, price: p.price, quantity: 1 },
        ],
      });
  },
  quantity: (id, delta) =>
    set((s) => ({
      cart: s.cart.map((i) =>
        i.productId === id
          ? { ...i, quantity: Math.max(1, Math.min(999, i.quantity + delta)) }
          : i,
      ),
    })),
  remove: (id) =>
    set((s) => ({ cart: s.cart.filter((i) => i.productId !== id) })),
  clear: () => set({ cart: [] }),
  notify: (input) => {
    if (input === '') { set({ toast: null }); return; }
    const notice = typeof input === 'string' ? { title: input } : input;
    const previous = get().toast;
    if (previous?.title === notice.title && previous?.message === notice.message && previous?.tone === notice.tone) return;
    set({ toast: { ...notice, id: ++noticeId } });
  },
}));
