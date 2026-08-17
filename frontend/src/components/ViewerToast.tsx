'use client';

import { useViewers } from '@/hooks/useViewers';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { User } from '@/types';

export default function ViewerToast() {
  const { user } = useAuth();
  const viewers = useViewers(user?.uid) as User[];

  if (viewers.length === 0) return null;

  const firstViewer = viewers[0];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 50, opacity: 0, scale: 0.9 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 50, opacity: 0, scale: 0.9 }}
        className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] w-auto"
      >
        <div className="bg-slate-900/80 backdrop-blur-2xl border border-fuchsia-500/30 px-5 py-3 rounded-2xl shadow-[0_10px_40px_rgba(217,70,239,0.2)] flex items-center gap-3">
          <div className="relative">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-fuchsia-500">
              <img src={firstViewer.fotoUrl || '/globe.svg'} alt={firstViewer.nick} className="w-full h-full object-cover" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-fuchsia-500 rounded-full border-2 border-slate-900 animate-pulse" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-fuchsia-400">¡Actividad en vivo!</p>
            <p className="text-xs font-bold text-white">
              <span className="text-fuchsia-300">{firstViewer.nick}</span> {viewers.length > 1 ? `y ${viewers.length - 1} más están` : 'está'} viendo tu perfil 👀
            </p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
