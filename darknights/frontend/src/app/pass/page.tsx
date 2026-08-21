'use client';

import React, { useEffect, useState, Suspense } from 'react';
import QRCode from 'react-qr-code';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AlertCircle } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useTranslation } from 'react-i18next';

function TicketViewInner() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const { user } = useAuth();
  const { isReady } = useRequireAuth();

  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    
    const fetchTicket = async () => {
      try {
        const docRef = doc(db, 'tickets', id);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setTicket({ id: snap.id, ...snap.data() });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTicket();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-amber-400 text-xs font-black uppercase tracking-widest animate-pulse">
        {t('pass.loading_pass')}
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center text-white p-6">
        <AlertCircle size={48} className="text-red-500 mb-4" />
        <h1 className="text-xl font-bold">{t('pass.error.not_found_title')}</h1>
        <p className="text-gray-400 text-center mt-2">{t('pass.error.not_found_desc')}</p>
      </div>
    );
  }

  if (user && ticket.userId && ticket.userId !== user.uid) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center text-white p-6">
        <AlertCircle size={48} className="text-red-500 mb-4" />
        <h1 className="text-xl font-bold">{t('pass.error.access_denied_title')}</h1>
        <p className="text-gray-400 text-center mt-2">{t('pass.error.access_denied_desc')}</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-white text-slate-900 flex justify-center p-4 pb-12">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl space-y-4 pb-6">
        
        {/* 1. Flyer / Cartel de Cabecera */}
        <div className="relative h-48 w-full bg-slate-800">
          {ticket.flyerUrl ? (
            <img 
              src={ticket.flyerUrl} 
              alt={ticket.eventTitle || 'Event'} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-amber-900 via-blue-950 to-slate-950 flex flex-col items-center justify-center text-amber-400/40">
              <span className="text-4xl mb-1">🪩</span>
              <span className="text-[10px] uppercase font-black tracking-widest text-slate-500">DARKNIGHTS Pass</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-black/30" />
          <span className="absolute top-3 left-3 bg-amber-600/90 backdrop-blur-md text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow-lg">
            {t('pass.official_pass')}
          </span>
        </div>

        {/* 2. Datos del Evento */}
        <div className="px-5 space-y-1">
          <h1 className="text-xl font-black tracking-tight text-white">{ticket.eventTitle || t('pass.default_event_title')}</h1>
          <p className="text-xs text-amber-400 font-semibold flex items-center gap-1">
            📍 {ticket.venueName || t('pass.default_venue_name')}
          </p>
          {ticket.eventDate && (
            <p className="text-xs text-slate-400 mt-1 font-medium">
              📅 {ticket.eventDate} {ticket.eventTime && `• ⏰ ${ticket.eventTime}h`}
            </p>
          )}
        </div>

        {/* 3. Desglose de Consumición y Asistente */}
        <div className="mx-5 bg-slate-200 border border-slate-200 rounded-2xl p-3.5 flex justify-between items-center text-xs shadow-inner shadow-black/50">
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider block">{t('pass.ticket_type_label')}</span>
            <span className="font-bold text-emerald-400 tracking-wide">{ticket.tierName || ticket.ticketType || t('pass.default_tier_name')}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">{t('pass.guest_prefix')}{ticket.client_name || t('pass.anonymous')}</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider block">RRPP</span>
            <span className="font-bold text-slate-300 tracking-wide">{ticket.promoter_name || t('pass.official_promoter')}</span>
          </div>
        </div>

        {/* 4. QR Dinámico + PIN de Puerta */}
        <div className="p-5 pt-1 text-center space-y-4">
          <div className="inline-block p-3 bg-white rounded-2xl shadow-inner shadow-black/20">
            <QRCode 
              value={`https://darknights.com/scan?ticket=${ticket.qrToken}`}
              size={170}
              level="M"
            />
          </div>

          {ticket.pinCode && (
            <div className="bg-slate-500 border border-slate-800 py-2.5 px-4 rounded-xl inline-block w-full shadow-lg">
              <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest block mb-0.5">
                {t('pass.door_pin')}
              </span>
              <span className="text-2xl font-mono font-black tracking-[0.25em] text-amber-400">
                #{ticket.pinCode}
              </span>
            </div>
          )}

          <p className="text-[10px] text-slate-500 leading-tight font-medium px-4">
            {t('pass.presentation_instruction')}
          </p>
        </div>

      </div>
    </main>
  );
}

export default function TicketViewPage() {
  const { t } = useTranslation();
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center text-amber-400 text-xs font-black uppercase tracking-widest animate-pulse">{t('pass.loading_pass')}</div>}>
      <TicketViewInner />
    </Suspense>
  );
}
