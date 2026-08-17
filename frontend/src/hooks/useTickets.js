'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function useTickets(userId) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, 'tickets'),
      where('userId', '==', userId),
      orderBy('purchasedAt', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setTickets(list);
      setLoading(false);
    });

    return unsub;
  }, [userId]);

  const valid = tickets.filter((t) => t.status === 'valid');
  const used = tickets.filter((t) => t.status === 'used');

  return { tickets, valid, used, loading };
}
