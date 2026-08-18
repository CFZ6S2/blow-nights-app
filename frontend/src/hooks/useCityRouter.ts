'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { DEFAULT_CITY } from '@/lib/routes';

export function useCityRouter() {
  const params = useParams();
  const router = useRouter();
  const city = (params?.city as string) || DEFAULT_CITY;

  const cityPath = useCallback((path: string = '') => {
    return `/${city}${path}`;
  }, [city]);

  const pushCity = useCallback((path: string) => {
    router.push(`/${city}${path}`);
  }, [city, router]);

  const replaceCity = useCallback((path: string) => {
    router.replace(`/${city}${path}`);
  }, [city, router]);

  return { city, cityPath, pushCity, replaceCity, router };
}
