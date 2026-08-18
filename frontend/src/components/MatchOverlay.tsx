'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useCityRouter } from '@/hooks/useCityRouter';

export default function MatchOverlay({ matchData, onClose }: { matchData: any, onClose: () => void }) {
  const router = useRouter();
  const { cityPath } = useCityRouter();

  if (!matchData) return null;

  const handleGoToChat = async () => {
    const { getOrCreateChat } = await import('@/hooks/useChat');
    const chatId = await getOrCreateChat(matchData.user1.uid, matchData.user2.uid);
    router.push(cityPath(`/chat/detail?id=${chatId}`));
    onClose();
  };

  const isSuper = matchData.isSuperLike;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[250] bg-slate-950/98 backdrop-blur-[50px] flex flex-col items-center justify-center p-8 text-center overflow-hidden"
    >
      {/* Luz Estroboscópica de Impacto */}
      <motion.div 
        animate={{ 
          opacity: [0, 0.4, 0],
          scale: [0.8, 1.5, 0.8]
        }}
        transition={{ duration: 0.2, repeat: 3, repeatDelay: 1 }}
        className="absolute inset-0 bg-white -z-10"
      />

      {/* Brillo de fondo pulsante */}
      <motion.div 
        animate={{ 
          scale: [1, 1.4, 1],
          opacity: [0.2, 0.5, 0.2]
        }}
        transition={{ duration: 4, repeat: Infinity }}
        className={`absolute w-[600px] h-[600px] rounded-full blur-[150px] -z-20 ${isSuper ? 'bg-yellow-500/30' : 'bg-fuchsia-600/30'}`}
      />

      <motion.div
        initial={{ scale: 0.8, y: 50, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 15, stiffness: 200 }}
        className="relative max-w-sm w-full"
      >
        {/* Explosión de Partículas Orgánicas */}
        <div className="absolute inset-0 -z-10 flex items-center justify-center">
          {[...Array(40)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, x: 0, y: 0 }}
              animate={{ 
                scale: [0, 1.2, 0.6, 0], 
                x: Math.cos(i * 9 * Math.PI / 180) * (250 + ((i * 17) % 100) / 100 * 150), 
                y: Math.sin(i * 9 * Math.PI / 180) * (250 + ((i * 23) % 100) / 100 * 150),
                rotate: [0, 180, 360]
              }}
              transition={{ 
                duration: 4, 
                repeat: Infinity, 
                delay: ((i * 11) % 100) / 100 * 1,
                ease: "easeOut"
              }}
              className={`absolute w-1.5 h-1.5 rounded-full ${
                i % 4 === 0 ? (isSuper ? 'bg-yellow-400' : 'bg-fuchsia-500') : 
                i % 4 === 1 ? 'bg-white' : 
                i % 4 === 2 ? (isSuper ? 'bg-orange-500' : 'bg-indigo-500') :
                'bg-cyan-400'
              } shadow-[0_0_15px_currentColor] opacity-60`}
            />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, type: "spring", damping: 10 }}
        >
          <h1 className={`text-7xl font-[1000] italic tracking-tighter mb-2 leading-[0.8] ${
            isSuper ? 'text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 via-yellow-400 to-yellow-700' : 'text-transparent bg-clip-text bg-gradient-to-b from-white via-fuchsia-400 to-fuchsia-600'
          } drop-shadow-[0_10px_30px_rgba(217,70,239,0.5)]`}>
            {isSuper ? 'SUPER MATCH' : 'MATCH!'}
          </h1>
          <p className="text-white/60 font-black tracking-[0.5em] uppercase text-[10px] mb-16">Has conectado con alguien especial</p>
        </motion.div>

        <div className="flex items-center justify-center mb-24 relative">
          {/* Círculos de energía */}
          <motion.div 
            animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className={`absolute w-48 h-48 rounded-full border-2 ${isSuper ? 'border-yellow-500' : 'border-fuchsia-500'}`}
          />

          <motion.div 
            initial={{ x: -40, rotate: -12, scale: 0.8 }}
            animate={{ x: 20, rotate: -6, scale: 1 }}
            transition={{ delay: 0.4, type: "spring", stiffness: 100 }}
            className="w-40 h-40 rounded-[3rem] overflow-hidden border-[6px] border-white shadow-[0_30px_60px_rgba(0,0,0,0.8)] z-10"
          >
            <img src={matchData.user1.foto || '/globe.svg'} className="w-full h-full object-cover" />
          </motion.div>

          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 1, type: "spring", stiffness: 300, damping: 15 }}
            className={`absolute z-30 w-24 h-24 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(0,0,0,0.5)] border-[6px] border-slate-950 ${
              isSuper ? 'bg-gradient-to-br from-yellow-400 to-orange-600' : 'bg-gradient-to-br from-fuchsia-500 to-purple-600'
            }`}
          >
            <motion.span 
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
              className="material-icons text-white text-5xl"
            >
              {isSuper ? 'star' : 'favorite'}
            </motion.span>
          </motion.div>

          <motion.div 
            initial={{ x: 40, rotate: 12, scale: 0.8 }}
            animate={{ x: -20, rotate: 6, scale: 1 }}
            transition={{ delay: 0.6, type: "spring", stiffness: 100 }}
            className="w-40 h-40 rounded-[3rem] overflow-hidden border-[6px] border-white shadow-[0_30px_60px_rgba(0,0,0,0.8)]"
          >
            <img src={matchData.user2.foto || '/globe.svg'} className="w-full h-full object-cover" />
          </motion.div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5 }}
          className="space-y-4 w-full px-4"
        >
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: "0 0 40px rgba(217, 70, 239, 0.4)" }}
            whileTap={{ scale: 0.95 }}
            onClick={handleGoToChat}
            className={`w-full py-6 rounded-[2.5rem] font-black text-sm uppercase tracking-[0.3em] shadow-2xl transition-all ${
              isSuper ? 'bg-yellow-500 text-black' : 'bg-white text-black'
            }`}
          >
            Hablar ahora
          </motion.button>
          
          <button 
            onClick={onClose}
            className="w-full py-4 rounded-[2rem] text-white/40 font-black text-[10px] uppercase tracking-[0.4em] hover:text-white/80 transition-all"
          >
            Quizás más tarde
          </button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
