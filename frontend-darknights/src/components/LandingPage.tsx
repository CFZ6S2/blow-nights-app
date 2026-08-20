'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, limit, getCountFromServer } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getAnalytics, logEvent } from 'firebase/analytics';
import app from '@/lib/firebase';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

interface LandingPageProps {
  onStart: () => void;
}

const stagger: any = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};
const fadeUp: any = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
};

export default function LandingPage({ onStart }: LandingPageProps) {
  const [onlineCount, setOnlineCount] = useState(0);
  const [venueCount, setVenueCount] = useState(0);
  const { t } = useTranslation();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // No consultamos la colección de usuarios aquí para evitar errores de permisos, 
        // ya que los visitantes no están autenticados.
        const venuesQ = query(collection(db, 'venues'), where('isActive', '==', true));
        const venuesSnap = await getCountFromServer(venuesQ);
        setVenueCount(venuesSnap.data().count);
      } catch {}
    };
    fetchStats();
  }, []);

  const handleStart = () => {
    try { logEvent(getAnalytics(app), 'landing_start_click'); } catch {}
    onStart();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-fuchsia-500/30 overflow-x-hidden">

      {/* ═══ HERO ═══ */}
      <header className="relative min-h-[100dvh] flex flex-col items-center justify-center px-6 overflow-hidden">
        {/* Top nav links */}
        <div className="absolute top-0 left-0 right-0 z-50 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/business" className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500 hover:text-slate-800 transition-colors">{t('landing.nav_venues')}</Link>
            <Link href="/rrpp" className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500 hover:text-slate-800 transition-colors">{t('landing.nav_rrpp')}</Link>
          </div>
        </div>

        {/* Ambient glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.3, 0.15] }}
            transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
            className="absolute -top-[30%] -left-[20%] w-[70%] h-[70%] bg-slate-900 blur-[160px] rounded-full"
          />
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.25, 0.1] }}
            transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
            className="absolute -bottom-[20%] -right-[15%] w-[60%] h-[60%] bg-indigo-600 blur-[180px] rounded-full"
          />
        </div>

        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="relative z-10 max-w-3xl w-full text-center space-y-8"
        >
          {/* Live pill */}
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            <span className="text-[11px] font-bold text-slate-500 tracking-wide">
              {onlineCount > 0 ? t('landing.active_now', { count: onlineCount }) : t('landing.live_city')}
            </span>
          </motion.div>

          {/* Headline */}
          <motion.div variants={fadeUp} className="space-y-4">
            <h1 className="text-[clamp(3rem,10vw,6.5rem)] font-[1000] tracking-[-0.04em] leading-[0.85]">
              BLOW{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-400 via-purple-400 to-indigo-400">
                NIGHTS
              </span>
            </h1>
            <p className="text-lg md:text-xl text-slate-500 max-w-xl mx-auto leading-relaxed font-medium">
              {t('landing.hero_desc_1')}<br className="hidden sm:block" />
              {t('landing.hero_desc_2')}
            </p>
          </motion.div>

          {/* CTA */}
          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <button
              onClick={handleStart}
              className="w-full sm:w-auto px-14 py-5 rounded-2xl bg-white text-black font-[900] text-[13px] uppercase tracking-[0.15em] hover:bg-slate-100 active:scale-[0.97] transition-all shadow-[0_15px_40px_rgba(255,255,255,0.08)]"
            >
              {t('landing.enter_free')}
            </button>
            <Link
              href="/rules"
              className="w-full sm:w-auto px-14 py-5 rounded-2xl bg-white/[0.04] text-slate-900/80 border border-white/10 font-bold text-[13px] uppercase tracking-[0.1em] hover:bg-white/[0.08] transition-all backdrop-blur-sm text-center"
            >
              {t('landing.how_it_works')}
            </Link>
          </motion.div>

          {/* Stats bar */}
          <motion.div variants={fadeUp} className="flex items-center justify-center gap-8 pt-6 text-center">
            {[
              { value: venueCount > 0 ? `${venueCount}+` : '—', label: t('landing.stat_venues') },
              { value: '6', label: t('landing.stat_types') },
              { value: 'QR', label: t('landing.stat_tickets') },
            ].map((s, i) => (
              <div key={i} className="space-y-1">
                <div className="text-2xl font-[900] tracking-tight text-slate-900">{s.value}</div>
                <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity }} className="text-slate-600">
            <span className="material-icons text-xl">expand_more</span>
          </motion.div>
        </motion.div>
      </header>

      {/* ═══ WHAT IS BLOW NIGHTS ═══ */}
      <section className="py-24 md:py-32 px-6">
        <div className="max-w-5xl mx-auto space-y-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl space-y-4"
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-900">{t('landing.what_is')}</p>
            <h2 className="text-3xl md:text-5xl font-[900] tracking-tight leading-[1.1]">
              {t('landing.not_dating')}<br />
              <span className="text-slate-500">{t('landing.is_circuit')}</span>
            </h2>
            <p className="text-slate-500 text-base leading-relaxed max-w-lg">
              {t('landing.about_desc')}
            </p>
          </motion.div>

          {/* Feature grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                icon: 'nightlife',
                title: t('landing.feat1_title'),
                desc: t('landing.feat1_desc'),
                gradient: 'from-fuchsia-500/15 to-purple-500/5',
                border: 'border-slate-700/15',
                iconColor: 'text-slate-800',
              },
              {
                icon: 'confirmation_number',
                title: t('landing.feat2_title'),
                desc: t('landing.feat2_desc'),
                gradient: 'from-yellow-500/10 to-amber-500/5',
                border: 'border-yellow-500/15',
                iconColor: 'text-yellow-400',
              },
              {
                icon: 'location_on',
                title: t('landing.feat3_title'),
                desc: t('landing.feat3_desc'),
                gradient: 'from-green-500/10 to-emerald-500/5',
                border: 'border-green-500/15',
                iconColor: 'text-green-400',
              },
              {
                icon: 'map',
                title: t('landing.feat4_title'),
                desc: t('landing.feat4_desc'),
                gradient: 'from-indigo-500/10 to-blue-500/5',
                border: 'border-indigo-500/15',
                iconColor: 'text-indigo-400',
              },
              {
                icon: 'shield',
                title: t('landing.feat5_title'),
                desc: t('landing.feat5_desc'),
                gradient: 'from-red-500/10 to-rose-500/5',
                border: 'border-red-500/15',
                iconColor: 'text-red-400',
              },
              {
                icon: 'travel_explore',
                title: t('landing.feat6_title'),
                desc: t('landing.feat6_desc'),
                gradient: 'from-cyan-500/10 to-teal-500/5',
                border: 'border-cyan-500/15',
                iconColor: 'text-cyan-400',
              },
            ].map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className={`bg-gradient-to-br ${f.gradient} border ${f.border} rounded-3xl p-6 space-y-3 hover:scale-[1.02] transition-transform`}
              >
                <div className="w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center">
                  <span className={`material-icons ${f.iconColor} text-xl`}>{f.icon}</span>
                </div>
                <h3 className="text-[15px] font-[800] tracking-tight">{f.title}</h3>
                <p className="text-[13px] text-slate-500 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="py-24 md:py-32 px-6 border-t border-white/[0.04]">
        <div className="max-w-4xl mx-auto space-y-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center space-y-3"
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-900">{t('landing.how_it_works')}</p>
            <h2 className="text-3xl md:text-5xl font-[900] tracking-tight">{t('landing.steps_title')}</h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {[
              {
                step: '01',
                title: t('landing.step1_title'),
                desc: t('landing.step1_desc'),
                icon: 'person_add',
              },
              {
                step: '02',
                title: t('landing.step2_title'),
                desc: t('landing.step2_desc'),
                icon: 'explore',
              },
              {
                step: '03',
                title: t('landing.step3_title'),
                desc: t('landing.step3_desc'),
                icon: 'celebration',
              },
            ].map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative space-y-4 text-center md:text-left"
              >
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/5 border border-white/10">
                  <span className="material-icons text-slate-800 text-2xl">{s.icon}</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 justify-center md:justify-start">
                    <span className="text-[10px] font-[900] text-slate-600 tracking-widest">{s.step}</span>
                    <h3 className="text-lg font-[800] tracking-tight">{s.title}</h3>
                  </div>
                  <p className="text-[13px] text-slate-500 leading-relaxed">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ VENUE TYPES ═══ */}
      <section className="py-24 md:py-32 px-6 border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto space-y-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-3"
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-900">{t('landing.venue_types')}</p>
            <h2 className="text-3xl md:text-5xl font-[900] tracking-tight">{t('landing.venue_title')}</h2>
            <p className="text-slate-500 max-w-lg">{t('landing.venue_desc')}</p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { icon: 'local_bar', name: t('landing.vtype_bars'), hours: '20:00 – 02:00', tag: null },
              { icon: 'nightlife', name: t('landing.vtype_clubs'), hours: '01:00 – 06:00', tag: null },
              { icon: 'wb_twilight', name: t('landing.vtype_afters'), hours: '06:00 – 12:00', tag: null },
              { icon: 'hot_tub', name: t('landing.vtype_saunas'), hours: '12:00 – 03:00', tag: '18+' },
              { icon: 'sensor_door', name: t('landing.vtype_cruising'), hours: '22:00 – 06:00', tag: '18+' },
              { icon: 'park', name: t('landing.vtype_outdoor'), hours: '22:00 – 06:00', tag: '18+' },
            ].map((v, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 flex items-start gap-3 hover:bg-white/[0.06] transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                  <span className="material-icons text-slate-500 text-lg">{v.icon}</span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-[13px] font-[800] truncate">{v.name}</h4>
                    {v.tag && (
                      <span className="bg-red-500/20 text-red-400 text-[8px] font-[900] px-1.5 py-0.5 rounded uppercase tracking-wider flex-shrink-0">
                        {v.tag}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium mt-0.5">{v.hours}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ B2B / FOR VENUES ═══ */}
      <section className="py-24 md:py-32 px-6 border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-br from-slate-800/10 via-indigo-600/5 to-transparent border border-slate-700/10 rounded-[2rem] p-8 md:p-12 space-y-8"
          >
            <div className="space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-800">{t('landing.b2b_tag')}</p>
              <h2 className="text-2xl md:text-4xl font-[900] tracking-tight">
                {t('landing.b2b_title')}
              </h2>
              <p className="text-slate-500 max-w-lg leading-relaxed">
                {t('landing.b2b_desc')}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: 'storefront', label: t('landing.b2b_panel') },
                { icon: 'qr_code_scanner', label: t('landing.b2b_qr') },
                { icon: 'campaign', label: t('landing.b2b_promos') },
                { icon: 'analytics', label: t('landing.b2b_metrics') },
              ].map((t, i) => (
                <div key={i} className="flex items-center gap-3 bg-white/[0.04] border border-white/[0.06] rounded-xl p-4">
                  <span className="material-icons text-slate-800 text-xl">{t.icon}</span>
                  <span className="text-[12px] font-bold">{t.label}</span>
                </div>
              ))}
            </div>

            <Link
              href="/business"
              className="inline-block px-8 py-4 rounded-xl bg-slate-900 text-slate-900 font-[800] text-[12px] uppercase tracking-[0.12em] hover:bg-fuchsia-500 active:scale-[0.97] transition-all"
            >
              {t('landing.b2b_register')}
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ═══ PRIVACY & SAFETY ═══ */}
      <section className="py-24 md:py-32 px-6 border-t border-white/[0.04]">
        <div className="max-w-4xl mx-auto text-center space-y-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
              <span className="material-icons text-indigo-400 text-3xl">verified_user</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-[900] tracking-tight">{t('landing.privacy_title')}</h2>
            <p className="text-slate-500 max-w-lg mx-auto leading-relaxed">
              {t('landing.privacy_desc')}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {[
              { icon: 'visibility', label: t('landing.priv_public'), desc: t('landing.priv_public_desc'), color: 'text-slate-800' },
              { icon: 'visibility_off', label: t('landing.priv_ghost'), desc: t('landing.priv_ghost_desc'), color: 'text-indigo-400' },
              { icon: 'shield', label: t('landing.priv_anon'), desc: t('landing.priv_anon_desc'), color: 'text-red-400' },
            ].map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 space-y-2"
              >
                <span className={`material-icons ${m.color} text-2xl`}>{m.icon}</span>
                <h4 className="text-sm font-[800]">{m.label}</h4>
                <p className="text-[11px] text-slate-500">{m.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>


      {/* ═══ FOOTER ═══ */}
      <footer className="py-16 px-6 border-t border-white/[0.04] text-center space-y-6">
        <div className="flex justify-center gap-8">
          <Link href="/business" className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-900 hover:text-slate-800 transition-colors">{t('landing.footer_business')}</Link>
          <Link href="/terms" className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-600 hover:text-slate-900 transition-colors">{t('landing.footer_terms')}</Link>
          <Link href="/privacy" className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-600 hover:text-slate-900 transition-colors">{t('landing.footer_privacy')}</Link>
          <Link href="/rules" className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-600 hover:text-slate-900 transition-colors">{t('landing.footer_rules')}</Link>
        </div>
        <p className="text-[10px] text-slate-700 font-medium uppercase tracking-[0.15em]">
          &copy; 2026 DarkNights
        </p>
      </footer>
    </div>
  );
}
