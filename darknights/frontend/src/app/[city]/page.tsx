'use client';

import { useTranslation } from 'react-i18next';
import { useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion, Variants } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useCityRouter } from '@/hooks/useCityRouter';
import LandingPage from '@/components/LandingPage';
import CitySelector from '@/components/CitySelector';
import Skeleton from '@/components/Skeleton';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

// maplibre-gl es pesado; se difiere para no bloquear el primer render de la página.
const MainMap = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-[70vh] rounded-[2.5rem]" />,
});

export default function Home() {
  const { t } = useTranslation();
  const { user, profile, isAdmin, isSuperAdmin, isCityAdmin, loading, logout } = useAuth();
  const { cityPath, router } = useCityRouter();
  const boostCooldown = useMemo(() => new Date(Date.now() - 24*60*60*1000), []);
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (loading || !user) {
      hasRedirected.current = false;
      return;
    }

    const role = profile?.role;

    if ((!profile || profile.edad === null || profile.edad === undefined) && role !== 'rrpp') {
      router.push('/setup-profile');
      return;
    }

    if (hasRedirected.current) return;

    if (!role || role === 'user') return;

    // Ya NO forzamos redirección a superadmin ni admin. 
    // Tienen un botón en la interfaz para ir a su panel si lo desean.
    // Esto evita bloqueos de pantalla y bucles infinitos en PWA.
    if (role === 'cityAdmin' && !isCityAdmin) return;

    const redirects: Record<string, string> = {
      venue: '/venue-admin',
      venueOwner: '/venue-admin',
      cityAdmin: '/city-manager',
      door: '/door',
      ambassador: '/ambassador',
      rrpp: '/rrpp',
      pending_rrpp: '/rrpp/register',
    };

    if (redirects[role]) {
      hasRedirected.current = true;
      router.replace(redirects[role]);
    }
  }, [user, profile, loading, router, isSuperAdmin, isAdmin, isCityAdmin]);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-white text-slate-900 p-4 md:p-8">
        <header className="flex justify-between items-center mb-8 opacity-40">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="w-20 h-3 rounded-lg" />
              <Skeleton className="w-24 h-2 rounded-lg" />
            </div>
          </div>
          <Skeleton className="w-20 h-10 rounded-xl" />
        </header>

        <main className="flex-1 space-y-8 max-w-4xl mx-auto w-full">
          <section className="space-y-4">
            <div className="flex justify-between items-end">
              <Skeleton className="w-32 h-6 rounded-lg" />
              <Skeleton className="w-24 h-3 rounded-lg" />
            </div>
            <Skeleton className="w-full h-[70vh] rounded-[2.5rem]" />
          </section>
          
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-32 rounded-3xl" />
            <Skeleton className="h-32 rounded-3xl" />
          </div>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <LandingPage 
        onStart={() => {
          router.push('/login');
        }} 
      />
    );
  }

  if (!profile) return null;

  const role = profile.role;
  const redirects: Record<string, string> = {
    venue: '/venue-admin',
    venueOwner: '/venue-admin',
    cityAdmin: '/city-manager',
    door: '/door',
    ambassador: '/ambassador',
  };
  const isRedirecting = role && redirects[role];

  return (
    <div className="flex flex-col min-h-screen bg-white text-slate-900 p-4 md:p-8">
      <header className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]">
            <img 
              src={profile.fotoUrl || `https://ui-avatars.com/api/?name=${profile.nick || 'User'}&background=random`} 
              alt="Profile" 
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h1 className="font-display text-lg font-black bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-red-700 uppercase tracking-tighter">
              DarkNights
            </h1>
            <p className="text-[10px] text-slate-400 font-medium">{t('city.hello')}, {profile.nick}! {isAdmin && <span className="text-amber-400 font-black ml-1">[ADMIN]</span>}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <CitySelector />
          {isSuperAdmin && (
            <Link href="/super-admin" prefetch={false} className="bg-amber-600/20 text-amber-400 border border-amber-600/50 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase hover:bg-amber-600/30 transition-all">
              {t('city.super_admin')}
            </Link>
          )}
          {isAdmin && (
            <Link href="/admin" prefetch={false} className="bg-blue-600/20 text-blue-400 border border-blue-600/50 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase hover:bg-blue-600/30 transition-all">
              Admin
            </Link>
          )}
          <button 
            onClick={logout}
            className="bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl transition-all text-xs font-medium border border-slate-200 text-slate-600"
          >
            Salir
          </button>
        </div>
      </header>

      <main className="flex-1 space-y-8 max-w-4xl mx-auto w-full">
        {/* Sección del Mapa */}
        {(!profile || profile.edad === null || profile.edad === undefined || isRedirecting) ? null : (
          <section className="space-y-4">
            <div className="flex justify-between items-end">
              <h2 className="font-display text-xl font-bold">{t('city.near_you')}</h2>
              <span className="text-xs text-blue-400 font-medium">{t('city.approx_location')}</span>
            </div>
            <MainMap />
          </section>
        )}
        
        {/* Acciones Rápidas */}
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-2 gap-4">
          <motion.div variants={itemVariants} whileTap={{ scale: 0.95 }} className="h-full">
            <Link
              href={cityPath('/venues')}
              className="glass-card flex flex-col p-5 group h-full relative overflow-hidden"
            >
              <div className="text-3xl mb-3 group-hover:scale-110 transition-transform relative z-10">
                <span className="material-icons text-amber-400 text-3xl drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]">nightlife</span>
              </div>
              <h3 className="font-display font-bold relative z-10">{t('city.where_going')}</h3>
              <p className="text-[10px] text-slate-400 mt-1 relative z-10">{t('city.choose_spot')}</p>
              <div className="absolute inset-0 bg-gradient-to-br from-amber-600/10 to-amber-800/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          </motion.div>

          <motion.div variants={itemVariants} whileTap={{ scale: 0.95 }} className="h-full">
            <Link
              href={cityPath('/wallet')}
              className="glass-card flex flex-col p-5 group h-full relative overflow-hidden"
            >
              <div className="text-3xl mb-3 group-hover:scale-110 transition-transform relative z-10">
                <span className="material-icons text-yellow-400 text-3xl drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]">confirmation_number</span>
              </div>
              <h3 className="font-display font-bold relative z-10">{t('city.my_wallet')}</h3>
              <p className="text-[10px] text-slate-400 mt-1 relative z-10">{t('city.tickets_passes')}</p>
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-600/10 to-amber-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          </motion.div>

          <motion.div variants={itemVariants} whileTap={{ scale: 0.95 }} className="h-full">
            <Link
              href={cityPath('/chat')}
              className="glass-card flex flex-col p-5 group h-full relative overflow-hidden"
            >
              <div className="text-3xl mb-3 group-hover:scale-110 transition-transform relative z-10">💬</div>
              <h3 className="font-display font-bold relative z-10">{t('city.chats')}</h3>
              <p className="text-[10px] text-slate-400 mt-1 relative z-10">{t('city.pending_messages')}</p>
            </Link>
          </motion.div>

          <motion.div variants={itemVariants} whileTap={{ scale: 0.95 }} className="h-full">
            <Link
              href={cityPath('/visits')}
              className="glass-card flex flex-col p-5 group h-full relative overflow-hidden"
            >
              <div className="text-3xl mb-3 group-hover:scale-110 transition-transform relative z-10">👀</div>
              <h3 className="font-display font-bold relative z-10">{t('city.visits')}</h3>
              <p className="text-[10px] text-slate-400 mt-1 relative z-10">{t('city.who_saw_you')}</p>
            </Link>
          </motion.div>

          <motion.div variants={itemVariants} whileTap={{ scale: 0.95 }} className="col-span-2">
            <div
              onClick={() => window.dispatchEvent(new CustomEvent('show-pwa-prompt'))}
              className="glass-card p-5 group cursor-pointer flex items-center justify-between relative overflow-hidden"
            >
              <div className="flex items-center gap-4 relative z-10">
                <div className="text-3xl group-hover:scale-110 transition-transform">📲</div>
                <div>
                  <h3 className="font-display font-bold">{t('city.install_app')}</h3>
                  <p className="text-[10px] text-slate-400 mt-1">{t('city.take_home')}</p>
                </div>
              </div>
              <span className="material-icons text-slate-400 group-hover:text-slate-900 transition-colors relative z-10">download</span>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-900/10 to-slate-800/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </motion.div>

          <motion.div variants={itemVariants} whileTap={{ scale: 0.95 }} className="col-span-2">
            <div 
              onClick={() => router.push('/premium')}
              className={`glass-card p-5 cursor-pointer group flex items-center justify-between relative overflow-hidden ${profile?.premium ? 'border-yellow-500/30' : ''}`}
            >
              <div className="flex items-center gap-4 relative z-10">
                <div className={`text-3xl group-hover:scale-110 transition-transform ${profile?.premium ? 'drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]' : ''}`}>
                  {profile?.premium ? '👑' : '⭐'}
                </div>
                <div>
                  <h3 className={`font-display font-bold ${profile?.premium ? 'text-yellow-400' : ''}`}>
                    {profile?.premium ? t('city.vip_account') : t('city.go_premium')}
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {profile?.premium ? t('city.enjoy_advantages') : t('city.see_plans')}
                  </p>
                </div>
              </div>
              {!profile?.premium && (
                <span className="bg-slate-900 text-white text-[9px] font-black px-4 py-2 rounded-full uppercase tracking-tighter relative z-10 shadow-sm">{t('city.see_more')}</span>
              )}
              {profile?.premium && (
                <div className="absolute inset-0 animate-shimmer opacity-20" />
              )}
            </div>
          </motion.div>
        </motion.div>

        {/* Panel de Funciones VIP (Solo si es Premium) */}
        {profile?.premium && (
          <section className="bg-gradient-to-br from-amber-50 to-white p-6 rounded-[2.5rem] border border-amber-200 space-y-6">
            <h3 className="text-xs font-black text-yellow-500 uppercase tracking-[0.2em] flex items-center gap-2">
              <span className="material-icons text-sm">auto_awesome</span>
              {t('city.vip_active_features')}
            </h3>
            
            <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div>
                <p className="text-sm font-bold">{t('city.incognito_mode')}</p>
                <p className="text-[10px] text-slate-500">{t('city.navigate_hidden')}</p>
              </div>
              <button 
                onClick={async () => {
                  const { setDoc, doc } = await import('firebase/firestore');
                  const { db } = await import('@/lib/firebase');
                  await setDoc(doc(db, 'users', user.uid), { incognito: !profile.incognito }, { merge: true });
                }}
                className={`w-12 h-6 rounded-full transition-all relative ${profile.incognito ? 'bg-amber-500' : 'bg-slate-300'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${profile.incognito ? 'left-7' : 'left-1'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div>
                <p className="text-sm font-bold">{t('city.daily_boost')}</p>
                <p className="text-[10px] text-slate-500">{t('city.more_visibility')}</p>
              </div>
              <button 
                disabled={profile.lastBoost && profile.lastBoost.toDate() > boostCooldown}
                onClick={async () => {
                  const { setDoc, doc, serverTimestamp } = await import('firebase/firestore');
                  const { db } = await import('@/lib/firebase');
                  await setDoc(doc(db, 'users', user.uid), { 
                    boostedUntil: new Date(Date.now() + 60*60*1000), // 1 hora de boost
                    lastBoost: serverTimestamp() 
                  }, { merge: true });
                }}
                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-tighter transition-all ${
                  profile.lastBoost && profile.lastBoost.toDate() > boostCooldown
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-slate-900 text-white hover:scale-105'
                }`}
              >
                {profile.lastBoost && profile.lastBoost.toDate() > boostCooldown ? t('city.used') : t('city.activate_boost')}
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
