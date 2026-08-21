'use client';

import { useState, useEffect, useRef } from 'react';
import { doc, getDoc, collection, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { getOrCreateChat } from '@/hooks/useChat';
import { useLikes } from '@/hooks/useLikes';
import { useSafeActions } from '@/hooks/useSafeActions';
import MatchOverlay from '@/components/MatchOverlay';
import { ProfileSkeleton } from '@/components/Skeleton';
import { useRouter } from 'next/navigation';
import { useCityRouter } from '@/hooks/useCityRouter';
import { formatLastSeen } from '@/lib/timeUtils';
import { useTranslation } from 'react-i18next';

interface ProfileOverlayProps {
  id: string;
  onClose: () => void;
}

import { calculateDistance } from '@/lib/geo';
import { User } from '@/types';

export default function ProfileOverlay({ id, onClose }: ProfileOverlayProps) {
  const router = useRouter();
  const { cityPath } = useCityRouter();
  const { user: currentUser, profile: currentProfile } = useAuth();
  const { t } = useTranslation();
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePhoto, setActivePhoto] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll({ container: containerRef });
  
  const headerY = useTransform(scrollY, [0, 500], [0, 150]);
  const headerOpacity = useTransform(scrollY, [0, 400], [1, 0.4]);
  const contentFade = useTransform(scrollY, [0, 100], [1, 0.9]);

  const [hasLiked, setHasLiked] = useState(false);
  const [matchData, setMatchData] = useState<any>(null);
  const [showLikeAnim, setShowLikeAnim] = useState(false);
  const [nsfwRevealed, setNsfwRevealed] = useState<Record<number, boolean>>({});
  const [showSuperAnim, setShowSuperAnim] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const { blockUser, reportUser } = useSafeActions();
  const { sendLike } = useLikes();

  const triggerHaptic = (intensity = 10) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(intensity);
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'users', id));
        if (docSnap.exists()) {
          setProfile({ id: docSnap.id, ...docSnap.data() } as User);
          
          // Registrar visita si no es mi propio perfil
          if (currentUser && id !== currentUser.uid) {
            // Actualizar mi estado de "viendo ahora"
            await updateDoc(doc(db, 'users', currentUser.uid), {
              viewingProfileId: id
            });

            const visitId = `${currentUser.uid}_${id}`;
            await import('firebase/firestore').then(({ setDoc, doc, serverTimestamp }) => {
              setDoc(doc(db, 'visits', visitId), {
                visitorId: currentUser.uid,
                visitedId: id,
                visitorNick: currentProfile?.nick || 'Usuario',
                visitorFoto: currentProfile?.fotoUrl || '',
                timestamp: serverTimestamp()
              }, { merge: true });
            });

            const likeDoc = await getDoc(doc(db, 'likes', `${currentUser.uid}_${id}`));
            if (likeDoc.exists()) setHasLiked(true);
          }
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();

    return () => {
      if (currentUser) {
        updateDoc(doc(db, 'users', currentUser.uid), {
          viewingProfileId: null
        }).catch(console.error);
      }
    };
  }, [id, currentUser?.uid, currentProfile?.nick, currentProfile?.fotoUrl]);

  const handleScroll = () => {
    if (carouselRef.current) {
      const index = Math.round(carouselRef.current.scrollLeft / carouselRef.current.offsetWidth);
      if (index !== activePhoto) {
        setActivePhoto(index);
        triggerHaptic(5);
      }
    }
  };

  const handleLike = async (isSuper = false) => {
    if (!currentUser) return router.push('/login');
    if (hasLiked && !isSuper) return;

    // Animación inmediata y Haptic
    if (isSuper) {
      setShowSuperAnim(true);
      triggerHaptic(40);
      setTimeout(() => setShowSuperAnim(false), 2000);
    } else {
      setShowLikeAnim(true);
      triggerHaptic(30);
      setTimeout(() => setShowLikeAnim(false), 1500);
    }

    const result = await sendLike(id, isSuper);
    if (result.isMatch) {
      setMatchData(result.matchData);
      triggerHaptic(50);
      // Pequeño delay para que se vea la animación de like antes del overlay de match
      setTimeout(() => {
        setMatchData(result.matchData);
      }, 500);
    } else if (!result.error) {
      setHasLiked(true);
    }
  };

  if (loading) return (
    <div className="fixed inset-0 z-[100] bg-slate-500 backdrop-blur-md flex items-center justify-center">
      <ProfileSkeleton />
    </div>
  );

  if (!profile) return null;

  const isOwnProfile = currentUser?.uid === id;
  const isMatch = !!matchData || !!(profile?.matches && profile.matches.includes(currentUser?.uid || '')); // Simplificado para el demo
  const hasAccessToPrivate = isOwnProfile || isMatch;

  const publicPhotos = [profile.fotoUrl, ...(profile.extraPhotos || [])].filter(Boolean);
  const privatePhotos = (profile.privatePhotos || []).filter(Boolean);
  
  // Si no tiene acceso, mostramos las privadas pero marcadas
  const allPhotos = [...publicPhotos, ...privatePhotos];
  
  const distance = currentProfile?.lat && currentProfile?.lng && profile?.lat && profile?.lng 
    ? calculateDistance(currentProfile.lat, currentProfile.lng, profile.lat, profile.lng)
    : '0.5';

  const intereses = profile.intereses || ['Gimnasio', 'Cine', 'Viajes', 'Música', 'Gaming'];

  const handleChat = async () => {
    if (!currentUser) return router.push('/login');
    triggerHaptic(15);
    const chatId = await getOrCreateChat(currentUser.uid, id);
    router.push(cityPath(`/chat/detail?id=${chatId}`));
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-slate-300 backdrop-blur-xl flex flex-col items-center overflow-hidden"
    >
      <AnimatePresence>
        {matchData && <MatchOverlay matchData={matchData} onClose={() => setMatchData(null)} />}
      </AnimatePresence>

      <motion.div 
        drag="y"
        dragConstraints={{ top: 0 }}
        dragElastic={0.2}
        onDragEnd={(e, info) => {
          if (info.offset.y > 150) onClose();
        }}
        className="w-full max-w-md h-full bg-white relative shadow-2xl overflow-y-auto no-scrollbar"
        ref={containerRef}
      >
        {/* Parallax Header */}
        <motion.div 
          style={{ y: headerY, opacity: headerOpacity }}
          className="absolute top-0 left-0 right-0 h-[65vh] z-0 pointer-events-none"
        >
          <div 
            ref={carouselRef}
            onScroll={handleScroll}
            className="flex h-full overflow-x-auto snap-x snap-mandatory no-scrollbar pointer-events-auto"
          >
            {allPhotos.map((photo, i) => {
              const isPrivate = i >= publicPhotos.length;
              const locked = isPrivate && !hasAccessToPrivate;

              const isNsfw = !!(profile.nsfwPhotos && profile.nsfwPhotos.includes(i));
              const blurNsfw = isNsfw && currentProfile?.nsfwBlur !== false && !nsfwRevealed[i];

              return (
                <div key={i} className="snap-center min-w-full h-full relative overflow-hidden">
                  <motion.img
                    layoutId={i === 0 ? `marker-photo-${id}` : undefined}
                    src={photo}
                    alt={profile.nick}
                    animate={{
                      scale: activePhoto === i ? 1.05 : 1,
                      filter: (activePhoto === i ? 'blur(0px)' : 'blur(4px)') + (locked ? ' blur(40px) brightness(0.5)' : '') + (blurNsfw ? ' blur(30px)' : '')
                    }}
                    className="w-full h-full object-cover"
                  />
                  {blurNsfw && !locked && (
                    <button
                      onClick={() => setNsfwRevealed(prev => ({ ...prev, [i]: true }))}
                      className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-100"
                    >
                      <span className="material-icons text-white/80 text-3xl">visibility_off</span>
                      <span className="text-[9px] text-white/70 font-black uppercase tracking-widest mt-2">{t('overlay.nsfw_reveal')}</span>
                    </button>
                  )}
                  {locked && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-100">
                      <motion.div 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="w-20 h-20 rounded-full bg-slate-100 backdrop-blur-xl border border-slate-200 flex items-center justify-center shadow-2xl"
                      >
                        <span className="material-icons text-4xl text-yellow-500">lock</span>
                      </motion.div>
                      <p className="text-[10px] font-black text-white uppercase tracking-[0.3em] bg-slate-200 px-4 py-2 rounded-full backdrop-blur-md border border-slate-200">{t('overlay.private_album')}</p>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/10 to-transparent"></div>
                </div>
              );
            })}
          </div>
          <div className="absolute top-4 left-4 right-4 flex gap-1 z-30">
            {allPhotos.map((_, i) => (
              <div key={i} className="flex-1 h-0.5 bg-slate-100 rounded-full overflow-hidden">
                <motion.div animate={{ width: activePhoto === i ? '100%' : activePhoto > i ? '100%' : '0%' }} className="h-full bg-white" />
              </div>
            ))}
          </div>

          {/* Feedback Visual Inmediato (Like/Superlike) */}
          <AnimatePresence>
            {showLikeAnim && (
              <motion.div 
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 1.5, 1.2], opacity: [0, 1, 0] }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none"
              >
                <div className="relative">
                  <span className="material-icons text-[120px] text-amber-500 shadow-2xl drop-shadow-[0_0_30px_rgba(245,158,11,0.8)]">favorite</span>
                  {[...Array(12)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ x: 0, y: 0, opacity: 1 }}
                      animate={{ 
                        x: Math.cos(i * 30 * Math.PI / 180) * 150,
                        y: Math.sin(i * 30 * Math.PI / 180) * 150,
                        opacity: 0,
                        scale: 0.5
                      }}
                      className="absolute top-1/2 left-1/2 w-4 h-4 bg-amber-400 rounded-full"
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {showSuperAnim && (
              <motion.div 
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 2, 1.5], opacity: [0, 1, 0], rotate: [0, 10, -10, 0] }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none bg-yellow-500/10"
              >
                <div className="relative">
                  <span className="material-icons text-[150px] text-yellow-500 drop-shadow-[0_0_50px_rgba(234,179,8,1)]">star</span>
                  {[...Array(20)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
                      animate={{ 
                        x: Math.cos(i * 18 * Math.PI / 180) * 250,
                        y: Math.sin(i * 18 * Math.PI / 180) * 250,
                        opacity: 0,
                        scale: [1, 2, 0.5],
                        rotate: 360
                      }}
                      className="absolute top-1/2 left-1/2 w-6 h-6 text-yellow-300"
                    >
                      <span className="material-icons text-xl">star</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Content Area */}
        <motion.div 
          style={{ opacity: contentFade }}
          className="relative z-10 pt-[55vh] pointer-events-none"
        >
          <div className="bg-slate-500 backdrop-blur-2xl border-t border-slate-200 rounded-t-[3rem] p-8 shadow-[0_-20px_40px_rgba(0,0,0,0.5)] pointer-events-auto">
            <div className="w-12 h-1 bg-slate-100 rounded-full mx-auto -mt-4 mb-8" />
            
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-4xl font-black tracking-tight">{profile.nick}, {profile.edad} {profile.mood}</h1>
                  {profile.online ? (
                    <div className="px-2 py-0.5 rounded-full bg-green-500/20 border border-green-500/30">
                      <p className="text-[8px] font-black text-green-400 uppercase tracking-widest">Online</p>
                    </div>
                  ) : profile.lastSeen && (
                    <div className="px-2 py-0.5 rounded-full bg-slate-500/10 border border-slate-200">
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{t('overlay.active_at', { time: formatLastSeen(profile.lastSeen) })}</p>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="material-icons text-xs text-slate-500">near_me</span>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('overlay.distance', { distance })}</p>
                </div>
              </div>
              {profile.premium && <span className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black text-[9px] font-black px-3 py-1 rounded-full uppercase">VIP</span>}
            </div>

            <div className="flex flex-wrap gap-2 mb-8">
              <div className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[10px] font-bold text-slate-300 uppercase tracking-wider">{profile.rol === 'party_only' ? t('overlay.party_only') : profile.rol}</div>
              <div className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/10 text-[10px] font-bold text-amber-400 uppercase tracking-wider">{profile.intencion}</div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-10">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col items-center">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{t('overlay.height')}</span>
                <span className="text-2xl font-black">{profile.altura || '--'} <small className="text-[10px] text-slate-500">cm</small></span>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col items-center">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{t('overlay.weight')}</span>
                <span className="text-2xl font-black">{profile.peso || '--'} <small className="text-[10px] text-slate-500">kg</small></span>
              </div>
            </div>

            <div className="space-y-8 pb-32">
              <div className="space-y-4">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{t('overlay.interests')}</p>
                <div className="flex flex-wrap gap-2">
                  {profile.intereses && profile.intereses.map((interes: string, idx: number) => (
                    <span key={idx} className="px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-sm font-medium text-slate-300">
                      {interes}
                    </span>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{t('overlay.about_me')}</p>
                <p className="text-slate-300 leading-relaxed text-lg font-medium bg-slate-50 p-6 rounded-3xl border border-slate-200">
                  {profile.bio || t('overlay.no_bio')}
                </p>
              </div>

              {privatePhotos.length > 0 && !hasAccessToPrivate && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  className="p-8 rounded-[2.5rem] bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-200 shadow-2xl relative overflow-hidden group"
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 to-amber-500" />
                  <div className="flex items-center gap-6 mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20 group-hover:scale-110 transition-transform">
                      <span className="material-icons text-3xl text-yellow-500">lock</span>
                    </div>
                    <div>
                      <h4 className="text-xl font-black tracking-tight">{t('overlay.private_album')}</h4>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('overlay.hidden_photos', { count: privatePhotos.length })}</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed mb-8">
                    {t('overlay.private_desc')}
                  </p>
                  <button 
                    onClick={() => {
                      triggerHaptic(15);
                      alert(t('overlay.access_requested_alert'));
                    }}
                    className="w-full py-5 rounded-2xl bg-white text-black font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-slate-200 transition-all"
                  >
                    {t('overlay.request_access')}
                  </button>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Floating Actions */}
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[90%] max-w-sm z-[110]">
          <div className="bg-slate-900/90 backdrop-blur-3xl border border-slate-200 rounded-[2.5rem] p-3 flex gap-3 shadow-[0_25px_60px_rgba(0,0,0,0.8)]">
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => handleLike(true)} className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-yellow-500"><span className="material-icons">star</span></motion.button>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleLike(false)} className={`flex-1 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all ${hasLiked ? 'bg-slate-800 text-slate-500' : 'bg-gradient-to-r from-slate-800 via-blue-800 to-blue-900 text-white shadow-xl'}`}>{hasLiked ? t('overlay.sent') : t('overlay.like')}</motion.button>
            <motion.button whileTap={{ scale: 0.9 }} onClick={handleChat} className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-white"><span className="material-icons">chat_bubble</span></motion.button>
          </div>
        </div>

        {/* Top Close Button & More Options */}
        <div className="fixed top-8 left-0 right-0 px-6 flex justify-between items-center z-[120] pointer-events-none">
          <button 
            onClick={onClose} 
            className="w-10 h-10 rounded-xl bg-slate-200 backdrop-blur-2xl border border-slate-200 flex items-center justify-center pointer-events-auto"
          >
            <span className="material-icons text-white">expand_more</span>
          </button>

          <div className="relative pointer-events-auto">
            <button 
              onClick={() => { triggerHaptic(5); setShowOptions(!showOptions); }}
              className="w-10 h-10 rounded-xl bg-slate-200 backdrop-blur-2xl border border-slate-200 flex items-center justify-center"
            >
              <span className="material-icons text-white">more_horiz</span>
            </button>

            <AnimatePresence>
              {showOptions && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, x: 20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9, x: 20 }}
                  className="absolute top-12 right-0 w-48 bg-slate-900/95 backdrop-blur-3xl border border-slate-200 rounded-3xl p-2 shadow-2xl overflow-hidden"
                >
                  <button 
                    onClick={async () => {
                      if (confirm(t('overlay.report_confirm'))) {
                        await reportUser(id, 'Comportamiento inapropiado');
                        alert(t('overlay.report_sent'));
                        setShowOptions(false);
                      }
                    }}
                    className="w-full p-4 flex items-center gap-3 text-sm font-bold text-orange-400 hover:bg-orange-500/10 rounded-2xl transition-all text-left"
                  >
                    <span className="material-icons text-lg">flag</span> {t('overlay.report')}
                  </button>
                  <div className="h-px bg-slate-50 mx-2" />
                  <button 
                    onClick={async () => {
                      if (confirm(t('overlay.block_confirm'))) {
                        await blockUser(id);
                        onClose();
                        router.push(cityPath());
                      }
                    }}
                    className="w-full p-4 flex items-center gap-3 text-sm font-bold text-red-500 hover:bg-red-500/10 rounded-2xl transition-all text-left"
                  >
                    <span className="material-icons text-lg">block</span> {t('overlay.block')}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
