'use client';

import { useEffect, useRef } from 'react';
import { db, auth } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

export function usePresence(userId, profile) {
  const profileRef = useRef(profile);
  profileRef.current = profile;

  useEffect(() => {
    if (!userId) return;

    const userRef = doc(db, 'users', userId);

    const updatePresence = async (visible) => {
      try {
        if (!auth.currentUser) return;
        if (visible) {
          // Respetar el estado de visibilidad que el usuario eligió
          if (profileRef.current?.online === false) {
            await updateDoc(userRef, { lastSeen: serverTimestamp() });
            return;
          }
          await updateDoc(userRef, {
            online: true,
            lastSeen: serverTimestamp()
          });
        } else {
          await updateDoc(userRef, {
            online: false,
            lastSeen: serverTimestamp()
          });
        }
      } catch (err) {
        // Silenciamos errores de permisos si el usuario se está desconectando
      }
    };

    updatePresence(true);

    const handleVisibilityChange = () => {
      updatePresence(document.visibilityState === 'visible');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      updatePresence(false);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [userId]);

  return null;
}
