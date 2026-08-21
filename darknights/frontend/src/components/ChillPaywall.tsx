'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

export default function ChillPaywall({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { t } = useTranslation();

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
        className="bg-gradient-to-b from-slate-900 to-black border border-slate-700 w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 pb-10 relative overflow-hidden"
      >
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-slate-500/10 rounded-full blur-[100px] -z-10" />

        <button onClick={onClose} className="absolute top-4 right-4 text-slate-600 hover:text-white transition-colors">
          <span className="material-icons">close</span>
        </button>

        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-200 rounded-full mb-4">
            <span className="material-icons text-white/70 text-sm">nightlife</span>
            <span className="text-[10px] font-black text-white uppercase tracking-widest">{t('paywall.exclusive_black')}</span>
          </div>

          <h2 className="text-2xl font-black text-white mb-2 leading-tight">
            {t('paywall.only_black')}
          </h2>
          <p className="text-sm text-slate-400">
            {t('paywall.black_desc')}
          </p>
        </div>

        <button
          onClick={() => router.push('/premium')}
          className="w-full bg-gradient-to-r from-slate-200 to-white text-black font-black py-4 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-transform uppercase tracking-widest text-[10px] shadow-[0_0_20px_rgba(255,255,255,0.3)] mb-4"
        >
          {t('paywall.view_plans')}
        </button>

        {/* Features list */}
        <div className="space-y-2 mb-4">
          {[
            t('paywall.feat_chills'),
            t('paywall.feat_create'),
            t('paywall.feat_vip'),
            t('paywall.feat_pings'),
          ].map((feature, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="material-icons text-slate-100 text-sm">check</span>
              <span className="text-xs text-slate-400">{feature}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
