'use client';

import { useState, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'react-qr-code';
import { useTranslation } from 'react-i18next';

interface RRPPEventData {
  promoter: {
    id: string;
    name: string;
    code: string;
    venueId: string;
    eventId: string;
    is_closed: boolean;
    qr_quota: number;
    liquidated_by_rrpp: boolean;
    liquidated_by_venue: boolean;
  };
  event: {
    title: string;
    date: string;
    time: string | null;
    ticketType: string;
    scannerToken: string;
  };
  venue: {
    name: string;
  };
  stats: {
    totalSold: number;
    totalCommission: number;
    totalEntered: number;
  };
}

export default function RRPPEventCard({ token }: { token: string }) {
  const { t } = useTranslation();
  const [data, setData] = useState<RRPPEventData | null>(null);
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
      setData(res.data as RRPPEventData);
    } catch (e: any) {
      setError(e.message || t('rrpp_event_card.error_loading_data'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchStats();
  }, [token]);

  const handleGenerateTicket = async () => {
    if (!clientName) return alert(t('rrpp_event_card.enter_guest_name'));
    setGenerating(true);
    try {
      const generateDirectPromoterTicket = httpsCallable(functions, 'generateDirectPromoterTicket');
      const res = await generateDirectPromoterTicket({
        promoterToken: token,
        eventId: data?.promoter.eventId || 'UNKNOWN_EVENT',
        clientName,
        tierId
      });
      const result = res.data as any;
      if (result.success) {
        setGeneratedQR({ id: result.ticketId, token: result.qrToken, name: result.clientName });
        fetchStats();
      }
    } catch (e: any) {
      alert(`${t('rrpp_event_card.error')} ` + e.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleClose = async () => {
    if (!confirm(t('rrpp_event_card.close_night_confirm'))) return;
    try {
      const closePromoterList = httpsCallable(functions, 'closePromoterList');
      await closePromoterList({ token });
      fetchStats();
    } catch (e: any) {
      alert(`${t('rrpp_event_card.error')} ` + e.message);
    }
  };

  const handleLiquidate = async () => {
    if (!confirm(t('rrpp_event_card.liquidate_confirm'))) return;
    try {
      const liquidatePromoter = httpsCallable(functions, 'liquidatePromoter');
      await liquidatePromoter({ token });
      fetchStats();
    } catch (e: any) {
      alert(`${t('rrpp_event_card.error')} ` + e.message);
    }
  };

  const handleEliminarFiesta = async () => {
    if (data?.stats.totalSold && data.stats.totalSold > 0) return;
    if (!confirm(t('rrpp_event_card.delete_party_confirm'))) return;
    try {
      const deleteParty = httpsCallable(functions, 'deleteRRPPParty');
      await deleteParty({ promoterToken: token });
      window.location.reload();
    } catch (e: any) {
      alert(`${t('rrpp_event_card.error')} ` + e.message);
    }
  };

  const shareWhatsApp = () => {
    if (!generatedQR) return;
    const text = `${t('rrpp_event_card.here_is_your_ticket')} ${window.location.origin}/pass?id=${generatedQR.id}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
  };

  const shareScannerLink = () => {
    if (!data) return;
    const url = `${window.location.origin}/door?event=${data.promoter.eventId}&venueId=${data.promoter.venueId}&token=${data.event.scannerToken}&type=venue`;
    const text = `${t('rrpp_event_card.scanner_link_for')} ${data.event.title}: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
  };

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-200 rounded-3xl p-6 animate-pulse">
        <div className="h-6 bg-slate-100 rounded-lg w-2/3 mb-4" />
        <div className="h-4 bg-slate-50 rounded-lg w-1/2 mb-6" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-20 bg-slate-50 rounded-2xl" />
          <div className="h-20 bg-slate-50 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-900/20 border border-red-500/30 rounded-3xl p-6 text-center">
        <span className="material-icons text-3xl text-red-500 mb-2">error_outline</span>
        <p className="text-sm text-red-300">{error || t('rrpp_event_card.error_loading_event')}</p>
      </div>
    );
  }

  const formatDate = (d: string) => {
    if (!d) return '';
    try {
      return new Date(d + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
    } catch { return d; }
  };

  return (
    <>
      <div className={`bg-slate-900 border rounded-3xl overflow-hidden ${data.promoter.is_closed ? 'border-yellow-500/20' : 'border-amber-500/20'}`}>
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-black leading-tight">{data.event.title || t('rrpp_event_card.untitled')}</h2>
              <p className="text-xs text-slate-400 mt-1 mb-2">
                {data.venue.name}
                {data.event.date && <> &middot; {formatDate(data.event.date)}</>}
                {data.event.time && <> &middot; {data.event.time}</>}
              </p>
              
              {data.stats.totalSold === 0 ? (
                <button
                  onClick={handleEliminarFiesta}
                  className="text-rose-500 hover:bg-rose-500/10 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 border border-rose-500/20 transition-colors"
                >
                  🗑️ {t('rrpp_event_card.delete_party')}
                </button>
              ) : (
                <span 
                  title={t('rrpp_event_card.cannot_delete')}
                  className="inline-flex text-slate-500 bg-slate-800/50 px-3 py-1.5 rounded-xl text-[10px] font-bold border border-slate-200 cursor-not-allowed items-center gap-1"
                >
                  🔒 {data.stats.totalSold} {t('rrpp_event_card.qrs_issued')}
                </span>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${data.promoter.is_closed ? 'bg-yellow-500/20 text-yellow-500' : 'bg-green-500/20 text-green-400'}`}>
                {data.promoter.is_closed ? t('rrpp_event_card.closed') : t('rrpp_event_card.active')}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-slate-200 border border-slate-200 p-4 rounded-2xl text-center">
              <div className="text-3xl font-black text-amber-400">{data.stats.totalSold}</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">{t('rrpp_event_card.issued')}</div>
            </div>
            <div className="bg-slate-200 border border-slate-200 p-4 rounded-2xl text-center">
              <div className="text-3xl font-black text-green-400">{data.stats.totalEntered}</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">{t('rrpp_event_card.at_door')}</div>
            </div>
          </div>

          {!data.promoter.is_closed ? (
            <div className="space-y-3">
              {data.promoter.qr_quota > 0 ? (
                <button
                  onClick={() => { setGeneratedQR(null); setClientName(''); setShowModal(true); }}
                  className="w-full py-4 bg-amber-600 hover:bg-amber-500 rounded-2xl font-black text-sm shadow-[0_0_30px_-10px_rgba(192,38,211,0.5)] transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <span className="material-icons text-lg">qr_code</span>
                  {t('rrpp_event_card.issue_qr_ticket')}
                </button>
              ) : (
                <div className="bg-slate-800/20 border border-amber-500/30 p-4 rounded-2xl text-center">
                  <p className="text-xs text-slate-400 mb-3">{t('rrpp_event_card.no_qr_balance')}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        try {
                          setGenerating(true);
                          const createQRPackageCheckout = httpsCallable(functions, 'createQRPackageCheckout');
                          const res = await createQRPackageCheckout({ token, quantity: 50, origin: window.location.origin });
                          const { url } = res.data as { url: string };
                          window.location.href = url;
                        } catch(e) {
                          alert(`${t('rrpp_event_card.error')} ` + (e as any).message);
                          setGenerating(false);
                        }
                      }}
                      disabled={generating}
                      className="flex-1 bg-white hover:bg-slate-200 text-black font-bold py-3 rounded-xl text-xs uppercase tracking-widest"
                    >
                      50 QRs (25€)
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          setGenerating(true);
                          const createQRPackageCheckout = httpsCallable(functions, 'createQRPackageCheckout');
                          const res = await createQRPackageCheckout({ token, quantity: 100, origin: window.location.origin });
                          const { url } = res.data as { url: string };
                          window.location.href = url;
                        } catch(e) {
                          alert(`${t('rrpp_event_card.error')} ` + (e as any).message);
                          setGenerating(false);
                        }
                      }}
                      disabled={generating}
                      className="flex-1 bg-white hover:bg-slate-200 text-black font-bold py-3 rounded-xl text-xs uppercase tracking-widest"
                    >
                      100 QRs (50€)
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={shareScannerLink}
                className="w-full py-3 bg-[#25D366] hover:bg-[#1ebe5d] rounded-2xl font-bold uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2"
              >
                <span className="material-icons text-sm">share</span>
                {t('rrpp_event_card.share_scanner_link')}
              </button>

              <button
                onClick={handleClose}
                className="w-full py-3 bg-yellow-900/30 text-yellow-500 border border-yellow-500/20 hover:bg-yellow-900/50 rounded-2xl font-bold uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2"
              >
                <span className="material-icons text-sm">lock</span>
                {t('rrpp_event_card.close_night')}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-slate-200 border border-yellow-500/20 p-4 rounded-2xl text-center">
                <span className="material-icons text-2xl text-yellow-500 mb-1">lock</span>
                <p className="text-xs text-slate-400">{t('rrpp_event_card.lists_closed')}</p>
              </div>
              <button
                onClick={handleLiquidate}
                disabled={data.promoter.liquidated_by_rrpp}
                className={`w-full py-4 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 ${
                  data.promoter.liquidated_by_rrpp
                    ? 'bg-green-900/20 text-green-500 border border-green-500/20 cursor-not-allowed'
                    : 'bg-amber-600 hover:bg-amber-500 text-white'
                }`}
              >
                <span className="material-icons text-sm">{data.promoter.liquidated_by_rrpp ? 'check_circle' : 'done_all'}</span>
                {data.promoter.liquidated_by_rrpp ? t('rrpp_event_card.payment_confirmed') : t('rrpp_event_card.confirm_payment')}
              </button>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/90 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-slate-900 border border-slate-200 w-full max-w-sm rounded-3xl p-6 relative overflow-hidden"
            >
              <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white">
                <span className="material-icons">close</span>
              </button>

              {!generatedQR ? (
                <>
                  <h2 className="text-xl font-black mb-6">{t('rrpp_event_card.new_ticket')}</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest">{t('rrpp_event_card.guest_alias')}</label>
                      <input
                        type="text"
                        value={clientName}
                        onChange={e => setClientName(e.target.value)}
                        placeholder={t('rrpp_event_card.guest_alias_placeholder')}
                        className="w-full bg-black border border-slate-200 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest">{t('rrpp_event_card.pass_type')}</label>
                      <select
                        value={tierId}
                        onChange={e => setTierId(e.target.value)}
                        className="w-full bg-black border border-slate-200 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 appearance-none"
                      >
                        <option value="general">{t('rrpp_event_card.general_admission')}</option>
                        <option value="vip">{t('rrpp_event_card.vip')}</option>
                        <option value="promo">{t('rrpp_event_card.special_promo')}</option>
                      </select>
                    </div>
                    <button
                      onClick={handleGenerateTicket}
                      disabled={generating}
                      className="w-full py-4 mt-4 bg-white text-black hover:bg-slate-200 rounded-xl font-black uppercase tracking-widest transition-colors"
                    >
                      {generating ? t('rrpp_event_card.generating') : t('rrpp_event_card.generate_qr')}
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center py-4">
                  <div className="text-green-400 mb-2"><span className="material-icons text-5xl">check_circle</span></div>
                  <h2 className="text-xl font-black mb-1">{t('rrpp_event_card.ticket_ready')}</h2>
                  <p className="text-slate-400 text-sm mb-6">{t('rrpp_event_card.pass_for')} {generatedQR.name}</p>
                  <div className="bg-white p-4 rounded-2xl mb-6 shadow-xl">
                    <QRCode value={generatedQR.token} size={200} />
                  </div>
                  <button
                    onClick={shareWhatsApp}
                    className="w-full py-4 bg-[#25D366] hover:bg-[#1ebe5d] text-white rounded-xl font-black flex items-center justify-center gap-2 mb-3"
                  >
                    <span className="material-icons">share</span>
                    {t('rrpp_event_card.share_whatsapp')}
                  </button>
                  <button
                    onClick={() => { setGeneratedQR(null); setClientName(''); }}
                    className="text-slate-400 text-sm font-bold underline"
                  >
                    {t('rrpp_event_card.generate_another')}
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
