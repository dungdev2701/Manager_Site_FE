import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Role } from '@/types';
import { authApi } from '@/lib/api';
import { queryClient } from '@/lib/query-client';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  _hasHydrated: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  hasRole: (roles: Role | Role[]) => boolean;
  setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      _hasHydrated: false,

      setHasHydrated: (state) => set({ _hasHydrated: state }),

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      setAccessToken: (accessToken) => {
        set({ accessToken });
        if (typeof window !== 'undefined') {
          if (accessToken) {
            localStorage.setItem('accessToken', accessToken);
          } else {
            localStorage.removeItem('accessToken');
          }
        }
      },

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const response = await authApi.login({ email, password });
          set({
            user: response.user as User,
            accessToken: response.accessToken,
            isAuthenticated: true,
            isLoading: false,
          });
          if (typeof window !== 'undefined') {
            localStorage.setItem('accessToken', response.accessToken);
            // Set cookie for middleware to read
            document.cookie = `accessToken=${response.accessToken}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
            if (response.refreshToken) {
              localStorage.setItem('refreshToken', response.refreshToken);
            }
          }
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          await authApi.logout();
        } catch {
          // Ignore logout API errors
        } finally {
          // Clear React Query cache to prevent stale data from previous user
          queryClient.clear();

          set({
            user: null,
            accessToken: null,
            isAuthenticated: false,
          });
          if (typeof window !== 'undefined') {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            // Clear cookie
            document.cookie = 'accessToken=; path=/; max-age=0';
          }
        }
      },

      fetchUser: async () => {
        const { accessToken } = get();
        if (!accessToken) return;

        set({ isLoading: true });
        try {
          const user = await authApi.getMe();
          set({ user, isAuthenticated: true, isLoading: false });
        } catch {
          set({
            user: null,
            accessToken: null,
            isAuthenticated: false,
            isLoading: false,
          });
          if (typeof window !== 'undefined') {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
          }
        }
      },

      hasRole: (roles) => {
        const { user } = get();
        if (!user) return false;
        const roleArray = Array.isArray(roles) ? roles : [roles];
        return roleArray.includes(user.role);
      },
    }),
    {
      name: 'auth-storage',
      version: 2,
      partialize: (state) => ({
        accessToken: state.accessToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('Failed to rehydrate auth state:', error);
          // Clear corrupted storage
          if (typeof window !== 'undefined') {
            localStorage.removeItem('auth-storage');
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            document.cookie = 'accessToken=; path=/; max-age=0';
          }
        }
        state?.setHasHydrated(true);

        // Auto-validate token after hydration
        if (state?.accessToken && typeof window !== 'undefined') {
          state.fetchUser().catch(() => {
            // If fetchUser fails, clear everything
            console.warn('Token validation failed, clearing auth state');
          });
        }
      },
      migrate: (persistedState: unknown, version: number) => {
        // Handle migration from older versions
        if (!persistedState || typeof persistedState !== 'object') {
          return { accessToken: null, user: null, isAuthenticated: false };
        }

        const state = persistedState as Record<string, unknown>;

        // Version 1 only had accessToken, need to add user and isAuthenticated
        if (version < 2) {
          return {
            accessToken: state.accessToken as string | null,
            user: null,
            isAuthenticated: false,
          };
        }

        return persistedState as { accessToken: string | null; user: User | null; isAuthenticated: boolean };
      },
    }
  )
);
