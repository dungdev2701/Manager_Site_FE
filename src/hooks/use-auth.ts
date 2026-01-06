'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores';
import { Role } from '@/types';

export function useAuth() {
  const { user, isAuthenticated, isLoading, login, logout, fetchUser, hasRole } = useAuthStore();

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    fetchUser,
    hasRole,
  };
}

export function useRequireAuth(requiredRoles?: Role | Role[]) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, fetchUser, hasRole, _hasHydrated, accessToken } =
    useAuthStore();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      if (!_hasHydrated) return;

      // If we have a token but not authenticated, try to fetch user
      if (accessToken && !isAuthenticated && !isLoading) {
        try {
          await fetchUser();
        } catch {
          // fetchUser already handles error and clears state
        }
      }

      setIsCheckingAuth(false);
    };
    checkAuth();
  }, [_hasHydrated, accessToken, isAuthenticated, isLoading, fetchUser]);

  useEffect(() => {
    // Don't redirect while still checking auth or loading
    if (!_hasHydrated || isCheckingAuth || isLoading) return;

    // Only redirect to login if no token and not authenticated
    if (!accessToken && !isAuthenticated) {
      router.push('/login');
      return;
    }

    // Check role requirements
    if (isAuthenticated && requiredRoles) {
      if (!hasRole(requiredRoles)) {
        router.push('/unauthorized');
      }
    }
  }, [
    _hasHydrated,
    isCheckingAuth,
    isLoading,
    accessToken,
    isAuthenticated,
    requiredRoles,
    hasRole,
    router,
  ]);

  return {
    user,
    isAuthenticated,
    isLoading: !_hasHydrated || isCheckingAuth || isLoading,
    hasRole,
  };
}
