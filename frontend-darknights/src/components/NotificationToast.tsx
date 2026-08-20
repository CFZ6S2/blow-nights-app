'use client';

import { useNotificationUI } from '@/context/NotificationContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

export default function NotificationToast() {
  const { notifications } = useNotificationUI() || { notifications: [] };
  const router = useRouter();

  if (notifications.length === 0) return null;

  // Mostramos solo la más reciente
  const notification = notifications[notifications.length - 1];

  const handleClick = () => {
    if (notification.data?.click_action) {
      // Extraer la ruta relativa de la URL completa si es necesario
      try {
        const url = new URL(notification.data.click_action);
        router.push(url.pathname + url.search);
      } catch (e) {
        router.push(notification.data.click_action);
      }
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        key={notification.id}
        initial={{ y: -100, opacity: 0, scale: 0.9 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: -100, opacity: 0, scale: 0.9 }}
        onClick={handleClick}
        className="fixed top-6 left-1/2 -translate-x-1/2 z-[300] w-[90%] max-w-md cursor-pointer"
      >
        <div className="bg-white/90 backdrop-blur-3xl border border-white/10 p-4 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <span className="material-icons text-slate-900">
              {notification.data?.type === 'chat' ? 'chat' : 
               notification.data?.type === 'like' ? 'favorite' : 
               notification.data?.type === 'match' ? 'bolt' : 'notifications'}
            </span>
          </div>
          <div className="flex-1 overflow-hidden">
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 truncate">
              {notification.title}
            </h4>
            <p className="text-sm font-bold text-slate-900 truncate">
              {notification.body}
            </p>
          </div>
          <span className="material-icons text-slate-600 text-sm">chevron_right</span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
