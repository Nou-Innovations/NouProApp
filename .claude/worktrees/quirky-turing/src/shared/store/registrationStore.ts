/**
 * Registration Store
 * Ephemeral (non-persisted) store for registration flow data.
 * Keeps sensitive data like passwords out of navigation params.
 */

import { create } from 'zustand';

interface RegistrationState {
  password: string | null;
  setPassword: (password: string) => void;
  clearPassword: () => void;
  reset: () => void;
}

export const useRegistrationStore = create<RegistrationState>()((set) => ({
  password: null,
  setPassword: (password: string) => set({ password }),
  clearPassword: () => set({ password: null }),
  reset: () => set({ password: null }),
}));
