'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, limit, getCountFromServer, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getAnalytics, logEvent } from 'firebase/analytics';
import app from '@/lib/firebase';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
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
  const [liveSenseVenues, setLiveSenseVenues] = useState<any[]>([]);
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

  useEffect(() => {
    const q = query(
      collection(db, 'live_sense'),
      where('current_count', '>', 0),
      orderBy('current_count', 'desc'),
      limit(8)
    );
    const unsub = onSnapshot(q, (snap) => {
      setLiveSenseVenues(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  const handleStart = () => {
    try { logEvent(getAnalytics(app), 'landing_start_click'); } catch {}
    onStart();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-fuchsia-500/30 overflow-x-hidden">

      {/* ═══ HERO ═══ */}
      <header className="relative min-h-[100dvh] flex flex-col items-center justify-center px-6 overflow-hidden">
        {/* Top nav links */}
        <div className="absolute top-0 left-0 right-0 z-50 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/entradas" className="text-[11px] font-black uppercase tracking-[0.12em] text-fuchsia-400 hover:text-white transition-colors bg-fuchsia-500/10 border border-fuchsia-500/20 px-3 py-1.5 rounded-full flex items-center gap-1.5">
              <span>🎟️</span> ENTRADAS
            </Link>
            <Link href="/business" className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 hover:text-fuchsia-400 transition-colors">{t('landing.nav_venues')}</Link>
            <Link href="/rrpp" className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 hover:text-fuchsia-400 transition-colors">{t('landing.nav_rrpp')}</Link>
          </div>
        </div>

        {/* Ambient glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.3, 0.15] }}
            transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
            className="absolute -top-[30%] -left-[20%] w-[70%] h-[70%] bg-fuchsia-600 blur-[160px] rounded-full"
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
            <span className="text-[11px] font-bold text-slate-400 tracking-wide">
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
            <p className="text-lg md:text-xl text-slate-400 max-w-xl mx-auto leading-relaxed font-medium">
              {t('landing.hero_desc_1')}<br className="hidden sm:block" />
              {t('landing.hero_desc_2')}
            </p>
          </motion.div>

          {/* CTA */}
          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              href="/entradas"
              className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white font-[900] text-[13px] uppercase tracking-[0.15em] transition-all shadow-[0_15px_40px_rgba(217,70,239,0.35)] text-center flex items-center justify-center gap-2 transform hover:scale-105"
            >
              <span>🎟️</span>
              <span>Comprar Entradas Sin Registro</span>
            </Link>
            <button
              onClick={handleStart}
              className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-white text-black font-[900] text-[13px] uppercase tracking-[0.15em] hover:bg-slate-100 active:scale-[0.97] transition-all shadow-[0_15px_40px_rgba(255,255,255,0.08)]"
            >
              {t('landing.enter_free')}
            </button>
            <Link
              href="/rules"
              className="w-full sm:w-auto px-8 py-5 rounded-2xl bg-white/[0.04] text-white/80 border border-white/10 font-bold text-[13px] uppercase tracking-[0.1em] hover:bg-white/[0.08] transition-all backdrop-blur-sm text-center"
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
                <div className="text-2xl font-[900] tracking-tight text-white">{s.value}</div>
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
          <div className="text-slate-500">
            <ChevronDown className="w-6 h-6 animate-bounce mx-auto" />
          </div>
        </motion.div>
      </header>

      {/* ═══ PUBLIC TICKETS CTA BANNER ═══ */}
      <section className="px-6 -mt-6 mb-12 relative z-20">
        <div className="max-w-5xl mx-auto bg-gradient-to-r from-fuchsia-950/80 via-slate-900 to-indigo-950/80 border border-fuchsia-500/30 rounded-3xl p-8 md:p-10 shadow-2xl backdrop-blur-2xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30 text-[10px] font-black uppercase tracking-widest">
              <span>🎟️ VENTA DIRECTA SIN REGISTRO</span>
            </div>
            <h2 className="text-2xl md:text-4xl font-black text-white tracking-tight">
              ¿Vas de fiesta esta noche? <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-indigo-400">Compra tu entrada en 10 segundos</span>
            </h2>
            <p className="text-slate-300 text-xs md:text-sm max-w-xl">
              Elige tu garito favorito, selecciona tu pase VIP o general y recibe tu QR anti-fraude sin necesidad de registrarte.
            </p>
          </div>

          <Link
            href="/entradas"
            className="px-8 py-5 bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-fuchsia-500/25 transition-all transform hover:scale-105 shrink-0 whitespace-nowrap"
          >
            Ver Entradas & Garitos →
          </Link>
        </div>
      </section>

      {/* ═══ WHAT IS BLOW NIGHTS ═══ */}
      <section className="py-24 md:py-32 px-6">
        <div className="max-w-5xl mx-auto space-y-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl space-y-4"
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-fuchsia-500">{t('landing.what_is')}</p>
            <h2 className="text-3xl md:text-5xl font-[900] tracking-tight leading-[1.1]">
              {t('landing.not_dating')}<br />
              <span className="text-slate-500">{t('landing.is_circuit')}</span>
            </h2>
            <p className="text-slate-400 text-base leading-relaxed max-w-lg">
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
                border: 'border-fuchsia-500/15',
                iconColor: 'text-fuchsia-400',
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
                <p className="text-[13px] text-slate-400 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TICKETS CTA ═══ */}
      <section className="py-16 px-6 border-t border-white/[0.04]">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-r from-yellow-500/10 via-amber-500/5 to-orange-500/10 border border-yellow-500/20 rounded-[2rem] p-8 md:p-10 flex flex-col md:flex-row items-center gap-6 md:gap-10"
          >
            <div className="flex-shrink-0">
              <div className="w-20 h-20 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                <span className="material-icons text-yellow-400 text-4xl">confirmation_number</span>
              </div>
            </div>
            <div className="flex-1 text-center md:text-left space-y-3">
              <h2 className="text-2xl md:text-3xl font-[900] tracking-tight">{t('landing.tickets_cta_title')}</h2>
              <p className="text-slate-400 text-sm leading-relaxed max-w-lg">{t('landing.tickets_cta_desc')}</p>
            </div>
            <Link
              href="/entradas"
              className="flex-shrink-0 px-10 py-4 rounded-2xl bg-white text-black font-[900] text-[12px] uppercase tracking-[0.15em] hover:bg-slate-100 active:scale-[0.97] transition-all shadow-[0_10px_30px_rgba(255,255,255,0.08)]"
            >
              {t('landing.tickets_cta_btn')}
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ═══ LIVE SENSE ═══ */}
      {liveSenseVenues.length > 0 && (
        <section className="py-24 md:py-32 px-6 border-t border-white/[0.04] relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-[20%] left-[-10%] w-[40%] h-[40%] bg-emerald-600/8 blur-[140px] rounded-full" />
          </div>
          <div className="max-w-5xl mx-auto space-y-12 relative z-10">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center space-y-3">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Live Sense</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-[900] tracking-tight">¿Dónde hay ambiente<br className="hidden sm:block" /><span className="text-emerald-400"> ahora mismo</span>?</h2>
              <p className="text-slate-400 text-sm leading-relaxed max-w-lg mx-auto">Mira en tiempo real cuánta gente hay en cada local. Sin registro, sin cuenta, sin filtros.</p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {liveSenseVenues.map((v, i) => {
                const ratio = v.capacity ? v.current_count / v.capacity : null;
                const level = !ratio ? (v.current_count > 50 ? 'high' : v.current_count > 15 ? 'medium' : 'low') : (ratio >= 0.95 ? 'full' : ratio >= 0.65 ? 'high' : ratio >= 0.3 ? 'medium' : 'low');
                const colors: Record<string, { dot: string; text: string; bg: string; bar: string }> = {
                  low: { dot: 'bg-emerald-400', text: 'text-emerald-400', bg: 'bg-emerald-500/10', bar: 'bg-emerald-500' },
                  medium: { dot: 'bg-yellow-400', text: 'text-yellow-400', bg: 'bg-yellow-500/10', bar: 'bg-yellow-500' },
                  high: { dot: 'bg-orange-400', text: 'text-orange-400', bg: 'bg-orange-500/10', bar: 'bg-orange-500' },
                  full: { dot: 'bg-red-400', text: 'text-red-400', bg: 'bg-red-500/10', bar: 'bg-red-500' },
                };
                const c = colors[level];
                return (
                  <motion.div
                    key={v.id}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 space-y-3 hover:border-white/10 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-black truncate">{v.venue_name}</h3>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">{v.venue_type}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black ${c.bg} ${c.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${c.dot} animate-pulse`} />
                        {v.current_count}
                      </span>
                    </div>
                    {v.capacity && (
                      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-700 ${c.bar}`} style={{ width: `${Math.min(100, (v.current_count / v.capacity) * 100)}%` }} />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center space-y-4 pt-4">
              <p className="text-sm text-slate-500">¿Quieres ver <span className="text-white font-bold">quién</span> está dentro y mandar un <span className="text-fuchsia-400 font-bold">Toque 🔥</span>?</p>
              <button onClick={handleStart} className="px-8 py-3 bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-full hover:scale-105 active:scale-95 transition-transform shadow-lg shadow-fuchsia-500/20">
                Crea tu perfil en 1 clic
              </button>
            </motion.div>
          </div>
        </section>
      )}

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="py-24 md:py-32 px-6 border-t border-white/[0.04]">
        <div className="max-w-4xl mx-auto space-y-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center space-y-3"
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-fuchsia-500">{t('landing.how_it_works')}</p>
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
                  <span className="material-icons text-fuchsia-400 text-2xl">{s.icon}</span>
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
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-fuchsia-500">{t('landing.venue_types')}</p>
            <h2 className="text-3xl md:text-5xl font-[900] tracking-tight">{t('landing.venue_title')}</h2>
            <p className="text-slate-400 max-w-lg">{t('landing.venue_desc')}</p>
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
                  <span className="material-icons text-slate-400 text-lg">{v.icon}</span>
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

      {/* ═══ ROLES & ACCESS SECTION (BLOW NIGHTS GLAM VIBE) ═══ */}
      <section className="py-24 md:py-32 px-6 border-t border-white/[0.06] bg-gradient-to-b from-slate-950 via-purple-950/20 to-slate-950 relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-fuchsia-600/10 blur-[150px] rounded-full pointer-events-none" />

        <div className="max-w-6xl mx-auto space-y-16 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center space-y-4"
          >
            <span className="px-4 py-1.5 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/20 text-[11px] font-black uppercase tracking-[0.25em] text-fuchsia-400 backdrop-blur-md">
              Ecosistema Blow Nights
            </span>
            <h2 className="text-4xl md:text-6xl font-[1000] tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-fuchsia-300">
              ¿Cuál es tu rol esta noche?
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto text-base font-medium">
              Tanto si buscas salir de fiesta, promover salas o gestionar un club, Blow Nights tiene una experiencia diseñada para ti.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 1. Usuario */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="group bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/10 hover:border-fuchsia-500/50 rounded-[2.5rem] p-8 flex flex-col justify-between transition-all duration-300 hover:shadow-[0_0_50px_rgba(217,70,239,0.2)] backdrop-blur-xl relative overflow-hidden"
            >
              <div className="space-y-5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-fuchsia-600 to-purple-600 p-0.5 shadow-lg shadow-fuchsia-500/30">
                  <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-2xl">
                    🔥
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-2xl font-black text-white">Party Goer</h3>
                    <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30">
                      Vibe VIP
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Accede al mapa en vivo, envía pings, compra pases VIP y únete a <strong className="text-white">Chills</strong> privados (*User Plus*) o crea los tuyos (*User Black*).
                  </p>
                </div>
              </div>
              <Link
                href="/login"
                className="mt-8 w-full py-4 rounded-2xl bg-white text-black font-black text-xs uppercase tracking-[0.15em] text-center hover:bg-fuchsia-400 hover:text-white transition-all shadow-xl active:scale-95"
              >
                Entrar / Registrarme
              </Link>
            </motion.div>

            {/* 2. RRPP */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="group bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/10 hover:border-purple-500/50 rounded-[2.5rem] p-8 flex flex-col justify-between transition-all duration-300 hover:shadow-[0_0_50px_rgba(168,85,247,0.2)] backdrop-blur-xl relative overflow-hidden"
            >
              <div className="space-y-5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 p-0.5 shadow-lg shadow-purple-500/30">
                  <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-2xl">
                    🎟️
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-2xl font-black text-white">RRPP / Promotor</h3>
                    <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      Cashback QR
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Crea QRs de invitado con descuento, mueve tus redes sociales y <strong className="text-white">gana comisiones en directo</strong> cada vez que tus invitados entren por puerta.
                  </p>
                </div>
              </div>
              <Link
                href="/rrpp/register"
                className="mt-8 w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black text-xs uppercase tracking-[0.15em] text-center hover:opacity-90 transition-all shadow-xl active:scale-95"
              >
                Ser RRPP Oficial
              </Link>
            </motion.div>

            {/* 3. Organizador */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="group bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/10 hover:border-indigo-500/50 rounded-[2.5rem] p-8 flex flex-col justify-between transition-all duration-300 hover:shadow-[0_0_50px_rgba(99,102,241,0.2)] backdrop-blur-xl relative overflow-hidden"
            >
              <div className="space-y-5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-600 p-0.5 shadow-lg shadow-indigo-500/30">
                  <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-2xl">
                    🪩
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-2xl font-black text-white">Organizador</h3>
                    <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      Promotora
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Solicita tu alta desde tu usuario, lanza tus sesiones, gestiona tramos de precio (*Early Bird*, *VIP*) y coordina tu equipo de RRPPs y accesos.
                  </p>
                </div>
              </div>
              <Link
                href="/organizer/register"
                className="mt-8 w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-black text-xs uppercase tracking-[0.15em] text-center hover:opacity-90 transition-all shadow-xl active:scale-95"
              >
                Lanzar Eventos
              </Link>
            </motion.div>

            {/* 4. Local */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="group bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/10 hover:border-pink-500/50 rounded-[2.5rem] p-8 flex flex-col justify-between transition-all duration-300 hover:shadow-[0_0_50px_rgba(236,72,153,0.2)] backdrop-blur-xl relative overflow-hidden"
            >
              <div className="space-y-5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-600 to-rose-600 p-0.5 shadow-lg shadow-pink-500/30">
                  <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-2xl">
                    🍸
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-2xl font-black text-white">Club / Discoteca</h3>
                    <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
                      Stripe Express
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Conecta tu cuenta bancaria en segundos, publica entradas con enlaces públicos directos y controla el aforo en tiempo real con escáneres mágicos.
                  </p>
                </div>
              </div>
              <Link
                href="/business"
                className="mt-8 w-full py-4 rounded-2xl bg-gradient-to-r from-pink-600 to-rose-600 text-white font-black text-xs uppercase tracking-[0.15em] text-center hover:opacity-90 transition-all shadow-xl active:scale-95"
              >
                Portal B2B Locales
              </Link>
            </motion.div>

            {/* 5. Franquiciado */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="group bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/10 hover:border-emerald-500/50 rounded-[2.5rem] p-8 flex flex-col justify-between transition-all duration-300 hover:shadow-[0_0_50px_rgba(16,185,129,0.2)] backdrop-blur-xl relative overflow-hidden col-span-1 md:col-span-2 lg:col-span-1"
            >
              <div className="space-y-5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 p-0.5 shadow-lg shadow-emerald-500/30">
                  <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-2xl">
                    🏙️
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-2xl font-black text-white">City Manager</h3>
                    <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Franquicia
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Lidera y supervisa una ciudad entera. Aprueba locales y eventos en tu zona mientras acumulas tus ingresos territoriales automáticos.
                  </p>
                </div>
              </div>
              <Link
                href="/partners"
                className="mt-8 w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-xs uppercase tracking-[0.15em] text-center hover:opacity-90 transition-all shadow-xl active:scale-95"
              >
                Solicitar Franquicia
              </Link>
            </motion.div>
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
            className="bg-gradient-to-br from-fuchsia-600/10 via-indigo-600/5 to-transparent border border-fuchsia-500/10 rounded-[2rem] p-8 md:p-12 space-y-8"
          >
            <div className="space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-fuchsia-400">{t('landing.b2b_tag')}</p>
              <h2 className="text-2xl md:text-4xl font-[900] tracking-tight">
                {t('landing.b2b_title')}
              </h2>
              <p className="text-slate-400 max-w-lg leading-relaxed">
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
                  <span className="material-icons text-fuchsia-400 text-xl">{t.icon}</span>
                  <span className="text-[12px] font-bold">{t.label}</span>
                </div>
              ))}
            </div>

            <Link
              href="/business"
              className="inline-block px-8 py-4 rounded-xl bg-fuchsia-600 text-white font-[800] text-[12px] uppercase tracking-[0.12em] hover:bg-fuchsia-500 active:scale-[0.97] transition-all"
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
            <p className="text-slate-400 max-w-lg mx-auto leading-relaxed">
              {t('landing.privacy_desc')}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {[
              { icon: 'visibility', label: t('landing.priv_public'), desc: t('landing.priv_public_desc'), color: 'text-fuchsia-400' },
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
          <Link href="/business" className="text-[10px] font-bold uppercase tracking-[0.15em] text-fuchsia-500 hover:text-fuchsia-400 transition-colors">{t('landing.footer_business')}</Link>
          <Link href="/terms" className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-600 hover:text-white transition-colors">{t('landing.footer_terms')}</Link>
          <Link href="/privacy" className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-600 hover:text-white transition-colors">{t('landing.footer_privacy')}</Link>
          <Link href="/rules" className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-600 hover:text-white transition-colors">{t('landing.footer_rules')}</Link>
        </div>
        <p className="text-[10px] text-slate-700 font-medium uppercase tracking-[0.15em]">
          &copy; 2026 Blow Nights
        </p>
      </footer>
    </div>
  );
}
