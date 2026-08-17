'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const VENUE_TYPES = {
  previa: { label: 'Previas / Bares', hours: '20:00–02:00', icon: 'local_bar', cruising: false },
  discoteca: { label: 'Discotecas / Clubes', hours: '01:00–06:00', icon: 'nightlife', cruising: false },
  after: { label: 'Afters / Matinales', hours: '06:00–12:00', icon: 'wb_twilight', cruising: false },
  sauna: { label: 'Saunas', hours: '12:00–03:00', icon: 'hot_tub', cruising: true },
  cruising_bar: { label: 'Cruising Bars', hours: '22:00–06:00', icon: 'sensor_door', cruising: true },
  outdoor_zone: { label: 'Zonas Exteriores', hours: '22:00–06:00', icon: 'park', cruising: true },
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
    grouped[key] = venues.filter((v) => v.type === key);
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
