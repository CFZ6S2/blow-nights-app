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
        
        // Remove 'true' to prevent forcing a token refresh which can cause an infinite loop
        // of onAuthStateChanged events in some Firebase SDK versions.
        user.getIdTokenResult().then((idTokenResult) => {
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
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const loginWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Lógica de Referidos
      const urlParams = new URLSearchParams(window.location.search);
      const refId = urlParams.get('ref');

      if (refId && refId !== user.uid) {
        try {
          const { httpsCallable } = await import('firebase/functions');
          const { functions } = await import('@/lib/firebase');
          const processReferral = httpsCallable(functions, 'processReferral');
          await processReferral({ referrerId: refId });
        } catch (e) {
          console.error("Error processing referral:", e);
        }
      }
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
      const result = await signInWithPopup(auth, provider);
      // Apple logic could be identical to Google regarding referrals
      // We'll skip the referral part for Apple to keep it simple, or replicate if needed
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
  }, [user]);

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
  }, [user, profile?.nick]);

  const isSuperAdmin = claims?.role === 'superadmin';
  const isAdmin = isSuperAdmin || claims?.role === 'admin';
  const isCityAdmin = claims?.role === 'cityAdmin';
  const isVenueManager = isAdmin || isCityAdmin || claims?.role === 'venueOwner' || claims?.role === 'venue';
  const hasChillAccess = isAdmin || !!claims?.premium || !!profile?.premium
    || (typeof claims?.pass_expires === 'number' && claims.pass_expires > Date.now());

  const value = useMemo(() => ({
    user,
    profile,
    claims,
    isSuperAdmin,
    isAdmin,
    isCityAdmin,
    isVenueManager,
    hasChillAccess,
    loginWithGoogle,
    loginWithApple,
    logout,
    deleteAccount,
    requestVerification,
    loading
  }), [user, profile, claims, isSuperAdmin, isAdmin, isCityAdmin, isVenueManager, hasChillAccess, loginWithGoogle, loginWithApple, logout, deleteAccount, requestVerification, loading]);

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
