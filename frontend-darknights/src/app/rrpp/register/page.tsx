'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ArrowLeft, UserPlus, Info, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export default function RRPPRegisterPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [alreadyPending, setAlreadyPending] = useState(false);

  useEffect(() => {
    if (!user) return;
    const checkExisting = async () => {
      const snap = await getDoc(doc(db, 'rrpp_applications', user.uid));
      if (snap.exists() && snap.data().status === 'pending') {
        setAlreadyPending(true);
      }
    };
    checkExisting();
  }, [user]);

  if (loading) return <div className="min-h-screen bg-black" />;

  if (profile?.role === 'rrpp') {
    if (typeof window !== 'undefined') router.push('/rrpp');
    return null;
  }

  const handleSubmit = async () => {
    if (!phone || !city) return alert(t('rrpp.register.alertFillFields'));
    setIsSubmitting(true);
    try {
      const { httpsCallable } = await import('firebase/functions');
      const { functions } = await import('@/lib/firebase');
      
      const submitApp = httpsCallable(functions, 'submitRRPPApplication');
      await submitApp({
        phone,
        city,
        nick: profile?.nick || '',
        email: user?.email || ''
      });

      setSubmitted(true);
      setTimeout(() => {
        router.push('/');
      }, 3000);
    } catch (error: any) {
      console.error(error);
      alert(t('rrpp.register.alertError') + (error.message || t('rrpp.register.unknownError')));
    } finally {
      setIsSubmitting(false);
    }
  };

  const pendingView = (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-yellow-500/30 rounded-3xl p-8 shadow-2xl text-center">
      <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mb-6 mx-auto">
        <Clock className="w-8 h-8 text-yellow-500" />
      </div>
      <h1 className="text-2xl font-black mb-3">{t('rrpp.register.pendingTitle')}</h1>
      <p className="text-slate-500 text-sm mb-6">
        {t('rrpp.register.pendingDescription')}
      </p>
      <p className="text-xs text-slate-500">{t('rrpp.register.pendingNotify')}</p>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-black text-slate-900 p-6 font-sans">
      <div className="max-w-2xl mx-auto pt-12">
        {!submitted && !alreadyPending && (
          <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors mb-8 text-sm font-bold uppercase tracking-wider">
            <ArrowLeft className="w-4 h-4" />
            {t('rrpp.register.back')}
          </button>
        )}

        {(submitted || alreadyPending) ? pendingView : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-slate-200 rounded-3xl p-8 shadow-2xl">
            <div className="w-16 h-16 bg-slate-900/20 rounded-full flex items-center justify-center mb-6">
              <UserPlus className="w-8 h-8 text-slate-900" />
            </div>

            <h1 className="text-3xl font-black mb-4">{t('rrpp.register.title')}</h1>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 text-sm text-slate-600">
              <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                <Info className="w-4 h-4 text-slate-900" />
                {t('rrpp.register.infoTitle')}
              </h3>
              <p className="mb-4">
                {t('rrpp.register.infoP1_1')}<strong>{t('rrpp.register.infoP1_2')}</strong>{t('rrpp.register.infoP1_3')}
              </p>
              <p>
                {t('rrpp.register.infoP2_1')}<strong>{t('rrpp.register.infoP2_2')}</strong>{t('rrpp.register.infoP2_3')}
              </p>
            </div>

            {!user ? (
              <button
                onClick={() => router.push('/login?redirect=/rrpp/register')}
                className="w-full bg-gradient-to-r from-slate-800 to-purple-600 text-slate-900 font-bold uppercase tracking-widest text-sm py-4 rounded-xl hover:from-fuchsia-500 hover:to-purple-500 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(192,38,211,0.4)]"
              >
                {t('rrpp.register.loginToContinue')}
              </button>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500">{t('rrpp.register.cityLabel')}</label>
                  <input
                    placeholder={t('rrpp.register.cityPlaceholder')}
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-4 text-sm focus:border-slate-700 outline-none transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500">{t('rrpp.register.phoneLabel')}</label>
                  <input
                    type="tel"
                    placeholder={t('rrpp.register.phonePlaceholder')}
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-4 text-sm focus:border-slate-700 outline-none transition-colors"
                  />
                </div>
                <button
                  disabled={isSubmitting || !phone || !city}
                  onClick={handleSubmit}
                  className="w-full bg-gradient-to-r from-slate-800 to-purple-600 text-slate-900 font-bold uppercase tracking-widest text-sm py-4 rounded-xl hover:from-fuchsia-500 transition-all mt-4 disabled:opacity-50"
                >
                  {isSubmitting ? t('rrpp.register.submitting') : t('rrpp.register.submitBtn')}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
