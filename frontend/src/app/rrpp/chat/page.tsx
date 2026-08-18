'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';

export default function RRPPChatPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const chatId = user ? `support_${user.uid}` : null;

  useEffect(() => {
    if (!chatId) return;

    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });

    return () => unsubscribe();
  }, [chatId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !chatId || !user) return;

    const text = inputText;
    setInputText('');

    await addDoc(collection(db, 'chats', chatId, 'messages'), {
      senderId: user.uid,
      content: text,
      createdAt: serverTimestamp(),
    });
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-white pb-20">
      {/* Cabecera */}
      <header className="p-4 border-b border-slate-800 bg-slate-900/50 flex items-center gap-3">
        <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
        <div>
          <h1 className="font-bold text-sm">Canal Directo con Central / Admin</h1>
          <p className="text-[10px] text-slate-400">Soporte técnico, recargas e incidencias de fiesta</p>
        </div>
      </header>

      {/* Lista de Mensajes */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => {
          const isMe = msg.senderId === user?.uid;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs ${
                isMe ? 'bg-fuchsia-600 text-white rounded-br-none' : 'bg-slate-800 text-slate-200 rounded-bl-none'
              }`}>
                <p>{msg.content}</p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-800 bg-slate-900/80 flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Escribe un mensaje al admin..."
          className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-fuchsia-500"
        />
        <button
          type="submit"
          className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all"
        >
          Enviar
        </button>
      </form>
    </div>
  );
}
