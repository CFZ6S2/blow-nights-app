'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Handshake, ChevronRight, CheckCircle2 } from 'lucide-react';
import { collection, addDoc, updateDoc, doc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useTranslation } from 'react-i18next';

export default function SetupWizard({ user, profile }: { user: any, profile: any }) {
  const { t } = useTranslation();
  const [step, setStep] = useState<'choice' | 'form' | 'delegated' | 'done'>('choice');
  const [loading, setLoading] = useState(false);
  
  // Venue form fields
  const [name, setName] = useState('');
  const [type, setType] = useState('club');
  const [cityId, setCityId] = useState('');
  const [cities, setCities] = useState<any[]>([]);

  useEffect(() => {
    const fetchCities = async () => {
      const q = query(collection(db, 'cities'), where('readyForFranchise', '==', true));
      const snap = await getDocs(q);
      const list: any[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setCities(list);
    };
    fetchCities();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'venues'), {
        name,
        type,
        cityId,
        ownerId: user.uid,
        isActive: true,
        isVIPNight: false,
        isPrivate: false,
        autoAcceptChills: true,
        createdAt: serverTimestamp(),
      });
      setStep('done');
    } catch (err) {
      console.error(err);
      alert('Error al crear el local.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelegate = async () => {
    setLoading(true);
    try {
      // Find partner_application to mark as delegated
      const q = query(collection(db, 'partner_applications'), where('email', '==', user.email));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const appDoc = snap.docs[0];
        await updateDoc(doc(db, 'partner_applications', appDoc.id), {
          delegatedManagement: true,
          status: 'delegated_setup',
          updatedAt: serverTimestamp()
        });
      } else {
        // Fallback if no application exists
        await updateDoc(doc(db, 'users', user.uid), {
          delegatedManagement: true,
        });
      }
      setStep('delegated');
    } catch (err) {
      console.error(err);
      alert('Error al procesar la solicitud.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-32 flex flex-col items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-fuchsia-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-fuchsia-500/20">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black mb-2">Bienvenido a BlowNights</h1>
          <p className="text-slate-400">Tu cuenta está aprobada. ¿Cómo quieres empezar?</p>
        </div>

        <AnimatePresence mode="wait">
          {step === 'choice' && (
            <motion.div key="choice" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button onClick={() => setStep('form')} className="flex flex-col items-center text-center p-6 bg-slate-950 border border-slate-800 hover:border-fuchsia-500 rounded-2xl transition-all group">
                <Building2 className="w-10 h-10 text-slate-500 group-hover:text-fuchsia-500 mb-4 transition-colors" />
                <h3 className="text-lg font-bold mb-2">Configurar mi local</h3>
                <p className="text-xs text-slate-400 mb-4">Añade los datos de tu local ahora y empieza a operar al instante.</p>
                <div className="mt-auto flex items-center text-fuchsia-500 text-xs font-bold uppercase tracking-wider">
                  Empezar <ChevronRight className="w-4 h-4 ml-1" />
                </div>
              </button>

              <button onClick={handleDelegate} disabled={loading} className="flex flex-col items-center text-center p-6 bg-slate-950 border border-slate-800 hover:border-indigo-500 rounded-2xl transition-all group disabled:opacity-50">
                <Handshake className="w-10 h-10 text-slate-500 group-hover:text-indigo-500 mb-4 transition-colors" />
                <h3 className="text-lg font-bold mb-2">Delegar en BlowNights</h3>
                <p className="text-xs text-slate-400 mb-4">¿Prefieres que lo hagamos nosotros? Nuestro equipo configurará y gestionará tu perfil.</p>
                <div className="mt-auto flex items-center text-indigo-500 text-xs font-bold uppercase tracking-wider">
                  {loading ? 'Procesando...' : 'Solicitar'} <ChevronRight className="w-4 h-4 ml-1" />
                </div>
              </button>
            </motion.div>
          )}

          {step === 'form' && (
            <motion.form key="form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Nombre del Local</label>
                <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-white text-sm rounded-xl px-4 py-3 focus:border-fuchsia-500" placeholder="Ej. Amnesia Ibiza" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Tipo</label>
                  <select required value={type} onChange={e => setType(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-white text-sm rounded-xl px-4 py-3 focus:border-fuchsia-500 appearance-none">
                    <option value="club">Club / Discoteca</option>
                    <option value="bar">Bar</option>
                    <option value="pub">Pub</option>
                    <option value="lounge">Lounge</option>
                    <option value="sauna">Sauna</option>
                    <option value="cruising">Cruising</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Ciudad</label>
                  <select required value={cityId} onChange={e => setCityId(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-white text-sm rounded-xl px-4 py-3 focus:border-fuchsia-500 appearance-none">
                    <option value="" disabled>Seleccionar</option>
                    {cities.map(c => <option key={c.id} value={c.id}>{c.name || c.id}</option>)}
                    <option value="other">Otra</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setStep('choice')} className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold rounded-xl transition-all">
                  Volver
                </button>
                <button type="submit" disabled={loading} className="flex-1 py-3 bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-sm font-black uppercase tracking-widest rounded-xl transition-all disabled:opacity-50">
                  {loading ? 'Creando...' : 'Crear Local'}
                </button>
              </div>
            </motion.form>
          )}

          {step === 'delegated' && (
            <motion.div key="delegated" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
              <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-indigo-500" />
              </div>
              <h2 className="text-2xl font-black mb-2">¡Recibido!</h2>
              <p className="text-slate-400 max-w-sm mx-auto mb-8">
                Has elegido delegar la gestión. Nuestro equipo se pondrá en contacto contigo pronto para acordar las tarifas y detalles del servicio de gestión integral (Management Fee).
              </p>
              <button onClick={() => window.location.reload()} className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold rounded-xl transition-all">
                Recargar panel
              </button>
            </motion.div>
          )}

          {step === 'done' && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
              <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-2xl font-black mb-2">¡Local Creado!</h2>
              <p className="text-slate-400 max-w-sm mx-auto mb-8">
                Tu local se ha configurado correctamente. Ya puedes acceder a tu panel de control.
              </p>
              <button onClick={() => window.location.reload()} className="px-8 py-3 bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-sm font-bold uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-fuchsia-500/20">
                Entrar al Panel
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
