'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/hooks/useChat';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function ChatDetailPage() {
  const { id: chatId } = useParams();
  const { user } = useAuth();
  const { messages, loading, sendMessage } = useChat(chatId);
  const [newMessage, setNewMessage] = useState('');
  const [otherUser, setOtherUser] = useState(null);
  const scrollRef = useRef();
  const router = useRouter();

  useEffect(() => {
    const fetchOtherUser = async () => {
      const chatDoc = await getDoc(doc(db, 'chats', chatId));
      if (chatDoc.exists()) {
        const otherId = chatDoc.data().users.find(uid => uid !== user?.uid);
        if (otherId) {
          const userDoc = await getDoc(doc(db, 'users', otherId));
          setOtherUser(userDoc.data());
        }
      }
    };
    if (user && chatId) fetchOtherUser();
  }, [chatId, user]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (newMessage.trim()) {
      sendMessage(newMessage);
      setNewMessage('');
    }
  };

  if (loading || !otherUser) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-950">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-purple-500"></div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-white">
      {/* Header del Chat */}
      <header className="p-4 bg-white/5 backdrop-blur-md border-b border-white/10 flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-white/10 rounded-full">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="w-10 h-10 rounded-full overflow-hidden border border-purple-500">
          <img src={otherUser.fotoUrl || '/globe.svg'} alt={otherUser.nick} className="w-full h-full object-cover" />
        </div>
        <div>
          <h2 className="font-bold text-lg">{otherUser.nick}</h2>
          <p className="text-[10px] text-green-400 font-medium uppercase tracking-widest">
            {otherUser.online ? 'En línea' : 'Desconectado'}
          </p>
        </div>
      </header>

      {/* Lista de Mensajes */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isMe = msg.senderId === user.uid;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] px-4 py-3 rounded-2xl shadow-lg ${
                isMe 
                ? 'bg-gradient-to-br from-purple-600 to-indigo-600 rounded-tr-none' 
                : 'bg-white/10 border border-white/5 rounded-tl-none'
              }`}>
                <p className="text-sm">{msg.content}</p>
                <p className="text-[8px] opacity-50 text-right mt-1">
                  {msg.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={scrollRef}></div>
      </div>

      {/* Input de Mensaje */}
      <form onSubmit={handleSend} className="p-4 bg-white/5 border-t border-white/10 flex items-center gap-3">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Escribe un mensaje..."
          className="flex-1 bg-slate-900 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
        />
        <button 
          type="submit"
          className="bg-purple-600 p-3 rounded-2xl hover:bg-purple-700 transition-all shadow-lg shadow-purple-600/20"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 rotate-90" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
          </svg>
        </button>
      </form>
    </div>
  );
}
