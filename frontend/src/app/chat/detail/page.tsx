'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/hooks/useChat';
import { useSafeActions } from '@/hooks/useSafeActions';
import { useMedia } from '@/hooks/useMedia';
import { formatLastSeen } from '@/lib/timeUtils';
import ChatAudioPlayer from '@/components/ChatAudioPlayer';
import ImageModal from '@/components/ImageModal';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';

export default function ChatDetailPage() {
  const searchParams = useSearchParams();
  const chatId = searchParams.get('id');
  const { user, profile: myProfile } = useAuth();
  const { messages, loading, isOtherTyping, activeUsers, sendMessage, setTypingStatus, markAsRead, grantPrivateAccess } = useChat(chatId);
  const { blockUser, reportUser } = useSafeActions();
  const { uploadFile, uploading, progress } = useMedia();
  const fileInputRef = useRef(null);
  
  const [newMessage, setNewMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [otherUser, setOtherUser] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const scrollRef = useRef();
  const router = useRouter();
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [showOptions, setShowOptions] = useState(false);

  function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (R * c).toFixed(1);
  }

  const triggerHaptic = (intensity = 10) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(intensity);
    }
  };

  useEffect(() => {
    if (messages.length > 0) {
      markAsRead();
    }
  }, [messages]);

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
    if (isNearBottom) {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOtherTyping, isNearBottom]);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    setIsNearBottom(isAtBottom);
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (newMessage.trim()) {
      triggerHaptic(15);
      sendMessage(newMessage);
      setNewMessage('');
      setTypingStatus(false);
    }
  };

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    setTypingStatus(e.target.value.length > 0);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user || !chatId) return;

    try {
      triggerHaptic(20);
      const path = `chatMedia/${chatId}/${Date.now()}_${file.name}`;
      const url = await uploadFile(file, path);
      await sendMessage('', 'image', url);
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Error al subir la imagen.");
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const file = new File([blob], "voice_note.webm", { type: 'audio/webm' });
        const path = `chatMedia/${chatId}/${Date.now()}_voice.webm`;
        const url = await uploadFile(file, path);
        await sendMessage('', 'audio', url);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      
      const timer = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      recorder.timerInterval = timer;
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("No se pudo acceder al micrófono.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      clearInterval(mediaRecorder.timerInterval);
      setIsRecording(false);
      setRecordingTime(0);
      setMediaRecorder(null);
    }
  };

  if (loading || !otherUser) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-950">
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className="h-10 w-10 border-t-2 border-fuchsia-500 rounded-full"
      />
    </div>
  );

  const distance = myProfile?.lat && otherUser?.lat 
    ? calculateDistance(myProfile.lat, myProfile.lng, otherUser.lat, otherUser.lng)
    : '0.5';

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-white overflow-hidden">
      {/* Header Premium */}
      <header className="px-6 py-6 bg-slate-900/40 backdrop-blur-3xl border-b border-white/5 flex items-center gap-4 z-40">
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={() => { triggerHaptic(5); router.back(); }} 
          className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/5"
        >
          <span className="material-icons text-white">chevron_left</span>
        </motion.button>
        
        <div className="relative">
          <motion.div 
            layoutId={`chat-avatar-${otherUser.id}`}
            animate={{ 
              boxShadow: activeUsers.includes(otherUser.id || searchParams.get('otherId')) 
                ? '0 0 20px rgba(217, 70, 239, 0.6)' 
                : '0 0 0px rgba(217, 70, 239, 0)' 
            }}
            className="w-12 h-12 rounded-2xl overflow-hidden border border-white/10 shadow-2xl transition-all duration-500"
          >
            <img src={otherUser.fotoUrl || '/globe.svg'} alt={otherUser.nick} className="w-full h-full object-cover" />
          </motion.div>
          {otherUser.online && (
            <motion.div 
              animate={{ scale: [1, 1.4, 1], opacity: [1, 0.4, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-4 border-slate-900 shadow-[0_0_10px_#22c55e]"
            />
          )}
        </div>

        <div className="flex-1">
          <h2 className="font-black text-lg tracking-tight leading-tight">{otherUser.nick}</h2>
          <div className="flex items-center gap-2">
            <AnimatePresence mode="wait">
              {isOtherTyping ? (
                <motion.p 
                  key="typing"
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 5 }}
                  className="text-[9px] font-black uppercase tracking-widest text-fuchsia-400 animate-pulse"
                >
                  Escribiendo...
                </motion.p>
              ) : activeUsers.includes(otherUser.id || searchParams.get('otherId')) ? (
                <motion.p 
                  key="active"
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 5 }}
                  className="text-[9px] font-black uppercase tracking-widest text-fuchsia-500 flex items-center gap-1"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-500 animate-ping" />
                  En el chat
                </motion.p>
              ) : (
                <motion.p 
                  key="status"
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 5 }}
                  className={`text-[9px] font-black uppercase tracking-widest ${otherUser.online ? 'text-green-500/60' : 'text-slate-500'}`}
                >
                  {otherUser.online ? 'En línea' : otherUser.lastSeen ? `Activo ${formatLastSeen(otherUser.lastSeen)}` : 'Desconectado'}
                </motion.p>
              )}
            </AnimatePresence>
            <div className="w-1 h-1 rounded-full bg-white/10" />
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{distance} km</p>
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => { triggerHaptic(5); setShowOptions(!showOptions); }}
          className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/5"
        >
          <span className="material-icons text-slate-400 text-lg">more_vert</span>
        </motion.button>

        {/* Opciones */}
        <AnimatePresence>
          {showOptions && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowOptions(false)}
                className="fixed inset-0 bg-black/40 z-30"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -20 }}
                className="absolute top-24 right-6 w-56 bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-2 z-40 shadow-2xl"
              >
                <button onClick={() => { triggerHaptic(10); router.push(`/profile/view?id=${otherUser.id || searchParams.get('otherId')}`); }} className="w-full p-4 flex items-center gap-3 text-sm font-bold text-slate-200 hover:bg-white/5 rounded-2xl transition-all">
                  <span className="material-icons text-slate-400">person</span> Ver Perfil
                </button>
                <button 
                  onClick={async () => { 
                    triggerHaptic(10); 
                    if (confirm(`¿Quieres dar acceso a tus fotos privadas a ${otherUser.nick}?`)) {
                      await grantPrivateAccess(otherUser.id || searchParams.get('otherId'));
                      setShowOptions(false);
                    }
                  }} 
                  className="w-full p-4 flex items-center gap-3 text-sm font-bold text-yellow-500 hover:bg-yellow-500/10 rounded-2xl transition-all"
                >
                  <span className="material-icons">lock_open</span> Dar Acceso Privado
                </button>
                <div className="h-px bg-white/5 mx-2" />
                <button 
                  onClick={async () => { 
                    triggerHaptic(10); 
                    if (confirm('¿Quieres reportar a este usuario?')) {
                      await reportUser(otherUser.id || searchParams.get('otherId'), 'Desde chat');
                      alert('Reporte enviado.');
                      setShowOptions(false);
                    }
                  }} 
                  className="w-full p-4 flex items-center gap-3 text-sm font-bold text-orange-400 hover:bg-orange-500/10 rounded-2xl transition-all"
                >
                  <span className="material-icons">flag</span> Reportar
                </button>
                <button 
                  onClick={async () => { 
                    triggerHaptic(10); 
                    if (confirm('¿Bloquear usuario? No podrán hablarte más.')) {
                      await blockUser(otherUser.id || searchParams.get('otherId'));
                      router.push('/chat');
                    }
                  }} 
                  className="w-full p-4 flex items-center gap-3 text-sm font-bold text-red-500 hover:bg-red-500/10 rounded-2xl transition-all"
                >
                  <span className="material-icons">block</span> Bloquear
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </header>

      {/* Mensajes */}
      <div 
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 no-scrollbar"
      >
        <AnimatePresence initial={false}>
          {messages.map((msg, index) => {
            const isMe = msg.senderId === user.uid;
            return (
              <motion.div 
                key={msg.id || index}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] p-4 rounded-3xl relative group transition-all duration-300 ${
                  isMe 
                  ? 'bg-gradient-to-br from-fuchsia-600 to-purple-600 text-white rounded-tr-none shadow-[0_10px_20px_rgba(217,70,239,0.15)]' 
                  : 'bg-slate-800/80 backdrop-blur-xl border border-white/5 rounded-tl-none text-slate-100 shadow-xl'
                }`}>
                  {/* Bubble Tail */}
                  <div className={`absolute top-0 w-4 h-4 ${
                    isMe 
                    ? 'right-[-8px] bg-purple-600 [clip-path:polygon(0_0,0_100%,100%_0)]' 
                    : 'left-[-8px] bg-slate-800/80 [clip-path:polygon(100%_0,100%_100%,0_0)]'
                  }`} />

                  {msg.type === 'image' ? (
                    <div className="space-y-2">
                      <motion.img 
                        whileHover={{ scale: 1.02 }}
                        onClick={() => { 
                          triggerHaptic(10); 
                          setSelectedImage(msg.url);
                          setIsModalOpen(true);
                        }}
                        src={msg.url} 
                        alt="Media" 
                        className="w-72 max-w-full rounded-2xl cursor-pointer border border-white/10 shadow-2xl"
                      />
                      {msg.content && <p className="text-sm font-medium px-1">{msg.content}</p>}
                    </div>
                  ) : msg.type === 'audio' ? (
                    <ChatAudioPlayer url={msg.url} />
                  ) : (
                    <p className="text-sm font-medium leading-relaxed">{msg.content}</p>
                  )}
                  
                  <div className="flex items-center justify-end gap-1.5 mt-2 opacity-60">
                    <div className="text-[9px] font-black uppercase tracking-wider">
                      {msg.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {isMe && (
                      <span className={`material-icons text-[14px] ${msg.read ? 'text-blue-400' : 'text-white/40'}`}>
                        {msg.read ? 'done_all' : 'done'}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {isOtherTyping && (
          <div className="flex justify-start">
            <div className="bg-slate-800/40 px-6 py-4 rounded-3xl rounded-tl-none flex gap-1.5">
              {[0, 1, 2].map(i => (
                <motion.div key={i} animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }} className="w-1.5 h-1.5 bg-fuchsia-500 rounded-full" />
              ))}
            </div>
          </div>
        )}
        <div ref={scrollRef} className="h-4" />
      </div>

      {/* Input v33 MediaFlow */}
      <footer className="p-6 pb-12 bg-slate-900/80 backdrop-blur-3xl border-t border-white/5 relative">
        {uploading && (
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="absolute top-0 left-0 h-1 bg-fuchsia-500 shadow-[0_0_15px_rgba(217,70,239,0.8)] z-50"
          />
        )}
        
        <form onSubmit={handleSend} className="max-w-4xl mx-auto flex items-end gap-3">
          <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
          
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={() => { triggerHaptic(5); fileInputRef.current?.click(); }}
            className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/5 hover:bg-white/10 transition-all text-slate-400"
          >
            <span className="material-icons">add_a_photo</span>
          </motion.button>

          <div className="flex-1 bg-white/5 rounded-[2rem] border border-white/5 p-2 flex items-end gap-2 focus-within:border-fuchsia-500/30 transition-all relative overflow-hidden">
            {isRecording ? (
              <div className="flex-1 flex items-center gap-3 px-4 py-3 bg-red-500/10 animate-pulse">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <span className="text-xs font-black text-red-400 uppercase tracking-widest">
                  Grabando {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                </span>
              </div>
            ) : (
              <textarea
                value={newMessage}
                onChange={handleInputChange}
                placeholder="Escribe algo..."
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-3 px-4 resize-none max-h-32 min-h-[44px]"
                rows={1}
              />
            )}
          </div>

          <AnimatePresence mode="wait">
            <motion.button 
              key={isRecording ? 'stop' : (newMessage.trim() ? 'send' : 'mic')}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              whileTap={{ scale: 0.9 }}
              type={newMessage.trim() ? 'submit' : 'button'}
              onClick={() => {
                if (isRecording) {
                  triggerHaptic(10);
                  stopRecording();
                } else if (!newMessage.trim()) {
                  triggerHaptic(25);
                  startRecording();
                }
              }}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                isRecording 
                ? 'bg-red-500 text-white' 
                : (newMessage.trim() ? 'bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-500/20' : 'bg-white/5 text-slate-400')
              }`}
            >
              <span className="material-icons">{isRecording ? 'stop' : (newMessage.trim() ? 'send' : 'mic')}</span>
            </motion.button>
          </AnimatePresence>
        </form>
      </footer>
      <ImageModal 
        url={selectedImage} 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
}
