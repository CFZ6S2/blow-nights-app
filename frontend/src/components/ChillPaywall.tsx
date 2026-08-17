'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { useCity } from '@/context/CityContext';

export default function ChillPaywall({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState<string | null>(null);
  const { currentCity } = useCity();

  const handlePurchase = async (passType: 'weekend' | 'monthly' | 'quarterly') => {
    setLoading(passType);
    try {
      const createChillPassCheckout = httpsCallable(functions, 'createChillPassCheckout');
      const res = await createChillPassCheckout({
        passType,
        origin: window.location.origin,
        citySlug: currentCity?.slug || '',
      });
      const { url } = res.data as { url: string };
      if (url) window.location.href = url;
    } catch (e: any) {
      alert('Error: ' + e.message);
      setLoading(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/90 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-gradient-to-b from-slate-900 to-black border border-fuchsia-500/20 w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 pb-10 relative overflow-hidden"
      >
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-fuchsia-500/10 rounded-full blur-[100px] -z-10" />

        <button onClick={onClose} className="absolute top-4 right-4 text-slate-600 hover:text-white transition-colors">
          <span className="material-icons">close</span>
        </button>

        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-full mb-4">
            <span className="material-icons text-fuchsia-400 text-sm">local_fire_department</span>
            <span className="text-[10px] font-black text-fuchsia-400 uppercase tracking-widest">Acceso Exclusivo</span>
          </div>

          <h2 className="text-2xl font-black text-white mb-2 leading-tight">
            Chills & Afters Privados
          </h2>
          <p className="text-sm text-slate-400">
            Desbloquea el pase para conectar con las fiestas privadas de esta noche
            {currentCity ? ` en ${currentCity.name}` : ''}.
          </p>
        </div>

        {/* Pricing cards */}
        <div className="space-y-3 mb-6">
          {/* Weekend pass — preselected */}
          <button
            onClick={() => handlePurchase('weekend')}
            disabled={loading !== null}
            className="w-full text-left bg-fuchsia-600/20 border-2 border-fuchsia-500 rounded-2xl p-4 hover:bg-fuchsia-600/30 transition-all active:scale-[0.98] relative overflow-hidden group"
          >
            <div className="absolute top-2 right-3">
              <span className="text-[9px] font-black bg-fuchsia-500 text-white px-2 py-0.5 rounded-full uppercase tracking-widest">Popular</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-black text-white text-base">Pase Fin de Semana</p>
                <p className="text-xs text-slate-400">48 horas de acceso completo</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-white">9,99 <span className="text-sm">€</span></p>
                <p className="text-[10px] text-slate-500">pago unico</p>
              </div>
            </div>
            {loading === 'weekend' && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-2xl">
                <div className="w-6 h-6 border-2 border-fuchsia-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </button>

          {/* Monthly VIP */}
          <button
            onClick={() => handlePurchase('monthly')}
            disabled={loading !== null}
            className="w-full text-left bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-all active:scale-[0.98] relative"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-black text-white text-base">Blow VIP Mensual</p>
                <p className="text-xs text-slate-400">Chills ilimitados + filtros + distintivo</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-white">19,99 <span className="text-sm">€</span></p>
                <p className="text-[10px] text-slate-500">/mes</p>
              </div>
            </div>
            {loading === 'monthly' && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-2xl">
                <div className="w-6 h-6 border-2 border-fuchsia-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </button>

          {/* Quarterly VIP */}
          <button
            onClick={() => handlePurchase('quarterly')}
            disabled={loading !== null}
            className="w-full text-left bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-all active:scale-[0.98] relative"
          >
            <div className="absolute top-2 right-3">
              <span className="text-[9px] font-black bg-green-500/80 text-white px-2 py-0.5 rounded-full uppercase tracking-widest">Ahorra 22%</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-black text-white text-base">Blow VIP Trimestral</p>
                <p className="text-xs text-slate-400">3 meses a 16,66 €/mes</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-white">49,99 <span className="text-sm">€</span></p>
                <p className="text-[10px] text-slate-500">/trimestre</p>
              </div>
            </div>
            {loading === 'quarterly' && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-2xl">
                <div className="w-6 h-6 border-2 border-fuchsia-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </button>
        </div>

        {/* Features list */}
        <div className="space-y-2 mb-4">
          {[
            'Acceso a chills y afters privados',
            'Crear tus propias reuniones',
            'Distintivo VIP en tu perfil',
            'Filtros avanzados en el radar',
          ].map((feature) => (
            <div key={feature} className="flex items-center gap-2">
              <span className="material-icons text-fuchsia-400 text-sm">check</span>
              <span className="text-xs text-slate-400">{feature}</span>
            </div>
          ))}
        </div>

        <p className="text-[10px] text-slate-600 text-center">
          Pago seguro con Stripe. Cancela cuando quieras.
        </p>
      </motion.div>
    </motion.div>
  );
}
