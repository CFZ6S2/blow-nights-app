'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { collectionGroup, query, where, getDocs } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/lib/firebase';
import { motion } from 'framer-motion';
import { useMedia } from '@/hooks/useMedia';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import RRPPEventCard from './RRPPEventCard';
import { useTranslation } from 'react-i18next';

function RRPPInner() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get('token');
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const { isReady } = useRequireAuth();
  const { uploadFile, uploading } = useMedia();

  const [promoterDocs, setPromoterDocs] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [eventName, setEventName] = useState('');
  const [venueName, setVenueName] = useState('');
  const [address, setAddress] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [ticketType, setTicketType] = useState('general');
  const [flyerFile, setFlyerFile] = useState<File | null>(null);
  const [flyerPreview, setFlyerPreview] = useState<string>('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!user || tokenParam) {
      setLoadingDocs(false);
      return;
    }

    const fetchPromoters = async () => {
      try {
        const q = query(collectionGroup(db, 'promoters'), where('userId', '==', user.uid));
        const snap = await getDocs(q);
        const docs = snap.docs.map(d => ({
          id: d.id,
          ...(d.data() as any),
          eventId: d.ref.parent.parent?.id
        }));
        setPromoterDocs(docs);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingDocs(false);
      }
    };

    fetchPromoters();
  }, [user?.uid, tokenParam]);

  const handleUploadFlyer = (e: any) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFlyerFile(file);
      setFlyerPreview(URL.createObjectURL(file));
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName || !venueName || !address) return alert(t('rrpp.alertRequired'));

    setCreating(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
      const geocodeData = await res.json();

      if (!geocodeData || geocodeData.length === 0) {
        throw new Error(t('rrpp.alertGeocodeFail'));
      }

      const lat = parseFloat(geocodeData[0].lat);
      const lng = parseFloat(geocodeData[0].lon);

      let flyerUrl = null;
      if (flyerFile) {
        const path = `events/${user?.uid}_${Date.now()}_flyer`;
        flyerUrl = await uploadFile(flyerFile, path);
      }

      const createParty = httpsCallable(functions, 'createRRPPParty');
      await createParty({ eventName, venueName, address, lat, lng, eventDate, eventTime, ticketType, flyerUrl });

      setEventName('');
      setVenueName('');
      setAddress('');
      setEventDate('');
      setEventTime('');
      setTicketType('general');
      setFlyerFile(null);
      setFlyerPreview('');
      setShowCreateForm(false);

      const q = query(collectionGroup(db, 'promoters'), where('userId', '==', user!.uid));
      const snap = await getDocs(q);
      setPromoterDocs(snap.docs.map(d => ({
        id: d.id,
        ...(d.data() as any),
        eventId: d.ref.parent.parent?.id
      })));
    } catch (e: any) {
      console.error(e);
      alert(e.message || t('rrpp.alertErrorCreating'));
      if (e.code === 'permission-denied') {
        window.location.href = '/login';
      }
    } finally {
      setCreating(false);
    }
  };

  if (authLoading || loadingDocs) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center text-slate-500 font-bold">
        {t('rrpp.loadingPanel')}
      </div>
    );
  }

  if (!user && !tokenParam) {
    if (typeof window !== 'undefined') router.push('/rrpp/register');
    return null;
  }

  if (tokenParam) {
    return (
      <div className="min-h-screen bg-black text-white p-6 pb-24">
        <div className="max-w-md mx-auto pt-8">
          <RRPPEventCard token={tokenParam} />
        </div>
      </div>
    );
  }

  if (profile?.role !== 'rrpp') {
    if (typeof window !== 'undefined') router.push('/rrpp/register');
    return null;
  }

  const activeEvents = promoterDocs.filter(d => !d.is_closed);
  const closedEvents = promoterDocs.filter(d => d.is_closed);

  return (
    <div className="min-h-screen bg-black text-white p-6 pb-24 font-sans">
      <div className="max-w-md mx-auto pt-8">
        <header className="mb-8">
          <div className="inline-block px-3 py-1 bg-fuchsia-900/30 text-fuchsia-400 rounded-full text-[10px] font-black tracking-widest uppercase mb-4 border border-fuchsia-500/20">
            {t('rrpp.panelTitle')}
          </div>
          <h1 className="text-3xl font-black mb-2">{t('rrpp.hello')}, {profile?.nick || 'RRPP'}</h1>
          <p className="text-sm text-slate-400">{t('rrpp.manageDescription')}</p>
        </header>

        {((profile as any)?.qr_quota === 25 && activeEvents.length === 0) && (
          <div className="bg-gradient-to-r from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 p-4 rounded-3xl mb-8 flex gap-4 items-start shadow-lg shadow-emerald-500/10">
            <span className="text-3xl">🎁</span>
            <div>
              <h3 className="text-emerald-400 font-black text-sm mb-1">{t('rrpp.welcomeBonus')}</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {t('rrpp.bonusPart1')}<strong>{t('rrpp.bonusPart2')}</strong>{t('rrpp.bonusPart3')}
              </p>
            </div>
          </div>
        )}

        {activeEvents.length > 0 && (
          <section className="mb-8 space-y-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">{t('rrpp.activeEventsTitle')}</h2>
            {activeEvents.map(doc => (
              <RRPPEventCard key={doc.id} token={doc.access_token} />
            ))}
          </section>
        )}

        {closedEvents.length > 0 && (
          <section className="mb-8 space-y-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">{t('rrpp.closedEventsTitle')}</h2>
            {closedEvents.map(doc => (
              <RRPPEventCard key={doc.id} token={doc.access_token} />
            ))}
          </section>
        )}

        {promoterDocs.length === 0 && !showCreateForm && (
          <div className="bg-slate-900 border border-fuchsia-500/30 rounded-3xl p-8 text-center mb-6">
            <h3 className="font-bold mb-3 text-fuchsia-400 text-xl">{t('rrpp.noActiveEvents')}</h3>
            <p className="text-sm text-slate-300 mb-6 leading-relaxed">
              {t('rrpp.createFirstEvent')}
            </p>
            <div className="bg-black/50 border border-white/5 rounded-2xl p-5 text-xs text-slate-300 text-left mb-6">
              <p className="font-bold text-fuchsia-400 mb-3 uppercase tracking-widest text-[10px]">{t('rrpp.howItWorks')}</p>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <span className="bg-fuchsia-500/20 text-fuchsia-400 w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <span>{t('rrpp.step1')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-fuchsia-500/20 text-fuchsia-400 w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <span>{t('rrpp.step2')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-fuchsia-500/20 text-fuchsia-400 w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5">3</span>
                  <span>{t('rrpp.step3')}</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {!showCreateForm ? (
          <button
            onClick={() => setShowCreateForm(true)}
            className="w-full py-5 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 rounded-2xl font-black text-sm uppercase tracking-widest shadow-[0_0_30px_-10px_rgba(192,38,211,0.5)] transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <span className="material-icons">add</span>
            {t('rrpp.createNewEvent')}
          </button>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900 border border-fuchsia-500/20 rounded-3xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-black">{t('rrpp.newEventFormTitle')}</h2>
              <button onClick={() => setShowCreateForm(false)} className="text-slate-500 hover:text-white">
                <span className="material-icons">close</span>
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 block uppercase tracking-widest">
                  {t('rrpp.flyerLabel')}
                </label>
                <div className="relative border-2 border-dashed border-slate-700 hover:border-fuchsia-500 rounded-2xl p-4 text-center cursor-pointer bg-slate-900/50">
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleUploadFlyer} 
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  {flyerPreview ? (
                    <img src={flyerPreview} alt="Preview" className="h-32 w-full object-cover rounded-xl" />
                  ) : (
                    <div className="text-slate-400 py-2">
                      <span className="text-2xl block mb-1">🖼️</span>
                      <span className="text-xs font-medium">{t('rrpp.uploadFlyerHint')}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">{t('rrpp.eventNameLabel')}</label>
                <input
                  required
                  placeholder={t('rrpp.eventNamePlaceholder')}
                  value={eventName}
                  onChange={e => setEventName(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-fuchsia-500 outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">{t('rrpp.venueLabel')}</label>
                <input
                  required
                  placeholder={t('rrpp.venuePlaceholder')}
                  value={venueName}
                  onChange={e => setVenueName(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-fuchsia-500 outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">{t('rrpp.addressLabel')}</label>
                <input
                  required
                  placeholder={t('rrpp.addressPlaceholder')}
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-fuchsia-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-400">{t('rrpp.dateLabel')}</label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={e => setEventDate(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-fuchsia-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-400">{t('rrpp.timeLabel')}</label>
                  <input
                    type="time"
                    value={eventTime}
                    onChange={e => setEventTime(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-fuchsia-500 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">{t('rrpp.ticketTypeLabel')}</label>
                <select
                  value={ticketType}
                  onChange={e => setTicketType(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-fuchsia-500 outline-none appearance-none"
                >
                  <option value="general">{t('rrpp.ticketGeneral')}</option>
                  <option value="vip">{t('rrpp.ticketVip')}</option>
                  <option value="promo">{t('rrpp.ticketPromo')}</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={creating}
                className="w-full py-4 bg-white text-black hover:bg-slate-200 rounded-xl font-black uppercase tracking-widest text-xs transition-colors disabled:opacity-50 mt-2"
              >
                {creating ? t('rrpp.creatingEvent') : t('rrpp.createEventBtn')}
              </button>

              <p className="text-center text-[10px] text-slate-500 px-4">
                {t('rrpp.disclaimer')}
              </p>
            </form>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default function RRPPPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center font-bold text-slate-500">Cargando...</div>
    }>
      <RRPPInner />
    </Suspense>
  );
}
