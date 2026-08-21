'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useCityRouter } from '@/hooks/useCityRouter';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, where, onSnapshot, doc, setDoc, addDoc, deleteDoc, serverTimestamp, Timestamp, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useVenues, VENUE_TYPES } from '@/hooks/useVenues';
import { useCity } from '@/context/CityContext';
import { fuzzCoordinates } from '@/lib/geo';
import CitySelector from '@/components/CitySelector';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

function VenueCounter({ venueId }: { venueId: string }) {
  const { t } = useTranslation();
  const [count, setCount] = useState(0);

  useEffect(() => {
    const now = Timestamp.now();
    const q = query(
      collection(db, 'checkins'),
      where('venueId', '==', venueId),
      where('expiresAt', '>', now)
    );
    const unsub = onSnapshot(q, (snap) => setCount(snap.size), () => {});
    return unsub;
  }, [venueId]);

  if (count === 0) return null;

  return (
    <span className="bg-amber-500/20 text-amber-400 text-[10px] font-black px-2 py-0.5 rounded-full">
      {count} {t('venuesPage.people', { count })}
    </span>
  );
}

const CRUISING_TYPES = new Set(['sauna', 'cruising_bar', 'outdoor_zone']);

type VisibilityMode = 'public' | 'ghost' | 'anonymous';

export default function VenuesPage() {
  const { t } = useTranslation();
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { cityPath } = useCityRouter();
  const { cityId, currentCity } = useCity();
  const [venues, setVenues] = useState<any[]>([]);
  const { grouped, loading: venuesLoading } = useVenues(cityId);
  const [activeCheckin, setActiveCheckin] = useState<any>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [visibilityMode, setVisibilityMode] = useState<VisibilityMode>('public');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    const now = Timestamp.now();

    const q1 = query(collection(db, 'checkins'), where('userId', '==', user.uid), where('expiresAt', '>', now));
    const q2 = query(collection(db, 'checkins'), where('realUserId', '==', user.uid), where('expiresAt', '>', now));

    let results: any[] = [];
    const merge = () => {
      const active = results.length > 0 ? results[0] : null;
      setActiveCheckin(active);
    };

    const unsub1 = onSnapshot(q1, (snap) => {
      results = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      merge();
    }, () => {});
    const unsub2 = onSnapshot(q2, (snap) => {
      const anonResults = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      if (anonResults.length > 0 && results.length === 0) {
        results = anonResults;
      }
      merge();
    }, () => {});

    return () => { unsub1(); unsub2(); };
  }, [user?.uid]);

  const handleCheckin = async (venueId: string, venueName: string) => {
    if (!user || checkingIn) return;
    setCheckingIn(true);
    try {
      if (activeCheckin) {
        await deleteDoc(doc(db, 'checkins', activeCheckin.id));
      }

      const tomorrow2pm = new Date();
      tomorrow2pm.setDate(tomorrow2pm.getDate() + 1);
      tomorrow2pm.setHours(14, 0, 0, 0);

      const isAnon = visibilityMode === 'anonymous' || (profile?.cruisingMode ?? false);
      const checkinData: Record<string, any> = {
        userId: isAnon ? `anon_${user.uid}` : user.uid,
        realUserId: user.uid,
        venueId,
        venueName,
        cityId: cityId || '',
        visibility: isAnon ? 'anonymous' : visibilityMode,
        anonymous: isAnon,
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromDate(tomorrow2pm),
      };

      if (isAnon && typeof navigator !== 'undefined' && navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((res, rej) =>
            navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
          );
          const fuzzed = fuzzCoordinates(pos.coords.latitude, pos.coords.longitude);
          checkinData.lat = fuzzed.lat;
          checkinData.lng = fuzzed.lng;
        } catch {}
      }

      await addDoc(collection(db, 'checkins'), checkinData);
    } catch (err) {
      console.error('Error checking in:', err);
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCheckout = async () => {
    if (!activeCheckin) return;
    try {
      await deleteDoc(doc(db, 'checkins', activeCheckin.id));
    } catch (err) {
      console.error('Error checking out:', err);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-10 h-10 border-t-2 border-amber-500 rounded-full" />
      </div>
    );
  }

  const tabs = Object.entries(VENUE_TYPES);

  const displayedVenues = selectedCategory === 'all' 
    ? Object.values(grouped).flat() 
    : grouped[selectedCategory as keyof typeof grouped] || [];

  if (venuesLoading) return <div className="min-h-screen bg-white flex justify-center items-center"><div className="w-8 h-8 border-2 border-amber-500 rounded-full animate-spin border-t-transparent" /></div>;

  return (
    <div className="min-h-screen bg-white text-slate-900 pb-32">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-amber-600/10 blur-[120px] rounded-full" />
        <div className="absolute top-[20%] -right-[10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
      </div>

      <main className="relative z-10 p-6 md:p-12 max-w-2xl mx-auto space-y-6">
        <header className="pt-8 space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-black tracking-tight">{t('venuesPage.whereTo')}</h1>
            <CitySelector />
          </div>
          <p className="text-xs text-slate-500">{t('venuesPage.selectVenue')}</p>
        </header>

        {activeCheckin && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 p-5 rounded-3xl"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-green-500/20 flex items-center justify-center">
                  <span className="material-icons text-green-400">location_on</span>
                </div>
                <div>
                  <p className="text-sm font-black">{activeCheckin.venueName}</p>
                  <p className="text-[10px] text-slate-500">
                    {activeCheckin.visibility === 'anonymous' ? t('venuesPage.anonMode') :
                     activeCheckin.visibility === 'ghost' ? t('venuesPage.ghostMode') : t('venuesPage.visibleAll')}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCheckout}
                className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold hover:bg-slate-100 transition-all"
              >
                {t('venuesPage.exit')}
              </button>
            </div>
          </motion.div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => setVisibilityMode('public')}
            className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${
              visibilityMode === 'public'
                ? 'bg-amber-500/20 border-amber-500/30 text-amber-400'
                : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}
          >
            <span className="material-icons text-sm align-middle mr-1">visibility</span>
            {t('venuesPage.public')}
          </button>
          <button
            onClick={() => setVisibilityMode('ghost')}
            className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${
              visibilityMode === 'ghost'
                ? 'bg-blue-500/20 border-blue-500/30 text-blue-400'
                : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}
          >
            <span className="material-icons text-sm align-middle mr-1">visibility_off</span>
            {t('venuesPage.ghost')}
          </button>
          <button
            onClick={() => setVisibilityMode('anonymous')}
            className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${
              visibilityMode === 'anonymous'
                ? 'bg-red-500/20 border-red-500/30 text-red-400'
                : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}
          >
            <span className="material-icons text-sm align-middle mr-1">shield</span>
            {t('venuesPage.anonymous')}
          </button>
        </div>

        {visibilityMode === 'anonymous' && (
          <div className="bg-red-500/5 border border-red-500/10 p-3 rounded-2xl">
            <p className="text-[10px] text-red-400/80 font-bold">
              <span className="material-icons text-[10px] align-middle mr-1">info</span>
              {t('venuesPage.anonInfo')}
            </p>
          </div>
        )}

        <div className="relative w-full sm:w-64">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-xl px-3 py-2.5 appearance-none focus:outline-none focus:border-blue-500 transition-all cursor-pointer font-medium"
          >
            <option value="all">{t('venuesPage.allCategories')}</option>
            <optgroup label={t('venuesPage.commercialVenues')}>
              <option value="club">{t('venuesPage.clubs')}</option>
              <option value="bar">{t('venuesPage.bars')}</option>
              <option value="sauna">{t('venuesPage.saunas')}</option>
              <option value="chiringuito">{t('venuesPage.chiringuitos')}</option>
            </optgroup>
            <optgroup label={t('venuesPage.communityPoints')}>
              <option value="cruising_outdoor">{t('venuesPage.cruising')}</option>
              <option value="community_point">{t('venuesPage.meetingPoints')}</option>
            </optgroup>
            <optgroup label={t('venuesPage.independentEvents')}>
              <option value="event">{t('venuesPage.events')}</option>
            </optgroup>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
            ▼
          </div>
        </div>

        {selectedCategory !== 'all' && (
          <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
            {VENUE_TYPES[selectedCategory as keyof typeof VENUE_TYPES]?.hours}
          </p>
        )}

        <div className="space-y-3">
          {venuesLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 bg-slate-50 rounded-3xl animate-pulse" />
            ))
          ) : displayedVenues.length === 0 ? (
            <div className="text-center py-16 space-y-4">
              <span className="material-icons text-5xl text-slate-700">nightlife</span>
              <p className="text-sm text-slate-500">{t('venuesPage.noVenues')}</p>
              <p className="text-[10px] text-slate-600">{t('venuesPage.venuesWillBeAdded')}</p>
            </div>
          ) : (
            displayedVenues.map((venue: any) => (
              <motion.div
                key={venue.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-slate-50 backdrop-blur-xl border rounded-3xl p-5 transition-all ${
                  activeCheckin?.venueId === venue.id
                    ? 'border-green-500/30 bg-green-500/5'
                    : 'border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <span className="material-icons text-amber-400">
                        {VENUE_TYPES[venue.type as keyof typeof VENUE_TYPES]?.icon || 'place'}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-black truncate">{venue.name}</h3>
                        {CRUISING_TYPES.has(venue.type) && (
                          <span className="bg-red-500/20 text-red-400 text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider">18+</span>
                        )}
                        {venue.ownerId === 'community' ? (
                          <span className="bg-slate-700/50 text-slate-300 text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider">{t('venuesPage.addedByCommunity')}</span>
                        ) : (
                          <span className="bg-green-500/20 text-green-400 text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider">{t('venuesPage.verifiedVenue')}</span>
                        )}
                        <VenueCounter venueId={venue.id} />
                      </div>
                      {venue.address && (
                        <p className="text-[10px] text-slate-500 truncate">{venue.address}</p>
                      )}
                      
                      {venue.promoBanner?.active && (
                        <div className="bg-gradient-to-r from-amber-500/20 to-blue-500/20 border border-amber-500/40 px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs text-amber-300 font-medium mt-2">
                          <span>🔥</span>
                          <span className="truncate">{venue.promoBanner.text}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {activeCheckin?.venueId === venue.id ? (
                    <div className="flex items-center gap-2 ml-3">
                      <span className="text-[10px] font-black text-green-400 uppercase tracking-widest">{t('venuesPage.here')}</span>
                      <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    </div>
                  ) : (
                    <button
                      onClick={() => handleCheckin(venue.id, venue.name)}
                      disabled={checkingIn}
                      className="ml-3 px-4 py-2.5 rounded-2xl bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-amber-500 transition-all active:scale-95 disabled:opacity-50 flex-shrink-0"
                    >
                      {checkingIn ? '...' : t('venuesPage.go')}
                    </button>
                  )}
                </div>

                {(venue.ticketPricing && Object.keys(venue.ticketPricing).length > 0) || (venue.ticket_tiers && venue.ticket_tiers.length > 0) ? (
                  <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between">
                    <div className="flex gap-2 flex-wrap">
                      {venue.ticketPricing && Object.entries(venue.ticketPricing).map(([type, pricing]: [string, any]) => (
                        <span key={type} className="text-[9px] bg-slate-50 text-slate-400 px-2 py-1 rounded-lg">
                          {pricing.name || type}: {(pricing.amount / 100).toFixed(2)}€
                        </span>
                      ))}
                      {venue.ticket_tiers && venue.ticket_tiers.map((tier: any) => (
                        <span key={tier.id} className="text-[9px] bg-slate-50 text-slate-400 px-2 py-1 rounded-lg">
                          {tier.name}: {tier.price.toFixed(2)}€
                        </span>
                      ))}
                    </div>
                    <Link
                      href={cityPath(`/venues/detail?id=${venue.id}&type=${venue.type}`)}
                      className="text-[10px] font-black text-yellow-500 uppercase tracking-widest"
                    >
                      {t('venuesPage.tickets')}
                    </Link>
                  </div>
                ) : null}
              </motion.div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
