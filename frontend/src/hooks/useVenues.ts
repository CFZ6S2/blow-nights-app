'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const VENUE_TYPES = {
  // Locales Comerciales
  club: { label: 'Discotecas & Clubs', hours: '01:00–06:00', icon: 'nightlife', cruising: false, group: 'commercial' },
  bar: { label: 'Bares & Previas', hours: '20:00–02:00', icon: 'local_bar', cruising: false, group: 'commercial' },
  sauna: { label: 'Saunas & Spas', hours: '12:00–03:00', icon: 'hot_tub', cruising: true, group: 'commercial' },
  chiringuito: { label: 'Chiringuitos', hours: '12:00–22:00', icon: 'beach_access', cruising: false, group: 'commercial' },
  // Puntos Comunitarios
  cruising_outdoor: { label: 'Cruising Exterior & Zonas Libres', hours: '22:00–06:00', icon: 'park', cruising: true, group: 'community' },
  community_point: { label: 'Puntos de Encuentro', hours: '24h', icon: 'place', cruising: false, group: 'community' },
};

export { VENUE_TYPES };

export function useVenues(cityId: string | null) {
  const [venues, setVenues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const constraints = [where('isActive', '==', true)];
    if (cityId) constraints.push(where('cityId', '==', cityId));

    const q = query(collection(db, 'venues'), ...constraints);

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setVenues(list);
      setLoading(false);
    });

    return unsub;
  }, [cityId]);

  const grouped: Record<string, any[]> = {};
  Object.keys(VENUE_TYPES).forEach((key) => {
    grouped[key] = venues
      .filter((v) => v.type === key)
      .sort((a, b) => {
        const aBoost = a.boostActive || a.subscription?.status === 'active';
        const bBoost = b.boostActive || b.subscription?.status === 'active';
        
        // Locales con boost aparecen siempre primero
        if (aBoost && !bBoost) return -1;
        if (!aBoost && bBoost) return 1;
        return 0; // mantener orden por defecto si son iguales
      });
  });

  return { venues, grouped, loading };
}

export function useVenueCheckins(venueId: string | null) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!venueId) return;
    const now = new Date();
    const q = query(
      collection(db, 'checkins'),
      where('venueId', '==', venueId),
      where('expiresAt', '>', now)
    );

    const unsub = onSnapshot(q, (snap) => {
      setCount(snap.size);
    });

    return unsub;
  }, [venueId]);

  return count;
}
