'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export function ClientCityGuard() {
  const { profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && profile?.role === 'pending_rrpp') {
      router.replace('/rrpp/register');
    }
  }, [profile, loading, router]);

  return null;
}
