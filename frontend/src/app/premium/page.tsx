'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';


export default function PremiumPage() {
  const { t } = useTranslation();
  const { user, profile, loading } = useAuth();
  const { isReady } = useRequireAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubscribe = async (priceId: string) => {
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

      const createCheckoutSession = httpsCallable(functions, 'createCheckoutSession');
      const result = await createCheckoutSession({ priceId, origin: window.location.origin });
      const data: any = result.data;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        setError(t('premium.error_session'));
      }
    } catch (err) {
      console.error("Error creating checkout session", err);
      setError(t('premium.error_payment'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return null;

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-white p-6">
      <header className="flex items-center gap-4 mb-12">
        <button onClick={() => router.push('/')} className="p-2 hover:bg-white/10 rounded-full transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold">{t('premium.title')}</h1>
      </header>

      <main className="max-w-4xl mx-auto w-full space-y-12">
        <div className="text-center space-y-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-block bg-gradient-to-r from-fuchsia-600 to-indigo-600 px-6 py-2 rounded-full mb-4 shadow-[0_0_30px_rgba(217,70,239,0.3)]"
          >
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">{t('premium.launch_offer')}</span>
          </motion.div>
          <h2 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-600 leading-tight">
            {t('premium.unlock_potential')}
          </h2>
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-[2rem] max-w-lg mx-auto border-dashed border-fuchsia-500/50">
            <p className="text-slate-200 text-sm font-bold">
              {t('premium.celebration')}
            </p>
            <p className="text-slate-400 text-xs mt-2" dangerouslySetInnerHTML={{ __html: t('premium.free_offer').replace('100', '<span class="text-fuchsia-400 font-black">100</span>').replace('PREMIUM GRATIS', '<span class="text-yellow-500 font-black">PREMIUM GRATIS</span>').replace('PREMIUM plan for FREE', '<span class="text-yellow-500 font-black">PREMIUM plan for FREE</span>') }} />
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-2xl text-center">
            {error}
          </div>
        )}

        {profile?.premium ? (
          <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 p-8 rounded-3xl text-center space-y-4">
            <div className="text-5xl">👑</div>
            <h3 className="text-2xl font-bold text-yellow-500">{t('premium.already_premium')}</h3>
            <p className="text-slate-300">{t('premium.thanks_support')}</p>
            <button 
              onClick={() => router.push('/')}
              className="mt-4 bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 px-8 rounded-2xl transition-all"
            >
              {t('premium.back_to_map')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
            {/* Plan Mensual */}
            <motion.div 
              whileHover={{ y: -10 }}
              className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem] flex flex-col space-y-6 relative overflow-hidden group hover:border-fuchsia-500/50 transition-all shadow-xl"
            >
              <div className="space-y-2">
                <h3 className="text-xl font-black uppercase tracking-widest text-slate-400">{t('premium.monthly')}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-black">9,99€</span>
                  <span className="text-slate-500 text-xs font-black">{t('premium.per_month')}</span>
                </div>
              </div>
              <ul className="space-y-4 text-xs font-bold text-slate-400">
                <li className="flex items-center gap-3"><span className="material-icons text-fuchsia-500 text-sm">check_circle</span> {t('premium.no_ads')}</li>
                <li className="flex items-center gap-3"><span className="material-icons text-fuchsia-500 text-sm">check_circle</span> {t('premium.see_visitors')}</li>
                <li className="flex items-center gap-3"><span className="material-icons text-fuchsia-500 text-sm">check_circle</span> {t('premium.advanced_filters')}</li>
                <li className="flex items-center gap-3"><span className="material-icons text-fuchsia-500 text-sm">check_circle</span> {t('premium.incognito')}</li>
              </ul>
              <button
                disabled={isSubmitting || !process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY}
                onClick={() => handleSubscribe(process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY!)}
                className="w-full bg-white text-black font-black py-5 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-widest text-[10px]"
              >
                {t('premium.choose_plan')}
              </button>
            </motion.div>

            {/* Plan Anual (Más popular) */}
            <motion.div 
              whileHover={{ y: -10 }}
              className="bg-gradient-to-br from-indigo-600/20 to-fuchsia-600/20 backdrop-blur-xl border-2 border-fuchsia-500 p-8 rounded-[2.5rem] flex flex-col space-y-6 relative overflow-hidden group shadow-[0_20px_50px_rgba(217,70,239,0.2)]"
            >
              <div className="absolute top-0 right-0 bg-fuchsia-500 text-white text-[10px] font-black px-4 py-2 rounded-bl-2xl uppercase tracking-widest">
                {t('premium.save_40')}
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black uppercase tracking-widest text-fuchsia-400">{t('premium.yearly')}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-black">69,99€</span>
                  <span className="text-slate-500 text-xs font-black">{t('premium.per_year')}</span>
                </div>
              </div>
              <ul className="space-y-4 text-xs font-bold text-white/80">
                <li className="flex items-center gap-3 font-black text-fuchsia-400"><span className="material-icons text-sm">stars</span> {t('premium.all_monthly')}</li>
                <li className="flex items-center gap-3"><span className="material-icons text-fuchsia-500 text-sm">check_circle</span> {t('premium.boosts')}</li>
                <li className="flex items-center gap-3"><span className="material-icons text-fuchsia-500 text-sm">check_circle</span> {t('premium.vip_badge')}</li>
                <li className="flex items-center gap-3"><span className="material-icons text-fuchsia-500 text-sm">check_circle</span> {t('premium.priority_support')}</li>
              </ul>
              <button
                disabled={isSubmitting || !process.env.NEXT_PUBLIC_STRIPE_PRICE_YEARLY}
                onClick={() => handleSubscribe(process.env.NEXT_PUBLIC_STRIPE_PRICE_YEARLY!)}
                className="w-full bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white font-black py-5 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-widest text-[10px] shadow-lg shadow-fuchsia-500/20"
              >
                {t('premium.activate_yearly')}
              </button>
            </motion.div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center mt-12">
          <div className="p-6">
            <div className="text-3xl mb-2">🔒</div>
            <h4 className="font-bold">{t('premium.secure_payment')}</h4>
            <p className="text-xs text-slate-500 mt-1">{t('premium.secure_desc')}</p>
          </div>
          <div className="p-6">
            <div className="text-3xl mb-2">🔄</div>
            <h4 className="font-bold">{t('premium.no_commitment')}</h4>
            <p className="text-xs text-slate-500 mt-1">{t('premium.no_commitment_desc')}</p>
          </div>
          <div className="p-6">
            <div className="text-3xl mb-2">✨</div>
            <h4 className="font-bold">{t('premium.new_features')}</h4>
            <p className="text-xs text-slate-500 mt-1">{t('premium.new_features_desc')}</p>
          </div>
        </div>
      </main>
    </div>
  );
}
