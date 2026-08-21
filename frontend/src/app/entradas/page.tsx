'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
interface VenueWithTickets {
  id: string;
  name: string;
  slug?: string;
  type: string;
  address?: string;
  coverImage?: string;
  cityId?: string;
  ticketPricing?: Record<string, any>;
  ticket_tiers?: any[];
  externalTicketUrl?: string;
}

export default function EntradasPage() {
  const { t } = useTranslation();
  const [venues, setVenues] = useState<VenueWithTickets[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchVenues = async () => {
      try {
        const venuesQ = query(collection(db, 'venues'), where('isActive', '==', true));
        const venuesSnap = await getDocs(venuesQ);
        const venueList = venuesSnap.docs
          .map(d => ({ id: d.id, ...d.data() } as VenueWithTickets))
          .filter(v => v.ticketPricing && Object.keys(v.ticketPricing).length > 0 || v.externalTicketUrl);

        const eventsQ = query(collection(db, 'events'), where('status', '==', 'published'));
        const eventsSnap = await getDocs(eventsQ);
        const eventList = eventsSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter((e: any) => e.ticket_tiers && e.ticket_tiers.length > 0);

        setVenues(venueList);
        setEvents(eventList);
      } catch (err) {
        console.error('Error fetching venues:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchVenues();
  }, []);

  const filteredVenues = venues.filter(v =>
    v.name?.toLowerCase().includes(search.toLowerCase()) ||
    v.address?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredEvents = events.filter((e: any) =>
    e.title?.toLowerCase().includes(search.toLowerCase()) ||
    e.organizerName?.toLowerCase().includes(search.toLowerCase())
  );

  const getLowestPrice = (v: VenueWithTickets) => {
    if (!v.ticketPricing) return null;
    const prices = Object.values(v.ticketPricing).map((p: any) => p.amount || 0).filter(Boolean);
    return prices.length > 0 ? Math.min(...prices) : null;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="relative py-20 px-6 text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-fuchsia-600/15 blur-[140px] rounded-full" />
          <div className="absolute -bottom-[20%] -right-[10%] w-[40%] h-[40%] bg-indigo-600/15 blur-[140px] rounded-full" />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto space-y-6">
          <Link href="/madrid/" className="inline-flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest">
            <span className="material-icons text-sm">arrow_back</span>
            {t('entradas.back_home')}
          </Link>

          <h1 className="text-4xl md:text-6xl font-[1000] tracking-[-0.03em]">
            <span className="material-icons text-fuchsia-400 text-3xl md:text-5xl align-middle mr-2">confirmation_number</span>
            {t('entradas.title')}
          </h1>
          <p className="text-slate-400 text-base max-w-xl mx-auto">
            {t('entradas.subtitle')}
          </p>

          <div className="max-w-md mx-auto">
            <div className="relative">
              <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xl">search</span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('entradas.search_placeholder')}
                className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-fuchsia-500/50 backdrop-blur-md"
              />
            </div>
          </div>
        </div>
      </header>

      <main className="px-6 pb-24 max-w-5xl mx-auto space-y-12">
        {loading ? (
          <div className="flex justify-center py-20">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-10 h-10 border-t-2 border-fuchsia-500 rounded-full" />
          </div>
        ) : (
          <>
            {filteredVenues.length > 0 && (
              <section className="space-y-6">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-fuchsia-500">{t('entradas.venues_section')}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredVenues.map((v) => {
                    const lowestPrice = getLowestPrice(v);
                    return (
                      <motion.div
                        key={v.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ y: -2 }}
                      >
                        <Link
                          href={`/madrid/venues/detail?id=${v.id}&type=venue`}
                          className="block bg-white/5 border border-white/10 rounded-3xl overflow-hidden hover:border-fuchsia-500/30 transition-all"
                        >
                          {v.coverImage && (
                            <div className="h-32 overflow-hidden">
                              <img src={v.coverImage} alt={v.name} className="w-full h-full object-cover" />
                            </div>
                          )}
                          <div className="p-5 space-y-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="text-base font-[900] tracking-tight">{v.name}</h3>
                                {v.address && <p className="text-[11px] text-slate-500 mt-0.5">{v.address}</p>}
                              </div>
                              {lowestPrice && (
                                <span className="bg-fuchsia-500/15 text-fuchsia-400 px-3 py-1 rounded-full text-xs font-black whitespace-nowrap">
                                  {t('entradas.from')} {(lowestPrice / 100).toFixed(0)}€
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="material-icons text-fuchsia-400 text-sm">confirmation_number</span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                {Object.keys(v.ticketPricing || {}).length} {t('entradas.types_available')}
                              </span>
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              </section>
            )}

            {filteredEvents.length > 0 && (
              <section className="space-y-6">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-400">{t('entradas.events_section')}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredEvents.map((e: any) => (
                    <motion.div
                      key={e.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ y: -2 }}
                    >
                      <Link
                        href={`/madrid/venues/detail?id=${e.id}&type=event`}
                        className="block bg-white/5 border border-white/10 rounded-3xl overflow-hidden hover:border-indigo-500/30 transition-all"
                      >
                        {e.coverImage && (
                          <div className="h-32 overflow-hidden">
                            <img src={e.coverImage} alt={e.title} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="p-5 space-y-3">
                          <h3 className="text-base font-[900] tracking-tight">{e.title}</h3>
                          {e.date && (
                            <p className="text-[11px] text-indigo-400 font-bold">
                              {new Date(e.date.seconds ? e.date.seconds * 1000 : e.date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </p>
                          )}
                          <div className="flex items-center gap-2">
                            <span className="material-icons text-indigo-400 text-sm">event</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              {e.ticket_tiers?.length || 0} {t('entradas.types_available')}
                            </span>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </section>
            )}

            {filteredVenues.length === 0 && filteredEvents.length === 0 && (
              <div className="text-center py-20 space-y-4">
                <span className="material-icons text-6xl text-slate-700">confirmation_number</span>
                <p className="text-slate-500 text-sm font-bold">{t('entradas.no_results')}</p>
                <p className="text-slate-600 text-xs">{t('entradas.try_another_search')}</p>
              </div>
            )}
          </>
        )}

        <section className="text-center py-8 space-y-4">
          <p className="text-slate-500 text-xs">{t('entradas.want_to_sell')}</p>
          <Link href="/business" className="inline-block px-8 py-4 rounded-xl bg-fuchsia-600 text-white font-[800] text-[12px] uppercase tracking-[0.12em] hover:bg-fuchsia-500 transition-all">
            {t('entradas.register_venue')}
          </Link>
        </section>
      </main>
    </div>
  );
}
