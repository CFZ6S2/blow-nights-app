'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCityRouter } from '@/hooks/useCityRouter';
import { motion } from 'framer-motion';
import { doc, onSnapshot, collection, query, where, Timestamp, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/lib/firebase';
import { ShieldCheck, Sparkles, Building2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function VenueDetailPage() {
  const { t } = useTranslation();
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const { cityPath } = useCityRouter();
  const searchParams = useSearchParams();
  const venueId = searchParams?.get('id');
  const type = searchParams?.get('type');

  const [venue, setVenue] = useState<any>(null);
  const [checkinCount, setCheckinCount] = useState(0);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const canceled = searchParams?.get('canceled') === 'true';

  const [isClaiming, setIsClaiming] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);

  const handleClaimVenue = async () => {
    if (!user) {
      alert(t('venueDetail.loginToClaim'));
      router.push('/login');
      return;
    }
    if (!venueId) return;

    try {
      setIsClaiming(true);
      const venueRef = doc(db, 'venues', venueId);
      
      await updateDoc(venueRef, {
        ownerId: user.uid,
        isVerified: false,
        claimedAt: serverTimestamp(),
        claimedByEmail: user.email || null,
      });

      setShowClaimModal(false);
      router.push('/venue-admin');
    } catch (error) {
      console.error('Error al reclamar local:', error);
      alert(t('venueDetail.errorClaiming'));
    } finally {
      setIsClaiming(false);
    }
  };

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (!venueId) return;
    const collectionName = type === 'event' ? 'events' : 'venues';
    const unsub = onSnapshot(doc(db, collectionName, venueId), (snap) => {
      if (snap.exists()) setVenue({ id: snap.id, ...snap.data() });
    }, () => {});
    return unsub;
  }, [venueId, type]);

  useEffect(() => {
    if (!venueId) return;
    const q = query(
      collection(db, 'checkins'),
      where('venueId', '==', venueId),
      where('expiresAt', '>', Timestamp.now())
    );
    const unsub = onSnapshot(q, (snap) => setCheckinCount(snap.size), () => {});
    return unsub;
  }, [venueId]);

  const handlePurchase = async (ticketType: string) => {
    if (!user || purchasing) return;
    setPurchasing(ticketType);
    try {
      if (type === 'event') {
        const purchaseEventTicket = httpsCallable(functions, 'purchaseIndependentEventTicket');
        const result = await purchaseEventTicket({
          eventId: venueId,
          ticketType,
          origin: window.location.origin,
        });
        const { url } = result.data as { url: string };
        if (url) window.location.href = url;
      } else {
        const purchaseVenueTicket = httpsCallable(functions, 'purchaseVenueTicket');
        const result = await purchaseVenueTicket({
          venueId,
          ticketType,
          origin: window.location.origin,
        });
        const { url } = result.data as { url: string };
        if (url) window.location.href = url;
      }
    } catch (err: any) {
      console.error('Error purchasing ticket:', err);
      alert(err.message || t('venueDetail.errorBuying'));
    } finally {
      setPurchasing(null);
    }
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-10 h-10 border-t-2 border-slate-700 rounded-full" />
      </div>
    );
  }

  if (!venueId) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center">
        <p className="text-slate-500">{t('venueDetail.noVenueSpecified')}</p>
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center">
        <p className="text-slate-500">{t('venueDetail.loadingVenue')}</p>
      </div>
    );
  }

  const pricing = venue.ticketPricing || {};
  const isCommunitySpot = venue.ownerId === 'community';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-32">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-slate-900/10 blur-[120px] rounded-full" />
      </div>

      <main className="relative z-10 p-6 md:p-12 max-w-2xl mx-auto space-y-6">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors">
          <span className="material-icons text-sm">arrow_back</span>
          <span className="text-xs font-bold">{t('venueDetail.back')}</span>
        </button>

        <header className="space-y-4">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-3xl bg-white/10 flex items-center justify-center border-2 ${isCommunitySpot ? (venue.type === 'chill' ? 'border-red-500' : 'border-green-500') : 'border-transparent'}`}>
              <span className={`material-icons text-3xl ${venue.type === 'chill' ? 'text-red-500' : venue.type === 'cruising' ? 'text-green-500' : 'text-slate-800'}`}>
                {venue.type === 'chill' ? 'local_fire_department' : venue.type === 'cruising' ? 'park' : 'nightlife'}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">{venue.title || venue.name}</h1>
              {venue.address && <p className="text-xs text-slate-500">{venue.address}</p>}
            </div>
          </div>

          <div className="flex gap-3">
            <div className="bg-fuchsia-500/10 border border-slate-700/20 px-4 py-2 rounded-2xl">
              <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">
                {checkinCount} {t('venueDetail.peopleGo', { count: checkinCount })}
              </span>
            </div>
            {venue.capacity && (
              <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-2xl">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  {t('venueDetail.capacity')} {venue.capacity}
                </span>
              </div>
            )}
          </div>
        </header>

        {venue.banner_url && (
          <img src={venue.banner_url} alt={venue.title || venue.name} className="w-full h-48 object-cover rounded-3xl" />
        )}

        {canceled && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-2xl">
            <p className="text-xs text-yellow-400 font-bold">{t('venueDetail.purchaseCanceled')}</p>
          </div>
        )}

        {venue.description && (
          <section className="bg-white/5 border border-white/10 p-6 rounded-3xl">
            <p className="text-sm text-slate-600 leading-relaxed">{venue.description}</p>
          </section>
        )}

        {isCommunitySpot ? (
          <section className="bg-white/5 border border-white/10 p-8 rounded-3xl text-center space-y-3 mt-8">
            <span className="material-icons text-4xl text-slate-700">forum</span>
            <p className="text-sm text-slate-500">{t('venueDetail.communitySpot')}</p>
            <p className="text-[10px] text-slate-500">{t('venueDetail.joinChat')}</p>
            
            {['club', 'bar', 'sauna', 'chiringuito'].includes(venue.type) && user && (
              <div className="mt-8 pt-6 border-t border-white/10 text-left">
                <div className="p-4 bg-gradient-to-br from-purple-950/60 via-slate-900 to-indigo-950/60 border border-purple-500/40 rounded-2xl shadow-xl">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 bg-purple-600/20 text-purple-400 rounded-xl border border-purple-500/30">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{t('venueDetail.areYouOwner')}</h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {t('venueDetail.claimDescription')}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowClaimModal(true)}
                    className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-slate-900 text-xs font-extrabold uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    {t('venueDetail.claimButton')}
                  </button>
                </div>
              </div>
            )}

            {venue.createdBy === user?.uid && (
              <button 
                onClick={async () => {
                  if(confirm(t('venueDetail.confirmDelete'))) {
                    try {
                      await deleteDoc(doc(db, 'venues', venue.id));
                      router.push(cityPath('/venues'));
                    } catch (err) {
                      console.error(err);
                      alert(t('venueDetail.errorDeleting'));
                    }
                  }
                }}
                className="mt-6 px-4 py-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-xs font-bold w-full active:scale-95 transition-all"
              >
                {t('venueDetail.deleteCommunitySpot')}
              </button>
            )}
          </section>
        ) : (
          <>
            {venue.externalTicketUrl ? (
              <section className="space-y-4 text-center mt-6">
                <a 
                  href={venue.externalTicketUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-4 bg-gradient-to-r from-rose-600 to-orange-500 hover:from-rose-500 hover:to-orange-400 text-slate-900 font-black text-sm uppercase tracking-widest rounded-2xl shadow-[0_10px_30px_rgba(225,29,72,0.3)] transition-all flex justify-center items-center gap-2 active:scale-95"
                >
                  {t('venueDetail.buyOfficialTicket')}
                </a>
                <p className="text-[10px] text-slate-500">{t('venueDetail.redirectTaquilla')}</p>
              </section>
            ) : Object.keys(pricing).length > 0 || (venue.ticket_tiers && venue.ticket_tiers.length > 0) ? (
              <section className="space-y-4">
                <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">{t('venueDetail.availableTickets')}</h2>

            {Object.entries(pricing).map(([type, data]: [string, any]) => (
              <motion.div
                key={type}
                whileHover={{ y: -2 }}
                className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black capitalize">{data.name || type.replace(/_/g, ' ')}</h3>
                    {data.description && (
                      <p className="text-[10px] text-slate-500 mt-1">{data.description}</p>
                    )}
                    <p className="text-lg font-black text-slate-800 mt-2">
                      {data.amount ? (data.amount / 100).toFixed(2) : '0.00'}€
                    </p>
                    {data.quota != null && (
                      <p className="text-[9px] text-slate-600 mt-1">{t('venueDetail.limitedSpots')} {data.quota}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handlePurchase(type)}
                    disabled={purchasing !== null}
                    className="px-6 py-3 rounded-2xl bg-gradient-to-r from-slate-800 to-indigo-600 text-slate-900 text-[10px] font-black uppercase tracking-widest hover:shadow-[0_10px_30px_rgba(192,38,211,0.3)] transition-all active:scale-95 disabled:opacity-50"
                  >
                    {purchasing === type ? (
                      <span className="material-icons text-sm animate-spin">sync</span>
                    ) : (
                      t('venueDetail.buy')
                    )}
                  </button>
                </div>
              </motion.div>
                ))}
            
            {venue.ticket_tiers && venue.ticket_tiers.map((tier: any) => (
              <motion.div
                key={tier.id}
                whileHover={{ y: -2 }}
                className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black capitalize">{tier.name}</h3>
                    {tier.perks && (
                      <p className="text-[10px] text-slate-500 mt-1">{tier.perks}</p>
                    )}
                    <p className="text-lg font-black text-slate-800 mt-2">
                      {tier.price.toFixed(2)}€
                    </p>
                    {tier.quota != null && (
                      <p className="text-[9px] text-slate-600 mt-1">{t('venueDetail.limitedSpots')} {tier.quota}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handlePurchase(tier.id)}
                    disabled={purchasing !== null}
                    className="px-6 py-3 rounded-2xl bg-gradient-to-r from-slate-800 to-indigo-600 text-slate-900 text-[10px] font-black uppercase tracking-widest hover:shadow-[0_10px_30px_rgba(192,38,211,0.3)] transition-all active:scale-95 disabled:opacity-50"
                  >
                    {purchasing === tier.id ? (
                      <span className="material-icons text-sm animate-spin">sync</span>
                    ) : (
                      t('venueDetail.buy')
                    )}
                  </button>
                </div>
              </motion.div>
                ))}
              </section>
            ) : (
              <section className="bg-white/5 border border-white/10 p-8 rounded-3xl text-center space-y-3">
                <span className="material-icons text-4xl text-slate-700">local_activity</span>
                <p className="text-sm text-slate-500">{t('venueDetail.noTickets')}</p>
                <p className="text-[10px] text-slate-600">{t('venueDetail.checkInFromVenues')}</p>
              </section>
            )}
          </>
        )}

        {showClaimModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-white border border-purple-500/40 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-600/20 text-purple-400 rounded-full flex items-center justify-center mx-auto mb-2 border border-purple-500/30">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">{t('venueDetail.takeControl')} {venue?.name}</h3>
                <p className="text-xs text-slate-500 mt-1">
                  {t('venueDetail.adminAccessInfo')}
                </p>
              </div>

              <div className="space-y-2 text-xs text-slate-600 bg-slate-50/60 p-3 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> {t('venueDetail.scanner')}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> {t('venueDetail.rrppPanel')}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> {t('venueDetail.promotions')}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowClaimModal(false)}
                  disabled={isClaiming}
                  className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-700 text-slate-600 text-xs font-semibold rounded-xl transition-all"
                >
                  {t('venueDetail.cancel')}
                </button>
                <button
                  onClick={handleClaimVenue}
                  disabled={isClaiming}
                  className="flex-1 py-2.5 px-3 bg-purple-600 hover:bg-purple-500 text-slate-900 text-xs font-bold rounded-xl transition-all shadow-md disabled:opacity-50"
                >
                  {isClaiming ? t('venueDetail.assigning') : t('venueDetail.confirmAndEnter')}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
