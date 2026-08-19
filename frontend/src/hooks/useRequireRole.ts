'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export function useRequireRole(allowedRoles: string[], redirectTo = '/') {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  const hasRole = !!profile && allowedRoles.includes(profile.role ?? '');

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (profile && !hasRole) {
      router.push(redirectTo);
    }
  }, [user, profile, loading, hasRole, redirectTo, router]);

  return { isReady: !loading && !!user && hasRole, user, profile, loading };
}
