'use client';

import { useEffect } from 'react';
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
  const { user, isAuthenticated, isLoading, fetchUser, hasRole, _hasHydrated } = useAuthStore();

  useEffect(() => {
    const checkAuth = async () => {
      if (_hasHydrated && !isAuthenticated && !isLoading) {
        await fetchUser();
      }
    };
    checkAuth();
  }, [_hasHydrated, isAuthenticated, isLoading, fetchUser]);

  useEffect(() => {
    if (_hasHydrated && !isLoading && !isAuthenticated) {
      router.push('/login');
    }

    if (_hasHydrated && !isLoading && isAuthenticated && requiredRoles) {
      if (!hasRole(requiredRoles)) {
        router.push('/unauthorized');
      }
    }
  }, [_hasHydrated, isLoading, isAuthenticated, requiredRoles, hasRole, router]);

  return {
    user,
    isAuthenticated,
    isLoading: !_hasHydrated || isLoading,
    hasRole,
  };
}
