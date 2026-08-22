'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, setDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, functions } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface TicketTier {
  id: string;
  name: string;
  price: number;
  quota: number;
  sold: number;
  perks: string;
}

interface IndependentEvent {
  id: string;
  title: string;
  description: string;
  platform?: string;
  banner_url: string;
  start_date: Timestamp | null;
  scanner_token: string;
  ticket_tiers: TicketTier[];
  organizerId: string;
  cityId: string;
  isIndependent: boolean;
  type: string; // 'event'
  isActive: boolean;
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
}

function EventPromoters({ eventId }: { eventId: string }) {
  const { t } = useTranslation();
  const [promoters, setPromoters] = useState<Promoter[]>([]);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, `events/${eventId}/promoters`));
    const unsub = onSnapshot(q, (snap) => {
      const p: Promoter[] = [];
      snap.forEach(d => p.push({ id: d.id, ...d.data() } as Promoter));
      setPromoters(p);
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [eventId]);

  const handleAddPromoter = async () => {
    if (!newName.trim()) return;
    const token = crypto.randomUUID().replace(/-/g, '') + Date.now().toString(36);
    const code = newName.toLowerCase().replace(/[^a-z0-9]/g, '');
    try {
      await setDoc(doc(collection(db, `events/${eventId}/promoters`)), {
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
      await setDoc(doc(db, `events/${eventId}/promoters`, promoterId), {
        is_closed: true,
        closed_at: Timestamp.now()
      }, { merge: true });
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  };

  const handleLiquidate = async (promoterId: string, currentValue: boolean) => {
    try {
      await setDoc(doc(db, `events/${eventId}/promoters`, promoterId), {
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
      <h4 className="text-sm font-bold text-indigo-400">{t('organizer_page.rrpp_team')}</h4>
      
      <div className="flex gap-2">
        <input 
          type="text" 
          value={newName} 
          onChange={e => setNewName(e.target.value)} 
          placeholder={t('organizer_page.new_rrpp_placeholder')}
          className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
        />
        <button onClick={handleAddPromoter} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold">
          {t('organizer_page.add')}
        </button>
      </div>

      {loading ? (
        <div className="text-xs text-slate-500">{t('organizer_page.loading')}</div>
      ) : promoters.length === 0 ? (
        <div className="text-xs text-slate-500">{t('organizer_page.no_rrpps')}</div>
      ) : (
        <div className="space-y-3 mt-4">
          {promoters.map(p => {
            const isDestroyed = p.liquidated_by_rrpp && p.liquidated_by_venue;
            if (isDestroyed) return null;

            return (
              <div key={p.id} className={`flex items-center justify-between p-3 rounded-xl border ${p.is_closed ? 'bg-black/40 border-yellow-500/20' : 'bg-black/20 border-white/10'}`}>
                <div>
                  <div className="font-bold text-sm flex items-center gap-2">
                    {p.name}
                    {p.is_closed && <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">{t('organizer_page.closed')}</span>}
                  </div>
                  {!p.is_closed && (
                    <button onClick={() => copyLink(p.access_token)} className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center mt-1">
                      <span className="material-icons text-[12px] mr-1">link</span> {t('organizer_page.copy_link')}
                    </button>
                  )}
                  {p.is_closed && (
                    <div className="text-[10px] text-slate-500 mt-1 flex flex-col gap-1">
                      <span className={p.liquidated_by_venue ? 'text-green-400' : ''}>
                        <span className="material-icons text-[10px] mr-1">{p.liquidated_by_venue ? 'check_circle' : 'pending'}</span>
                        Organizador: {p.liquidated_by_venue ? 'Liquidado' : 'Pendiente'}
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
                      {t('organizer_page.close_list')}
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleLiquidate(p.id, p.liquidated_by_venue)}
                      className={`text-[10px] border px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider ${p.liquidated_by_venue ? 'border-red-500/50 text-red-400 hover:bg-red-500/20' : 'border-green-500/50 text-green-400 hover:bg-green-500/20'}`}
                    >
                      {p.liquidated_by_venue ? t('organizer_page.cancel_payment') : t('organizer_page.mark_paid')}
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

function EventMagicLink({ eventId }: { eventId: string }) {
  const [token, setToken] = useState<string | null>(null);
  
  useEffect(() => {
    getDoc(doc(db, `events/${eventId}/private`, 'secrets')).then(snap => {
      if (snap.exists()) setToken(snap.data()?.scanner_token);
    });
  }, [eventId]);

  const copyMagicLink = () => {
    if (!token) return;
    const link = `${window.location.origin}/door?eventId=${eventId}&token=${token}`;
    navigator.clipboard.writeText(link);
    alert('Enlace copiado al portapapeles. ¡Envíalo por WhatsApp a tus porteros!');
  };

  if (!token) return <div className="text-[10px] text-slate-500">Cargando enlace seguro...</div>;

  return (
    <div className="flex items-center justify-between bg-black/40 p-3 rounded-xl border border-fuchsia-500/20">
      <div>
        <div className="text-[10px] text-fuchsia-400 font-bold uppercase tracking-widest">Enlace de Portero (Magic Link)</div>
        <div className="text-xs text-slate-400 font-mono mt-1">/door?eventId={eventId}&token={token.substring(0,8)}...</div>
      </div>
      <button 
        onClick={copyMagicLink}
        className="w-10 h-10 bg-fuchsia-600 rounded-full flex items-center justify-center hover:scale-105 transition-transform"
        title="Copiar Enlace para Puerta"
      >
        <span className="material-icons text-white">content_copy</span>
      </button>
    </div>
  );
}

export default function OrganizerDashboard() {
  const { t } = useTranslation();
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [events, setEvents] = useState<IndependentEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [buyQRModal, setBuyQRModal] = useState(false);
  const [buyingQRs, setBuyingQRs] = useState(false);
  const [issueModalOpen, setIssueModalOpen] = useState<{eventId: string, tiers: TicketTier[]} | null>(null);
  const [issueClientName, setIssueClientName] = useState('');
  const [issueTierId, setIssueTierId] = useState('');
  const [issuingTicket, setIssuingTicket] = useState(false);
  const [issuedQR, setIssuedQR] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [cityId, setCityId] = useState('');
  const [flyerFile, setFlyerFile] = useState<File | null>(null);
  const [flyerPreview, setFlyerPreview] = useState('');
  const [tiers, setTiers] = useState<TicketTier[]>([
    { id: 'tier_general', name: 'Entrada General', price: 15, quota: 100, sold: 0, perks: '1 Copa incluida' }
  ]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || profile?.role !== 'event_organizer')) {
      router.push('/');
    }
  }, [user, profile, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'events'),
      where('organizerId', '==', user.uid),
      orderBy('start_date', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const evts: IndependentEvent[] = [];
      snap.forEach((d) => {
        evts.push({ id: d.id, ...d.data() } as IndependentEvent);
      });
      setEvents(evts);
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  const totalRevenue = events.reduce((sum, evt) => {
    return sum + (evt.ticket_tiers?.reduce((tierSum, tier) => tierSum + (tier.sold * tier.price), 0) || 0);
  }, 0);
  
  const totalCheckedIn = events.reduce((sum, evt) => sum + (evt.stats?.total_checked_in || 0), 0);

  const handleBuyQRs = async (quantity: number) => {
    setBuyingQRs(true);
    try {
      const createCheckout = httpsCallable(functions, 'createQRPackageCheckout');
      const result: any = await createCheckout({
        quantity,
        origin: window.location.origin,
        purchaseType: 'organizer'
      });
      if (result.data?.url) {
        window.location.href = result.data.url;
      }
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setBuyingQRs(false);
    }
  };

  const handleIssueTicket = async () => {
    if (!issueClientName || !issueTierId || !issueModalOpen) return alert('Rellena todos los campos');
    setIssuingTicket(true);
    try {
      const issueTicket = httpsCallable(functions, 'generateOrganizerQRTicket');
      const res: any = await issueTicket({
        eventId: issueModalOpen.eventId,
        clientName: issueClientName,
        tierId: issueTierId
      });
      setIssuedQR(res.data.qrToken);
    } catch (e: any) {
      alert('Error al emitir entrada: ' + e.message);
    } finally {
      setIssuingTicket(false);
    }
  };

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
    if (!title || !startDate || !cityId) return alert('Título, ciudad y fecha son obligatorios');
    if (!user) return;
    setSaving(true);
    try {
      let banner_url = '';
      const eventId = `evt_${Date.now()}`;

      if (flyerFile) {
        const webpBlob = await compressToWebP(flyerFile);
        const storageRef = ref(storage, `events/${eventId}/flyer.webp`);
        await uploadBytes(storageRef, webpBlob);
        banner_url = await getDownloadURL(storageRef);
      }

      const scanner_token = crypto.randomUUID().replace(/-/g, '') + Date.now().toString(36);

      const newEvent: Partial<IndependentEvent> = {
        title,
        description,
        banner_url,
        platform: process.env.NEXT_PUBLIC_APP_PLATFORM || 'blownights',
        start_date: Timestamp.fromDate(new Date(startDate)),
        ticket_tiers: tiers,
        organizerId: user.uid,
        cityId,
        isIndependent: true,
        type: 'event',
        isActive: true,
        stats: {
          total_sold: 0,
          total_checked_in: 0
        }
      };

      await setDoc(doc(db, 'events', eventId), newEvent);
      await setDoc(doc(db, `events/${eventId}/private`, 'secrets'), { scanner_token });
      
      setIsCreating(false);
      setTitle('');
      setDescription('');
      setCityId('');
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
    const link = `${window.location.origin}/door?eventId=${eventId}&token=${token}`;
    navigator.clipboard.writeText(link);
    alert('Enlace copiado al portapapeles. ¡Envíalo por WhatsApp a tus porteros!');
  };

  if (authLoading || loading) return <div className="min-h-screen bg-slate-950 flex justify-center items-center"><div className="w-8 h-8 border-2 border-indigo-500 rounded-full animate-spin border-t-transparent" /></div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-12">
      <main className="relative z-10 p-6 md:p-12 max-w-4xl mx-auto space-y-8">
        <header className="pt-8">
          <div className="inline-block px-3 py-1 bg-indigo-900/30 text-indigo-400 rounded-full text-[10px] font-black tracking-widest uppercase mb-4 border border-indigo-500/20">
            {t('organizer_page.organizer_badge')}
          </div>
          <h1 className="text-3xl font-black tracking-tight">{t('organizer_page.dashboard')}</h1>
          <p className="text-slate-400 mt-2">{t('organizer_page.manage_events_desc')}</p>
        </header>

        {events.length > 0 && !isCreating && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-fuchsia-900/40 to-slate-900/40 border border-fuchsia-500/30 p-6 rounded-3xl relative">
              <div className="text-[10px] font-black uppercase tracking-widest text-fuchsia-400 mb-1">Créditos QR</div>
              <div className="text-3xl font-black text-white">{(profile as any)?.qr_quota || 0}</div>
              <button 
                onClick={() => setBuyQRModal(true)}
                className="absolute top-1/2 -translate-y-1/2 right-6 bg-fuchsia-600 hover:bg-fuchsia-500 text-white px-4 py-2 rounded-xl text-xs font-bold"
              >
                Recargar
              </button>
            </div>
            <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900/40 border border-indigo-500/30 p-6 rounded-3xl">
              <div className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1">{t('organizer_page.total_revenue')}</div>
              <div className="text-3xl font-black text-white">{totalRevenue.toFixed(2)}€</div>
            </div>
            <div className="bg-gradient-to-br from-purple-900/40 to-slate-900/40 border border-purple-500/30 p-6 rounded-3xl">
              <div className="text-[10px] font-black uppercase tracking-widest text-purple-400 mb-1">{t('organizer_page.total_attendees')}</div>
              <div className="text-3xl font-black text-white">{totalCheckedIn}</div>
            </div>
          </div>
        )}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">{t('organizer_page.my_events')}</h2>
          <button
            onClick={() => setIsCreating(!isCreating)}
            className="px-6 py-3 bg-indigo-600 text-white rounded-full text-xs font-bold uppercase tracking-widest hover:bg-indigo-500 transition-colors"
          >
            {isCreating ? t('organizer_page.cancel') : t('organizer_page.new_event')}
          </button>
        </div>

        {isCreating && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900 border border-indigo-500/30 rounded-3xl p-8 space-y-6">
            <h3 className="text-xl font-bold">{t('organizer_page.create_event')}</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Título del Evento</label>
                <input 
                  type="text" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                  placeholder="Ej. Sábado Loco - Winter Edition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Descripción</label>
                <textarea 
                  value={description} 
                  onChange={e => setDescription(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                  placeholder="Detalles de la fiesta..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Ciudad (ID)</label>
                  <input 
                    type="text" 
                    value={cityId} 
                    onChange={e => setCityId(e.target.value.toLowerCase())}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                    placeholder="ej. madrid, barcelona..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Fecha y Hora de Inicio</label>
                  <input 
                    type="datetime-local" 
                    value={startDate} 
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Cartel / Flyer (Opcional)</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleFlyerChange}
                  className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700"
                />
                {flyerPreview && (
                  <img src={flyerPreview} alt="Preview" className="mt-4 h-32 rounded-xl object-cover" />
                )}
              </div>
              
              <div className="pt-4 border-t border-white/10 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-indigo-400">Tipos de Entrada (Tiers)</h4>
                  <button onClick={addTier} className="text-xs text-indigo-400 border border-indigo-400 px-3 py-1 rounded-full hover:bg-indigo-400/10">+ Añadir</button>
                </div>
                
                {tiers.map((tier, index) => (
                  <div key={tier.id} className="bg-black/40 p-4 rounded-2xl border border-white/5 space-y-3 relative">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1">Nombre</label>
                        <input type="text" value={tier.name} onChange={e => updateTier(index, 'name', e.target.value)} className="w-full bg-transparent border-b border-white/10 focus:border-indigo-500 pb-1 text-sm outline-none" placeholder="Ej. General" />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1">Precio (€)</label>
                        <input type="number" value={tier.price} onChange={e => updateTier(index, 'price', parseFloat(e.target.value))} className="w-full bg-transparent border-b border-white/10 focus:border-indigo-500 pb-1 text-sm outline-none" />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1">Cupo (Aforo)</label>
                        <input type="number" value={tier.quota} onChange={e => updateTier(index, 'quota', parseInt(e.target.value))} className="w-full bg-transparent border-b border-white/10 focus:border-indigo-500 pb-1 text-sm outline-none" />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1">Perks (Opcional)</label>
                        <input type="text" value={tier.perks} onChange={e => updateTier(index, 'perks', e.target.value)} className="w-full bg-transparent border-b border-white/10 focus:border-indigo-500 pb-1 text-sm outline-none" placeholder="1 Copa..." />
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
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest transition-colors mt-6 shadow-[0_0_20px_rgba(79,70,229,0.3)] disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Publicar Evento'}
              </button>
            </div>
          </motion.div>
        )}

        <div className="space-y-4">
          {events.length === 0 && !isCreating && (
            <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/5">
              <span className="material-icons text-6xl text-slate-700 mb-4">event_note</span>
              <p className="text-lg font-bold text-slate-300">Aún no has creado ningún evento</p>
              <p className="text-sm text-slate-500 mt-2">Los eventos que crees aparecerán aquí y en el feed público de la ciudad.</p>
            </div>
          )}
          
          {events.map(evt => (
            <div key={evt.id} className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col md:flex-row gap-6">
              {evt.banner_url ? (
                <img src={evt.banner_url} alt={evt.title} className="w-full md:w-48 h-48 object-cover rounded-2xl" />
              ) : (
                <div className="w-full md:w-48 h-48 bg-slate-900 rounded-2xl flex items-center justify-center">
                  <span className="material-icons text-slate-600 text-5xl">event</span>
                </div>
              )}
              
              <div className="flex-1 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="px-2 py-1 bg-indigo-500/20 text-indigo-400 text-[10px] font-bold uppercase rounded-md mb-2 inline-block">
                      {evt.cityId}
                    </span>
                    <h3 className="font-black text-2xl">{evt.title}</h3>
                    <p className="text-sm text-slate-400 mt-1">
                      {evt.start_date ? evt.start_date.toDate().toLocaleString() : 'Fecha no definida'}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-black text-indigo-400">{evt.stats?.total_sold || 0}</div>
                    <div className="text-[10px] uppercase tracking-widest text-slate-500">Tickets</div>
                  </div>
                </div>

                {evt.description && (
                  <p className="text-sm text-slate-300">{evt.description}</p>
                )}

                <div className="pt-4 border-t border-white/5">
                  <EventMagicLink eventId={evt.id} />
                </div>

                <div className="pt-4 mt-4 border-t border-white/5 flex gap-2">
                  <button 
                    onClick={() => setIssueModalOpen({eventId: evt.id, tiers: evt.ticket_tiers})}
                    className="flex-1 bg-fuchsia-600 hover:bg-fuchsia-500 text-white py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                  >
                    <span className="material-icons text-[16px]">qr_code_scanner</span>
                    Emitir Entrada (-1 QR)
                  </button>
                </div>
                <EventPromoters eventId={evt.id} />
              </div>
            </div>
          ))}
        </div>
      
        {buyQRModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 max-w-sm w-full space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">Comprar Créditos QR</h3>
                <button onClick={() => setBuyQRModal(false)}><span className="material-icons">close</span></button>
              </div>
              <p className="text-sm text-slate-400">Añade saldo a tu cuenta para emitir entradas manualmente. Coste: 1€ por QR.</p>
              
              <div className="space-y-3">
                {[25, 50, 100, 500].map(qty => (
                  <button 
                    key={qty}
                    onClick={() => handleBuyQRs(qty)}
                    disabled={buyingQRs}
                    className="w-full flex justify-between items-center bg-white/5 hover:bg-white/10 p-4 rounded-2xl border border-white/5 disabled:opacity-50"
                  >
                    <span className="font-bold">{qty} QRs</span>
                    <span className="text-indigo-400 font-bold">{qty} €</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {issueModalOpen && !issuedQR && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 max-w-sm w-full space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">Emitir Entrada Directa</h3>
                <button onClick={() => setIssueModalOpen(null)}><span className="material-icons">close</span></button>
              </div>
              <p className="text-sm text-slate-400">Esta acción descontará 1 crédito de tu saldo ({(profile as any)?.qr_quota || 0} disponibles).</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Nombre del Cliente</label>
                  <input 
                    type="text" 
                    value={issueClientName} 
                    onChange={e => setIssueClientName(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none"
                    placeholder="Ej. Juan Pérez"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Tipo de Entrada</label>
                  <select 
                    value={issueTierId} 
                    onChange={e => setIssueTierId(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none appearance-none"
                  >
                    <option value="">Selecciona un tipo...</option>
                    {issueModalOpen.tiers.map((t: any) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <button
                onClick={handleIssueTicket}
                disabled={issuingTicket}
                className="w-full py-4 bg-fuchsia-600 hover:bg-fuchsia-500 text-white rounded-2xl font-black uppercase tracking-widest disabled:opacity-50"
              >
                {issuingTicket ? 'Emitiendo...' : 'Generar QR'}
              </button>
            </div>
          </div>
        )}

        {issuedQR && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
            <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center space-y-6">
              <h3 className="text-2xl font-black text-slate-900">¡Entrada Generada!</h3>
              <p className="text-sm text-slate-600">Muestra este código al portero o hazle captura de pantalla.</p>
              
              <div className="bg-slate-100 p-4 rounded-2xl aspect-square flex items-center justify-center border-4 border-slate-200">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${issuedQR}`} 
                  alt="Ticket QR" 
                  className="w-full h-full object-contain mix-blend-multiply" 
                />
              </div>
              
              <button
                onClick={() => {
                  setIssuedQR(null);
                  setIssueModalOpen(null);
                  setIssueClientName('');
                  setIssueTierId('');
                }}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
</main>
    </div>
  );
}
