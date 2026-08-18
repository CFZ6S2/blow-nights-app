'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { motion } from 'framer-motion';

export default function RRPPComprarCreditosPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleComprar = async (quantity: number) => {
    if (!user) return;
    setLoading(true);
    try {
      const createQRPackageCheckout = httpsCallable(functions, 'createQRPackageCheckout');
      const res = await createQRPackageCheckout({ quantity, origin: window.location.origin });
      const { url } = res.data as { url: string };
      window.location.href = url;
    } catch (error: any) {
      alert('Error: ' + error.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 pb-24 font-sans">
      <div className="max-w-md mx-auto pt-8">
        <header className="mb-8 text-center">
          <div className="inline-block px-3 py-1 bg-fuchsia-900/30 text-fuchsia-400 rounded-full text-[10px] font-black tracking-widest uppercase mb-4 border border-fuchsia-500/20">
            Tienda de Créditos
          </div>
          <h1 className="text-3xl font-black mb-2">Recarga QRs</h1>
          <p className="text-sm text-slate-400">Compra paquetes de entradas para seguir emitiendo en tus fiestas.</p>
        </header>

        <div className="space-y-4">
          <motion.div 
            whileTap={{ scale: 0.98 }}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between"
          >
            <div>
              <h2 className="text-2xl font-black mb-1">Pack 50 Entradas</h2>
              <p className="text-slate-400 text-sm mb-4">Válido para cualquier fiesta. 0,50€ por QR.</p>
              <div className="text-3xl font-black text-fuchsia-400 mb-6">25 €</div>
            </div>
            <button 
              onClick={() => handleComprar(50)}
              disabled={loading}
              className="w-full bg-white hover:bg-slate-200 text-black font-black py-4 rounded-2xl uppercase tracking-widest text-sm transition-colors"
            >
              {loading ? 'Procesando...' : 'Comprar Ahora'}
            </button>
          </motion.div>

          <motion.div 
            whileTap={{ scale: 0.98 }}
            className="bg-slate-900 border border-fuchsia-500/30 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between"
          >
            <div className="absolute top-0 right-0 bg-fuchsia-600 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-widest">
              Más Popular
            </div>
            <div>
              <h2 className="text-2xl font-black mb-1">Pack 100 Entradas</h2>
              <p className="text-slate-400 text-sm mb-4">La mejor opción para grandes eventos.</p>
              <div className="text-3xl font-black text-fuchsia-400 mb-6">50 €</div>
            </div>
            <button 
              onClick={() => handleComprar(100)}
              disabled={loading}
              className="w-full bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-sm transition-colors shadow-[0_0_30px_-10px_rgba(192,38,211,0.5)]"
            >
              {loading ? 'Procesando...' : 'Comprar Ahora'}
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
