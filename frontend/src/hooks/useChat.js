'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

export const useChat = (chatId) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!chatId) return;

    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = [];
      snapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() });
      });
      setMessages(msgs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [chatId]);

  const sendMessage = async (content) => {
    if (!content.trim() || !user) return;

    const messageData = {
      senderId: user.uid,
      content: content.trim(),
      timestamp: serverTimestamp()
    };

    await addDoc(collection(db, 'chats', chatId, 'messages'), messageData);
    
    // Actualizar el último mensaje en el documento del chat
    await updateDoc(doc(db, 'chats', chatId), {
      lastMessage: content.trim(),
      lastMessageAt: serverTimestamp()
    });
  };

  return { messages, loading, sendMessage };
};

export const getOrCreateChat = async (user1Id, user2Id) => {
  const chatId = [user1Id, user2Id].sort().join('_');
  const chatRef = doc(db, 'chats', chatId);
  const chatSnap = await getDoc(chatRef);

  if (!chatSnap.exists()) {
    await setDoc(chatRef, {
      users: [user1Id, user2Id],
      lastMessage: '',
      lastMessageAt: serverTimestamp(),
      createdAt: serverTimestamp()
    });
  }

  return chatId;
};
