'use client';

import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

export default function SetupStripePage() {
  const { user } = useAuth();
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [promoResult, setPromoResult] = useState<any>(null);
  const [promoLoading, setPromoLoading] = useState(false);

  const handleSetup = async () => {
    setLoading(true);
    setError('');
    try {
      const setup = httpsCallable(functions, 'setupStripeProducts');
      const res = await setup({});
      setResult(res.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Login required</div>;

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-2xl font-bold mb-4">Setup Stripe Products</h1>
      <p className="text-slate-400 mb-6">Crea los productos y precios en Stripe. Solo ejecutar una vez.</p>

      <button
        onClick={handleSetup}
        disabled={loading}
        className="px-6 py-3 bg-fuchsia-600 rounded-xl font-bold disabled:opacity-50"
      >
        {loading ? 'Creando productos...' : 'Crear Productos en Stripe'}
      </button>

      {error && <div className="mt-4 p-4 bg-red-500/20 border border-red-500 rounded-xl text-red-400">{error}</div>}

      <hr className="border-white/10 my-8" />

      <h2 className="text-xl font-bold mb-2">Promo Code de Test</h2>
      <p className="text-slate-400 mb-4">Crea un código TEST100 con 100% descuento para testing.</p>
      <button
        onClick={async () => {
          setPromoLoading(true);
          try {
            const fn = httpsCallable(functions, 'createTestPromoCode');
            const res = await fn({});
            setPromoResult(res.data);
          } catch (e: any) {
            setError(e.message);
          } finally {
            setPromoLoading(false);
          }
        }}
        disabled={promoLoading}
        className="px-6 py-3 bg-green-600 rounded-xl font-bold disabled:opacity-50"
      >
        {promoLoading ? 'Creando...' : 'Crear Promo Code TEST100'}
      </button>

      {promoResult && (
        <div className="mt-4 p-4 bg-green-500/20 border border-green-500 rounded-xl text-green-400">
          Código creado: <span className="font-mono font-bold text-white">TEST100</span> (100% off, max 50 usos)
        </div>
      )}

      {result && (
        <div className="mt-6">
          <h2 className="text-lg font-bold mb-2 text-green-400">Productos creados. Copia esto para functions/.env:</h2>
          <pre className="bg-slate-900 p-4 rounded-xl text-sm font-mono whitespace-pre-wrap select-all">
{Object.entries(result).map(([key, value]) => `${key}=${value}`).join('\n')}
          </pre>
        </div>
      )}
    </div>
  );
}
