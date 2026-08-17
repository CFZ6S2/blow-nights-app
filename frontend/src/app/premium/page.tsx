'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';


export default function PremiumPage() {
  const { user, profile, loading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubscribe = async (priceId: string) => {
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
        setError('No se pudo crear la sesión de pago.');
      }
    } catch (err) {
      console.error("Error creating checkout session", err);
      setError('Hubo un error al iniciar el pago. Inténtalo de nuevo.');
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
        <h1 className="text-2xl font-bold">Hazte Premium</h1>
      </header>

      <main className="max-w-4xl mx-auto w-full space-y-12">
        <div className="text-center space-y-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-block bg-gradient-to-r from-fuchsia-600 to-indigo-600 px-6 py-2 rounded-full mb-4 shadow-[0_0_30px_rgba(217,70,239,0.3)]"
          >
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">🔥 Oferta de Lanzamiento</span>
          </motion.div>
          <h2 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-600 leading-tight">
            Desbloquea todo el potencial
          </h2>
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-[2rem] max-w-lg mx-auto border-dashed border-fuchsia-500/50">
            <p className="text-slate-200 text-sm font-bold">
              ¡Estamos de celebración! 🎉
            </p>
            <p className="text-slate-400 text-xs mt-2">
              Los <span className="text-fuchsia-400 font-black">primeros 1.000 usuarios</span> que se registren obtendrán el plan <span className="text-yellow-500 font-black">PREMIUM GRATIS</span> para siempre.
            </p>
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
            <h3 className="text-2xl font-bold text-yellow-500">¡Ya eres Premium!</h3>
            <p className="text-slate-300">Gracias por apoyar a la comunidad. Tienes acceso a todas las funciones.</p>
            <button 
              onClick={() => router.push('/')}
              className="mt-4 bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 px-8 rounded-2xl transition-all"
            >
              Volver al Mapa
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
                <h3 className="text-xl font-black uppercase tracking-widest text-slate-400">Mensual</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-black">9,99€</span>
                  <span className="text-slate-500 text-xs font-black">/MES</span>
                </div>
              </div>
              <ul className="space-y-4 text-xs font-bold text-slate-400">
                <li className="flex items-center gap-3"><span className="material-icons text-fuchsia-500 text-sm">check_circle</span> Sin publicidad</li>
                <li className="flex items-center gap-3"><span className="material-icons text-fuchsia-500 text-sm">check_circle</span> Ver quién te visitó</li>
                <li className="flex items-center gap-3"><span className="material-icons text-fuchsia-500 text-sm">check_circle</span> Filtros avanzados</li>
                <li className="flex items-center gap-3"><span className="material-icons text-fuchsia-500 text-sm">check_circle</span> Modo incógnito</li>
              </ul>
              <button
                disabled={isSubmitting}
                // TODO(buyer): reemplaza por el Price ID real del plan mensual creado en el Dashboard de Stripe.
                onClick={() => handleSubscribe('price_monthly_placeholder')}
                className="w-full bg-white text-black font-black py-5 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-widest text-[10px]"
              >
                Elegir este plan
              </button>
            </motion.div>

            {/* Plan Anual (Más popular) */}
            <motion.div 
              whileHover={{ y: -10 }}
              className="bg-gradient-to-br from-indigo-600/20 to-fuchsia-600/20 backdrop-blur-xl border-2 border-fuchsia-500 p-8 rounded-[2.5rem] flex flex-col space-y-6 relative overflow-hidden group shadow-[0_20px_50px_rgba(217,70,239,0.2)]"
            >
              <div className="absolute top-0 right-0 bg-fuchsia-500 text-white text-[10px] font-black px-4 py-2 rounded-bl-2xl uppercase tracking-widest">
                Ahorra 40%
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black uppercase tracking-widest text-fuchsia-400">Anual</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-black">69,99€</span>
                  <span className="text-slate-500 text-xs font-black">/AÑO</span>
                </div>
              </div>
              <ul className="space-y-4 text-xs font-bold text-white/80">
                <li className="flex items-center gap-3 font-black text-fuchsia-400"><span className="material-icons text-sm">stars</span> Todo lo del plan mensual</li>
                <li className="flex items-center gap-3"><span className="material-icons text-fuchsia-500 text-sm">check_circle</span> 3 Boosts al mes</li>
                <li className="flex items-center gap-3"><span className="material-icons text-fuchsia-500 text-sm">check_circle</span> Insignia VIP</li>
                <li className="flex items-center gap-3"><span className="material-icons text-fuchsia-500 text-sm">check_circle</span> Soporte prioritario</li>
              </ul>
              <button
                disabled={isSubmitting}
                // TODO(buyer): reemplaza por el Price ID real del plan anual creado en el Dashboard de Stripe.
                onClick={() => handleSubscribe('price_yearly_placeholder')}
                className="w-full bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white font-black py-5 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-widest text-[10px] shadow-lg shadow-fuchsia-500/20"
              >
                Activar Plan Anual
              </button>
            </motion.div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center mt-12">
          <div className="p-6">
            <div className="text-3xl mb-2">🔒</div>
            <h4 className="font-bold">Pago Seguro</h4>
            <p className="text-xs text-slate-500 mt-1">Encriptación SSL de 256 bits procesada por Stripe.</p>
          </div>
          <div className="p-6">
            <div className="text-3xl mb-2">🔄</div>
            <h4 className="font-bold">Sin Compromiso</h4>
            <p className="text-xs text-slate-500 mt-1">Cancela tu suscripción en cualquier momento.</p>
          </div>
          <div className="p-6">
            <div className="text-3xl mb-2">✨</div>
            <h4 className="font-bold">Nuevas Funciones</h4>
            <p className="text-xs text-slate-500 mt-1">Acceso inmediato a todas las futuras novedades.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
