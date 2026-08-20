'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { Building2, ArrowRight, Lock, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function BusinessLoginPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAuthResult = async (user: any) => {
    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      await setDoc(userRef, {
        email: user.email,
        role: 'venueOwner',
        isAdmin: false,
        premium: false,
        createdAt: serverTimestamp(),
        lastSeen: serverTimestamp(),
      });
      router.push('/venue-admin');
    } else {
      const data = snap.data();
      const role = data?.role;
      if (role === 'venue' || role === 'venueOwner' || role === 'admin' || role === 'superadmin') {
        router.push('/venue-admin');
      } else {
        setError(t('business.login.error.no_permissions'));
      }
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await handleAuthResult(result.user);
    } catch (err: any) {
      console.error(err);
      setError(t('business.login.error.google_login'));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isRegistering) {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await handleAuthResult(result.user);
      } else {
        const result = await signInWithEmailAndPassword(auth, email, password);
        await handleAuthResult(result.user);
      }
    } catch (err: any) {
      console.error(err);
      setError(isRegistering ? t('business.login.error.register_failed') : t('business.login.error.invalid_credentials'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 selection:bg-fuchsia-500/30">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-fuchsia-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-fuchsia-500/20">
            <Building2 className="w-8 h-8 text-white" />
          </div>
        </div>
        
        <div className="text-center mb-8 space-y-2">
          <h1 className="text-3xl font-black text-white">BlowNights <span className="text-fuchsia-400">Business</span></h1>
          <p className="text-slate-400 text-sm">
            {isRegistering ? t('business.login.subtitle_register') : t('business.login.subtitle_login')}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold p-4 rounded-xl mb-6 text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">{t('business.login.form.email_label')}</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="w-5 h-5 text-slate-500" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white text-sm rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 transition-all"
                  placeholder="gerencia@milocal.com"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">{t('business.login.form.password_label')}</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="w-5 h-5 text-slate-500" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white text-sm rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 py-4 bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white text-sm font-black uppercase tracking-widest rounded-xl shadow-lg shadow-fuchsia-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? t('common.processing') : (isRegistering ? t('business.login.form.submit_register') : t('business.login.form.submit_login'))}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <div className="relative flex items-center justify-center mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800"></div>
            </div>
            <span className="relative bg-slate-900 px-4 text-xs text-slate-500 font-bold uppercase">{t('business.login.or_continue_with')}</span>
          </div>

          <button
            onClick={loginWithGoogle}
            disabled={loading}
            className="w-full py-3.5 bg-white text-slate-900 hover:bg-slate-100 text-sm font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google
          </button>
        </div>

        <div className="mt-8 text-center">
          <button 
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            {isRegistering ? t('business.login.toggle_login') : t('business.login.toggle_register')}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
