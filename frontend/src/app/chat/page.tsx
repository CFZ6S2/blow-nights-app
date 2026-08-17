'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChatSkeleton } from '@/components/Skeleton';

export default function ChatListPage() {
  const { user, loading: authLoading } = useAuth();
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'chats'),
      where('users', 'array-contains', user.uid),
      orderBy('lastMessageAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, 
      async (snapshot) => {
        // Obtener bloqueos
        const { getDocs, collection } = await import('firebase/firestore');
        const blocksSnap = await getDocs(collection(db, 'users', user.uid, 'blocks'));
        const blockedIds = blocksSnap.docs.map(doc => doc.data().blockedId);

        const chatsData = [];
        for (const d of snapshot.docs) {
          const data = d.data();
          const otherId = d.data().users.find((uid: string) => uid !== user.uid);
          
          // Ocultar si está bloqueado
          if (blockedIds.includes(otherId)) continue;

          const otherDoc = await getDoc(doc(db, 'users', otherId));
          chatsData.push({
            id: d.id,
            ...data,
            otherUser: otherDoc.data()
          });
        }
        setChats(chatsData);
        setLoading(false);
      },
      (error) => {
        console.error("Chat list snapshot error", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  if (authLoading || loading) return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-white p-4">
      <header className="py-6 px-4 flex justify-between items-center opacity-40">
        <div className="w-10 h-10 rounded-full bg-white/5" />
        <h1 className="text-2xl font-bold">Mis Mensajes</h1>
        <div className="w-10" />
      </header>
      <div className="space-y-3 max-w-2xl mx-auto w-full">
        <ChatSkeleton />
        <ChatSkeleton />
        <ChatSkeleton />
        <ChatSkeleton />
        <ChatSkeleton />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-white p-4">
      <header className="py-6 px-4 flex justify-between items-center">
        <button onClick={() => router.push('/')} className="p-2 hover:bg-white/10 rounded-full transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold">Mis Mensajes</h1>
        <div className="w-10"></div> {/* Spacer */}
      </header>

      <div className="space-y-2 max-w-2xl mx-auto w-full">
        {chats.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <div className="text-6xl mb-4">💬</div>
            <p>Aún no tienes conversaciones.</p>
            <p className="text-xs mt-2">¡Ve al mapa y rompe el hielo!</p>
          </div>
        ) : (
          chats.map((chat) => (
            <Link 
              key={chat.id} 
              href={`/chat/detail?id=${chat.id}`}
              className="flex items-center gap-4 p-4 bg-white/5 border border-white/5 rounded-3xl hover:bg-white/10 transition-all group"
            >
              <div className="relative">
                <div className="w-14 h-14 rounded-full overflow-hidden border border-purple-500/30">
                  <img src={chat.otherUser?.fotoUrl || '/globe.svg'} alt={chat.otherUser?.nick} className="w-full h-full object-cover" />
                </div>
                {chat.otherUser?.online && (
                  <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-slate-950"></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <h3 className="font-bold text-white group-hover:text-purple-400 transition-colors">{chat.otherUser?.nick}</h3>
                  <span className="text-[10px] text-slate-500">
                    {chat.lastMessageAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-sm text-slate-400 truncate mt-1">
                  {chat.lastMessage || '¡Di hola! 👋'}
                </p>
              </div>
              <div className="text-slate-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
