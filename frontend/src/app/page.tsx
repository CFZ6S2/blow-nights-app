'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion, Variants } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
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
  const { user, profile, isAdmin, isSuperAdmin, loading, logout } = useAuth();
  const router = useRouter();
  const boostCooldown = useMemo(() => new Date(Date.now() - 24*60*60*1000), []);
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (loading || !user) {
      hasRedirected.current = false;
      return;
    }

    if (!profile || profile.edad === null || profile.edad === undefined) {
      router.push('/setup-profile');
      return;
    }

    if (hasRedirected.current) return;

    const role = profile?.role;
    if (!role || role === 'user') return;

    const redirects: Record<string, string> = {
      venue: '/venue-admin',
      venueOwner: '/venue-admin',
      cityAdmin: '/city-manager',
      superadmin: '/super-admin',
      admin: '/admin',
      door: '/door',
      ambassador: '/ambassador',
    };

    if (redirects[role]) {
      hasRedirected.current = true;
      router.replace(redirects[role]);
    }
  }, [user, profile, loading, router]);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-950 text-white p-4 md:p-8">
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

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <header className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border border-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.3)]">
            <img 
              src={profile.fotoUrl || `https://ui-avatars.com/api/?name=${profile.nick || 'User'}&background=random`} 
              alt="Profile" 
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h1 className="font-display text-lg font-black bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-violet-500 uppercase tracking-tighter">
              Blow Nights
            </h1>
            <p className="text-[10px] text-slate-400 font-medium">¡Hola, {profile.nick}! {isAdmin && <span className="text-purple-400 font-black ml-1">[ADMIN]</span>}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <CitySelector />
          {isAdmin && (
            <Link href="/admin" prefetch={false} className="bg-purple-600/20 text-purple-400 border border-purple-600/50 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase hover:bg-purple-600/30 transition-all">
              Panel Admin
            </Link>
          )}
          <button 
            onClick={logout}
            className="bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl transition-all text-xs font-medium border border-white/5"
          >
            Salir
          </button>
        </div>
      </header>

      <main className="flex-1 space-y-8 max-w-4xl mx-auto w-full">
        {/* Sección del Mapa */}
        <section className="space-y-4">
          <div className="flex justify-between items-end">
            <h2 className="font-display text-xl font-bold">Cerca de ti</h2>
            <span className="text-xs text-purple-400 font-medium">Ubicación aproximada</span>
          </div>
          <MainMap />
        </section>
        
        {/* Acciones Rápidas */}
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-2 gap-4">
          <motion.div variants={itemVariants} whileTap={{ scale: 0.95 }} className="h-full">
            <Link
              href="/venues"
              className="glass-card flex flex-col p-5 group h-full relative overflow-hidden"
            >
              <div className="text-3xl mb-3 group-hover:scale-110 transition-transform relative z-10">
                <span className="material-icons text-fuchsia-400 text-3xl drop-shadow-[0_0_8px_rgba(192,38,211,0.5)]">nightlife</span>
              </div>
              <h3 className="font-display font-bold relative z-10">¿A dónde sales?</h3>
              <p className="text-[10px] text-slate-400 mt-1 relative z-10">Elige tu garito</p>
              <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-600/10 to-violet-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          </motion.div>

          <motion.div variants={itemVariants} whileTap={{ scale: 0.95 }} className="h-full">
            <Link
              href="/wallet"
              className="glass-card flex flex-col p-5 group h-full relative overflow-hidden"
            >
              <div className="text-3xl mb-3 group-hover:scale-110 transition-transform relative z-10">
                <span className="material-icons text-yellow-400 text-3xl drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]">confirmation_number</span>
              </div>
              <h3 className="font-display font-bold relative z-10">Mi Cartera</h3>
              <p className="text-[10px] text-slate-400 mt-1 relative z-10">Entradas y pases</p>
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-600/10 to-amber-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          </motion.div>

          <motion.div variants={itemVariants} whileTap={{ scale: 0.95 }} className="h-full">
            <Link
              href="/chat"
              className="glass-card flex flex-col p-5 group h-full relative overflow-hidden"
            >
              <div className="text-3xl mb-3 group-hover:scale-110 transition-transform relative z-10">💬</div>
              <h3 className="font-display font-bold relative z-10">Chats</h3>
              <p className="text-[10px] text-slate-400 mt-1 relative z-10">Mensajes pendientes</p>
            </Link>
          </motion.div>

          <motion.div variants={itemVariants} whileTap={{ scale: 0.95 }} className="h-full">
            <Link
              href="/visits"
              className="glass-card flex flex-col p-5 group h-full relative overflow-hidden"
            >
              <div className="text-3xl mb-3 group-hover:scale-110 transition-transform relative z-10">👀</div>
              <h3 className="font-display font-bold relative z-10">Visitas</h3>
              <p className="text-[10px] text-slate-400 mt-1 relative z-10">Quién te ha visto</p>
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
                  <h3 className="font-display font-bold">Instalar App</h3>
                  <p className="text-[10px] text-slate-400 mt-1">Lleva Blow Nights en tu pantalla de inicio</p>
                </div>
              </div>
              <span className="material-icons text-slate-400 group-hover:text-white transition-colors relative z-10">download</span>
              <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-600/10 to-indigo-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
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
                    {profile?.premium ? 'Tu Cuenta VIP' : 'Hazte Premium'}
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {profile?.premium ? 'Disfruta de todas las ventajas' : 'Ver planes y beneficios'}
                  </p>
                </div>
              </div>
              {!profile?.premium && (
                <span className="bg-white text-black text-[9px] font-black px-4 py-2 rounded-full uppercase tracking-tighter relative z-10 shadow-[0_0_15px_rgba(255,255,255,0.3)]">Ver más</span>
              )}
              {profile?.premium && (
                <div className="absolute inset-0 animate-shimmer opacity-20" />
              )}
            </div>
          </motion.div>
        </motion.div>

        {/* Panel de Funciones VIP (Solo si es Premium) */}
        {profile?.premium && (
          <section className="bg-gradient-to-br from-yellow-500/10 to-transparent p-6 rounded-[2.5rem] border border-yellow-500/20 space-y-6">
            <h3 className="text-xs font-black text-yellow-500 uppercase tracking-[0.2em] flex items-center gap-2">
              <span className="material-icons text-sm">auto_awesome</span>
              Funciones VIP Activas
            </h3>
            
            <div className="flex items-center justify-between p-4 bg-black/20 rounded-2xl border border-white/5">
              <div>
                <p className="text-sm font-bold">Modo Incógnito</p>
                <p className="text-[10px] text-slate-500">Navega sin dejar rastro</p>
              </div>
              <button 
                onClick={async () => {
                  const { setDoc, doc } = await import('firebase/firestore');
                  const { db } = await import('@/lib/firebase');
                  await setDoc(doc(db, 'users', user.uid), { incognito: !profile.incognito }, { merge: true });
                }}
                className={`w-12 h-6 rounded-full transition-all relative ${profile.incognito ? 'bg-yellow-500' : 'bg-slate-700'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${profile.incognito ? 'left-7' : 'left-1'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-black/20 rounded-2xl border border-white/5">
              <div>
                <p className="text-sm font-bold">Boost Diario</p>
                <p className="text-[10px] text-slate-500">Más visibilidad en el mapa</p>
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
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-white text-black hover:scale-105'
                }`}
              >
                {profile.lastBoost && profile.lastBoost.toDate() > boostCooldown ? 'Usado' : 'Activar Boost'}
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
