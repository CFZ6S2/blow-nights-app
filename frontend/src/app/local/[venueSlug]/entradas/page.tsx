'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Ticket, MapPin, Share2, Check, ShieldCheck, Sparkles, ShoppingBag } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { useTranslation } from 'react-i18next';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

interface TicketTier {
  id: string;
  nombre: string;
  precio: number;
  descripcion: string;
  incluye: string[];
  destacado?: boolean;
}

function PublicVenueTicketsContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const venueSlug = params?.venueSlug as string;
  const giftUserId = searchParams.get('gift');

  const [venue, setVenue] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [buyingId, setBuyingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchVenue = async () => {
      try {
        const q = query(collection(db, 'venues'), where('slug', '==', venueSlug));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const docData = snapshot.docs[0].data();
          setVenue({ id: snapshot.docs[0].id, ...docData });
        } else {
          setVenue({
            id: venueSlug,
            nombre: venueSlug?.replace(/-/g, ' ').toUpperCase() || 'VENUE',
            ciudad: 'Madrid',
            direccion: 'Zona Centro / Chueca',
            fotoUrl: 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=1200&auto=format&fit=crop',
            description: t('venue_tickets.fallback_desc'),
            tickets: [
              { id: 'early', nombre: t('venue_tickets.tier_early'), precio: 12, descripcion: t('venue_tickets.tier_early_desc'), incluye: [t('venue_tickets.perk_priority'), t('venue_tickets.perk_1drink')], destacado: false },
              { id: 'general', nombre: t('venue_tickets.tier_general'), precio: 15, descripcion: t('venue_tickets.tier_general_desc'), incluye: [t('venue_tickets.perk_main_access'), t('venue_tickets.perk_premium_drink')], destacado: true },
              { id: 'vip', nombre: t('venue_tickets.tier_vip'), precio: 30, descripcion: t('venue_tickets.tier_vip_desc'), incluye: [t('venue_tickets.perk_fast_pass'), t('venue_tickets.perk_2premium'), t('venue_tickets.perk_coat_check')], destacado: false }
            ]
          });
        }
      } catch (err) {
        console.error("Error loading venue:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchVenue();
  }, [venueSlug, t]);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleCheckout = async (ticket: TicketTier) => {
    setBuyingId(ticket.id);
    try {
      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const functions = getFunctions();
      const purchasePublicVenueTicket = httpsCallable(functions, 'purchasePublicVenueTicket');

      const result = await purchasePublicVenueTicket({
        venueId: venue.id,
        ticketType: ticket.id,
        origin: window.location.origin,
        giftUserId,
      });

      const { url } = result.data as { url: string };
      if (url) window.location.href = url;
    } catch (err: any) {
      console.error("Error in checkout:", err);
      alert(err.message || t('venue_tickets.checkout_error'));
    } finally {
      setBuyingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-fuchsia-500" />
      </div>
    );
  }

  const ticketsList: TicketTier[] = venue.tickets || [
    { id: 'early', nombre: t('venue_tickets.tier_early'), precio: 12, descripcion: t('venue_tickets.tier_early_desc'), incluye: [t('venue_tickets.perk_priority'), t('venue_tickets.perk_1drink')], destacado: false },
    { id: 'general', nombre: t('venue_tickets.tier_general'), precio: 15, descripcion: t('venue_tickets.tier_general_desc'), incluye: [t('venue_tickets.perk_main_access'), t('venue_tickets.perk_premium_drink')], destacado: true },
    { id: 'vip', nombre: t('venue_tickets.tier_vip'), precio: 30, descripcion: t('venue_tickets.tier_vip_desc'), incluye: [t('venue_tickets.perk_fast_pass'), t('venue_tickets.perk_2premium'), t('venue_tickets.perk_coat_check')], destacado: false }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-fuchsia-500/30 pb-24">
      <div className="relative h-[45vh] min-h-[320px] w-full overflow-hidden">
        <img
          src={venue.fotoUrl || 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=1200&auto=format&fit=crop'}
          alt={venue.nombre}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />

        <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-10">
          <Link
            href="/entradas"
            className="px-4 py-2 bg-slate-950/80 hover:bg-slate-950 backdrop-blur-md rounded-xl text-xs font-black uppercase tracking-wider text-white border border-white/10 transition-all flex items-center gap-2"
          >
            ← {t('venue_tickets.back_all')}
          </Link>

          <button
            onClick={handleShare}
            className="px-4 py-2 bg-slate-950/80 hover:bg-slate-950 backdrop-blur-md rounded-xl text-xs font-black uppercase tracking-wider text-white border border-white/10 transition-all flex items-center gap-2"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            {copied ? t('venue_tickets.copied') : t('venue_tickets.share')}
          </button>
        </div>

        <div className="absolute bottom-8 left-6 right-6 max-w-4xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-fuchsia-500/20 border border-fuchsia-500/30 text-fuchsia-300 text-[10px] font-black uppercase tracking-widest">
            <ShieldCheck className="w-3.5 h-3.5" />
            {t('venue_tickets.official_wall')}
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight uppercase leading-none">
            {venue.nombre}
          </h1>
          <p className="text-slate-300 text-sm md:text-base font-medium flex items-center gap-2">
            <MapPin className="w-4 h-4 text-fuchsia-400 shrink-0" />
            {venue.direccion} • {venue.ciudad}
          </p>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-6 pt-8 space-y-8">
        <div className="bg-slate-900/60 p-6 rounded-3xl border border-white/10 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-white">{t('venue_tickets.no_registration')}</h3>
            <p className="text-slate-400 text-xs mt-0.5">{t('venue_tickets.qr_delivery')}</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-emerald-400 font-bold bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20 shrink-0">
            <ShieldCheck className="w-4 h-4" /> {t('venue_tickets.secure_stripe')}
          </div>
        </div>

        <div className="grid gap-6">
          {ticketsList.map((ticket) => (
            <motion.div
              key={ticket.id}
              whileHover={{ scale: 1.01 }}
              className={`relative bg-slate-900 border rounded-3xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-2xl transition-all ${
                ticket.destacado
                  ? 'border-fuchsia-500/60 bg-gradient-to-r from-fuchsia-950/30 via-slate-900 to-slate-900 shadow-fuchsia-900/20'
                  : 'border-white/10'
              }`}
            >
              {ticket.destacado && (
                <span className="absolute -top-3 left-8 bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> {t('venue_tickets.best_seller')}
                </span>
              )}

              <div className="space-y-3 flex-1">
                <div className="flex items-baseline gap-3">
                  <h3 className="text-2xl font-black text-white">{ticket.nombre}</h3>
                  <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-indigo-400">
                    {ticket.precio}€
                  </span>
                </div>
                <p className="text-slate-400 text-xs leading-relaxed max-w-xl">{ticket.descripcion}</p>

                <div className="flex flex-wrap gap-2 pt-1">
                  {ticket.incluye.map((inc, i) => (
                    <span key={i} className="text-[10px] font-bold text-slate-300 bg-white/5 border border-white/5 px-3 py-1 rounded-lg flex items-center gap-1">
                      <Check className="w-3 h-3 text-fuchsia-400" />
                      {inc}
                    </span>
                  ))}
                </div>
              </div>

              <button
                onClick={() => handleCheckout(ticket)}
                disabled={buyingId === ticket.id}
                className={`w-full md:w-auto px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-2 shrink-0 ${
                  ticket.destacado
                    ? 'bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white shadow-fuchsia-500/25'
                    : 'bg-white text-slate-950 hover:bg-slate-200'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                {buyingId === ticket.id ? t('venue_tickets.processing') : t('venue_tickets.buy_ticket')}
              </button>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default function PublicVenueTicketsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-fuchsia-500" /></div>}>
      <PublicVenueTicketsContent />
    </Suspense>
  );
}
