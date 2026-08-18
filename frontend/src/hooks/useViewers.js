'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';

export function useViewers(myUid) {
  const [viewers, setViewers] = useState([]);

  useEffect(() => {
    if (!myUid) return;

    const q = query(
      collection(db, 'users'),
      where('viewingProfileId', '==', myUid),
      limit(150)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const viewersList = [];
      snapshot.forEach((doc) => {
        viewersList.push({ id: doc.id, ...doc.data() });
      });
      setViewers(viewersList);
    });

    return () => unsubscribe();
  }, [myUid]);

  return viewers;
}
