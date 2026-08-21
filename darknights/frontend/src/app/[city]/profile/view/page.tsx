'use client';

import { useSearchParams } from 'next/navigation';
import { useCityRouter } from '@/hooks/useCityRouter';
import { useState, useEffect, Suspense, useRef } from 'react';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { motion, AnimatePresence, useScroll, useTransform, useSpring } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { getOrCreateChat } from '@/hooks/useChat';
import { useLikes } from '@/hooks/useLikes';
import MatchOverlay from '@/components/MatchOverlay';
import { ProfileSkeleton } from '@/components/Skeleton';
import { calculateDistance } from '@/lib/geo';
import { useTranslation } from 'react-i18next';

function PublicProfileContent() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const pingVenueId = searchParams.get('pingVenueId');
  const { cityPath, router } = useCityRouter();
  const { user: currentUser, profile: currentProfile } = useAuth();
  
  const [profile, setProfile] = useState<any>(null);
  const [pingVenue, setPingVenue] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activePhoto, setActivePhoto] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  
  // Parallax Logic
  const { scrollY } = useScroll();
  const headerY = useTransform(scrollY, [0, 500], [0, 150]);
  const headerOpacity = useTransform(scrollY, [0, 400], [1, 0.4]);
  const headerScale = useTransform(scrollY, [-100, 0], [1.2, 1]); // Zoom out on pull-to-refresh
  
  const { sendLike } = useLikes();
  const [matchData, setMatchData] = useState<any>(null);
  const [hasLiked, setHasLiked] = useState(false);

  const triggerHaptic = (intensity: number | number[] = 10) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(intensity);
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      if (!id) return;
      
      try {
        const userDoc = await getDoc(doc(db, 'users', id));
        if (userDoc.exists()) {
          const profileData = userDoc.data();
          setProfile(profileData);

          if (currentUser && id !== currentUser.uid) {
            if (!(currentProfile?.premium && currentProfile?.incognito)) {
              await addDoc(collection(db, 'visits'), {
                visitorId: currentUser.uid,
                visitedId: id,
                visitorNick: currentProfile?.nick || t('profileView.anonymous'),
                visitorFoto: currentProfile?.fotoUrl || '',
                timestamp: serverTimestamp()
              });
            }
            const likeDoc = await getDoc(doc(db, 'likes', `${currentUser.uid}_${id}`));
            if (likeDoc.exists()) setHasLiked(true);
          }
          if (pingVenueId) {
            const venueDoc = await getDoc(doc(db, 'venues', pingVenueId));
            if (venueDoc.exists()) {
              setPingVenue({ id: pingVenueId, ...venueDoc.data() });
            }
          }
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [id, currentUser, currentProfile]);

  const handleScroll = () => {
    if (carouselRef.current) {
      const index = Math.round(carouselRef.current.scrollLeft / carouselRef.current.offsetWidth);
      if (index !== activePhoto) {
        setActivePhoto(index);
        triggerHaptic(5);
      }
    }
  };

  const handleChat = async () => {
    if (!currentUser) return router.push('/login');
    triggerHaptic(10);
    const chatId = await getOrCreateChat(currentUser.uid, id!);
    router.push(cityPath(`/chat/detail?id=${chatId}`));
  };

  const handleLike = async (isSuper = false) => {
    if (!currentUser || !id) return router.push('/login');
    if (hasLiked && !isSuper) return;

    triggerHaptic(isSuper ? [30, 50, 30] : 20);
    const result = await sendLike(id, isSuper);

    if (result.isMatch) {
      setMatchData(result.matchData);
    } else if (!result.error) {
      setHasLiked(true);
    }
  };

  if (loading) return <ProfileSkeleton />;

  if (!profile) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
      <h2 className="text-2xl font-black mb-4 text-white">{t('profileView.profileNotFound')}</h2>
      <button onClick={() => router.back()} className="text-amber-500 font-bold uppercase tracking-widest">{t('profileView.back')}</button>
    </div>
  );

  const allPhotos = [profile.fotoUrl, ...(profile.extraPhotos || [])].filter(Boolean);
  const distance = currentProfile?.lat && currentProfile?.lng && profile?.lat && profile?.lng 
    ? calculateDistance(currentProfile.lat, currentProfile.lng, profile.lat, profile.lng)
    : null;

  const intereses = profile.intereses || ['Gimnasio', 'Cine', 'Viajes', 'Música', 'Gaming'];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-white text-slate-900 pb-40"
    >
      <AnimatePresence>
        {matchData && <MatchOverlay matchData={matchData} onClose={() => setMatchData(null)} />}
      </AnimatePresence>

      {/* Parallax Header */}
      {pingVenue && (
        <div className="fixed top-0 left-0 right-0 z-50 p-4 pt-8 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
          <motion.div 
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-slate-900/90 backdrop-blur-md border border-orange-500/50 rounded-2xl p-4 shadow-2xl pointer-events-auto"
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">🔥</span>
              <div>
                <p className="text-white text-xs font-bold">{profile.nick} {t('profileView.invitedToDate')}</p>
                <p className="text-orange-400 text-[10px] font-black uppercase tracking-widest mt-0.5">
                  {t('profileView.imAt')} {pingVenue.name}
                </p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${pingVenue.location?.latitude},${pingVenue.location?.longitude}`, '_blank')}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-white font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-slate-100 transition-all"
              >
                <span className="material-icons text-sm">map</span> {t('profileView.howToGetThere')}
              </button>
              <button 
                onClick={() => handleLike()}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.5)] hover:scale-105 transition-all"
              >
                <span className="material-icons text-sm">chat</span> {t('profileView.openChat')}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <motion.div 
        style={{ y: headerY, opacity: headerOpacity, scale: headerScale }}
        className="fixed top-0 left-0 right-0 h-[65vh] w-full z-0 pointer-events-none"
      >
        <div 
          ref={carouselRef}
          onScroll={handleScroll}
          className="flex h-full overflow-x-auto snap-x snap-mandatory no-scrollbar pointer-events-auto"
        >
          {allPhotos.map((photo: string, i: number) => (
            <div key={i} className="snap-center min-w-full h-full relative overflow-hidden">
              <motion.img 
                layoutId={i === 0 ? `marker-photo-${id}` : undefined}
                src={photo} 
                alt={`${profile.nick} - ${i}`} 
                initial={false}
                animate={{ 
                  scale: activePhoto === i ? 1.05 : 1,
                  filter: activePhoto === i ? 'blur(0px)' : 'blur(4px)'
                }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="w-full h-full object-cover" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent"></div>
            </div>
          ))}
        </div>

        {/* Story Indicators */}
        <div className="absolute top-4 left-4 right-4 flex gap-1 z-30">
          {allPhotos.map((_, i) => (
            <div key={i} className="flex-1 h-0.5 bg-slate-100 rounded-full overflow-hidden">
              <motion.div 
                initial={false}
                animate={{ width: activePhoto === i ? '100%' : activePhoto > i ? '100%' : '0%' }}
                className="h-full bg-white"
              />
            </div>
          ))}
        </div>

        {/* Top Actions */}
        <div className="absolute top-8 left-6 right-6 flex justify-between items-center z-40 pointer-events-auto">
          <motion.button 
            whileTap={{ scale: 0.9 }} 
            onClick={() => router.back()} 
            className="w-10 h-10 rounded-xl bg-slate-200 backdrop-blur-2xl border border-slate-200 flex items-center justify-center"
          >
            <span className="material-icons text-xl">expand_more</span>
          </motion.button>
          <motion.button 
            whileTap={{ scale: 0.9 }} 
            className="w-10 h-10 rounded-xl bg-slate-200 backdrop-blur-2xl border border-slate-200 flex items-center justify-center"
          >
            <span className="material-icons text-xl">more_horiz</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Content Area (Scrollable) */}
      <div className="relative z-10 pt-[55vh]">
        <div className="bg-slate-500 backdrop-blur-xl border-t border-slate-200 rounded-t-[3rem] p-8 shadow-[0_-20px_40px_rgba(0,0,0,0.5)]">
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-4xl font-black tracking-tight">{profile.nick}, {profile.edad}</h1>
                {profile.verified && (
                  <span className="material-icons text-blue-500 text-3xl">verified</span>
                )}
                {profile.online && (
                  <div className="px-2 py-0.5 rounded-full bg-green-500/20 border border-green-500/30">
                    <p className="text-[8px] font-black text-green-400 uppercase tracking-widest">{t('profileView.online')}</p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="material-icons text-xs text-slate-500">near_me</span>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  A {distance || '0.5'} {t('profileView.kmFromYou')}
                </p>
              </div>
            </div>
            {profile.premium && <span className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black text-[9px] font-black px-3 py-1 rounded-full uppercase">VIP</span>}
          </div>

          <div className="flex flex-wrap gap-2 mb-8">
            <div className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[10px] font-bold text-slate-300 uppercase tracking-wider">{profile.rol === 'party_only' ? t('profileView.onlyParty') : profile.rol}</div>
            <div className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/10 text-[10px] font-bold text-amber-400 uppercase tracking-wider">{profile.intencion}</div>
            {profile.complexion && <div className="px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/10 text-[10px] font-bold text-blue-400 uppercase tracking-wider">{profile.complexion}</div>}
          </div>

          <div className="grid grid-cols-2 gap-4 mb-10">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col items-center">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{t('profileView.height')}</span>
              <span className="text-2xl font-black">{profile.altura || '--'} <small className="text-[10px] text-slate-500">cm</small></span>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col items-center">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{t('profileView.weight')}</span>
              <span className="text-2xl font-black">{profile.peso || '--'} <small className="text-[10px] text-slate-500">kg</small></span>
            </div>
          </div>

          <div className="space-y-8">
            <div className="space-y-4">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{t('profileView.interests')}</p>
              <div className="flex flex-wrap gap-2">
                {intereses.map((interes: string, idx: number) => (
                  <motion.span 
                    key={idx}
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.05 }}
                    className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[10px] font-bold text-slate-400 hover:bg-slate-100 transition-colors cursor-default"
                  >
                    #{interes}
                  </motion.span>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{t('profileView.aboutMe')}</p>
              <p className="text-slate-300 leading-relaxed text-lg font-medium bg-slate-50 p-6 rounded-3xl border border-slate-200">
                {profile.bio || t('profileView.noDescription')}
              </p>
            </div>

            {/* Álbum Privado */}
            {(profile.privatePhotos && profile.privatePhotos.length > 0) && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <span className="material-icons text-xs">lock</span> {t('profileView.privateAlbum')}
                  </p>
                  {!profile.permittedUsers?.includes(currentUser?.uid) && (
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{profile.privatePhotos.length} {t('profileView.photos')}</span>
                  )}
                </div>
                
                {profile.permittedUsers?.includes(currentUser?.uid) ? (
                  <div className="grid grid-cols-3 gap-2">
                    {profile.privatePhotos.map((photo: string, idx: number) => (
                      <motion.div 
                        key={idx}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="aspect-square rounded-2xl overflow-hidden border border-slate-200"
                      >
                        <img src={photo} alt="Privada" className="w-full h-full object-cover" />
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <button 
                    onClick={handleChat}
                    className="w-full p-8 rounded-[2rem] bg-slate-50 border border-dashed border-yellow-500/20 flex flex-col items-center justify-center gap-3 group hover:bg-yellow-500/5 transition-all"
                  >
                    <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500 group-hover:scale-110 transition-transform">
                      <span className="material-icons">lock_person</span>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-white">{t('profileView.privateContent')}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">{t('profileView.requestAccess')}</p>
                    </div>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fixed Actions Dock */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[90%] max-w-sm z-30">
        <div className="bg-slate-900/90 backdrop-blur-3xl border border-slate-200 rounded-[2.5rem] p-3 flex gap-3 shadow-[0_25px_60px_rgba(0,0,0,0.8)]">
          <motion.button 
            whileTap={{ scale: 0.9 }} 
            onClick={() => handleLike(true)} 
            className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-yellow-500 hover:bg-yellow-500/10 transition-colors"
          >
            <span className="material-icons">star</span>
          </motion.button>
          <motion.button 
            whileTap={{ scale: 0.95 }} 
            onClick={() => handleLike(false)} 
            className={`flex-1 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl ${hasLiked ? 'bg-slate-800 text-slate-500' : 'bg-gradient-to-r from-amber-600 via-blue-600 to-blue-600 text-white shadow-amber-500/20'}`}
          >
            {hasLiked ? t('profileView.sent') : t('profileView.like')}
          </motion.button>
          <motion.button 
            whileTap={{ scale: 0.9 }} 
            onClick={handleChat} 
            className="relative w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-white overflow-hidden group"
          >
            <motion.div 
              animate={{ scale: [1, 1.2, 1], opacity: [0, 0.2, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 bg-white"
            />
            <span className="material-icons group-hover:scale-110 transition-transform">chat_bubble</span>
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

export default function PublicProfilePage() {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <PublicProfileContent />
    </Suspense>
  );
}
