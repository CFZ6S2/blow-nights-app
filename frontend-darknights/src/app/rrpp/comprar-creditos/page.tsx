'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRequireRole } from '@/hooks/useRequireRole';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

export default function RRPPComprarCreditosPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isReady } = useRequireRole(['rrpp', 'admin', 'superadmin'], '/rrpp/register');
  const [loading, setLoading] = useState(false);

  if (!isReady) return <div className="min-h-screen bg-black flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-slate-700" /></div>;

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
    <div className="min-h-screen bg-black text-slate-900 p-6 pb-24 font-sans">
      <div className="max-w-md mx-auto pt-8">
        <header className="mb-8 text-center">
          <div className="inline-block px-3 py-1 bg-fuchsia-900/30 text-slate-800 rounded-full text-[10px] font-black tracking-widest uppercase mb-4 border border-slate-700/20">
            {t('rrppBuyCredits.title')}
          </div>
          <h1 className="text-3xl font-black mb-2">{t('rrppBuyCredits.rechargeQrs')}</h1>
          <p className="text-sm text-slate-500">{t('rrppBuyCredits.buyDesc')}</p>
        </header>

        <div className="space-y-4">
          <motion.div 
            whileTap={{ scale: 0.98 }}
            className="bg-white border border-slate-200 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between"
          >
            <div>
              <h2 className="text-2xl font-black mb-1">{t('rrppBuyCredits.pack50')}</h2>
              <p className="text-slate-500 text-sm mb-4">{t('rrppBuyCredits.pack50Desc')}</p>
              <div className="text-3xl font-black text-slate-800 mb-6">25 €</div>
            </div>
            <button 
              onClick={() => handleComprar(50)}
              disabled={loading}
              className="w-full bg-white hover:bg-slate-200 text-black font-black py-4 rounded-2xl uppercase tracking-widest text-sm transition-colors"
            >
              {loading ? t('rrppBuyCredits.processing') : t('rrppBuyCredits.buyNow')}
            </button>
          </motion.div>

          <motion.div 
            whileTap={{ scale: 0.98 }}
            className="bg-white border border-slate-700/30 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between"
          >
            <div className="absolute top-0 right-0 bg-slate-900 text-slate-900 text-[10px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-widest">
              {t('rrppBuyCredits.mostPopular')}
            </div>
            <div>
              <h2 className="text-2xl font-black mb-1">{t('rrppBuyCredits.pack100')}</h2>
              <p className="text-slate-500 text-sm mb-4">{t('rrppBuyCredits.pack100Desc')}</p>
              <div className="text-3xl font-black text-slate-800 mb-6">50 €</div>
            </div>
            <button 
              onClick={() => handleComprar(100)}
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-fuchsia-500 text-slate-900 font-black py-4 rounded-2xl uppercase tracking-widest text-sm transition-colors shadow-[0_0_30px_-10px_rgba(192,38,211,0.5)]"
            >
              {loading ? t('rrppBuyCredits.processing') : t('rrppBuyCredits.buyNow')}
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
