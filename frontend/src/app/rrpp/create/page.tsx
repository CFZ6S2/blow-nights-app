'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/lib/firebase';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';

export default function RRPPCreateEventPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();

  const [eventName, setEventName] = useState('');
  const [venueName, setVenueName] = useState('');
  const [address, setAddress] = useState('');
  const [promoterName, setPromoterName] = useState('');

  useEffect(() => {
    if (profile) {
      setPromoterName(profile.nick || '');
    }
  }, [profile]);
  
  const [loading, setLoading] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<{token: string, scannerToken: string, eventId: string} | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName || !venueName || !address || !promoterName) return alert('Rellena los campos obligatorios');
    
    setLoading(true);
    try {
      // Geocodificación simple usando Nominatim (OpenStreetMap)
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
      const geocodeData = await res.json();
      
      if (!geocodeData || geocodeData.length === 0) {
        throw new Error('No se ha podido encontrar la dirección. Por favor sé más específico.');
      }
      
      const lat = parseFloat(geocodeData[0].lat);
      const lng = parseFloat(geocodeData[0].lon);

      // Llamar a la Cloud Function de creación de fiesta
      const createParty = httpsCallable(functions, 'createRRPPParty');
      const response: any = await createParty({
        eventName,
        venueName,
        address,
        lat,
        lng
      });

      const { token, scannerToken, eventId } = response.data;

      setGeneratedToken({ token, scannerToken, eventId });
    } catch(e: any) {
      console.error(e);
      alert(e.message || 'Error creando evento');
      if (e.code === 'permission-denied') {
        // Probablemente ha sido baneado por piratería
        window.location.href = '/login';
      }
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

  if (authLoading) return <div className="min-h-screen bg-black" />;
  
  if (!user || profile?.role !== 'rrpp') {
    if (typeof window !== 'undefined') {
      router.push('/rrpp/register');
    }
    return null;
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



        <div className="space-y-2 mb-8">
          <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Tu Nombre (RRPP)</label>
          <input required readOnly placeholder="Ej: Carlos VIP" value={promoterName} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-4 text-sm outline-none text-slate-400 cursor-not-allowed" />
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
