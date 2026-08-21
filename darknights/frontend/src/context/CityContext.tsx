'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface City {
  id: string;
  name: string;
  slug: string;
  lat?: number;
  lng?: number;
  country?: string;
  emoji?: string;
}

interface CityContextType {
  cities: City[];
  currentCity: City | null;
  setCurrentCity: (city: City | null) => void;
  loading: boolean;
  detectedByGPS: boolean;
  cityId: string | null;
  citySlug: string | null;
}

const CityContext = createContext<CityContextType | null>(null);

const CITY_STORAGE_KEY = 'darknights_city';

export function CityProvider({ children }: { children: React.ReactNode }) {
  const [cities, setCities] = useState<City[]>([]);
  const [currentCity, setCurrentCityState] = useState<City | null>(null);
  const [loading, setLoading] = useState(true);
  const [detectedByGPS, setDetectedByGPS] = useState(false);

  const fallbackToFirst = useCallback((cityList: City[]) => {
    if (cityList.length > 0) {
      setCurrentCityState(cityList[0]);
      localStorage.setItem(CITY_STORAGE_KEY, cityList[0].slug);
    }
    setLoading(false);
  }, []);

  const detectCityByGPS = useCallback((cityList: City[]) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      fallbackToFirst(cityList);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        let nearest: City | null = null;
        let minDist = Infinity;

        cityList.forEach((city) => {
          if (!city.lat || !city.lng) return;
          const dist = haversineKm(latitude, longitude, city.lat, city.lng);
          if (dist < minDist) {
            minDist = dist;
            nearest = city;
          }
        });

        if (nearest && minDist < 100) {
          const detected: City = nearest;
          setCurrentCityState(detected);
          setDetectedByGPS(true);
          localStorage.setItem(CITY_STORAGE_KEY, detected.slug);
        } else {
          fallbackToFirst(cityList);
        }
        setLoading(false);
      },
      () => {
        fallbackToFirst(cityList);
      },
      { timeout: 5000, maximumAge: 600000 }
    );
  }, [fallbackToFirst]);

  useEffect(() => {
    const q = query(collection(db, 'cities'), where('isActive', '==', true));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as City));
      setCities(list);

      // 1. Detectar ciudad por URL path (ej: /madrid/...)
      if (typeof window !== 'undefined') {
        const pathSlug = window.location.pathname.split('/')[1];
        const pathCity = list.find((c) => c.slug === pathSlug);
        if (pathCity) {
          setCurrentCityState(pathCity);
          localStorage.setItem(CITY_STORAGE_KEY, pathCity.slug);
          setLoading(false);
          return;
        }
      }

      // 2. Detectar por localStorage
      const savedSlug = localStorage.getItem(CITY_STORAGE_KEY);
      if (savedSlug) {
        const saved = list.find((c) => c.slug === savedSlug);
        if (saved) {
          setCurrentCityState(saved);
          setLoading(false);
          return;
        }
      }

      detectCityByGPS(list);
    }, (err) => {
      console.error('CityContext onSnapshot error:', err);
      setLoading(false);
    });
    return unsub;
  }, [detectCityByGPS]);

  const setCurrentCity = useCallback((city: City | null) => {
    setCurrentCityState(city);
    setDetectedByGPS(false);
    if (city) localStorage.setItem(CITY_STORAGE_KEY, city.slug);
  }, []);

  return (
    <CityContext.Provider value={{
      cities,
      currentCity,
      setCurrentCity,
      loading,
      detectedByGPS,
      cityId: currentCity?.id || null,
      citySlug: currentCity?.slug || null,
    }}>
      {children}
    </CityContext.Provider>
  );
}

export function useCity() {
  const ctx = useContext(CityContext);
  if (!ctx) throw new Error('useCity must be used within CityProvider');
  return ctx;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
