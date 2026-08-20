'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

export default function PremiumPage() {
  const { t } = useTranslation();
  const { user, profile, claims, loading } = useAuth();
  const { isReady } = useRequireAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('yearly');
  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  const router = useRouter();

  // Active membership derivation
  const membershipTier = profile?.membershipTier || 'free';
  const isPlus = membershipTier === 'plus' && profile?.membershipStatus === 'active';
  const isBlack = membershipTier === 'black' && profile?.membershipStatus === 'active';
  const isPromoLifetime = profile?.promoMember === true;
  
  // Black 8h Pass countdown
  useEffect(() => {
    const boostExpires = profile?.blackBoostExpires?.toMillis 
      ? profile.blackBoostExpires.toMillis() 
      : (typeof claims?.blackBoostExpires === 'number' ? claims.blackBoostExpires : null);

    if (!boostExpires) {
      setTimeLeft(null);
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const diff = boostExpires - now;
      if (diff <= 0) {
        setTimeLeft(null);
        clearInterval(interval);
      } else {
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${h}h ${m}m ${s}s`);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [profile?.blackBoostExpires, claims?.blackBoostExpires]);

  const handleSubscribe = async (tier: 'plus' | 'black') => {
    if (!profile?.cityId) {
      alert('Debes seleccionar tu ciudad antes de adquirir la membresía.');
      router.push('/setup-profile');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const { httpsCallable } = await import('firebase/functions');
      const { functions } = await import('@/lib/firebase');

      const createUserMembershipCheckout = httpsCallable(functions, 'createUserMembershipCheckout');
      const result = await createUserMembershipCheckout({ tier, period, origin: window.location.origin });
      const data: any = result.data;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        setError(t('premium.error_session'));
      }
    } catch (err: any) {
      console.error("Error creating membership checkout session", err);
      setError(err.message || t('premium.error_payment'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBlack8h = async () => {
    if (!profile?.cityId) {
      alert('Debes seleccionar tu ciudad antes.');
      router.push('/setup-profile');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const { httpsCallable } = await import('firebase/functions');
      const { functions } = await import('@/lib/firebase');

      const createBlack8hCheckout = httpsCallable(functions, 'createBlack8hCheckout');
      const result = await createBlack8hCheckout({ origin: window.location.origin });
      const data: any = result.data;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        setError(t('premium.error_session'));
      }
    } catch (err: any) {
      console.error("Error creating Black 8h checkout", err);
      setError(err.message || t('premium.error_payment'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManageSubscription = async () => {
    setIsSubmitting(true);
    try {
      const { httpsCallable } = await import('firebase/functions');
      const { functions } = await import('@/lib/firebase');
      const createStripePortalSession = httpsCallable(functions, 'createStripePortalSession');
      const result = await createStripePortalSession({});
      const data: any = result.data;
      if (data?.url) window.location.href = data.url;
    } catch (err) {
      console.error(err);
      alert('Error al abrir el portal de gestión.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return null;

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-white p-6 pb-24 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-fuchsia-600/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px] pointer-events-none" />

      <header className="flex items-center gap-4 mb-8 relative z-10">
        <button onClick={() => router.push('/')} className="p-2 hover:bg-white/10 rounded-full transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold">{t('premium.title', 'Planes de Membresía')}</h1>
      </header>

      <main className="max-w-6xl mx-auto w-full space-y-8 relative z-10">
        
        {/* Toggle Period */}
        <div className="flex justify-center mb-8">
          <div className="bg-white/10 backdrop-blur-md p-1 rounded-full inline-flex border border-white/20">
            <button 
              onClick={() => setPeriod('monthly')}
              className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${period === 'monthly' ? 'bg-white text-black shadow-lg' : 'text-white/70 hover:text-white'}`}
            >
              Mensual
            </button>
            <button 
              onClick={() => setPeriod('yearly')}
              className={`px-6 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${period === 'yearly' ? 'bg-gradient-to-r from-fuchsia-500 to-indigo-500 text-white shadow-lg' : 'text-white/70 hover:text-white'}`}
            >
              Anual <span className="bg-white/20 text-xs px-2 py-0.5 rounded-full">-40%</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-2xl text-center">
            {error}
          </div>
        )}

        {/* First 100 Lifetime Promo Banner */}
        {isPromoLifetime && (
          <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 p-6 rounded-3xl text-center space-y-2 mb-8">
            <div className="text-4xl">👑</div>
            <h3 className="text-xl font-black text-yellow-500">Fundador Black de por vida</h3>
            <p className="text-sm text-slate-300">Fuiste uno de los 100 primeros. Disfruta de todos los beneficios Black gratis para siempre.</p>
          </div>
        )}

        {/* Current Active Plan (if not promo lifetime, but active subscription) */}
        {(isPlus || isBlack) && !isPromoLifetime && (
          <div className="bg-white/10 border border-white/20 p-6 rounded-3xl flex justify-between items-center mb-8 backdrop-blur-sm">
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-widest font-bold">Plan Actual</p>
              <h3 className={`text-2xl font-black ${isBlack ? 'text-transparent bg-clip-text bg-gradient-to-r from-slate-300 to-white' : 'text-fuchsia-400'}`}>
                {isBlack ? 'BLACK' : 'PLUS'}
              </h3>
            </div>
            <button 
              onClick={handleManageSubscription}
              disabled={isSubmitting}
              className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-sm font-bold transition-all border border-white/10"
            >
              Gestionar
            </button>
          </div>
        )}

        {/* Tiers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          
          {/* FREE TIER */}
          <motion.div 
            whileHover={{ y: -5 }}
            className={`bg-white/5 backdrop-blur-xl border p-8 rounded-[2rem] flex flex-col relative overflow-hidden transition-all ${membershipTier === 'free' && !isPromoLifetime ? 'border-white/40 shadow-[0_0_20px_rgba(255,255,255,0.1)]' : 'border-white/10 opacity-70'}`}
          >
            <div className="space-y-2 mb-8">
              <h3 className="text-xl font-black uppercase tracking-widest text-slate-300">Free</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black">0€</span>
              </div>
            </div>
            <ul className="space-y-4 text-xs font-bold text-slate-400 flex-grow">
              <li className="flex items-center gap-3"><span className="material-icons text-white/50 text-sm">check_circle</span> Mapa con usuarios cercanos</li>
              <li className="flex items-center gap-3"><span className="material-icons text-white/50 text-sm">check_circle</span> Chat ilimitado con matches</li>
              <li className="flex items-center gap-3"><span className="material-icons text-white/50 text-sm">check_circle</span> 3 pings al día</li>
              <li className="flex items-center gap-3"><span className="material-icons text-white/50 text-sm">check_circle</span> Ver locales y eventos</li>
            </ul>
            {membershipTier === 'free' && !isPromoLifetime && (
              <div className="mt-8">
                <div className="bg-black/40 border border-indigo-500/30 p-4 rounded-2xl relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/10 to-fuchsia-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <h4 className="text-sm font-black text-indigo-400 mb-1">Black 8h Pass</h4>
                  <p className="text-[10px] text-slate-400 mb-3 leading-relaxed">Obtén todas las ventajas Black (excepto crear Chills) por una noche.</p>
                  
                  {timeLeft ? (
                    <div className="bg-indigo-500/20 text-indigo-300 font-mono text-center py-2 rounded-xl text-xs font-bold border border-indigo-500/30">
                      Activo: {timeLeft}
                    </div>
                  ) : (
                    <button
                      disabled={isSubmitting}
                      onClick={handleBlack8h}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-xl text-xs transition-all shadow-lg shadow-indigo-500/20"
                    >
                      Comprar por 5€
                    </button>
                  )}
                </div>
              </div>
            )}
            {membershipTier === 'free' && !isPromoLifetime && (
              <div className="mt-4 text-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Tu plan actual</span>
              </div>
            )}
          </motion.div>

          {/* PLUS TIER */}
          <motion.div 
            whileHover={{ y: -5 }}
            className={`bg-white/5 backdrop-blur-xl border p-8 rounded-[2rem] flex flex-col relative overflow-hidden transition-all ${isPlus ? 'border-fuchsia-500 shadow-[0_0_30px_rgba(217,70,239,0.2)]' : 'border-white/10 hover:border-fuchsia-500/50'}`}
          >
            <div className="space-y-2 mb-8">
              <h3 className="text-xl font-black uppercase tracking-widest text-fuchsia-400">Plus</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black">{period === 'monthly' ? '10€' : '69,99€'}</span>
                <span className="text-slate-500 text-xs font-black">/{period === 'monthly' ? 'mes' : 'año'}</span>
              </div>
            </div>
            <ul className="space-y-4 text-xs font-bold text-slate-300 flex-grow">
              <li className="flex items-center gap-3"><span className="material-icons text-fuchsia-500 text-sm">add_circle</span> <span className="text-white">Todo lo Free</span></li>
              <li className="flex items-center gap-3"><span className="material-icons text-fuchsia-500 text-sm">visibility</span> Ver quién te ha visitado</li>
              <li className="flex items-center gap-3"><span className="material-icons text-fuchsia-500 text-sm">visibility_off</span> Modo fantasma</li>
              <li className="flex items-center gap-3"><span className="material-icons text-fuchsia-500 text-sm">bolt</span> 10 pings al día</li>
              <li className="flex items-center gap-3"><span className="material-icons text-fuchsia-500 text-sm">rocket_launch</span> 1 boost gratis al mes</li>
              <li className="flex items-center gap-3"><span className="material-icons text-fuchsia-500 text-sm">tune</span> Filtros avanzados</li>
              <li className="flex items-center gap-3"><span className="material-icons text-fuchsia-500 text-sm">favorite</span> Ver quién te dio like</li>
            </ul>
            <div className="mt-8">
              {!isPlus && !isBlack && !isPromoLifetime && (
                <button
                  disabled={isSubmitting}
                  onClick={() => handleSubscribe('plus')}
                  className="w-full bg-white text-black font-black py-4 rounded-2xl hover:bg-slate-200 transition-all uppercase tracking-widest text-[10px]"
                >
                  Mejorar a Plus
                </button>
              )}
              {isPlus && (
                <div className="text-center py-4 bg-fuchsia-500/10 rounded-2xl border border-fuchsia-500/30">
                  <span className="text-[10px] font-bold text-fuchsia-400 uppercase">Tu plan actual</span>
                </div>
              )}
            </div>
          </motion.div>

          {/* BLACK TIER */}
          <motion.div 
            whileHover={{ y: -5 }}
            className={`bg-gradient-to-br from-slate-900 to-black backdrop-blur-xl border p-8 rounded-[2rem] flex flex-col relative overflow-hidden transition-all shadow-2xl ${isBlack || isPromoLifetime ? 'border-slate-400 shadow-[0_0_40px_rgba(255,255,255,0.15)]' : 'border-slate-700 hover:border-slate-500'}`}
          >
            {/* VIP Badge effect */}
            <div className="absolute top-0 right-0 bg-gradient-to-r from-slate-400 to-white text-black text-[10px] font-black px-4 py-2 rounded-bl-2xl uppercase tracking-widest shadow-lg">
              VIP
            </div>
            
            <div className="space-y-2 mb-8">
              <h3 className="text-xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-slate-300 to-white">Black</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-white">{period === 'monthly' ? '20€' : '139,99€'}</span>
                <span className="text-slate-500 text-xs font-black">/{period === 'monthly' ? 'mes' : 'año'}</span>
              </div>
            </div>
            <ul className="space-y-4 text-xs font-bold text-slate-300 flex-grow">
              <li className="flex items-center gap-3"><span className="material-icons text-slate-100 text-sm">add_circle</span> <span className="text-white">Todo lo Plus</span></li>
              <li className="flex items-center gap-3"><span className="material-icons text-slate-100 text-sm">bolt</span> Pings ilimitados</li>
              <li className="flex items-center gap-3"><span className="material-icons text-slate-100 text-sm">rocket_launch</span> Boosts ilimitados</li>
              <li className="flex items-center gap-3"><span className="material-icons text-slate-100 text-sm">shield</span> Modo incógnito</li>
              <li className="flex items-center gap-3"><span className="material-icons text-slate-100 text-sm">stars</span> Badge VIP & Prioridad</li>
              <li className="flex items-center gap-3 font-black text-white bg-white/10 p-2 rounded-xl border border-white/20"><span className="material-icons text-sm">nightlife</span> Crear Chills y Afters</li>
              <li className="flex items-center gap-3"><span className="material-icons text-slate-100 text-sm">block</span> Sin promos de venues</li>
            </ul>
            <div className="mt-8">
              {(!isBlack && !isPromoLifetime) && (
                <button
                  disabled={isSubmitting}
                  onClick={() => handleSubscribe('black')}
                  className="w-full bg-gradient-to-r from-slate-200 to-white text-black font-black py-4 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-transform uppercase tracking-widest text-[10px] shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                >
                  Hazte Black
                </button>
              )}
              {(isBlack || isPromoLifetime) && (
                <div className="text-center py-4 bg-white/10 rounded-2xl border border-white/30">
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">Tu plan actual</span>
                </div>
              )}
            </div>
          </motion.div>

        </div>
      </main>
    </div>
  );
}
