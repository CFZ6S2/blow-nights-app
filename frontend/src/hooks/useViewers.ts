'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';
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

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const viewersList: Partial<User>[] = [];
      snapshot.forEach((doc) => {
        viewersList.push({ id: doc.id, ...doc.data() } as Partial<User>);
      });
      setViewers(viewersList);
    }, () => {});

    return () => unsubscribe();
  }, [myUid]);

  return viewers;
}
