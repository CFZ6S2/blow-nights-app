'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { User } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { db, functions } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useTranslation } from 'react-i18next';

interface SwipeCardsProps {
  users: User[];
  onSwipe: (userId: string, direction: 'left' | 'right' | 'up' | 'up_no_checkin') => void;
  myVenueId?: string; // The venue where the current user is checked in
}

export default function SwipeCards({ users, onSwipe, myVenueId }: SwipeCardsProps) {
  const { user, profile, isPlus, hasBlackAccess } = useAuth();
  const router = useRouter();
  const [cards, setCards] = useState<User[]>([]);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [pingLimitExceeded, setPingLimitExceeded] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    // Para el MVP, simplemente cargamos las cartas. En produccion deberíamos filtrar dislikes.
    // eslint-disable-next-line
    setCards(users);
  }, [users]);

  const handleDragEnd = (event: any, info: PanInfo, targetUser: User) => {
    const swipeThreshold = 50;
    
    if (info.offset.x > swipeThreshold) {
      handleAction(targetUser, 'right'); // Like
    } else if (info.offset.x < -swipeThreshold) {
      handleAction(targetUser, 'left'); // Pass
    } else if (info.offset.y < -swipeThreshold) {
      handleAction(targetUser, 'up'); // Ping
    }
  };

  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [lastPingTime, setLastPingTime] = useState(0);

  const checkPingLimits = async () => {
    if (!user || !profile) return false;
    
    if (profile.isVIPNight || profile.premium || hasBlackAccess) return true;

    const pingLimit = isPlus ? 10 : 3;

    // Check 4 hour reset
    const now = new Date().valueOf();
    const lastReset = profile.lastPingReset?.toMillis?.() || 0;
    if (now - lastReset > 4 * 60 * 60 * 1000 && (profile.dailyPingsLeft || 0) < pingLimit) {
      await updateDoc(doc(db, 'users', user.uid), {
        dailyPingsLeft: pingLimit,
        lastPingReset: serverTimestamp()
      });
      return true; // Just reset, they have limits now
    }

    if ((profile.dailyPingsLeft ?? 0) <= 0) {
      setPingLimitExceeded(true);
      return false;
    }
    return true;
  };

  const handleCheckout = async (type: 'ping_pack' | 'vip_night') => {
    setIsProcessingPayment(true);
    try {
      const createPingCheckoutSession = httpsCallable(functions, 'createPingCheckoutSession');
      const citySlug = profile?.currentCity || 'madrid'; // Fallback to madrid for MVP if not set
      const result = await createPingCheckoutSession({ type, origin: window.location.origin, citySlug });
      const { url } = result.data as { url: string };
      if (url) {
        window.location.href = url;
      }
    } catch (e) {
      console.error(e);
      alert(t('swipe.err_payment'));
      setIsProcessingPayment(false);
    }
  };

  const handleAction = async (targetUser: User, direction: 'left' | 'right' | 'up') => {
    if (direction === 'up') {
      const now = new Date().valueOf();
      if (now - lastPingTime < 30000) {
        alert(t('swipe.err_wait'));
        return;
      }

      // Check if already pinged today
      const q = query(
        collection(db, 'pings'),
        where('fromUserId', '==', user?.uid),
        where('toUserId', '==', targetUser.id),
        where('timestamp', '>', new Date(now - 24 * 60 * 60 * 1000))
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        alert(t('swipe.err_already_pinged'));
        return; // Don't remove card, or maybe remove it. Let's remove it.
      }

      const canPing = await checkPingLimits();
      if (!canPing) {
        return; // limit exceeded modal is shown
      }
      
      setLastPingTime(now);

      // Enviar Ping
      await addDoc(collection(db, 'pings'), {
        fromUserId: user?.uid,
        toUserId: targetUser.id,
        venueId: myVenueId || null,
        timestamp: serverTimestamp(),
        // eslint-disable-next-line react-hooks/rules-of-hooks, react-hooks/exhaustive-deps, @typescript-eslint/ban-ts-comment
        // @ts-ignore
        expiresAt: new Date(now + 4 * 60 * 60 * 1000),
        status: 'unread'
      });
    }

    setCards(prev => prev.filter(c => c.id !== targetUser.id));
    onSwipe(targetUser.id, direction);
  };
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  useEffect(() => {
    // Reset photo index when front card changes
    setCurrentPhotoIndex(0);
  }, [cards.length]);

  if (pingLimitExceeded) {
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md rounded-[2.5rem]">
        <div className="bg-slate-900 border border-slate-700 p-8 rounded-3xl text-center shadow-2xl w-full max-w-sm">
          <div className="text-4xl mb-4">🔥</div>
          <h2 className="text-lg font-black text-white uppercase leading-tight mb-2">{t('swipe.limit_title')}</h2>
          <p className="text-slate-400 text-xs font-medium mb-6">{t('swipe.limit_desc')}</p>
          
          <div className="space-y-3">
            <button 
              onClick={() => handleCheckout('ping_pack')}
              disabled={isProcessingPayment}
              className="w-full bg-slate-800 text-white font-bold text-sm tracking-wide py-4 rounded-xl hover:bg-slate-700 transition-all flex items-center justify-between px-4 border border-slate-600"
            >
              <span>{t('swipe.pack_extra')}</span>
              <span className="font-black text-orange-400">1,99 €</span>
            </button>
            <button 
              onClick={() => handleCheckout('vip_night')}
              disabled={isProcessingPayment}
              className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black text-sm tracking-wide py-4 rounded-xl hover:scale-105 transition-all shadow-[0_0_15px_rgba(245,158,11,0.5)] flex items-center justify-between px-4"
            >
              <span>{t('swipe.pass_unlimited')}</span>
              <span>3,99 €</span>
            </button>
          </div>

          <button onClick={() => setPingLimitExceeded(false)} className="text-slate-500 text-[10px] font-bold uppercase underline mt-6 block w-full tracking-wider">{t('swipe.back_to_radar')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[420px] flex items-center justify-center overflow-hidden">
      {selectedProfileId && (
        <ProfileOverlay id={selectedProfileId} onClose={() => setSelectedProfileId(null)} />
      )}

      <AnimatePresence>
        {cards.length === 0 ? (
           <div className="text-center text-slate-500 font-bold uppercase tracking-widest text-[10px]">
             {t('swipe.no_more_profiles')}
           </div>
        ) : (
          cards.map((c, index) => {
            const isFrontCard = index === cards.length - 1;
            const cardPhotos = [c.fotoUrl, ...(c.extraPhotos || [])].filter(Boolean);
            const activePhoto = isFrontCard ? (cardPhotos[currentPhotoIndex] || c.fotoUrl) : c.fotoUrl;

            return (
              <motion.div
                key={c.id}
                className="absolute w-full max-w-[350px] aspect-[3/4] rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10 bg-slate-900 select-none"
                style={{
                  backgroundImage: `url(${activePhoto || '/placeholder.png'})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  zIndex: index,
                }}
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: isFrontCard ? 1 : 0.95, opacity: 1, y: isFrontCard ? 0 : -20 }}
                exit={{ x: dragStart.x > 0 ? 200 : -200, opacity: 0, scale: 0.5 }}
                drag={isFrontCard ? "x" : false}
                dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                onDragStart={(e, info) => setDragStart({ x: info.point.x, y: info.point.y })}
                onDragEnd={(e, info) => handleDragEnd(e, info, c)}
                whileDrag={{ scale: 1.05 }}
              >
                {/* Tinder-style Photo Bar Indicators */}
                {isFrontCard && cardPhotos.length > 1 && (
                  <div className="absolute top-3 left-4 right-4 flex gap-1 z-30 pointer-events-none">
                    {cardPhotos.map((_, pIdx) => (
                      <div key={pIdx} className="flex-1 h-1 rounded-full bg-black/40 overflow-hidden backdrop-blur-sm">
                        <div className={`h-full transition-all duration-300 ${pIdx === currentPhotoIndex ? 'bg-white' : 'bg-white/30'}`} />
                      </div>
                    ))}
                  </div>
                )}

                {/* Left/Right Photo Tap Controls */}
                {isFrontCard && cardPhotos.length > 1 && (
                  <div className="absolute inset-0 flex z-10">
                    <div 
                      className="w-1/2 h-[75%]"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentPhotoIndex(prev => Math.max(0, prev - 1));
                      }}
                    />
                    <div 
                      className="w-1/2 h-[75%]"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentPhotoIndex(prev => Math.min(cardPhotos.length - 1, prev + 1));
                      }}
                    />
                  </div>
                )}

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent pointer-events-none" />
                
                {/* User Info & Expand Profile Button */}
                <div className="absolute bottom-24 left-0 w-full p-6 text-white space-y-1 z-20 flex justify-between items-end">
                  <div className="cursor-pointer" onClick={() => setSelectedProfileId(c.id)}>
                    <h2 className="text-3xl font-black flex items-center gap-2">
                      {c.nick}, {c.edad || '?'}
                    </h2>
                    <div className="flex gap-2 text-[10px] font-black uppercase tracking-widest text-slate-300 mt-1">
                      <span>
                        {c.rol === 'activo' ? t('swipe.role_active') : c.rol === 'pasivo' ? t('swipe.role_passive') : t('swipe.role_versatile')}
                      </span>
                      <span>•</span>
                      <span>{t('swipe.distance')}</span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedProfileId(c.id);
                    }}
                    className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-all text-white shadow-lg"
                    title="Ver perfil completo"
                  >
                    <span className="material-icons text-xl">info</span>
                  </button>
                </div>

                {/* Action Buttons Layer */}
                <div className="absolute bottom-5 w-full flex justify-center items-center gap-5 z-30">
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleAction(c, 'left'); }}
                    className="w-14 h-14 rounded-full bg-slate-900/90 border border-white/10 flex items-center justify-center hover:scale-110 hover:bg-slate-800 transition-all shadow-xl active:scale-95 text-red-400"
                  >
                    <span className="material-icons text-2xl">close</span>
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleAction(c, 'up'); }}
                    className="w-20 h-20 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 border border-amber-300/50 flex flex-col items-center justify-center hover:scale-110 transition-all shadow-[0_0_25px_rgba(245,158,11,0.6)] active:scale-95 text-white"
                  >
                    <span className="material-icons text-3xl">local_fire_department</span>
                    <span className="text-[8px] font-black uppercase tracking-widest mt-0.5">{t('swipe.come_here')}</span>
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleAction(c, 'right'); }}
                    className="w-14 h-14 rounded-full bg-slate-900/90 border border-white/10 flex items-center justify-center hover:scale-110 hover:bg-slate-800 transition-all shadow-xl active:scale-95 text-emerald-400"
                  >
                    <span className="material-icons text-2xl">favorite</span>
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </AnimatePresence>
    </div>
  );
}
