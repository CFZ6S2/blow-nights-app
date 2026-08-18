'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DEFAULT_CITY } from '@/lib/routes';

const CITY_STORAGE_KEY = 'blownights_city';

export default function RootRedirect() {
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem(CITY_STORAGE_KEY);
    router.replace(`/${saved || DEFAULT_CITY}/`);
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-950">
      <div className="w-8 h-8 border-2 border-fuchsia-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
