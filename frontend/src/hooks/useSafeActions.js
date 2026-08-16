'use client';

import { db } from '@/lib/firebase';
import { doc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';

export function useSafeActions() {
  const { user } = useAuth();

  const blockUser = async (blockedId) => {
    if (!user) return { error: 'No autenticado' };
    
    try {
      await setDoc(doc(db, 'users', user.uid, 'blocks', blockedId), {
        blockedId: blockedId,
        timestamp: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error blocking user:', error);
      return { error: error.message };
    }
  };

  const reportUser = async (reportedId, reason, details = '') => {
    if (!user) return { error: 'No autenticado' };

    try {
      await addDoc(collection(db, 'reports'), {
        reporterId: user.uid,
        reportedId: reportedId,
        reason: reason,
        details: details,
        timestamp: serverTimestamp(),
        status: 'pending'
      });
      return { success: true };
    } catch (error) {
      console.error('Error reporting user:', error);
      return { error: error.message };
    }
  };

  return { blockUser, reportUser };
}
