'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ArrowLeft, Info, Clock, CalendarDays } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export default function OrganizerRegisterPage() {
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
      const snap = await getDoc(doc(db, 'organizer_applications', user.uid));
      if (snap.exists() && snap.data().status === 'pending') {
        setAlreadyPending(true);
      }
    };
    checkExisting();
  }, [user]);

  if (loading) return <div className="min-h-screen bg-black" />;

  if (profile?.role === 'event_organizer') {
    if (typeof window !== 'undefined') router.push('/organizer');
    return null;
  }

  const handleSubmit = async () => {
    if (!phone || !city) return alert('Por favor, introduce tu teléfono y ciudad.');
    setIsSubmitting(true);
    try {
      const { httpsCallable } = await import('firebase/functions');
      const { functions } = await import('@/lib/firebase');
      
      const submitApp = httpsCallable(functions, 'submitOrganizerApplication');
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
      alert('Error al enviar la solicitud: ' + (error.message || 'Error desconocido'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const pendingView = (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900 border border-fuchsia-500/30 rounded-3xl p-8 shadow-2xl text-center">
      <div className="w-16 h-16 bg-fuchsia-500/20 rounded-full flex items-center justify-center mb-6 mx-auto">
        <Clock className="w-8 h-8 text-fuchsia-500" />
      </div>
      <h1 className="text-2xl font-black mb-3">{t('organizer_register.request_sent')}</h1>
      <p className="text-slate-400 text-sm mb-6">
        {t('organizer_register.pending_desc_1')}
      </p>
      <p className="text-xs text-slate-500">{t('organizer_register.pending_desc_2')}</p>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-black text-white p-6 font-sans">
      <div className="max-w-2xl mx-auto pt-12">
        {!submitted && !alreadyPending && (
          <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8 text-sm font-bold uppercase tracking-wider">
            <ArrowLeft className="w-4 h-4" />
            Volver
          </button>
        )}

        {(submitted || alreadyPending) ? pendingView : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
            <div className="w-16 h-16 bg-indigo-600/20 rounded-full flex items-center justify-center mb-6">
              <CalendarDays className="w-8 h-8 text-indigo-500" />
            </div>

            <h1 className="text-3xl font-black mb-4">{t('organizer_register.become_organizer')}</h1>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 text-sm text-slate-300">
              <h3 className="font-bold text-white mb-2 flex items-center gap-2">
                <Info className="w-4 h-4 text-indigo-500" />
                {t('organizer_register.organize_events')}
              </h3>
              <p className="mb-4">
                {t('organizer_register.organize_desc')}
              </p>
            </div>

            {!user ? (
              <button
                onClick={() => router.push('/login?redirect=/organizer/register')}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold uppercase tracking-widest text-sm py-4 rounded-xl hover:from-indigo-500 hover:to-purple-500 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(79,70,229,0.4)]"
              >
                {t('organizer_register.login_to_continue')}
              </button>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-400">{t('organizer_register.base_city')}</label>
                  <input
                    placeholder="Ej: Madrid, Barcelona, Valencia..."
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-4 text-sm focus:border-indigo-500 outline-none transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-400">{t('organizer_register.phone')}</label>
                  <input
                    type="tel"
                    placeholder="+34 600 000 000"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-4 text-sm focus:border-indigo-500 outline-none transition-colors"
                  />
                </div>
                <button
                  disabled={isSubmitting || !phone || !city}
                  onClick={handleSubmit}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold uppercase tracking-widest text-sm py-4 rounded-xl hover:from-indigo-500 transition-all mt-4 disabled:opacity-50"
                >
                  {isSubmitting ? t('organizer_register.sending') : t('organizer_register.send_request')}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
