'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import { type PerformanceTrace } from 'firebase/performance';
import { User } from '@/types';

export function useViewers(myUid: string | undefined) {
  const [viewers, setViewers] = useState<Partial<User>[]>([]);

  useEffect(() => {
    if (!myUid) return;

    const q = query(
      collection(db, 'users'),
      where('viewingProfileId', '==', myUid),
      limit(150)
    );

    let perfTrace: PerformanceTrace | null = null;
    if (typeof window !== 'undefined') {
      import('@/lib/perf').then(({ startTrace }) => {
        perfTrace = startTrace('query_viewers');
      });
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const viewersList: Partial<User>[] = [];
      snapshot.forEach((doc) => {
        viewersList.push({ id: doc.id, ...doc.data() } as Partial<User>);
      });
      setViewers(viewersList);
      if (perfTrace) { perfTrace.stop(); perfTrace = null; }
    }, () => {
      if (perfTrace) { perfTrace.putAttribute('error', 'true'); perfTrace.stop(); perfTrace = null; }
    });

    return () => unsubscribe();
  }, [myUid]);

  return viewers;
}
