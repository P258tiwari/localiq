import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      loading: false,

      login: async (email, password) => {
        set({ loading: true });
        try {
          const { data } = await api.post('/auth/login', { email, password });
          set({ user: data.user, loading: false });
        } catch (e) {
          set({ loading: false });
          throw e;
        }
      },

      logout: async () => {
        try { await api.post('/auth/logout'); } catch {}
        set({ user: null });
      },

      refreshUser: async () => {
        try {
          const { data } = await api.get('/auth/me');
          set({ user: data.user });
        } catch {
          set({ user: null });
        }
      }
    }),
    { name: 'gmb-auth', partialize: s => ({ user: s.user }) }
  )
);
