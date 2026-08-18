'use client';

import { useState, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'react-qr-code';

interface RRPPStats {
  promoter: {
    id: string;
    name: string;
    code: string;
    venueId: string;
    is_closed: boolean;
    liquidated_by_rrpp: boolean;
    liquidated_by_venue: boolean;
  };
  stats: {
    totalSold: number;
    totalCommission: number;
    totalEntered: number;
  };
}

export default function RRPPDashboardClient({ token }: { token: string }) {
  const [data, setData] = useState<RRPPStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [clientName, setClientName] = useState('');
  const [tierId, setTierId] = useState('general');
  const [generating, setGenerating] = useState(false);
  const [generatedQR, setGeneratedQR] = useState<{ id: string; token: string; name: string } | null>(null);

  const fetchStats = async () => {
    try {
      const getPromoterStats = httpsCallable(functions, 'getPromoterStats');
      const res = await getPromoterStats({ token });
      setData(res.data as RRPPStats);
    } catch (e: any) {
      setError(e.message || 'Error al cargar los datos. Token inválido.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchStats();
  }, [token]);

  const handleGenerateTicket = async () => {
    if (!clientName) return alert('Por favor ingresa un nombre o alias para el invitado.');
    setGenerating(true);
    try {
      const generateDirectPromoterTicket = httpsCallable(functions, 'generateDirectPromoterTicket');
      const res = await generateDirectPromoterTicket({
        promoterToken: token,
        eventId: (data?.promoter as any).eventId || 'UNKNOWN_EVENT',
        clientName,
        tierId
      });
      const result = res.data as any;
      if (result.success) {
        setGeneratedQR({ id: result.ticketId, token: result.qrToken, name: result.clientName });
        fetchStats();
      }
    } catch (e: any) {
      alert('Error generando ticket: ' + e.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleClose = async () => {
    if (!confirm('¿Estás seguro de cerrar la noche? Ya no podrás emitir más QRs.')) return;
    try {
      const closePromoterList = httpsCallable(functions, 'closePromoterList');
      await closePromoterList({ token });
      alert('Noche cerrada correctamente.');
      fetchStats();
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  };

  const handleLiquidate = async () => {
    if (!confirm('¿Confirmas que has liquidado cuentas con el local?')) return;
    try {
      const liquidatePromoter = httpsCallable(functions, 'liquidatePromoter');
      await liquidatePromoter({ token });
      alert('Liquidación confirmada.');
      fetchStats();
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  };

  const shareWhatsApp = () => {
    if (!generatedQR) return;
    const text = `Aquí tienes tu entrada: ${window.location.origin}/ticket/${generatedQR.id}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
  };

  if (loading) {
    return <div className="min-h-screen bg-black flex items-center justify-center font-bold text-slate-500">Cargando Panel RRPP...</div>;
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
        <span className="material-icons text-6xl text-red-500 mb-4">error_outline</span>
        <h1 className="text-xl font-bold mb-2 text-white">Evento Cerrado o Token Inválido</h1>
        <p className="text-slate-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 pb-24 font-sans selection:bg-fuchsia-500/30">
      <header className="mb-8">
        <div className="inline-block px-3 py-1 bg-fuchsia-900/30 text-fuchsia-400 rounded-full text-[10px] font-black tracking-widest uppercase mb-4 border border-fuchsia-500/20">
          Panel de Promotor (RRPP)
        </div>
        <h1 className="text-3xl font-black mb-1">Hola, {data.promoter.name}</h1>
        <p className="text-slate-400 text-sm">Gestiona tus listas y entradas al instante.</p>
      </header>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-slate-900 border border-white/5 p-4 rounded-3xl">
          <div className="text-3xl font-black text-fuchsia-400 mb-1">{data.stats.totalSold}</div>
          <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">QRs Emitidos</div>
        </div>
        <div className="bg-slate-900 border border-white/5 p-4 rounded-3xl">
          <div className="text-3xl font-black text-green-400 mb-1">{data.stats.totalEntered}</div>
          <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Han Entrado</div>
        </div>
      </div>

      {!data.promoter.is_closed ? (
        <>
          <button
            onClick={() => { setGeneratedQR(null); setShowModal(true); }}
            className="w-full py-5 bg-fuchsia-600 hover:bg-fuchsia-500 rounded-2xl font-black text-lg shadow-[0_0_40px_-10px_rgba(192,38,211,0.5)] transition-all active:scale-95 flex items-center justify-center gap-2 mb-4"
          >
            <span className="material-icons">qr_code</span>
            + Emitir Entrada QR
          </button>

          <button
            onClick={handleClose}
            className="w-full py-3 bg-yellow-900/30 text-yellow-500 border border-yellow-500/20 hover:bg-yellow-900/50 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2"
          >
            <span className="material-icons text-sm">lock</span>
            Cerrar mi Noche (Bloquear Listas)
          </button>
        </>
      ) : (
        <div className="bg-black/40 border border-yellow-500/20 p-5 rounded-3xl text-center mb-4">
          <span className="material-icons text-4xl text-yellow-500 mb-2">lock</span>
          <h2 className="font-bold text-yellow-500 mb-2">Las listas están cerradas</h2>
          <p className="text-xs text-slate-400 mb-4">Ya no puedes emitir nuevas entradas para esta noche. Revisa tus números y liquida cuentas con el local.</p>

          <button
            onClick={handleLiquidate}
            disabled={data.promoter.liquidated_by_rrpp}
            className={`w-full py-4 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 ${data.promoter.liquidated_by_rrpp ? 'bg-green-900/20 text-green-500 border border-green-500/20 cursor-not-allowed' : 'bg-fuchsia-600 hover:bg-fuchsia-500 text-white shadow-[0_0_20px_-5px_rgba(192,38,211,0.3)]'}`}
          >
            <span className="material-icons text-sm">{data.promoter.liquidated_by_rrpp ? 'check_circle' : 'done_all'}</span>
            {data.promoter.liquidated_by_rrpp ? 'Pago Confirmado' : 'Confirmar Cobro (Liquidar)'}
          </button>
        </div>
      )}

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-slate-900 border border-white/10 w-full max-w-sm rounded-3xl p-6 relative overflow-hidden"
            >
              <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white">
                <span className="material-icons">close</span>
              </button>

              {!generatedQR ? (
                <>
                  <h2 className="text-xl font-black mb-6">Nueva Entrada</h2>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest">Invitado / Alias</label>
                      <input
                        type="text"
                        value={clientName}
                        onChange={e => setClientName(e.target.value)}
                        placeholder="Ej. Marcos amigo"
                        className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-fuchsia-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest">Tipo de Pase</label>
                      <select
                        value={tierId}
                        onChange={e => setTierId(e.target.value)}
                        className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-fuchsia-500 appearance-none"
                      >
                        <option value="general">Entrada General</option>
                        <option value="vip">VIP / Reservado</option>
                        <option value="promo">Promo Especial</option>
                      </select>
                    </div>

                    <button
                      onClick={handleGenerateTicket}
                      disabled={generating}
                      className="w-full py-4 mt-4 bg-white text-black hover:bg-slate-200 rounded-xl font-black uppercase tracking-widest transition-colors"
                    >
                      {generating ? 'Generando...' : 'Generar QR'}
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center py-4">
                  <div className="text-green-400 mb-2"><span className="material-icons text-5xl">check_circle</span></div>
                  <h2 className="text-xl font-black mb-1">¡Entrada Lista!</h2>
                  <p className="text-slate-400 text-sm mb-6">Pase para {generatedQR.name}</p>

                  <div className="bg-white p-4 rounded-2xl mb-6 shadow-xl">
                    <QRCode value={generatedQR.token} size={200} />
                  </div>

                  <button
                    onClick={shareWhatsApp}
                    className="w-full py-4 bg-[#25D366] hover:bg-[#1ebe5d] text-white rounded-xl font-black flex items-center justify-center gap-2 mb-3"
                  >
                    <span className="material-icons">share</span>
                    Compartir por WhatsApp
                  </button>

                  <button
                    onClick={() => { setGeneratedQR(null); setClientName(''); }}
                    className="text-slate-400 text-sm font-bold underline"
                  >
                    Generar otra entrada
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
