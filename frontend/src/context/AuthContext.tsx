'use client';

import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import {
  onAuthStateChanged,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signOut
} from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { usePresence } from '@/hooks/usePresence';
import { User as UserProfile } from '@/types';
import { User as FirebaseUser } from 'firebase/auth';

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  claims: Record<string, any> | null;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isCityAdmin?: boolean;
  isVenueManager?: boolean;
  hasChillAccess: boolean;
  isPlus: boolean;
  isBlack: boolean;
  hasBlackAccess: boolean;
  isPromoLifetime: boolean;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithApple: () => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount?: () => Promise<void>;
  requestVerification?: (file: File) => Promise<boolean | undefined>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  claims: null,
  isSuperAdmin: false,
  isAdmin: false,
  hasChillAccess: false,
  isPlus: false,
  isBlack: false,
  hasBlackAccess: false,
  isPromoLifetime: false,
  loading: true,
  loginWithGoogle: async () => {},
  loginWithApple: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [claims, setClaims] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);

  usePresence(user?.uid, profile);

  useEffect(() => {
    // Failsafe: Si Firebase Auth tarda demasiado o se bloquea, forzar renderizado
    const failsafeTimeout = setTimeout(() => {
      setLoading(false);
    }, 3000);

    // Registro de Service Worker para PWA
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(err => {
          console.error('SW registration failed: ', err);
        });
      });
    }

    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (user) {
        setUser(user);
        
        user.getIdTokenResult().then((idTokenResult) => {
          if (!idTokenResult.claims.role) {
            return user.getIdTokenResult(true);
          }
          return idTokenResult;
        }).then((idTokenResult) => {
          setClaims(idTokenResult.claims);
        }).catch(err => console.error("Error fetching claims", err));
        
        // Escuchar cambios en el perfil de Firestore
        unsubscribeProfile = onSnapshot(doc(db, 'users', user.uid), 
          (doc) => {
            if (doc.exists()) {
              setProfile({ id: doc.id, ...doc.data() } as UserProfile);
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
        setClaims(null);
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(failsafeTimeout);
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const loginWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error signing in with Google", error);
      throw error;
    }
  }, []);

  const loginWithApple = useCallback(async () => {
    const provider = new OAuthProvider('apple.com');
    provider.addScope('email');
    provider.addScope('name');
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error signing in with Apple", error);
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out", error);
    }
  }, []);

  const deleteAccount = useCallback(async () => {
    if (!user) return;
    try {
      const { httpsCallable } = await import('firebase/functions');
      const { functions } = await import('@/lib/firebase');
      const deleteUserData = httpsCallable(functions, 'deleteUserData');
      await deleteUserData();
    } catch (error: any) {
      console.error("Error deleting account:", error);
      throw error;
    }
  }, [user?.uid]);

  const requestVerification = useCallback(async (photoFile: File) => {
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
  }, [user?.uid, profile?.nick]);

  // Roles privilegiados solo desde claims (server-side) para evitar escalado via Firestore
  const isSuperAdmin = claims?.role === 'superadmin';
  const isAdmin = isSuperAdmin || claims?.role === 'admin';
  const isCityAdmin = claims?.role === 'cityAdmin';
  const isVenueManager = isAdmin || isCityAdmin || claims?.role === 'venueOwner' || claims?.role === 'venue';
  
  const membershipTier = profile?.membershipTier || 'free';
  const isPlus = membershipTier === 'plus' && profile?.membershipStatus === 'active';
  const isBlack = membershipTier === 'black' && profile?.membershipStatus === 'active';
  const isPromoLifetime = profile?.promoMember === true;
  
  const boostExpires = profile?.blackBoostExpires?.toMillis?.() || claims?.blackBoostExpires;
  const hasBlackAccess = isAdmin || isBlack || isPromoLifetime || (typeof boostExpires === 'number' && boostExpires > Date.now());
  
  const hasChillAccess = isAdmin || !!claims?.premium || !!profile?.premium
    || (typeof claims?.pass_expires === 'number' && claims.pass_expires > Date.now())
    || (typeof claims?.blackBoostExpires === 'number' && claims.blackBoostExpires > Date.now());

  const value = useMemo(() => ({
    user,
    profile,
    claims,
    isSuperAdmin,
    isAdmin,
    isCityAdmin,
    isVenueManager,
    hasChillAccess,
    isPlus,
    isBlack,
    hasBlackAccess,
    isPromoLifetime,
    loginWithGoogle,
    loginWithApple,
    logout,
    deleteAccount,
    requestVerification,
    loading
  }), [user, profile, claims, isSuperAdmin, isAdmin, isCityAdmin, isVenueManager, hasChillAccess, isPlus, isBlack, hasBlackAccess, isPromoLifetime, loginWithGoogle, loginWithApple, logout, deleteAccount, requestVerification, loading]);

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="flex items-center justify-center min-h-screen bg-slate-950">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]"></div>
        </div>
      ) : children}
    </AuthContext.Provider>
  );
};
