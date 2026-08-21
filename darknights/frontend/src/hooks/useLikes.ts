'use client';

import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

interface LikeResult {
  isMatch?: boolean;
  matchData?: any;
  error?: any;
}

export function useLikes() {
  const { user } = useAuth();
  const [matching, setMatching] = useState(false);

  const sendLike = async (targetUserId: string, isSuper = false): Promise<LikeResult> => {
    if (!user) return { error: 'No user' };

    try {
      const sendLikeFn = httpsCallable(functions, 'sendLike');
      const result = await sendLikeFn({ targetUserId, isSuper });
      const data = result.data as LikeResult;

      if (data.isMatch) {
        setMatching(true);
      }

      return data;
    } catch (error) {
      console.error("Error sending like:", error);
      return { error };
    }
  };

  return { sendLike, matching, setMatching };
}
