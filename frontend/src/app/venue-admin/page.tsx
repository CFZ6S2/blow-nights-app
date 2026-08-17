'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  collection, query, where, onSnapshot, doc, addDoc, updateDoc,
  serverTimestamp, Timestamp, orderBy, getDocs, limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useCity } from '@/context/CityContext';
import CitySelector from '@/components/CitySelector';
import Link from 'next/link';
import VenueConfigTab from '@/components/venue-admin/VenueConfigTab';
import VenueCatalogTab from '@/components/venue-admin/VenueCatalogTab';
import EventsTab from '@/components/venue-admin/EventsTab';

export default function VenueAdminPage() {
  const { user, profile, loading, isAdmin } = useAuth();
  const router = useRouter();

  const [myVenues, setMyVenues] = useState<any[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<any>(null);
  const [checkins, setCheckins] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [promoText, setPromoText] = useState('');
  const [promoRadius, setPromoRadius] = useState(5);
  const [sendingPromo, setSendingPromo] = useState(false);
  const [promoSent, setPromoSent] = useState(false);
  const [tab, setTab] = useState<'overview' | 'config' | 'catalog' | 'tickets' | 'promos' | 'events'>('overview');

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  const { cityId } = useCity();

  useEffect(() => {
    if (!user) return;
    let q;
    const isCityAdmin = profile?.role === 'cityAdmin';
    if (isAdmin) {
      q = query(collection(db, 'venues'), where('isActive', '==', true));
    } else if (isCityAdmin && profile?.cityId) {
      q = query(collection(db, 'venues'), where('cityId', '==', profile.cityId), where('isActive', '==', true));
    } else {
      q = query(collection(db, 'venues'), where('ownerId', '==', user.uid));
    }

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMyVenues(list);
      if (list.length > 0 && !selectedVenue) setSelectedVenue(list[0]);
    });
    return unsub;
  }, [user, isAdmin, profile]);

  useEffect(() => {
    if (!selectedVenue) return;
    const now = Timestamp.now();
    const checkinsQ = query(
      collection(db, 'checkins'),
      where('venueId', '==', selectedVenue.id),
      where('expiresAt', '>', now)
    );
    const unsubCheckins = onSnapshot(checkinsQ, (snap) => {
      setCheckins(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const ticketsQ = query(
      collection(db, 'tickets'),
      where('venueId', '==', selectedVenue.id),
      orderBy('purchasedAt', 'desc'),
      limit(50)
    );
    const unsubTickets = onSnapshot(ticketsQ, (snap) => {
      setTickets(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubCheckins(); unsubTickets(); };
  }, [selectedVenue]);

  const sendPromotion = async () => {
    if (!selectedVenue || !promoText.trim() || sendingPromo) return;
    setSendingPromo(true);
    try {
      await addDoc(collection(db, 'promotions'), {
        venueId: selectedVenue.id,
        venueOwnerId: user!.uid,
        text: promoText.trim(),
        radiusKm: promoRadius,
        validUntil: Timestamp.fromDate(new Date(Date.now() + 2 * 60 * 60 * 1000)),
        createdAt: serverTimestamp(),
      });
      setPromoText('');
      setPromoSent(true);
      setTimeout(() => setPromoSent(false), 3000);
    } catch (err) {
      console.error('Error sending promotion:', err);
    } finally {
      setSendingPromo(false);
    }
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-10 h-10 border-t-2 border-fuchsia-500 rounded-full" />
      </div>
    );
  }

  if (myVenues.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 text-white pb-32">
        <main className="relative z-10 p-6 md:p-12 max-w-2xl mx-auto">
          <header className="pt-8 space-y-2 mb-8">
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-3">
              <span className="material-icons text-fuchsia-400">storefront</span>
              Panel de Local
            </h1>
          </header>
          <div className="text-center py-16 space-y-4">
            <span className="material-icons text-5xl text-slate-700">store</span>
            <p className="text-sm text-slate-500">No tienes locales registrados</p>
            <p className="text-[10px] text-slate-600">Contacta con el administrador para dar de alta tu local</p>
          </div>
        </main>
      </div>
    );
  }

  const validTickets = tickets.filter((t) => t.status === 'valid').length;
  const usedTickets = tickets.filter((t) => t.status === 'used').length;
  const totalRevenue = tickets
    .filter((t) => t.status !== 'cancelled')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const hourDistribution: Record<number, number> = {};
  checkins.forEach((c) => {
    const hour = c.createdAt?.toDate?.()?.getHours?.() ?? 0;
    hourDistribution[hour] = (hourDistribution[hour] || 0) + 1;
  });
  const peakHour = Object.entries(hourDistribution).sort(([, a], [, b]) => (b as number) - (a as number))[0];

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-32">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-fuchsia-600/10 blur-[120px] rounded-full" />
        <div className="absolute top-[20%] -right-[10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />
      </div>

      <main className="relative z-10 p-6 md:p-12 max-w-2xl mx-auto space-y-6">
        <header className="pt-8 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-3">
              <span className="material-icons text-fuchsia-400">storefront</span>
              Panel de Local
            </h1>
            <CitySelector />
          </div>

          {myVenues.length > 1 && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {myVenues.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setSelectedVenue(v)}
                  className={`flex-shrink-0 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                    selectedVenue?.id === v.id
                      ? 'bg-fuchsia-500/20 border-fuchsia-500/30 text-fuchsia-400'
                      : 'bg-white/5 border-white/10 text-slate-500'
                  }`}
                >
                  {v.name}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between bg-white/5 border border-white/10 p-4 rounded-2xl">
            <div>
              <h2 className="text-lg font-black">{selectedVenue?.name}</h2>
              <p className="text-[10px] text-slate-500">{selectedVenue?.address || 'Sin dirección'}</p>
            </div>
            <Link
              href="/scanner"
              className="px-4 py-3 rounded-2xl bg-fuchsia-600 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
            >
              <span className="material-icons text-sm">qr_code_scanner</span>
              Escanear
            </Link>
          </div>
        </header>

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            <button onClick={() => setTab('overview')} className={`px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap border transition-all ${tab === 'overview' ? 'bg-fuchsia-600 border-fuchsia-500 text-white' : 'bg-white/5 border-white/5 text-slate-500'}`}>Resumen</button>
            <button onClick={() => setTab('config')} className={`px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap border transition-all ${tab === 'config' ? 'bg-fuchsia-600 border-fuchsia-500 text-white' : 'bg-white/5 border-white/5 text-slate-500'}`}>Configuración</button>
            <button onClick={() => setTab('catalog')} className={`px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap border transition-all ${tab === 'catalog' ? 'bg-fuchsia-600 border-fuchsia-500 text-white' : 'bg-white/5 border-white/5 text-slate-500'}`}>Catálogo</button>
            <button onClick={() => setTab('events')} className={`px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap border transition-all ${tab === 'events' ? 'bg-fuchsia-600 border-fuchsia-500 text-white' : 'bg-white/5 border-white/5 text-slate-500'}`}>Eventos</button>
            <button onClick={() => setTab('tickets')} className={`px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap border transition-all ${tab === 'tickets' ? 'bg-fuchsia-600 border-fuchsia-500 text-white' : 'bg-white/5 border-white/5 text-slate-500'}`}>Ticketing</button>
            <button onClick={() => setTab('promos')} className={`px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap border transition-all ${tab === 'promos' ? 'bg-fuchsia-600 border-fuchsia-500 text-white' : 'bg-white/5 border-white/5 text-slate-500'}`}>Promos</button>
        </div>

        {tab === 'config' && selectedVenue && (
          <VenueConfigTab venue={selectedVenue} />
        )}

        {tab === 'catalog' && selectedVenue && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <VenueCatalogTab venue={selectedVenue} />
          </motion.div>
        )}

        {tab === 'events' && selectedVenue && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <EventsTab venueId={selectedVenue.id} />
          </motion.div>
        )}

        {tab === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Ahora mismo', value: checkins.length, icon: 'people', color: 'text-green-400' },
                { label: 'Entradas vendidas', value: validTickets + usedTickets, icon: 'confirmation_number', color: 'text-yellow-400' },
                { label: 'Entradas activas', value: validTickets, icon: 'local_activity', color: 'text-fuchsia-400' },
                { label: 'Hora punta', value: peakHour ? `${peakHour[0]}:00` : '-', icon: 'schedule', color: 'text-blue-400' },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  whileHover={{ y: -3 }}
                  className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-3xl space-y-2"
                >
                  <span className={`material-icons ${stat.color}`}>{stat.icon}</span>
                  <p className="text-2xl font-black">{stat.value}</p>
                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">{stat.label}</p>
                </motion.div>
              ))}
            </div>

            {checkins.length > 0 && (
              <section className="bg-white/5 border border-white/10 p-6 rounded-3xl space-y-3">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Personas ahora</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {checkins.map((c) => (
                    <div key={c.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        <span className="text-xs font-bold">{c.userId?.slice(0, 8)}...</span>
                      </div>
                      <span className={`text-[9px] font-black uppercase tracking-widest ${
                        c.visibility === 'ghost' ? 'text-indigo-400' : 'text-slate-500'
                      }`}>
                        {c.visibility === 'ghost' ? 'Fantasma' : 'Público'}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {tab === 'tickets' && (
          <div className="space-y-3">
            {tickets.length === 0 ? (
              <div className="text-center py-16">
                <span className="material-icons text-5xl text-slate-700">receipt_long</span>
                <p className="text-sm text-slate-500 mt-4">No hay entradas vendidas</p>
              </div>
            ) : (
              tickets.map((t) => (
                <div
                  key={t.id}
                  className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs font-bold">{t.userId?.slice(0, 12)}...</p>
                    <p className="text-[9px] text-slate-500 capitalize">{t.ticketType}</p>
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${
                    t.status === 'valid' ? 'text-green-400' :
                    t.status === 'used' ? 'text-slate-500' : 'text-red-400'
                  }`}>
                    {t.status === 'valid' ? 'Válida' : t.status === 'used' ? 'Usada' : 'Cancelada'}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'promos' && (
          <div className="space-y-6">
            <section className="bg-white/5 border border-white/10 p-6 rounded-3xl space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">
                <span className="material-icons text-sm align-middle mr-1 text-yellow-500">campaign</span>
                Nueva Promoción Flash
              </h3>
              <textarea
                value={promoText}
                onChange={(e) => setPromoText(e.target.value)}
                placeholder='Ej: "2x1 en copas durante los próximos 45 minutos"'
                rows={3}
                maxLength={200}
                className="w-full bg-black/30 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-fuchsia-500/50 resize-none"
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <label className="text-[10px] text-slate-500 font-bold">Radio:</label>
                  <select
                    value={promoRadius}
                    onChange={(e) => setPromoRadius(Number(e.target.value))}
                    className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value={1}>1 km</option>
                    <option value={3}>3 km</option>
                    <option value={5}>5 km</option>
                    <option value={10}>10 km</option>
                    <option value={25}>25 km</option>
                  </select>
                </div>
                <span className="text-[9px] text-slate-600">{promoText.length}/200</span>
              </div>
              <button
                onClick={sendPromotion}
                disabled={!promoText.trim() || sendingPromo}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-yellow-500 to-amber-600 text-black text-xs font-black uppercase tracking-[0.2em] disabled:opacity-50 transition-all active:scale-95"
              >
                {sendingPromo ? 'Enviando...' : 'Enviar Push a Usuarios Cercanos'}
              </button>
              <AnimatePresence>
                {promoSent && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-xs text-green-400 font-bold text-center"
                  >
                    Promoción enviada correctamente
                  </motion.p>
                )}
              </AnimatePresence>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
