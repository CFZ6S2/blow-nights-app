'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ArrowLeft, UserPlus, Info, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

export default function RRPPRegisterPage() {
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
    if (!phone || !city) return alert('Por favor, introduce tu teléfono y ciudad.');
    setIsSubmitting(true);
    try {
      await setDoc(doc(db, 'rrpp_applications', user!.uid), {
        uid: user!.uid,
        email: user!.email || '',
        nick: profile?.nick || '',
        phone,
        city,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      setSubmitted(true);
    } catch (error) {
      console.error(error);
      alert('Error al enviar la solicitud.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const pendingView = (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900 border border-yellow-500/30 rounded-3xl p-8 shadow-2xl text-center">
      <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mb-6 mx-auto">
        <Clock className="w-8 h-8 text-yellow-500" />
      </div>
      <h1 className="text-2xl font-black mb-3">Solicitud Enviada</h1>
      <p className="text-slate-400 text-sm mb-6">
        Tu solicitud para ser RRPP independiente está pendiente de aprobación. Recibirás acceso cuando un administrador la revise.
      </p>
      <button
        onClick={() => router.push('/')}
        className="w-full bg-white/5 border border-white/10 text-white font-bold py-3 rounded-xl text-sm hover:bg-white/10 transition-colors"
      >
        Volver al Inicio
      </button>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-black text-white p-6 font-sans">
      <div className="max-w-2xl mx-auto pt-12">
        <button onClick={() => router.push('/')} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8 text-sm font-bold uppercase tracking-wider">
          <ArrowLeft className="w-4 h-4" />
          Volver
        </button>

        {(submitted || alreadyPending) ? pendingView : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
            <div className="w-16 h-16 bg-fuchsia-600/20 rounded-full flex items-center justify-center mb-6">
              <UserPlus className="w-8 h-8 text-fuchsia-500" />
            </div>

            <h1 className="text-3xl font-black mb-4">Conviértete en RRPP</h1>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 text-sm text-slate-300">
              <h3 className="font-bold text-white mb-2 flex items-center gap-2">
                <Info className="w-4 h-4 text-fuchsia-500" />
                ¿Qué tipo de RRPP eres?
              </h3>
              <p className="mb-4">
                Si trabajas para un <strong>local o discoteca en concreto</strong>, no necesitas registrarte aquí. Pídele al mánager o dueño del local que te dé de alta desde su panel de control.
              </p>
              <p>
                Si eres <strong>independiente</strong> y quieres usar la app para gestionar tus propias listas o fiestas privadas, envía tu solicitud y un administrador la revisará.
              </p>
            </div>

            {!user ? (
              <button
                onClick={() => router.push('/login?redirect=/rrpp/register')}
                className="w-full bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white font-bold uppercase tracking-widest text-sm py-4 rounded-xl hover:from-fuchsia-500 hover:to-purple-500 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(192,38,211,0.4)]"
              >
                Inicia Sesión para Continuar
              </button>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Tu Ciudad</label>
                  <input
                    placeholder="Ej: Madrid, Barcelona, Valencia..."
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-4 text-sm focus:border-fuchsia-500 outline-none transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Teléfono (WhatsApp)</label>
                  <input
                    type="tel"
                    placeholder="+34 600 000 000"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-4 text-sm focus:border-fuchsia-500 outline-none transition-colors"
                  />
                </div>
                <button
                  disabled={isSubmitting || !phone || !city}
                  onClick={handleSubmit}
                  className="w-full bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white font-bold uppercase tracking-widest text-sm py-4 rounded-xl hover:from-fuchsia-500 transition-all mt-4 disabled:opacity-50"
                >
                  {isSubmitting ? 'Enviando...' : 'Enviar Solicitud'}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
