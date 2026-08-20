'use client';

import React, { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useTranslation, Trans } from 'react-i18next';

function ClaimVenueContent() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const venue = searchParams.get('venue') || t('business.claim.default_venue');
  const router = useRouter();

  const handleClaim = (e: React.FormEvent) => {
    e.preventDefault();
    alert(t('business.claim.alert_success'));
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-[#07080d] text-white flex flex-col justify-center items-center p-6 selection:bg-amber-500/30">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-slate-900 border border-white/10 p-8 rounded-3xl relative overflow-hidden shadow-2xl"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-yellow-600" />
        
        <div className="text-5xl mb-6">🏪</div>
        
        <h1 className="text-2xl font-black mb-4 leading-tight">
          {t('business.claim.title')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-500">{venue}</span>
        </h1>
        
        <p className="text-slate-400 text-sm mb-6 leading-relaxed">
          <Trans i18nKey="business.claim.description">
            Tus promotores (RRPPs) ya están utilizando <strong>Blow Nights</strong> para gestionar listas y accesos en tu local de forma independiente.
          </Trans>
        </p>
        
        <div className="bg-amber-900/20 border border-amber-500/20 p-4 rounded-xl mb-8">
          <h3 className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-2">{t('business.claim.benefits_title')}</h3>
          <ul className="space-y-3 text-sm text-slate-300">
            <li className="flex items-start gap-2">
              <span className="text-amber-500">✓</span> {t('business.claim.benefits_1')}
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500">✓</span> {t('business.claim.benefits_2')}
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500">✓</span> {t('business.claim.benefits_3')}
            </li>
          </ul>
        </div>

        <form onSubmit={handleClaim} className="space-y-4">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">{t('business.claim.form.name_label')}</label>
            <input required placeholder={t('business.claim.form.name_placeholder')} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-amber-500 outline-none" />
          </div>
          
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">{t('business.claim.form.phone_label')}</label>
            <input required type="tel" placeholder="+34 600 000 000" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-amber-500 outline-none" />
          </div>

          <button 
            type="submit"
            className="w-full bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black font-black py-4 rounded-xl shadow-[0_0_20px_-5px_rgba(245,158,11,0.5)] transition-all mt-4"
          >
            {t('business.claim.form.submit')}
          </button>
        </form>
        
        <p className="text-center text-[10px] text-slate-500 mt-6">
          {t('business.claim.footer_note')}
        </p>
      </motion.div>
    </div>
  );
}

export default function ClaimVenuePage() {
  const { t } = useTranslation();
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#07080d] flex items-center justify-center text-xs text-white">{t('common.loading')}</div>}>
      <ClaimVenueContent />
    </Suspense>
  );
}
