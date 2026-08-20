'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { httpsCallable } from 'firebase/functions';
import { functions, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useTranslation } from 'react-i18next';

const PLATFORM_FEE = 1.00; // 1.00€ gastos de gestión

interface TicketTier {
  id: string;
  name: string;
  price: number;
  quota: number;
  sold?: number;
}

function BuyTicketContent() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const router = useRouter();
  const venueId = searchParams.get('venue');
  const eventId = searchParams.get('event');
  const rrppId = searchParams.get('rrpp');
  const { user } = useAuth();
  const { isReady } = useRequireAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [venueName, setVenueName] = useState('');
  const [eventTitle, setEventTitle] = useState('');
  const [tiers, setTiers] = useState<TicketTier[]>([]);
  const [selectedTier, setSelectedTier] = useState<string>('');
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    if (!venueId || !eventId) {
      setPageLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        const [venueSnap, eventSnap] = await Promise.all([
          getDoc(doc(db, 'venues', venueId)),
          getDoc(doc(db, 'venues', venueId, 'events', eventId)),
        ]);

        if (venueSnap.exists()) {
          const venueData = venueSnap.data();
          setVenueName(venueData.name || '');

          if (venueData.externalTicketUrl) {
            window.location.href = venueData.externalTicketUrl;
            return;
          }
        }

        if (eventSnap.exists()) {
          const eventData = eventSnap.data();
          setEventTitle(eventData.title || '');
          const availableTiers = (eventData.ticket_tiers || []).filter(
            (t: TicketTier) => (t.sold || 0) < t.quota
          );
          setTiers(availableTiers);
          if (availableTiers.length > 0) setSelectedTier(availableTiers[0].id);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setPageLoading(false);
      }
    };

    loadData();
  }, [venueId, eventId]);

  const currentTier = tiers.find(t => t.id === selectedTier);
  const ticketPrice = currentTier?.price || 0;
  const totalPrice = ticketPrice + PLATFORM_FEE;

  const handleBuy = async () => {
    if (!venueId || !eventId || !selectedTier) return;

    setLoading(true);
    setError('');

    try {
      const createCheckout = httpsCallable(functions, 'createTicketCheckout');
      const res: any = await createCheckout({
        venueId,
        eventId,
        ticketType: selectedTier,
        rrppId: rrppId || '',
        origin: window.location.origin,
      });

      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        setError('No se pudo generar el pago.');
        setLoading(false);
      }
    } catch (e: any) {
      const msg = e.message || t('buy.error.payment_init_error');
      if (msg.includes('agotadas')) {
        setError(t('buy.error.tier_sold_out'));
        setTiers(prev => prev.filter(t => t.id !== selectedTier));
        if (tiers.length > 1) setSelectedTier(tiers.find(t => t.id !== selectedTier)?.id || '');
      } else {
        setError(msg);
      }
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-fuchsia-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!venueId || !eventId) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
        <span className="material-icons text-6xl text-red-500 mb-4">error_outline</span>
        <h1 className="text-xl font-bold text-white mb-2">{t('buy.invalid_link.title')}</h1>
        <p className="text-slate-400">{t('buy.invalid_link.description')}</p>
      </div>
    );
  }

  if (tiers.length === 0) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
        <span className="material-icons text-6xl text-slate-700 mb-4">confirmation_number</span>
        <h1 className="text-xl font-black text-white mb-2">{t('buy.sold_out.title')}</h1>
        <p className="text-slate-500 text-sm">{t('buy.sold_out.description')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 flex flex-col items-center justify-center">
      <div className="bg-slate-900/80 border border-white/5 p-8 rounded-3xl w-full max-w-md shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 bg-fuchsia-600 text-white text-[10px] font-black px-4 py-1 rounded-bl-2xl uppercase tracking-widest">
          {t('buy.secure_purchase')}
        </div>

        <h1 className="text-2xl font-black mb-1 mt-4 text-fuchsia-400 uppercase tracking-widest">
          {venueName || t('buy.buy_ticket')}
        </h1>
        {eventTitle && <p className="text-white font-bold text-sm mb-1">{eventTitle}</p>}
        <p className="text-slate-500 text-xs mb-6">{t('buy.qr_generated_instantly')}</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl mb-6 text-sm font-bold">
            {error}
          </div>
        )}

        {tiers.length > 1 && (
          <div className="space-y-2 mb-6">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-500 block">{t('buy.ticket_type_label')}</label>
            {tiers.map(tier => {
              const remaining = tier.quota - (tier.sold || 0);
              return (
                <button
                  key={tier.id}
                  onClick={() => setSelectedTier(tier.id)}
                  className={`w-full flex justify-between items-center p-4 rounded-2xl border transition-all ${
                    selectedTier === tier.id
                      ? 'bg-fuchsia-500/10 border-fuchsia-500/50'
                      : 'bg-white/5 border-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="text-left">
                    <p className="font-bold text-sm">{tier.name}</p>
                    <p className="text-[10px] text-slate-500">{remaining} {t('buy.available')}</p>
                  </div>
                  <p className="font-black text-lg">{tier.price.toFixed(2)} €</p>
                </button>
              );
            })}
          </div>
        )}

        <div className="bg-white/5 rounded-2xl p-4 mb-6 border border-white/5">
          <div className="flex justify-between text-sm mb-2 text-slate-300">
            <span>{currentTier?.name || t('buy.default_ticket_name')}</span>
            <span className="font-bold">{ticketPrice.toFixed(2)} €</span>
          </div>
          <div className="flex justify-between text-sm mb-2 text-slate-500">
            <span>{t('buy.platform_fee')}</span>
            <span className="font-bold">{PLATFORM_FEE.toFixed(2)} €</span>
          </div>
          <div className="border-t border-white/10 pt-2 mt-2 flex justify-between">
            <span className="font-black">{t('buy.total')}</span>
            <span className="font-black text-fuchsia-400 text-xl">{totalPrice.toFixed(2)} €</span>
          </div>
        </div>

        <button
          onClick={handleBuy}
          disabled={loading || !selectedTier}
          className="w-full bg-white hover:bg-slate-200 text-black font-black py-4 rounded-xl transition-all uppercase tracking-widest disabled:opacity-50 active:scale-95"
        >
          {loading ? t('buy.redirecting_to_stripe') : `${t('buy.pay')} ${totalPrice.toFixed(2)} €`}
        </button>
        <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-slate-600 font-bold">
          <span className="material-icons text-xs">lock</span>
          {t('buy.secure_payment_stripe')}
        </div>
      </div>
    </div>
  );
}

export default function BuyTicketPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-fuchsia-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <BuyTicketContent />
    </Suspense>
  );
}
