'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Ticket } from '@/types';

export function useTickets(userId: string | undefined) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, 'tickets'),
      where('userId', '==', userId),
      orderBy('purchasedAt', 'desc')
    );

    let perfTrace = null;
    if (typeof window !== 'undefined') {
      import('@/lib/perf').then(({ startTrace }) => {
        perfTrace = startTrace('query_tickets');
      });
    }

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Ticket));
      setTickets(list);
      setLoading(false);
      if (perfTrace) {
        perfTrace.stop();
        perfTrace = null;
      }
    }, () => {
      setLoading(false);
      if (perfTrace) {
        perfTrace.putAttribute('error', 'true');
        perfTrace.stop();
        perfTrace = null;
      }
    });

    return unsub;
  }, [userId]);

  const valid = tickets.filter((t) => t.status === 'valid');
  const used = tickets.filter((t) => t.status === 'used');

  return { tickets, valid, used, loading };
}
