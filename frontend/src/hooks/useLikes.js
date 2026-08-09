'use client';

import { useState } from 'react';
import { doc, getDoc, setDoc, collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { getOrCreateChat } from './useChat';

export function useLikes() {
  const { user, profile } = useAuth();
  const [matching, setMatching] = useState(false);

  const sendLike = async (targetUserId, isSuper = false) => {
    if (!user) return { error: 'No user' };

    try {
      // 1. Guardar el like
      const likeId = `${user.uid}_${targetUserId}`;
      await setDoc(doc(db, 'likes', likeId), {
        fromId: user.uid,
        toId: targetUserId,
        type: isSuper ? 'superlike' : 'like',
        timestamp: serverTimestamp(),
        fromNick: profile?.nick || 'Anónimo',
        fromFoto: profile?.fotoUrl || ''
      });

      // 2. Comprobar si hay match (si el otro usuario ya me dio like)
      const reverseLikeId = `${targetUserId}_${user.uid}`;
      const reverseLikeDoc = await getDoc(doc(db, 'likes', reverseLikeId));

      if (reverseLikeDoc.exists()) {
        // ¡ES UN MATCH!
        setMatching(true);
        
        // Crear el documento de match
        const matchData = {
          users: [user.uid, targetUserId],
          timestamp: serverTimestamp(),
          user1: { uid: user.uid, nick: profile?.nick, foto: profile?.fotoUrl },
          user2: { 
            uid: targetUserId, 
            nick: reverseLikeDoc.data().fromNick || 'Usuario', 
            foto: reverseLikeDoc.data().fromFoto || '' 
          }
        };

        await addDoc(collection(db, 'matches'), matchData);
        
        // Asegurar que el chat existe
        const chatId = await getOrCreateChat(user.uid, targetUserId);
        
        return { isMatch: true, chatId, matchData: { ...matchData, isSuperLike: isSuper } };
      }

      return { isMatch: false };
    } catch (error) {
      console.error("Error sending like:", error);
      return { error };
    }
  };

  return { sendLike, matching, setMatching };
}
