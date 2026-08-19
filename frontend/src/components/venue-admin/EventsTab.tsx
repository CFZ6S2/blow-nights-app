'use client';

import { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, doc, setDoc, Timestamp, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { motion } from 'framer-motion';

interface TicketTier {
  id: string;
  name: string;
  price: number;
  quota: number;
  sold: number;
  perks: string;
}

interface VenueEvent {
  id: string;
  title: string;
  banner_url: string;
  start_date: Timestamp | null;
  door_access_token: string;
  ticket_tiers: TicketTier[];
  stats: {
    total_sold: number;
    total_checked_in: number;
  };
}

interface Promoter {
  id: string;
  name: string;
  code: string;
  access_token: string;
  is_closed: boolean;
  liquidated_by_venue: boolean;
  liquidated_by_rrpp: boolean;
  stats?: {
    total_generated: number;
    total_entered: number;
  }
}

function EventPromoters({ venueId, eventId }: { venueId: string; eventId: string }) {
  const [promoters, setPromoters] = useState<Promoter[]>([]);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, `venues/${venueId}/events/${eventId}/promoters`));
    const unsub = onSnapshot(q, (snap) => {
      const p: Promoter[] = [];
      snap.forEach(d => p.push({ id: d.id, ...d.data() } as Promoter));
      setPromoters(p);
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [venueId, eventId]);

  const handleAddPromoter = async () => {
    if (!newName.trim()) return;
    const token = crypto.randomUUID().replace(/-/g, '') + Date.now().toString(36);
    const code = newName.toLowerCase().replace(/[^a-z0-9]/g, '');
    try {
      await setDoc(doc(collection(db, `venues/${venueId}/events/${eventId}/promoters`)), {
        name: newName,
        code,
        access_token: token,
        is_closed: false,
        liquidated_by_venue: false,
        liquidated_by_rrpp: false,
        created_at: Timestamp.now()
      });
      setNewName('');
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  };

  const handleClose = async (promoterId: string) => {
    if (!confirm('¿Seguro que quieres cerrar las listas de este RRPP? Ya no podrá generar más entradas.')) return;
    try {
      await setDoc(doc(db, `venues/${venueId}/events/${eventId}/promoters`, promoterId), {
        is_closed: true,
        closed_at: Timestamp.now()
      }, { merge: true });
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  };

  const handleLiquidate = async (promoterId: string, currentValue: boolean) => {
    try {
      await setDoc(doc(db, `venues/${venueId}/events/${eventId}/promoters`, promoterId), {
        liquidated_by_venue: !currentValue,
        liquidated_at: Timestamp.now()
      }, { merge: true });
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  };

  const copyLink = (token: string) => {
    const link = `${window.location.origin}/rrpp?token=${token}`;
    navigator.clipboard.writeText(link);
    alert('Enlace del RRPP copiado. ¡Envíalo por WhatsApp!');
  };

  return (
    <div className="mt-4 pt-4 border-t border-white/5 space-y-4">
      <h4 className="text-sm font-bold text-fuchsia-400">Equipo RRPP</h4>
      
      <div className="flex gap-2">
        <input 
          type="text" 
          value={newName} 
          onChange={e => setNewName(e.target.value)} 
          placeholder="Nombre del nuevo RRPP..."
          className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-fuchsia-500"
        />
        <button onClick={handleAddPromoter} className="bg-fuchsia-600 text-white px-4 py-2 rounded-xl text-sm font-bold">
          Añadir
        </button>
      </div>

      {loading ? (
        <div className="text-xs text-slate-500">Cargando...</div>
      ) : promoters.length === 0 ? (
        <div className="text-xs text-slate-500">No hay RRPPs asignados a este evento.</div>
      ) : (
        <div className="space-y-3 mt-4">
          {promoters.map(p => {
            const isDestroyed = p.liquidated_by_rrpp && p.liquidated_by_venue;
            if (isDestroyed) return null; // Destruido/oculto de la vista activa

            return (
              <div key={p.id} className={`flex items-center justify-between p-3 rounded-xl border ${p.is_closed ? 'bg-black/40 border-yellow-500/20' : 'bg-black/20 border-white/10'}`}>
                <div>
                  <div className="font-bold text-sm flex items-center gap-2">
                    {p.name}
                    {p.is_closed && <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">CERRADO</span>}
                  </div>
                  {!p.is_closed && (
                    <button onClick={() => copyLink(p.access_token)} className="text-[10px] text-fuchsia-400 hover:text-fuchsia-300 flex items-center mt-1">
                      <span className="material-icons text-[12px] mr-1">link</span> Copiar Enlace
                    </button>
                  )}
                  {p.is_closed && (
                    <div className="text-[10px] text-slate-500 mt-1 flex flex-col gap-1">
                      <span className={p.liquidated_by_venue ? 'text-green-400' : ''}>
                        <span className="material-icons text-[10px] mr-1">{p.liquidated_by_venue ? 'check_circle' : 'pending'}</span>
                        Garito: {p.liquidated_by_venue ? 'Liquidado' : 'Pendiente'}
                      </span>
                      <span className={p.liquidated_by_rrpp ? 'text-green-400' : ''}>
                        <span className="material-icons text-[10px] mr-1">{p.liquidated_by_rrpp ? 'check_circle' : 'pending'}</span>
                        RRPP: {p.liquidated_by_rrpp ? 'Confirmado' : 'Pendiente'}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2 items-end">
                  {!p.is_closed ? (
                    <button 
                      onClick={() => handleClose(p.id)}
                      className="text-[10px] border border-yellow-500/50 text-yellow-500 px-3 py-1.5 rounded-lg hover:bg-yellow-500/20 font-bold uppercase tracking-wider"
                    >
                      Cerrar Lista
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleLiquidate(p.id, p.liquidated_by_venue)}
                      className={`text-[10px] border px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider ${p.liquidated_by_venue ? 'border-red-500/50 text-red-400 hover:bg-red-500/20' : 'border-green-500/50 text-green-400 hover:bg-green-500/20'}`}
                    >
                      {p.liquidated_by_venue ? 'Anular Pago' : 'Marcar Pagado'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function EventsTab({ venueId }: { venueId: string }) {
  const [events, setEvents] = useState<VenueEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [flyerFile, setFlyerFile] = useState<File | null>(null);
  const [flyerPreview, setFlyerPreview] = useState('');
  const [tiers, setTiers] = useState<TicketTier[]>([
    { id: 'tier_general', name: 'Entrada General', price: 15, quota: 100, sold: 0, perks: '1 Copa incluida' }
  ]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const q = query(collection(db, `venues/${venueId}/events`), orderBy('start_date', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const evts: VenueEvent[] = [];
      snap.forEach((d) => {
        evts.push({ id: d.id, ...d.data() } as VenueEvent);
      });
      setEvents(evts);
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [venueId]);

  const handleFlyerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFlyerFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setFlyerPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const addTier = () => {
    setTiers([...tiers, { id: `tier_${Date.now()}`, name: '', price: 0, quota: 0, sold: 0, perks: '' }]);
  };

  const updateTier = (index: number, field: keyof TicketTier, value: string | number) => {
    const newTiers = [...tiers];
    newTiers[index] = { ...newTiers[index], [field]: value };
    setTiers(newTiers);
  };

  const compressToWebP = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height && width > maxDim) {
            height *= maxDim / width;
            width = maxDim;
          } else if (height > maxDim) {
            width *= maxDim / height;
            height = maxDim;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Canvas toBlob failed'));
          }, 'image/webp', 0.8);
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const handleCreateEvent = async () => {
    if (!title || !startDate) return alert('Título y fecha son obligatorios');
    setSaving(true);
    try {
      let banner_url = '';
      const eventId = `evt_${Date.now()}`;

      if (flyerFile) {
        const webpBlob = await compressToWebP(flyerFile);
        const storageRef = ref(storage, `venues/${venueId}/events/${eventId}/flyer.webp`);
        await uploadBytes(storageRef, webpBlob);
        banner_url = await getDownloadURL(storageRef);
      }

      const door_access_token = crypto.randomUUID().replace(/-/g, '') + Date.now().toString(36);

      const newEvent: Partial<VenueEvent> = {
        title,
        banner_url,
        start_date: Timestamp.fromDate(new Date(startDate)),
        door_access_token,
        ticket_tiers: tiers,
        stats: {
          total_sold: 0,
          total_checked_in: 0
        }
      };

      await setDoc(doc(db, `venues/${venueId}/events`, eventId), newEvent);
      
      setIsCreating(false);
      setTitle('');
      setDescription('');
      setStartDate('');
      setFlyerFile(null);
      setFlyerPreview('');
      setTiers([{ id: 'tier_general', name: 'Entrada General', price: 15, quota: 100, sold: 0, perks: '1 Copa incluida' }]);
    } catch (err: any) {
      console.error('Error creating event:', err);
      alert('Error al crear el evento: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const copyMagicLink = (eventId: string, token: string) => {
    const link = `${window.location.origin}/door?venueId=${venueId}&eventId=${eventId}&token=${token}`;
    navigator.clipboard.writeText(link);
    alert('Enlace copiado al portapapeles. ¡Envíalo por WhatsApp a tus porteros!');
  };

  if (loading) return <div className="text-center py-8">Cargando eventos...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-black">Gestión de Eventos</h2>
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="px-4 py-2 bg-fuchsia-600 text-white rounded-full text-xs font-bold uppercase tracking-widest"
        >
          {isCreating ? 'Cancelar' : '+ Nuevo Evento'}
        </button>
      </div>

      {isCreating && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-6">
          <h3 className="text-lg font-bold">Crear Nuevo Evento</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Título del Evento</label>
              <input 
                type="text" 
                value={title} 
                onChange={e => setTitle(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-fuchsia-500"
                placeholder="Ej. Sábado Loco - Winter Edition"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Fecha y Hora de Inicio</label>
              <input 
                type="datetime-local" 
                value={startDate} 
                onChange={e => setStartDate(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-fuchsia-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Cartel / Flyer (Opcional)</label>
              <input 
                type="file" 
                accept="image/*"
                onChange={handleFlyerChange}
                className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-fuchsia-600 file:text-white hover:file:bg-fuchsia-700"
              />
              {flyerPreview && (
                <img src={flyerPreview} alt="Preview" className="mt-4 h-32 rounded-xl object-cover" />
              )}
            </div>
            
            <div className="pt-4 border-t border-white/10 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-fuchsia-400">Tipos de Entrada (Tiers)</h4>
                <button onClick={addTier} className="text-xs text-fuchsia-400 border border-fuchsia-400 px-3 py-1 rounded-full">+ Añadir</button>
              </div>
              
              {tiers.map((tier, index) => (
                <div key={tier.id} className="bg-slate-900 p-4 rounded-2xl border border-white/5 space-y-3 relative">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1">Nombre</label>
                      <input type="text" value={tier.name} onChange={e => updateTier(index, 'name', e.target.value)} className="w-full bg-transparent border-b border-white/10 focus:border-fuchsia-500 pb-1 text-sm outline-none" placeholder="Ej. General" />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1">Precio (€)</label>
                      <input type="number" value={tier.price} onChange={e => updateTier(index, 'price', parseFloat(e.target.value))} className="w-full bg-transparent border-b border-white/10 focus:border-fuchsia-500 pb-1 text-sm outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1">Cupo (Aforo)</label>
                      <input type="number" value={tier.quota} onChange={e => updateTier(index, 'quota', parseInt(e.target.value))} className="w-full bg-transparent border-b border-white/10 focus:border-fuchsia-500 pb-1 text-sm outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1">Perks (Ej. 1 Copa)</label>
                      <input type="text" value={tier.perks} onChange={e => updateTier(index, 'perks', e.target.value)} className="w-full bg-transparent border-b border-white/10 focus:border-fuchsia-500 pb-1 text-sm outline-none" />
                    </div>
                  </div>
                  {tiers.length > 1 && (
                    <button onClick={() => setTiers(tiers.filter((_, i) => i !== index))} className="absolute top-2 right-2 text-red-400">
                      <span className="material-icons text-sm">close</span>
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={handleCreateEvent}
              disabled={saving}
              className="w-full py-4 bg-fuchsia-600 hover:bg-fuchsia-500 text-white rounded-2xl font-black uppercase tracking-widest transition-colors mt-6"
            >
              {saving ? 'Guardando...' : 'Crear Evento y Generar Escáner'}
            </button>
          </div>
        </motion.div>
      )}

      <div className="space-y-4">
        {events.length === 0 && !isCreating && (
          <div className="text-center py-12 text-slate-500">
            No tienes eventos programados.
          </div>
        )}
        
        {events.map(evt => (
          <div key={evt.id} className="bg-white/5 border border-white/10 rounded-3xl p-5 flex flex-col md:flex-row gap-5">
            {evt.banner_url ? (
              <img src={evt.banner_url} alt={evt.title} className="w-full md:w-32 h-32 object-cover rounded-2xl" />
            ) : (
              <div className="w-full md:w-32 h-32 bg-slate-900 rounded-2xl flex items-center justify-center">
                <span className="material-icons text-slate-600 text-3xl">event</span>
              </div>
            )}
            
            <div className="flex-1 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-black text-lg">{evt.title}</h3>
                  <p className="text-xs text-slate-400">
                    {evt.start_date ? evt.start_date.toDate().toLocaleString() : 'Fecha no definida'}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-fuchsia-400">{evt.stats?.total_sold || 0}</div>
                  <div className="text-[9px] uppercase tracking-widest text-slate-500">Tickets Vendidos</div>
                </div>
              </div>

              <div className="pt-3 border-t border-white/5">
                <div className="flex items-center justify-between bg-black/40 p-3 rounded-xl border border-fuchsia-500/20">
                  <div>
                    <div className="text-[10px] text-fuchsia-400 font-bold uppercase tracking-widest">Enlace de Portero (Magic Link)</div>
                    <div className="text-xs text-slate-400 font-mono mt-1">/door/{venueId}/{evt.id}?token={evt.door_access_token.substring(0,8)}...</div>
                  </div>
                  <button 
                    onClick={() => copyMagicLink(evt.id, evt.door_access_token)}
                    className="w-10 h-10 bg-fuchsia-600 rounded-full flex items-center justify-center hover:scale-105 transition-transform"
                    title="Copiar Enlace para Puerta"
                  >
                    <span className="material-icons text-white">content_copy</span>
                  </button>
                </div>
              </div>

              <EventPromoters venueId={venueId} eventId={evt.id} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
