'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { motion } from 'framer-motion';

export default function RRPPCreateEventPage() {
  const router = useRouter();

  const [eventName, setEventName] = useState('');
  const [venueName, setVenueName] = useState('');
  const [address, setAddress] = useState('');
  const [price, setPrice] = useState('20');
  const [commission, setCommission] = useState('40'); // Percentage by default
  const [promoterName, setPromoterName] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<{token: string, scannerToken: string, eventId: string} | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName || !venueName || !address || !promoterName) return alert('Rellena los campos obligatorios');
    
    setLoading(true);
    try {
      // 1. Create unverified venue
      const venueRef = doc(collection(db, 'venues'));
      const venueId = venueRef.id;
      
      // Basic coordinates offset for Madrid just for demo (in production use Geocoding)
      const lat = 40.4168 + (Math.random() - 0.5) * 0.05;
      const lng = -3.7038 + (Math.random() - 0.5) * 0.05;

      await setDoc(venueRef, {
        name: venueName,
        address,
        type: 'club',
        isActive: true,
        isClaimed: false, // Local No Reclamado
        cityId: 'madrid',
        ownerId: 'unclaimed',
        currentCount: 0,
        location: { latitude: lat, longitude: lng },
        ticketPricing: {
          'rrpp_fast': {
            name: 'Entrada General RRPP',
            amount: parseFloat(price),
            stripePriceId: 'mock_fast'
          }
        }
      });

      // 2. Create Event ID
      const eventId = new Date().toISOString().split('T')[0] + '-' + Math.random().toString(36).substr(2, 5);
      const scannerToken = 'DOOR-' + Math.random().toString(36).substr(2, 6).toUpperCase();

      const eventRef = doc(db, `venues/${venueId}/events`, eventId);
      await setDoc(eventRef, {
        title: eventName,
        date: new Date().toISOString().split('T')[0],
        scanner_token: scannerToken
      });

      // 3. Create Promoter Token
      const token = Math.random().toString(36).substr(2, 6).toUpperCase();
      const promoterRef = doc(collection(db, `venues/${venueId}/events/${eventId}/promoters`));
      await setDoc(promoterRef, {
        name: promoterName,
        code: token,
        commission: parseFloat(commission),
        is_closed: false,
        liquidated_by_rrpp: false,
        liquidated_by_venue: false
      });

      setGeneratedToken({ token, scannerToken, eventId });
    } catch(e) {
      console.error(e);
      alert('Error creando evento');
    } finally {
      setLoading(false);
    }
  };

  if (generatedToken) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center selection:bg-fuchsia-500/30">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-slate-900 border border-white/10 p-8 rounded-3xl w-full max-w-md">
          <div className="text-5xl mb-4">🚀</div>
          <h1 className="text-2xl font-black mb-2">¡Tu Evento está en marcha!</h1>
          <p className="text-slate-400 text-sm mb-6">El local ha sido dado de alta y ya puedes empezar a vender tus entradas.</p>
          
          <div className="bg-black/50 border border-fuchsia-500/30 p-4 rounded-2xl mb-4">
            <p className="text-xs text-fuchsia-400 font-bold uppercase tracking-widest mb-1">Tu Enlace de Venta</p>
            <p className="font-mono text-sm break-all">
              {typeof window !== 'undefined' ? window.location.origin : ''}/rrpp?token={generatedToken.token}
            </p>
          </div>

          <div className="bg-black/50 border border-emerald-500/30 p-4 rounded-2xl mb-6">
            <p className="text-xs text-emerald-400 font-bold uppercase tracking-widest mb-1">Enlace del Escáner (Para Puerta)</p>
            <p className="font-mono text-sm break-all text-emerald-200">
              {typeof window !== 'undefined' ? window.location.origin : ''}/door?event={generatedToken.eventId}&token={generatedToken.scannerToken}&type=venue
            </p>
          </div>

          <button 
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/rrpp?token=${generatedToken.token}`);
              alert('Enlace de venta copiado al portapapeles');
            }}
            className="w-full bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold py-4 rounded-xl mb-3 shadow-[0_0_20px_-5px_rgba(192,38,211,0.5)]"
          >
            Copiar Enlace Venta
          </button>
          
          <button 
            onClick={() => router.push(`/rrpp?token=${generatedToken.token}`)}
            className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-xl"
          >
            Ir a mi Panel RRPP
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 pb-24">
      <header className="mb-8 max-w-md mx-auto pt-8">
        <div className="inline-block px-3 py-1 bg-fuchsia-900/30 text-fuchsia-400 rounded-full text-[10px] font-black tracking-widest uppercase mb-4 border border-fuchsia-500/20">
          Venta Rápida RRPP
        </div>
        <h1 className="text-3xl font-black mb-2 leading-tight">Crea una fiesta y empieza a vender.</h1>
        <p className="text-slate-400 text-sm">¿El local no está en Blow Nights? No importa. Daló de alta tú mismo y empieza a generar comisiones ahora.</p>
      </header>

      <form onSubmit={handleCreate} className="max-w-md mx-auto space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Nombre de la Fiesta</label>
          <input required placeholder="Ej: Matinal Euphoria" value={eventName} onChange={e=>setEventName(e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-4 text-sm focus:border-fuchsia-500 outline-none" />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Local (Discoteca)</label>
          <input required placeholder="Ej: Discoteca Velvet" value={venueName} onChange={e=>setVenueName(e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-4 text-sm focus:border-fuchsia-500 outline-none" />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Dirección</label>
          <input required placeholder="Ej: Calle Mayor, 12, Madrid" value={address} onChange={e=>setAddress(e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-4 text-sm focus:border-fuchsia-500 outline-none" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Precio Entrada (€)</label>
            <input type="number" required value={price} onChange={e=>setPrice(e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-4 text-sm focus:border-fuchsia-500 outline-none" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Tu Comisión (%)</label>
            <input type="number" required value={commission} onChange={e=>setCommission(e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-4 text-sm focus:border-fuchsia-500 outline-none" />
          </div>
        </div>

        <div className="space-y-2 mb-8">
          <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Tu Nombre (RRPP)</label>
          <input required placeholder="Ej: Carlos VIP" value={promoterName} onChange={e=>setPromoterName(e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-4 text-sm focus:border-fuchsia-500 outline-none" />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-black py-4 rounded-2xl shadow-[0_0_30px_-10px_rgba(192,38,211,0.5)] transition-all disabled:opacity-50 mt-4"
        >
          {loading ? 'Generando...' : 'Crear Enlace de Venta'}
        </button>
        <p className="text-center text-[10px] text-slate-500 mt-4 px-4">
          Al crear este evento, confirmas que tienes autorización del local para actuar como promotor independiente.
        </p>
      </form>
    </div>
  );
}
