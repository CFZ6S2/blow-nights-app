'use client';

import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useCityRouter } from '@/hooks/useCityRouter';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatSkeleton } from '@/components/Skeleton';
import ProfileOverlay from '@/components/ProfileOverlay';

export default function VisitsPage() {
  const { t } = useTranslation();
  const { user, profile, loading: authLoading } = useAuth();
  const { isReady } = useRequireAuth();
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfileId, setSelectedProfileId] = useState(null);
  const { cityPath, router } = useCityRouter();

  const triggerHaptic = (intensity: number | number[] = 10) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(intensity);
    }
  };

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'visits'),
      where('visitedId', '==', user.uid),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const visitsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setVisits(visitsData);
        setLoading(false);
      },
      (error) => {
        console.error("Visits snapshot error", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  if (authLoading || loading) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-950 text-white p-8">
        <header className="py-8 flex items-center gap-6">
          <div className="w-12 h-12 rounded-2xl bg-white/5 animate-pulse" />
          <div className="h-8 w-40 bg-white/5 rounded-xl animate-pulse" />
        </header>
        <div className="space-y-6">
          {[...Array(5)].map((_, i) => <ChatSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  const isPremium = profile?.premium;

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-white pb-32 overflow-x-hidden">
      <AnimatePresence>
        {selectedProfileId && (
          <ProfileOverlay id={selectedProfileId} onClose={() => setSelectedProfileId(null)} />
        )}
      </AnimatePresence>

      <header className="sticky top-0 z-40 bg-slate-950/60 backdrop-blur-3xl border-b border-white/5 px-8 py-8">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-6">
            <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={() => { triggerHaptic(5); router.back(); }} 
              className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center hover:bg-white/10 transition-all"
            >
              <span className="material-icons text-white">chevron_left</span>
            </motion.button>
            <div>
              <h1 className="text-3xl font-[1000] tracking-tighter leading-none">{t('visits.title')}</h1>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mt-1">{t('visits.subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-xl">
            <span className="text-fuchsia-400 font-black text-xs">{visits.length}</span>
            <span className="material-icons text-fuchsia-500 text-sm">visibility</span>
          </div>
        </div>
      </header>

      <div className="px-6 pt-8 space-y-4 max-w-2xl mx-auto w-full">
        {visits.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-32"
          >
            <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-8">
              <span className="material-icons text-5xl text-slate-700">visibility_off</span>
            </div>
            <p className="text-xl font-black text-slate-400">{t('visits.empty_title')}</p>
            <p className="text-sm text-slate-600 mt-2 max-w-[200px] mx-auto">{t('visits.empty_subtitle')}</p>
          </motion.div>
        ) : (
          <div className="grid gap-3">
            {visits.map((visit, idx) => (
              <motion.div
                key={visit.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => {
                  if (isPremium) {
                    triggerHaptic(15);
                    setSelectedProfileId(visit.visitorId);
                  } else {
                    triggerHaptic([10, 30, 10]);
                    router.push('/premium');
                  }
                }}
                className={`relative flex items-center gap-5 p-5 bg-white/5 border border-white/5 rounded-[2.5rem] transition-all overflow-hidden ${isPremium ? 'hover:bg-white/10 active:scale-[0.98]' : 'cursor-pointer'}`}
              >
                {!isPremium && idx > 2 && (
                  <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-md z-10 flex items-center justify-center">
                    <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/20 border border-yellow-500/30 rounded-full">
                      <span className="material-icons text-xs text-yellow-500">lock</span>
                      <p className="text-[8px] font-black text-yellow-500 uppercase tracking-widest">{t('visits.vip_only')}</p>
                    </div>
                  </div>
                )}

                <div className={`relative w-20 h-20 rounded-[1.8rem] overflow-hidden border-2 transition-all ${isPremium ? 'border-fuchsia-500/30' : 'border-slate-800'}`}>
                  <img 
                    src={visit.visitorFoto || '/globe.svg'} 
                    alt={visit.visitorNick} 
                    className={`w-full h-full object-cover transition-all ${!isPremium && idx > 2 ? 'blur-2xl' : ''}`} 
                  />
                  {visit.online && (
                    <div className="absolute bottom-2 right-2 w-4 h-4 bg-green-500 rounded-full border-4 border-slate-900 shadow-[0_0_10px_#22c55e]" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className={`font-black text-lg truncate ${!isPremium && idx > 2 ? 'blur-sm select-none' : ''}`}>
                      {visit.visitorNick}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="material-icons text-[10px] text-slate-500">schedule</span>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      {visit.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {visit.timestamp?.toDate().toLocaleDateString() === new Date().toLocaleDateString() ? t('visits.today') : visit.timestamp?.toDate().toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-600">
                  <span className="material-icons text-sm">{isPremium ? 'chevron_right' : 'star'}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {!isPremium && visits.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-12 p-8 bg-gradient-to-br from-slate-900 to-slate-950 border border-yellow-500/20 rounded-[3rem] text-center shadow-2xl relative overflow-hidden group"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 via-yellow-600 to-yellow-400" />
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              className="absolute -top-24 -right-24 w-64 h-64 bg-yellow-500/5 rounded-full blur-[80px]"
            />
            
            <div className="w-20 h-20 bg-yellow-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-yellow-500/20 group-hover:scale-110 transition-transform">
              <span className="material-icons text-4xl text-yellow-500">workspace_premium</span>
            </div>
            
            <h2 className="text-2xl font-[1000] mb-3 tracking-tight">{t('visits.fans_title')}</h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-8 px-4">
              {t('visits.there_are')} <span className="text-white font-bold">{visits.length} {t('visits.people', { count: visits.length })}</span> {t('visits.fans_promo_text')}
            </p>
            
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => { triggerHaptic(20); router.push('/premium'); }}
              className="w-full py-6 rounded-2xl bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-black font-black text-xs uppercase tracking-[0.3em] shadow-[0_15px_40px_rgba(234,179,8,0.3)]"
            >
              {t('visits.unlock_now')}
            </motion.button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
