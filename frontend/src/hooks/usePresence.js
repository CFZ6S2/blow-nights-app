'use client';

import { useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

export function usePresence(userId, profile) {
  useEffect(() => {
    if (!userId) return;

    const userRef = doc(db, 'users', userId);

    const setOnline = async () => {
      try {
        if (!auth.currentUser) return;
        // Si está en modo ghost, no lo ponemos como online (visible en el mapa)
        if (profile?.ghostMode) {
          await updateDoc(userRef, {
            online: false,
            lastSeen: serverTimestamp()
          });
          return;
        }
        await updateDoc(userRef, {
          online: true,
          lastSeen: serverTimestamp()
        });
      } catch (err) {
        // Silenciamos errores de permisos si el usuario se está desconectando
      }
    };

    const setOffline = async () => {
      try {
        if (!auth.currentUser) return;
        await updateDoc(userRef, {
          online: false,
          lastSeen: serverTimestamp()
        });
      } catch (err) {
        // Silenciamos errores de permisos si el usuario se está desconectando
      }
    };

    // Al montar
    setOnline();

    // Detectar visibilidad de la página
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setOnline();
      } else {
        setOffline();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Al desmontar (cerrar pestaña o cerrar sesión)
    return () => {
      setOffline();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [userId]);

  return null;
}
