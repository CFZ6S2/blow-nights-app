'use client';

import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, limitToLast } from 'firebase/firestore';
import { type PerformanceTrace } from 'firebase/performance';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

export const useChat = (chatId: string | null) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [activeUsers, setActiveUsers] = useState<any[]>([]);

  useEffect(() => {
    if (!chatId || !user) return;

    // Marcarme como activo en este chat
    const chatRef = doc(db, 'chats', chatId);
    
    const setMeActive = async () => {
      await updateDoc(chatRef, {
        activeUsers: arrayUnion(user.uid)
      }).catch(console.error);
    };

    const setMeInactive = async () => {
      await updateDoc(chatRef, {
        activeUsers: arrayRemove(user.uid)
      }).catch(console.error);
    };

    setMeActive();

    let perfTrace: PerformanceTrace | null = null;
    if (typeof window !== 'undefined') {
      import('@/lib/perf').then(({ startTrace }) => {
        perfTrace = startTrace('query_chat_messages');
      });
    }

    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('timestamp', 'asc'),
      limitToLast(100)
    );

    const unsubscribeMessages = onSnapshot(q,
      (snapshot) => {
        const msgs: any[] = [];
        snapshot.forEach((doc) => {
          msgs.push({ id: doc.id, ...doc.data() });
        });
        setMessages(msgs);
        setLoading(false);
        if (perfTrace) { perfTrace.stop(); perfTrace = null; }
      },
      (error) => {
        console.error("Messages snapshot error", error);
        setLoading(false);
        if (perfTrace) { perfTrace.putAttribute('error', 'true'); perfTrace.stop(); perfTrace = null; }
      }
    );

    // Suscribirse al estado del chat (typing + activeUsers)
    const unsubscribeChat = onSnapshot(chatRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();

        // Typing
        const typingState = data.typing || {};
        const otherUserId = data.users.find((id: string) => id !== user.uid);
        setIsOtherTyping(!!typingState[otherUserId]);

        // Active Users
        setActiveUsers(data.activeUsers || []);
      }
    }, () => {});

    return () => {
      unsubscribeMessages();
      unsubscribeChat();
      setMeInactive();
    };
  }, [chatId, user?.uid]);

  const sendMessage = async (content = '', type = 'text', url: string | null = null) => {
    if ((!content.trim() && !url) || !user || !chatId) return;

    const messageData = {
      content: content.trim(),
      type,
      url,
      senderId: user.uid,
      timestamp: serverTimestamp(),
      read: false
    };

    await addDoc(collection(db, 'chats', chatId, 'messages'), messageData);
    
    await updateDoc(doc(db, 'chats', chatId), {
      lastMessage: type === 'text' ? content.trim() : `Sent an ${type}`,
      lastMessageAt: serverTimestamp(),
      [`typing.${user.uid}`]: false // Limpiar estado al enviar
    });
  };

  const markAsRead = async () => {
    if (!chatId || !user) return;
    
    // Solo marcamos como leídos los mensajes que NO enviamos nosotros y que están como false
    const unreadMessages = messages.filter(m => m.senderId !== user.uid && m.read === false);
    
    if (unreadMessages.length > 0) {
      const batch: any[] = [];
      unreadMessages.forEach(msg => {
        batch.push(updateDoc(doc(db, 'chats', chatId, 'messages', msg.id), {
          read: true,
          readAt: serverTimestamp()
        }));
      });
      await Promise.all(batch);
    }
  };

  // Debounce para el estado de escritura
  const [localTyping, setLocalTyping] = useState(false);
  
  const setTypingStatus = async (isTyping: boolean) => {
    if (!user || !chatId || isTyping === localTyping) return;
    
    setLocalTyping(isTyping);
    
    // Solo escribimos en Firestore si pasamos a TRUE (empezar) o si hay un cambio real
    await updateDoc(doc(db, 'chats', chatId), {
      [`typing.${user.uid}`]: isTyping
    }).catch(console.error);
  };

  const grantPrivateAccess = async (targetUserId: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        permittedUsers: arrayUnion(targetUserId)
      });
      // Enviar mensaje automático avisando del permiso
      await sendMessage('¡He desbloqueado mis fotos privadas para ti! 🔥', 'text');
      return true;
    } catch (error) {
      console.error("Error granting private access:", error);
      return false;
    }
  };

  return { messages, loading, isOtherTyping, activeUsers, sendMessage, setTypingStatus, markAsRead, grantPrivateAccess };
};

export const getOrCreateChat = async (user1Id: string, user2Id: string) => {
  const chatId = [user1Id, user2Id].sort().join('_');
  const chatRef = doc(db, 'chats', chatId);
  const chatSnap = await getDoc(chatRef);

  if (!chatSnap.exists()) {
    await setDoc(chatRef, {
      users: [user1Id, user2Id],
      lastMessage: '',
      lastMessageAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      typing: {
        [user1Id]: false,
        [user2Id]: false
      }
    });
  }

  return chatId;
};
