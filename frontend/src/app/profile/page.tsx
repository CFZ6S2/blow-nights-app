'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, where, onSnapshot, doc, setDoc, getDoc } from 'firebase/firestore';
import { db, analytics } from '@/lib/firebase';
import { logEvent } from 'firebase/analytics';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

export default function MyProfilePage() {
  const { t } = useTranslation();
  const { user, profile, loading, logout, deleteAccount, requestVerification } = useAuth();
  const { toggleNotifications } = useNotifications();
  const router = useRouter();
  
  const [stats, setStats] = useState({ visits: 0, likes: 0, matches: 0, invitesCount: 0 });
  const [isDeleting, setIsDeleting] = useState(false);
  const [isOptimisticAvailable, setIsOptimisticAvailable] = useState<boolean | null>(null);
  const [geoError, setGeoError] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [platformSettings, setPlatformSettings] = useState<{ enableDarkNightsBridge?: boolean } | null>(null);
  const isAvailable = isOptimisticAvailable !== null ? isOptimisticAvailable : !!profile?.online;

  useEffect(() => {
    async function fetchSettings() {
      try {
        const snap = await getDoc(doc(db, 'settings', 'platform'));
        if (snap.exists()) {
          setPlatformSettings(snap.data() as any);
        }
      } catch (e) {
        console.error("Error fetching platform settings", e);
      }
    }
    fetchSettings();
  }, []);

  const triggerHaptic = (intensity = 10) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(intensity);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await deleteAccount?.();
      router.push('/login');
    } catch (err) {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      // Suscribirse a estadísticas de visitas
      const vQ = query(collection(db, 'visits'), where('visitedId', '==', user.uid));
      const unsubscribeVisits = onSnapshot(vQ, (snap) => {
        setStats(prev => ({ ...prev, visits: snap.size || 0 }));
      });

      // Suscribirse a estadísticas de likes recibidos
      const lQ = query(collection(db, 'likes'), where('toId', '==', user.uid));
      const unsubscribeLikes = onSnapshot(lQ, (snap) => {
        setStats(prev => ({ ...prev, likes: snap.size }));
      });

      // Suscribirse a estadísticas de matches
      const mQ = query(collection(db, 'matches'), where('users', 'array-contains', user.uid));
      const unsubscribeMatches = onSnapshot(mQ, (snap) => {
        setStats(prev => ({ ...prev, matches: snap.size || 0 }));
      });

      return () => {
        unsubscribeVisits();
        unsubscribeLikes();
        unsubscribeMatches();
      };
    }
  }, [user, loading, router]);

  const toggleAvailability = async () => {
    if (!user) return;
    triggerHaptic(20);
    const nextState = !isAvailable;
    setIsOptimisticAvailable(nextState);

    try {
      if (nextState) {
        if (typeof navigator !== 'undefined' && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(async (pos) => {
            const { latitude, longitude } = pos.coords;
            setGeoError(false);
            await setDoc(doc(db, 'users', user.uid), {
              online: true,
              lat: latitude,
              lng: longitude
            }, { merge: true });
            setTimeout(() => setIsOptimisticAvailable(null), 1000);
          }, (err) => {
            setGeoError(true);
            setIsOptimisticAvailable(null);
          });
        } else {
          setGeoError(true);
          setIsOptimisticAvailable(null);
        }
      } else {
        await setDoc(doc(db, 'users', user.uid), {
          online: false
        }, { merge: true });
        setTimeout(() => setIsOptimisticAvailable(null), 1000);
      }
    } catch (error) {
      console.error("Error toggling availability", error);
      setIsOptimisticAvailable(null);
    }
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-10 h-10 border-t-2 border-fuchsia-500 rounded-full" />
      </div>
    );
  }

  const allPhotos = [profile.fotoUrl, ...(profile.extraPhotos || [])].filter(Boolean);

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-32">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-fuchsia-600/10 blur-[120px] rounded-full" />
        <div className="absolute top-[20%] -right-[10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />
      </div>

      <main className="relative z-10 p-6 md:p-12 max-w-2xl mx-auto space-y-8">
        {/* Header Premium */}
        <header className="flex flex-col items-center text-center space-y-4 pt-8">
          <div className="relative group">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="w-32 h-32 rounded-[2.5rem] overflow-hidden border-2 border-fuchsia-500/30 shadow-[0_20px_50px_rgba(217,70,239,0.2)] p-1 bg-gradient-to-br from-fuchsia-500 to-indigo-600"
            >
              <img 
                src={profile.fotoUrl || '/globe.svg'} 
                alt={profile.nick} 
                className="w-full h-full object-cover rounded-[2.2rem]"
              />
            </motion.div>
            {profile.premium && (
              <div className="absolute -top-2 -right-2 bg-gradient-to-br from-yellow-400 to-yellow-600 p-2 rounded-xl shadow-xl">
                <span className="material-icons text-black text-sm">stars</span>
              </div>
            )}
          </div>
          
          <div>
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-3xl font-black tracking-tight">{profile.nick}, {profile.edad}</h1>
              {profile.verified && (
                <span className="material-icons text-blue-500 text-xl" title={t('profile.verified_profile')}>verified</span>
              )}
              {profile.premium && (
                <motion.div 
                  initial={{ rotate: -10, scale: 0.5, opacity: 0 }}
                  animate={{ rotate: 0, scale: 1, opacity: 1 }}
                  className="bg-gradient-to-r from-amber-400 to-yellow-600 px-2 py-0.5 rounded-md shadow-[0_0_15px_rgba(251,191,36,0.4)]"
                >
                  <span className="text-[8px] font-black text-black uppercase tracking-tighter">{t('profile.founder')}</span>
                </motion.div>
              )}
            </div>
            <p className="text-slate-500 text-xs font-black uppercase tracking-[0.2em] mt-1">{profile.rol === 'party_only' ? 'Solo Fiesta' : profile.rol} • {profile.intencion}</p>
          </div>
        </header>

        {/* Puente de Tráfico Cruzado: Dark Nights */}
        {platformSettings?.enableDarkNightsBridge && (
          <div className="bg-slate-900 border border-slate-700/50 p-6 rounded-[2rem] shadow-xl text-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-tr from-slate-900 to-black pointer-events-none" />
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-[50px] rounded-full pointer-events-none" />
            
            <div className="relative z-10 flex flex-col items-center">
              <span className="text-3xl mb-3">🌙</span>
              <h3 className="text-lg font-black text-white uppercase tracking-wider mb-2">¿Buscas el Circuito General?</h3>
              <p className="text-xs text-slate-400 font-medium mb-6">Descubre quién sale hoy en Fabrik, Shôko y el resto del ocio comercial.</p>
              
              <button 
                onClick={async () => {
                  if (confirm('¡Próximamente! Activarás tu cuenta en Dark Nights con tu mismo perfil y compras.')) {
                     const { updateDoc, doc } = await import('firebase/firestore');
                     const { db } = await import('@/lib/firebase');
                     await updateDoc(doc(db, 'users', user!.uid), {
                       activePlatforms: ['blownights', 'darknights']
                     });
                     alert("¡Activado!");
                  }
                }}
                className="w-full bg-white text-black font-black uppercase tracking-widest py-4 rounded-xl hover:bg-slate-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] flex items-center justify-center gap-2"
              >
                <span>⚡ Pásate a Dark Nights</span>
              </button>
            </div>
          </div>
        )}

        {/* Stats Panel */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: t('profile.visits'), value: stats.visits, icon: 'visibility', color: 'text-blue-400' },
            { label: t('profile.likes'), value: stats.likes, icon: 'favorite', color: 'text-fuchsia-400' },
            { label: t('profile.matches'), value: stats.matches, icon: 'bolt', color: 'text-yellow-400' }
          ].map((stat, i) => (
            <motion.div 
              key={i}
              whileHover={{ y: -5 }}
              className="bg-white/5 backdrop-blur-xl border border-white/10 p-4 rounded-3xl flex flex-col items-center space-y-1"
            >
              <span className={`material-icons text-xl ${stat.color}`}>{stat.icon}</span>
              <span className="text-xl font-black">{stat.value}</span>
              <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">{stat.label}</span>
            </motion.div>
          ))}
        </div>

        {/* Visibility Toggle */}
        <section className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-[2.5rem] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest">{t('profile.visibility_status')}</h3>
              <p className="text-[10px] text-slate-500 mt-1">{t('profile.visibility_desc')}</p>
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={toggleAvailability}
              className={`px-6 py-3 rounded-2xl font-black text-[10px] tracking-widest transition-all duration-500 flex items-center gap-3 border ${
                isAvailable 
                ? 'bg-green-500 border-green-400 text-white shadow-[0_10px_20px_rgba(34,197,94,0.3)]' 
                : 'bg-slate-800 border-white/5 text-slate-400'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-white animate-pulse shadow-[0_0_10px_white]' : 'bg-slate-600'}`} />
              {isAvailable ? t('profile.visible_now') : t('profile.make_visible')}
            </motion.button>
          </div>
          
          <AnimatePresence>
            {geoError && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="bg-red-500/10 border border-red-500/20 p-6 rounded-[2rem] space-y-3 text-red-400 overflow-hidden"
              >
                <div className="flex items-center gap-3">
                  <span className="material-icons text-lg">location_off</span>
                  <p className="text-[10px] font-black uppercase tracking-widest">{t('profile.gps_blocked')}</p>
                </div>
                <p className="text-[9px] leading-relaxed text-slate-400 font-medium">
                  Has ignorado o bloqueado la solicitud de ubicación varias veces. Para aparecer en el mapa, sigue estos pasos:
                </p>
                <div className="bg-black/20 p-4 rounded-xl space-y-2">
                  <p className="text-[8px] text-slate-300 font-bold flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-slate-800 flex items-center justify-center text-[6px]">1</span>
                    Pulsa el icono <span className="material-icons text-[10px] mx-1">tune</span> o <span className="material-icons text-[10px] mx-1">lock</span> junto a la URL.
                  </p>
                  <p className="text-[8px] text-slate-300 font-bold flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-slate-800 flex items-center justify-center text-[6px]">2</span>
                    Selecciona "Restablecer permiso" o activa "Ubicación".
                  </p>
                  <p className="text-[8px] text-slate-300 font-bold flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-slate-800 flex items-center justify-center text-[6px]">3</span>
                    Refresca la página y pulsa de nuevo en "VOLVERME VISIBLE".
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Ghost Mode Toggle */}
        <section className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-[2.5rem] relative overflow-hidden group">
          <div className="flex items-center justify-between relative z-10">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black uppercase tracking-widest">{t('profile.ghost_mode')}</h3>
                {!profile?.premium && <span className="text-[8px] bg-yellow-500 text-black px-2 py-0.5 rounded-full font-black">VIP</span>}
              </div>
              <p className="text-[10px] text-slate-500 mt-1">{t('profile.ghost_desc')}</p>
            </div>
            <button
              onClick={async () => {
                if (!profile?.premium) return router.push('/premium');
                triggerHaptic(20);
                if (!user) return;
                await setDoc(doc(db, 'users', user.uid), {
                  ghostMode: !profile?.ghostMode
                }, { merge: true });
              }}
              className={`w-14 h-8 rounded-full transition-all relative ${
                profile?.ghostMode ? 'bg-indigo-600' : 'bg-slate-800'
              }`}
            >
              <motion.div 
                animate={{ x: profile?.ghostMode ? 24 : 4 }}
                className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-lg"
              />
            </button>
          </div>
          {!profile?.premium && (
            <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] z-20 flex items-center justify-center">
              <Link href="/premium" className="text-[10px] font-black text-yellow-500 uppercase tracking-widest flex items-center gap-2 bg-slate-900 px-6 py-3 rounded-full border border-yellow-500/20 shadow-2xl">
                <span className="material-icons text-sm">lock</span> {t('profile.unlock_ghost')}
              </Link>
            </div>
          )}
        </section>

        {/* Cruising Mode Toggle */}
        <section className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-[2.5rem] relative overflow-hidden group">
          <div className="flex items-center justify-between relative z-10">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black uppercase tracking-widest">{t('profile.cruising_mode')}</h3>
                <span className="bg-red-500/20 text-red-400 text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider">18+</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">{t('profile.cruising_desc')}</p>
            </div>
            <button
              onClick={async () => {
                triggerHaptic(20);
                if (!user) return;
                await setDoc(doc(db, 'users', user.uid), {
                  cruisingMode: !profile?.cruisingMode
                }, { merge: true });
              }}
              className={`w-14 h-8 rounded-full transition-all relative ${
                profile?.cruisingMode ? 'bg-red-600' : 'bg-slate-800'
              }`}
            >
              <motion.div
                animate={{ x: profile?.cruisingMode ? 24 : 4 }}
                className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-lg"
              />
            </button>
          </div>
          {profile?.cruisingMode && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="mt-4 bg-red-500/5 border border-red-500/10 p-3 rounded-2xl overflow-hidden"
            >
              <p className="text-[9px] text-red-400/80 font-bold leading-relaxed">
                <span className="material-icons text-[9px] align-middle mr-1">shield</span>
                Activo: tus check-ins son siempre anónimos (+1), tu ubicación se difumina a 150m y tu foto no aparece en listados de locales.
              </p>
            </motion.div>
          )}
        </section>

        {/* NSFW Filter Toggle */}
        <section className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-[2.5rem] relative overflow-hidden group">
          <div className="flex items-center justify-between relative z-10">
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest">{t('profile.nsfw_filter')}</h3>
              <p className="text-[10px] text-slate-500 mt-1">{t('profile.nsfw_desc')}</p>
            </div>
            <button
              onClick={async () => {
                triggerHaptic(20);
                if (!user) return;
                await setDoc(doc(db, 'users', user.uid), {
                  nsfwBlur: profile?.nsfwBlur === false ? true : false
                }, { merge: true });
              }}
              className={`w-14 h-8 rounded-full transition-all relative ${
                profile?.nsfwBlur !== false ? 'bg-fuchsia-600' : 'bg-slate-800'
              }`}
            >
              <motion.div
                animate={{ x: profile?.nsfwBlur !== false ? 24 : 4 }}
                className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-lg"
              />
            </button>
          </div>
        </section>

        {/* Push Notifications Toggle */}
        <section className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-[2.5rem] relative overflow-hidden group">
          <div className="flex items-center justify-between relative z-10">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black uppercase tracking-widest">{t('profile.push_notifications')}</h3>
                <span className="text-[8px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">FCM</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">{t('profile.push_desc')}</p>
            </div>
            <button
              onClick={async () => {
                triggerHaptic(20);
                toggleNotifications?.();
              }}
              className={`w-14 h-8 rounded-full transition-all relative ${
                profile?.notificationsEnabled ? 'bg-fuchsia-600' : 'bg-slate-800'
              }`}
            >
              <motion.div 
                animate={{ x: profile?.notificationsEnabled ? 24 : 4 }}
                className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-lg"
              />
            </button>
          </div>
        </section>

        {/* PWA Install Button */}
        <button
          onClick={() => {
            window.dispatchEvent(new CustomEvent('show-pwa-prompt'));
          }}
          className="w-full bg-white text-black font-[1000] py-6 rounded-[2.5rem] shadow-2xl flex items-center justify-center gap-4 active:scale-95 transition-all uppercase tracking-[0.2em] text-[10px]"
        >
          <span className="material-icons">install_mobile</span>
          {t('profile.install_app')}
        </button>

        <button
          onClick={async () => {
            if (analytics) {
              try {
                const a = await analytics;
                if (a) logEvent(a, 'share_app_click');
              } catch(e) {}
            }
            const shareUrl = `${window.location.origin}?ref=${user?.uid || ''}`;
            try {
              if (navigator.share) {
                await navigator.share({
                  title: 'BLOW NIGHTS',
                  text: '¡Únete a Blow Nights! Tu circuito nocturno LGTBIQ+ en vivo. 🏳️‍🌈🚀',
                  url: shareUrl
                });
              } else if (navigator.clipboard) {
                await navigator.clipboard.writeText(shareUrl);
                alert('¡Enlace copiado al portapapeles! Envíalo a tus amigos.');
              } else {
                prompt('Copia este enlace para invitar a tus amigos:', shareUrl);
              }
            } catch (err) {
              console.log('Error compartiendo', err);
            }
          }}
          className="w-full bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white font-[1000] py-6 rounded-[2.5rem] shadow-2xl flex items-center justify-center gap-4 active:scale-95 transition-all uppercase tracking-[0.2em] text-[10px]"
        >
          <span className="material-icons">share</span>
          {t('profile.invite_friend')}
        </button>
        <p className="text-[10px] text-center text-slate-500 font-bold uppercase tracking-widest mt-4">
          {(profile?.invitesCount || 0) >= 3 
            ? t('profile.premium_unlocked') 
            : t('profile.invite_more', { count: 3 - (profile?.invitesCount || 0) })}
        </p>

        {/* Photo Grid - Estilo Instagram */}
        <section className="space-y-4">
          <div className="flex justify-between items-end">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">{t('profile.my_photos')}</h3>
            <Link href="/setup-profile" prefetch={false} className="text-[10px] font-black text-fuchsia-500 uppercase tracking-widest">{t('profile.manage')}</Link>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {allPhotos.map((photo, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className="aspect-square rounded-2xl overflow-hidden bg-white/5 border border-white/10"
              >
                <img src={photo} alt={`Foto ${i}`} className="w-full h-full object-cover" />
              </motion.div>
            ))}
            {allPhotos.length < 6 && (
              <Link 
                href="/setup-profile"
                className="aspect-square rounded-2xl bg-white/5 border border-dashed border-white/20 flex flex-col items-center justify-center gap-1 text-slate-500 hover:bg-white/10 transition-all"
              >
                <span className="material-icons text-xl">add_a_photo</span>
                <span className="text-[8px] font-black uppercase tracking-tighter">{t('profile.add_photo')}</span>
              </Link>
            )}
          </div>
        </section>

        {/* Action Menu */}
        <section className="space-y-3">
          {[
            { label: t('profile.edit_profile'), icon: 'edit', href: '/setup-profile', color: 'text-slate-200' },
            { 
              label: profile.verified ? t('profile.account_verified') : profile.verificationStatus === 'pending' ? t('profile.verification_pending') : t('profile.verify_account'), 
              icon: profile.verified ? 'verified' : 'new_releases', 
              href: '#', 
              color: profile.verified ? 'text-blue-500' : profile.verificationStatus === 'pending' ? 'text-amber-500' : 'text-fuchsia-500',
              onClick: async () => {
                if (profile.verified || profile.verificationStatus === 'pending') return;
                const fileInput = document.createElement('input');
                fileInput.type = 'file';
                fileInput.accept = 'image/*';
                fileInput.onchange = async (e: any) => {
                  const file = e.target.files[0];
                  if (file) {
                    triggerHaptic(20);
                    if (confirm("Sube una foto tuya (selfie) para verificar tu identidad. Esta foto solo será vista por los administradores.")) {
                      try {
                        if (requestVerification) {
                          const success = await requestVerification(file);
                          if (success) {
                            alert("¡Solicitud enviada! Revisaremos tu perfil en las próximas 24h.");
                          }
                        }
                      } catch (err) {
                        alert("Error al enviar la solicitud. Inténtalo de nuevo.");
                      }
                    }
                  }
                };
                fileInput.click();
              }
            },
            { label: t('profile.recent_visits'), icon: 'history', href: '/visits', color: 'text-blue-400' },
            { label: t('profile.premium_plan'), icon: 'stars', href: '/premium', color: 'text-yellow-500' },
            { label: t('profile.tos'), icon: 'gavel', href: '/terms', color: 'text-slate-400' },
            { label: t('profile.privacy'), icon: 'admin_panel_settings', href: '/privacy', color: 'text-slate-400' },
            { label: t('profile.venue_panel'), icon: 'storefront', href: '/venue-admin', color: 'text-fuchsia-400' },
            { label: t('profile.scan_tickets'), icon: 'qr_code_scanner', href: '/scanner', color: 'text-fuchsia-400' },
            { label: t('profile.settings'), icon: 'security', href: '#', color: 'text-slate-400' }
          ].map((item, i) => {
            const content = (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-4">
                  <span className={`material-icons ${item.color}`}>{item.icon}</span>
                  <span className="text-sm font-bold tracking-tight">{item.label}</span>
                </div>
                <span className="material-icons text-slate-600 group-hover:translate-x-1 transition-transform">chevron_right</span>
              </div>
            );

            if (item.onClick) {
              return (
                <button 
                  key={i}
                  onClick={item.onClick}
                  className="w-full p-5 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl flex items-center justify-between group hover:bg-white/10 transition-all text-left"
                >
                  {content}
                </button>
              );
            }

            return (
              <Link 
                key={i}
                href={item.href}
                className="w-full p-5 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl flex items-center justify-between group hover:bg-white/10 transition-all"
              >
                {content}
              </Link>
            );
          })}
          
          <button 
            onClick={() => { triggerHaptic(30); logout(); }}
            className="w-full p-5 bg-red-500/10 border border-red-500/20 rounded-3xl flex items-center gap-4 text-red-500 font-bold hover:bg-red-500/20 transition-all mt-4"
          >
            <span className="material-icons">logout</span>
            <span className="text-sm tracking-tight">{t('profile.logout')}</span>
          </button>

          <button 
            onClick={() => { triggerHaptic(50); setShowDeleteModal(true); }}
            disabled={isDeleting}
            className="w-full p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-center gap-3 text-slate-600 text-[10px] font-black uppercase tracking-widest hover:text-red-500 hover:bg-red-500/5 transition-all mt-8"
          >
            <span className="material-icons text-sm">{isDeleting ? 'sync' : 'delete_forever'}</span>
            {isDeleting ? t('profile.deleting') : t('profile.delete_account')}
          </button>
        </section>
      </main>

      {/* Modal de Borrado Premium */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-[3rem] p-10 space-y-8 shadow-[0_40px_100px_rgba(0,0,0,0.8)] text-center"
            >
              <div className="w-20 h-20 rounded-[2rem] bg-red-500/10 flex items-center justify-center mx-auto">
                <span className="material-icons text-red-500 text-4xl animate-bounce">warning</span>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-white tracking-tight">{t('profile.say_goodbye')}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {t('profile.delete_desc')}
                </p>
              </div>

              <div className="space-y-3">
                <button 
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="w-full py-5 rounded-2xl bg-red-600 text-white font-black uppercase tracking-[0.2em] text-xs shadow-2xl shadow-red-600/20 active:scale-95 transition-all"
                >
                  {isDeleting ? t('profile.deleting') : t('profile.yes_delete')}
                </button>
                <button 
                  onClick={() => setShowDeleteModal(false)}
                  className="w-full py-5 rounded-2xl bg-white/5 text-slate-400 font-black uppercase tracking-[0.2em] text-xs hover:bg-white/10 transition-all"
                >
                  {t('profile.no_stay')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
