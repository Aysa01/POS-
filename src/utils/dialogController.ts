import { create } from 'zustand';
import type { AlertButton, AlertOptions } from 'react-native';

export type Dialog = { id: number; title: string; message: string; buttons: AlertButton[] };
let nextId = 0;
export const useDialogs = create<{ queue: Dialog[]; close: (id: number) => void }>(set => ({
  queue: [],
  close: id => set(state => ({ queue: state.queue.filter(dialog => dialog.id !== id) })),
}));
export const Alert = {
  alert(title: string, message = '', buttons: AlertButton[] = [{ text: 'OK' }], _options?: AlertOptions) {
    useDialogs.setState(state => ({ queue: [...state.queue, { id: ++nextId, title, message, buttons }] }));
  },
};
