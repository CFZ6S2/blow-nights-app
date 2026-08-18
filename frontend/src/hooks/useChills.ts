'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { Chill, ChillRequest } from '@/types';

export function useChills(citySlug: string | null) {
  const { user, loading: authLoading } = useAuth();
  const [chills, setChills] = useState<Chill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !user || !citySlug) { setTimeout(() => setLoading(false), 0); return; }

    const q = query(
      collection(db, 'chills'),
      where('city_slug', '==', citySlug),
      where('status', 'in', ['active', 'full']),
      orderBy('created_at', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Chill));
      setChills(list);
      setLoading(false);
    }, () => setLoading(false));

    return unsub;
  }, [citySlug]);

  return { chills, loading };
}

export function useChillRequests(chillId: string | null) {
  const { user, loading: authLoading } = useAuth();
  const [requests, setRequests] = useState<ChillRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !user || !chillId) { setTimeout(() => setLoading(false), 0); return; }

    const q = query(
      collection(db, 'chills', chillId, 'requests'),
      where('status', '==', 'pending')
    );

    const unsub = onSnapshot(q, (snap) => {
      setRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChillRequest)));
      setLoading(false);
    }, () => setLoading(false));

    return unsub;
  }, [chillId]);

  return { requests, loading };
}

export function useMyChills() {
  const { user, loading: authLoading } = useAuth();
  const [myChills, setMyChills] = useState<Chill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !user) { setTimeout(() => setLoading(false), 0); return; }

    const q = query(
      collection(db, 'chills'),
      where('host_uid', '==', user.uid),
      where('status', 'in', ['active', 'full'])
    );

    const unsub = onSnapshot(q, (snap) => {
      setMyChills(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Chill)));
      setLoading(false);
    }, () => setLoading(false));

    return unsub;
  }, [user]);

  return { myChills, loading };
}

export async function createChill(data: {
  title: string;
  description?: string;
  exact_address: string;
  approx_lat: number;
  approx_lng: number;
  max_capacity: number;
  city_slug: string;
  tags?: string[];
}) {
  const fn = httpsCallable(functions, 'createChill');
  const res = await fn(data);
  return res.data as { success: boolean; chillId: string };
}

export async function requestChillAccess(chillId: string) {
  const fn = httpsCallable(functions, 'requestChillAccess');
  const res = await fn({ chillId });
  return res.data as { success: boolean };
}

export async function respondChillRequest(chillId: string, userId: string, action: 'accept' | 'deny') {
  const fn = httpsCallable(functions, 'respondChillRequest');
  const res = await fn({ chillId, userId, action });
  return res.data as { success: boolean; action: string };
}

export async function endChill(chillId: string) {
  const fn = httpsCallable(functions, 'endChill');
  const res = await fn({ chillId });
  return res.data as { success: boolean };
}
