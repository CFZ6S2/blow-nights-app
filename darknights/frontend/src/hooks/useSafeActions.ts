'use client';

import { db } from '@/lib/firebase';
import { doc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';

export function useSafeActions() {
  const { user } = useAuth();

  const blockUser = async (blockedId: string) => {
    if (!user) return { error: 'No autenticado' };

    try {
      await setDoc(doc(db, 'users', user.uid, 'blocks', blockedId), {
        blockedId,
        timestamp: serverTimestamp()
      });
      return { success: true };
    } catch (error: any) {
      console.error('Error blocking user:', error);
      return { error: error.message };
    }
  };

  const reportUser = async (reportedId: string, reason: string, details = '') => {
    if (!user) return { error: 'No autenticado' };

    try {
      await addDoc(collection(db, 'reports'), {
        reporterId: user.uid,
        reportedId,
        reason,
        details,
        timestamp: serverTimestamp(),
        status: 'pending'
      });
      return { success: true };
    } catch (error: any) {
      console.error('Error reporting user:', error);
      return { error: error.message };
    }
  };

  return { blockUser, reportUser };
}
