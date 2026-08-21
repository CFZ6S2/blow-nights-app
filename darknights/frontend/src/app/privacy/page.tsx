'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

export default function PrivacyPage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-white text-slate-900 p-6 md:p-12 pb-32">
      <div className="max-w-3xl mx-auto space-y-12">
        <header className="space-y-4">
          <Link href="/login" prefetch={false} className="inline-flex items-center gap-2 text-amber-500 font-black uppercase tracking-widest text-[10px] hover:translate-x-[-4px] transition-transform">
            <span className="material-icons text-sm">arrow_back</span>
            {t('privacy.back')}
          </Link>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-500">
            {t('privacy.title')}
          </h1>
          <p className="text-slate-500 text-sm">{t('privacy.lastUpdated')}</p>
        </header>

        <main className="space-y-10 text-slate-300 leading-relaxed">
          <section className="space-y-4">
            <h2 className="text-xl font-black text-white uppercase tracking-wider border-b border-slate-200 pb-2">{t('privacy.section1.title')}</h2>
            <p>
              {t('privacy.section1.p1')}
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>{t('privacy.section1.li1.strong')}</strong> {t('privacy.section1.li1.text')}</li>
              <li><strong>{t('privacy.section1.li2.strong')}</strong> {t('privacy.section1.li2.text')}</li>
              <li><strong>{t('privacy.section1.li3.strong')}</strong> {t('privacy.section1.li3.text')}</li>
              <li><strong>{t('privacy.section1.li4.strong')}</strong> {t('privacy.section1.li4.text')}</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-black text-white uppercase tracking-wider border-b border-slate-200 pb-2">{t('privacy.section2.title')}</h2>
            <p>
              {t('privacy.section2.p1')}
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>{t('privacy.section2.li1')}</li>
              <li>{t('privacy.section2.li2')}</li>
              <li>{t('privacy.section2.li3')}</li>
              <li>{t('privacy.section2.li4')}</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-black text-white uppercase tracking-wider border-b border-slate-200 pb-2">{t('privacy.section3.title')}</h2>
            <p>
              {t('privacy.section3.p1')}
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-black text-white uppercase tracking-wider border-b border-slate-200 pb-2">{t('privacy.section4.title')}</h2>
            <p>
              {t('privacy.section4.p1')}
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-black text-white uppercase tracking-wider border-b border-slate-200 pb-2">{t('privacy.section5.title')}</h2>
            <p>
              {t('privacy.section5.p1')}
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-black text-white uppercase tracking-wider border-b border-slate-200 pb-2">{t('privacy.section6.title')}</h2>
            <p>
              {t('privacy.section6.p1')}
            </p>
          </section>
        </main>

        <footer className="pt-12 border-t border-slate-200 text-center">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">{t('privacy.footer')}</p>
        </footer>
      </div>
    </div>
  );
}
