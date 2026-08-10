'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  deleteUser
} from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { usePresence } from '@/hooks/usePresence';

const AuthContext = createContext({
  user: null,
  profile: null,
  isAdmin: false,
  loading: true,
  loginWithGoogle: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  usePresence(user?.uid, profile);

  useEffect(() => {
    // Registro de Service Worker para PWA
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then((registration) => {
          // Fuerza la comprobación de una versión nueva del SW en cada carga,
          // para que los usuarios con una versión vieja instalada la reciban pronto.
          registration.update().catch(() => {});
        }).catch(err => {
          // ignore
        });

        // Cuando el nuevo Service Worker toma el control, recarga una vez
        // para que el usuario obtenga el bundle actualizado automáticamente.
        let reloaded = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (reloaded) return;
          reloaded = true;
          window.location.reload();
        });
      });
    }

    let unsubscribeProfile = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (user) {
        setUser(user);
        
        // Escuchar cambios en el perfil de Firestore
        unsubscribeProfile = onSnapshot(doc(db, 'users', user.uid), 
          (doc) => {
            if (doc.exists()) {
              setProfile(doc.data());
            } else {
              setProfile(null);
            }
            setLoading(false);
          },
          (error) => {
            console.error("Profile snapshot error", error);
            setLoading(false);
          }
        );
      } else {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Lógica de Referidos
      const urlParams = new URLSearchParams(window.location.search);
      const refId = urlParams.get('ref');

      if (refId && refId !== user.uid) {
        const { getDoc, doc, updateDoc, increment, setDoc, serverTimestamp } = await import('firebase/firestore');
        
        // Comprobar si este usuario ya ha sido referido o es nuevo
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (!userDoc.exists()) {
          // Es un usuario nuevo, procesar la invitación
          const inviterRef = doc(db, 'users', refId);
          const inviterDoc = await getDoc(inviterRef);
          
          if (inviterDoc.exists()) {
            await updateDoc(inviterRef, {
              invitesCount: increment(1)
            });

            // Si llega a 3, darle Premium (ejemplo simple)
            const newCount = (inviterDoc.data().invitesCount || 0) + 1;
            if (newCount >= 3) {
              await updateDoc(inviterRef, {
                premium: true,
                premiumUntil: serverTimestamp() // Podríamos sumar días, pero para MVP es directo
              });
            }
          }
        }
      }
    } catch (error) {
      console.error("Error signing in with Google", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  const deleteAccount = async () => {
    if (!user) return;
    try {
      const { deleteDoc, doc, collection, query, where, getDocs } = await import('firebase/firestore');
      const { ref, listAll, deleteObject } = await import('firebase/storage');
      const { storage } = await import('@/lib/firebase');
      const uid = user.uid;

      const deleteMatchingDocs = async (col, field) => {
        const q = query(collection(db, col), where(field, '==', uid));
        const snap = await getDocs(q);
        await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
      };

      await Promise.all([
        deleteMatchingDocs('likes', 'fromId'),
        deleteMatchingDocs('likes', 'toId'),
        deleteMatchingDocs('visits', 'visitorId'),
        deleteMatchingDocs('visits', 'visitedId'),
        deleteMatchingDocs('blocks', 'blockerId'),
        deleteMatchingDocs('blocks', 'blockedId'),
        deleteDoc(doc(db, 'locations', uid)),
        deleteDoc(doc(db, 'verifications', uid)),
      ]);

      try {
        const storageRef = ref(storage, `profilePictures/${uid}`);
        const fileList = await listAll(storageRef);
        await Promise.all(fileList.items.map(item => deleteObject(item)));
      } catch {}

      await deleteDoc(doc(db, 'users', uid));
      await deleteUser(user);
    } catch (error) {
      console.error("Error deleting account:", error);
      if (error.code === 'auth/requires-recent-login') {
        alert("Por seguridad, debes haber iniciado sesión recientemente para borrar tu cuenta. Por favor, cierra sesión e inicia de nuevo.");
      }
      throw error;
    }
  };

  const requestVerification = async (photoFile) => {
    if (!user || !photoFile) return;
    try {
      const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
      const { setDoc, doc, serverTimestamp } = await import('firebase/firestore');
      const { storage } = await import('@/lib/firebase');

      const storageRef = ref(storage, `verifications/${user.uid}_${Date.now()}.jpg`);
      await uploadBytes(storageRef, photoFile);
      const url = await getDownloadURL(storageRef);

      await setDoc(doc(db, 'verifications', user.uid), {
        userId: user.uid,
        nick: profile?.nick || 'Sin nick',
        photoUrl: url,
        status: 'pending',
        timestamp: serverTimestamp()
      });

      // Actualizar estado en el perfil del usuario para feedback inmediato
      await setDoc(doc(db, 'users', user.uid), {
        verificationStatus: 'pending'
      }, { merge: true });

      return true;
    } catch (error) {
      console.error("Error requesting verification:", error);
      throw error;
    }
  };

  const isAdmin = user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL || user?.email === 'cesar.herrera.rojo@gmail.com';

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      isAdmin, 
      loginWithGoogle, 
      logout, 
      deleteAccount, 
      requestVerification,
      loading 
    }}>
      {loading ? (
        <div className="flex items-center justify-center min-h-screen bg-slate-950">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]"></div>
        </div>
      ) : children}
    </AuthContext.Provider>
  );
};
