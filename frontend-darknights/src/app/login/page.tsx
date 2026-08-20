'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { DEFAULT_CITY } from '@/lib/routes';
import { Suspense } from 'react';
import { useTranslation } from 'react-i18next';

function LoginInner() {
  const { t } = useTranslation();
  const { user, profile, loading: authLoading, loginWithGoogle, loginWithApple } = useAuth();
  const [error, setError] = useState('');
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect');

  useEffect(() => {
    if (!user || authLoading) return;
    if (!profile) return;
    if (redirect) {
      router.push(redirect);
      return;
    }
    const role = profile.role;
    if (role && role !== 'user') {
      const roleRedirects: Record<string, string> = {
        rrpp: '/rrpp',
        venue: '/venue-admin',
        venueOwner: '/venue-admin',
        cityAdmin: '/city-manager',
        door: '/door',
        ambassador: '/ambassador',
      };
      if (roleRedirects[role]) {
        router.push(roleRedirects[role]);
        return;
      }
    }
    const savedCity = typeof window !== 'undefined' ? localStorage.getItem('darknights_city') : null;
    router.push(`/${savedCity || DEFAULT_CITY}/`);
  }, [user, profile, authLoading, router, redirect]);

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (err) {
      setError('Error al iniciar sesión con Google.');
    }
  };

  const handleAppleLogin = async () => {
    try {
      await loginWithApple();
    } catch (err) {
      setError('Error al iniciar sesión con Apple.');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 selection:bg-fuchsia-500/30 overflow-hidden relative">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-slate-900/20 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/20 blur-[120px] rounded-full" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-12 shadow-[0_50px_100px_rgba(0,0,0,0.5)] space-y-12 relative z-10"
      >
        <div className="text-center space-y-4">
          <motion.div 
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            className="w-20 h-20 bg-gradient-to-tr from-slate-800 to-indigo-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl rotate-12 mb-6"
          >
            <span className="material-icons text-slate-900 text-4xl">favorite</span>
          </motion.div>
          <h1 className="text-5xl font-[1000] tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-500 via-purple-500 to-indigo-500">
            DARKNIGHTS
          </h1>
          <p className="text-slate-500 font-medium uppercase text-[10px] tracking-[0.3em]">{t('login.subtitle')}</p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest p-4 rounded-2xl text-center"
          >
            {error}
          </motion.div>
        )}

        <div className="space-y-6">
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={ageConfirmed}
              onChange={(e) => setAgeConfirmed(e.target.checked)}
              className="mt-0.5 w-5 h-5 rounded-md border-2 border-white/20 bg-white/5 accent-fuchsia-500 cursor-pointer flex-shrink-0"
            />
            <span className="text-[10px] text-slate-500 leading-relaxed group-hover:text-slate-600 transition-colors">
              Confirmo que tengo <span className="text-slate-900 font-bold">+18 años</span> y acepto los{' '}
              <Link href="/terms" className="text-slate-800 underline">Términos</Link> y la{' '}
              <Link href="/privacy" className="text-slate-800 underline">Política de Privacidad</Link>.
            </span>
          </label>

          <button
            onClick={handleGoogleLogin}
            disabled={!ageConfirmed}
            className="w-full flex items-center justify-center gap-4 bg-white text-black font-[1000] py-6 rounded-2xl hover:bg-slate-200 transition-all duration-300 shadow-xl text-[10px] uppercase tracking-[0.2em] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
            {t('login.google')}
          </button>

          <button
            onClick={handleAppleLogin}
            disabled={!ageConfirmed}
            className="w-full flex items-center justify-center gap-4 bg-black text-slate-900 border border-white/20 font-[1000] py-6 rounded-2xl hover:bg-white transition-all duration-300 shadow-xl text-[10px] uppercase tracking-[0.2em] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-black"
          >
            <span className="material-icons text-xl">apple</span>
            {t('login.apple')}
          </button>

          <div className="flex justify-between gap-2 pt-4">
            {[
              { icon: 'shield', label: 'Seguro' },
              { icon: 'lock', label: 'Privado' },
              { icon: 'verified', label: 'Real' }
            ].map((b, i) => (
              <div key={i} className="flex flex-col items-center gap-2 opacity-40">
                <span className="material-icons text-lg">{b.icon}</span>
                <span className="text-[7px] font-black uppercase tracking-tighter">{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <LoginInner />
    </Suspense>
  );
}
