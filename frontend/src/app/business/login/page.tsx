'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db, functions } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, ArrowRight, Lock, Mail, User, Phone, MapPin, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type Mode = 'login' | 'apply' | 'success';

export default function BusinessLoginPage() {
  const { t } = useTranslation();
  const router = useRouter();
  
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Application fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [cityId, setCityId] = useState('');
  const [cities, setCities] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (mode === 'apply' && cities.length === 0) {
      const fetchCities = async () => {
        const q = query(collection(db, 'cities'), where('readyForFranchise', '==', true));
        const snap = await getDocs(q);
        const list: any[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() }));
        setCities(list);
      };
      fetchCities();
    }
  }, [mode, cities.length]);

  const handleAuthResult = async (user: any) => {
    router.push('/venue-admin');
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
      const result = await signInWithEmailAndPassword(auth, email, password);
      await handleAuthResult(result.user);
    } catch (err: any) {
      console.error(err);
      setError(t('business.login.error.invalid_credentials'));
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const requestPartnerAccess = httpsCallable(functions, 'requestPartnerAccess');
      await requestPartnerAccess({ name, email, phone, cityId });
      setMode('success');
    } catch (err: any) {
      console.error(err);
      setError('Error al enviar la solicitud. Inténtalo de nuevo.');
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
            {mode === 'apply' ? 'Solicita acceso para tu local' : (mode === 'success' ? 'Solicitud Enviada' : 'Panel de Gestión para Locales')}
          </p>
        </div>

        {mode !== 'success' && (
          <div className="flex bg-slate-900 rounded-xl p-1 mb-8">
            <button 
              onClick={() => { setMode('apply'); setError(''); }}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${mode === 'apply' ? 'bg-fuchsia-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              Solicitar Acceso
            </button>
            <button 
              onClick={() => { setMode('login'); setError(''); }}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${mode === 'login' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              Entrar
            </button>
          </div>
        )}

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl overflow-hidden relative">
          <AnimatePresence mode="wait">
            {mode === 'success' && (
              <motion.div 
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-4"
              >
                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">¡Recibido!</h2>
                <p className="text-slate-400 text-sm mb-6">Hemos recibido tu solicitud. Nuestro equipo revisará tus datos y se pondrá en contacto contigo muy pronto para habilitar tu cuenta.</p>
                <button
                  onClick={() => setMode('login')}
                  className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold rounded-xl transition-all"
                >
                  Volver al inicio
                </button>
              </motion.div>
            )}

            {mode === 'apply' && (
              <motion.form 
                key="apply"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleApply} 
                className="space-y-4"
              >
                {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold p-3 rounded-xl text-center">{error}</div>}
                
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Tu Nombre</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><User className="w-4 h-4 text-slate-500" /></div>
                    <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-white text-sm rounded-xl pl-11 pr-4 py-3 focus:border-fuchsia-500" placeholder="Nombre completo" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Email de Contacto</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Mail className="w-4 h-4 text-slate-500" /></div>
                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-white text-sm rounded-xl pl-11 pr-4 py-3 focus:border-fuchsia-500" placeholder="gerencia@milocal.com" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Teléfono Móvil</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Phone className="w-4 h-4 text-slate-500" /></div>
                    <input type="tel" required value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-white text-sm rounded-xl pl-11 pr-4 py-3 focus:border-fuchsia-500" placeholder="+34 600 000 000" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Ciudad del Local</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><MapPin className="w-4 h-4 text-slate-500" /></div>
                    <select required value={cityId} onChange={e => setCityId(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-white text-sm rounded-xl pl-11 pr-4 py-3 focus:border-fuchsia-500 appearance-none">
                      <option value="" disabled>Selecciona una ciudad</option>
                      {cities.map(c => <option key={c.id} value={c.id}>{c.name || c.id}</option>)}
                      <option value="other">Otra ciudad / Aún no listada</option>
                    </select>
                  </div>
                </div>

                <button type="submit" disabled={loading} className="w-full mt-6 py-4 bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-sm font-black uppercase tracking-widest rounded-xl transition-all flex justify-center disabled:opacity-50">
                  {loading ? 'Enviando...' : 'Enviar Solicitud'}
                </button>
              </motion.form>
            )}

            {mode === 'login' && (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold p-3 rounded-xl text-center mb-4">{error}</div>}
                
                <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">{t('business.login.form.email_label')}</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Mail className="w-5 h-5 text-slate-500" /></div>
                      <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-white text-sm rounded-xl pl-11 pr-4 py-3 focus:border-indigo-500" placeholder="gerencia@milocal.com" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">{t('business.login.form.password_label')}</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Lock className="w-5 h-5 text-slate-500" /></div>
                      <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-white text-sm rounded-xl pl-11 pr-4 py-3 focus:border-indigo-500" placeholder="••••••••" />
                    </div>
                  </div>

                  <button type="submit" disabled={loading} className="w-full mt-4 py-4 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                    {loading ? t('common.processing') : 'Entrar'} <ArrowRight className="w-4 h-4" />
                  </button>
                </form>

                <div className="relative flex items-center justify-center mb-6">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800"></div></div>
                  <span className="relative bg-slate-900 px-4 text-xs text-slate-500 font-bold uppercase">{t('business.login.or_continue_with')}</span>
                </div>

                <button onClick={loginWithGoogle} disabled={loading} className="w-full py-3.5 bg-white text-slate-900 hover:bg-slate-100 text-sm font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50">
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Google
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
