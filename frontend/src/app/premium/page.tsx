'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY || 'pk_test_placeholder');

export default function PremiumPage() {
  const { user, profile, loading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubscribe = async (priceId) => {
    setIsSubmitting(true);
    setError('');

    try {
      const createCheckoutSession = httpsCallable(functions, 'createCheckoutSession');
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      
      const response = await createCheckoutSession({ 
        priceId, 
        origin 
      });

      const { url } = response.data;
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('No se pudo generar la sesión de Stripe');
      }
    } catch (err) {
      console.error("Error creating checkout session", err);
      setError('Hubo un error al conectar con Stripe. Inténtalo de nuevo.');
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
          <h2 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-600">
            Desbloquea todo el potencial
          </h2>
          <p className="text-slate-400 text-lg">Únete a la comunidad VIP y disfruta de ventajas exclusivas.</p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Plan Mensual */}
            <div className="bg-white/5 border border-white/10 p-8 rounded-3xl flex flex-col space-y-6 relative overflow-hidden group hover:border-purple-500/50 transition-all">
              <div className="space-y-2">
                <h3 className="text-xl font-bold">Mensual</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black">9,99€</span>
                  <span className="text-slate-500">/mes</span>
                </div>
              </div>
              <ul className="space-y-3 text-sm text-slate-400">
                <li className="flex items-center gap-2">✅ Sin publicidad</li>
                <li className="flex items-center gap-2">✅ Ver quién te visitó</li>
                <li className="flex items-center gap-2">✅ Filtros avanzados</li>
                <li className="flex items-center gap-2">✅ Modo incógnito</li>
              </ul>
              <button
                disabled={isSubmitting}
                onClick={() => handleSubscribe('price_monthly_placeholder')}
                className="w-full bg-white text-black font-bold py-4 rounded-2xl hover:bg-slate-200 transition-all"
              >
                Suscribirme
              </button>
            </div>

            {/* Plan Anual (Más popular) */}
            <div className="bg-gradient-to-br from-purple-900/40 to-indigo-900/40 border-2 border-purple-500 p-8 rounded-3xl flex flex-col space-y-6 relative overflow-hidden group transform scale-105 shadow-2xl shadow-purple-500/20">
              <div className="absolute top-0 right-0 bg-purple-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase">
                Ahorra 40%
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-purple-400">Anual</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black">69,99€</span>
                  <span className="text-slate-500">/año</span>
                </div>
              </div>
              <ul className="space-y-3 text-sm text-slate-300">
                <li className="flex items-center gap-2 font-medium text-white">⭐ Todo lo del plan mensual</li>
                <li className="flex items-center gap-2">✅ 3 Boosts al mes</li>
                <li className="flex items-center gap-2">✅ Insignia VIP</li>
                <li className="flex items-center gap-2">✅ Soporte prioritario</li>
              </ul>
              <button
                disabled={isSubmitting}
                onClick={() => handleSubscribe('price_yearly_placeholder')}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-4 rounded-2xl hover:opacity-90 transition-all shadow-lg"
              >
                Elegir Plan Anual
              </button>
            </div>
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
