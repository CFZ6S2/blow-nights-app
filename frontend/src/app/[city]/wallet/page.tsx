'use client';

import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useCityRouter } from '@/hooks/useCityRouter';
import { motion, AnimatePresence } from 'framer-motion';
import { useTickets } from '@/hooks/useTickets';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import QRCodeSVG from 'react-qr-code';

export default function WalletPage() {
  const { t } = useTranslation();
  const { user, profile, loading } = useAuth();
  const { cityPath, router } = useCityRouter();
  const { tickets, valid, used, loading: ticketsLoading } = useTickets(user?.uid);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [tab, setTab] = useState<'valid' | 'used'>('valid');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-10 h-10 border-t-2 border-fuchsia-500 rounded-full" />
      </div>
    );
  }

  const displayTickets = tab === 'valid' ? valid : used;

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-32">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-yellow-600/10 blur-[120px] rounded-full" />
        <div className="absolute top-[20%] -right-[10%] w-[40%] h-[40%] bg-fuchsia-600/10 blur-[120px] rounded-full" />
      </div>

      <main className="relative z-10 p-6 md:p-12 max-w-2xl mx-auto space-y-6">
        <header className="pt-8 space-y-2">
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-3">
            <span className="material-icons text-yellow-500">confirmation_number</span>
            Mi Cartera
          </h1>
          <p className="text-xs text-slate-500">Tus entradas y pases</p>
        </header>

        <div className="flex gap-2">
          <button
            onClick={() => setTab('valid')}
            className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${
              tab === 'valid'
                ? 'bg-green-500/20 border-green-500/30 text-green-400'
                : 'bg-white/5 border-white/10 text-slate-500'
            }`}
          >
            Activas ({valid.length})
          </button>
          <button
            onClick={() => setTab('used')}
            className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${
              tab === 'used'
                ? 'bg-slate-500/20 border-slate-500/30 text-slate-400'
                : 'bg-white/5 border-white/10 text-slate-500'
            }`}
          >
            Usadas ({used.length})
          </button>
        </div>

        {ticketsLoading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-28 bg-white/5 rounded-3xl animate-pulse" />
          ))
        ) : displayTickets.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <span className="material-icons text-5xl text-slate-700">
              {tab === 'valid' ? 'confirmation_number' : 'history'}
            </span>
            <p className="text-sm text-slate-500">
              {tab === 'valid' ? 'No tienes entradas activas' : 'No has usado ninguna entrada aún'}
            </p>
            {tab === 'valid' && (
              <button
                onClick={() => router.push(cityPath('/venues'))}
                className="px-6 py-3 rounded-2xl bg-fuchsia-600 text-white text-xs font-black uppercase tracking-widest"
              >
                Ver locales
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {displayTickets.map((ticket: any) => (
              <motion.button
                key={ticket.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setSelectedTicket(ticket)}
                className={`w-full bg-white/5 backdrop-blur-xl border rounded-3xl p-5 text-left transition-all ${
                  ticket.status === 'valid'
                    ? 'border-green-500/20 hover:bg-green-500/5'
                    : 'border-white/10 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                      ticket.status === 'valid' ? 'bg-green-500/20' : 'bg-slate-800'
                    }`}>
                      <span className={`material-icons ${
                        ticket.status === 'valid' ? 'text-green-400' : 'text-slate-600'
                      }`}>
                        {ticket.status === 'valid' ? 'qr_code_2' : 'check_circle'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-black">{ticket.venueName || ticket.venueId}</p>
                      <p className="text-[10px] text-slate-500 capitalize">{ticket.ticketType}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${
                      ticket.status === 'valid' ? 'text-green-400' : 'text-slate-500'
                    }`}>
                      {ticket.status === 'valid' ? 'Válida' : 'Usada'}
                    </span>
                    {ticket.purchasedAt && (
                      <p className="text-[9px] text-slate-600 mt-0.5">
                        {ticket.purchasedAt.toDate?.()?.toLocaleDateString('es-ES') || ''}
                      </p>
                    )}
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </main>

      <AnimatePresence>
        {selectedTicket && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedTicket(null)}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-[3rem] p-8 space-y-6 shadow-[0_40px_100px_rgba(0,0,0,0.8)]"
            >
              <div className="text-center space-y-2">
                <h3 className="text-xl font-black">{selectedTicket.venueName || selectedTicket.venueId}</h3>
                <p className="text-xs text-slate-500 capitalize">{selectedTicket.ticketType}</p>
                <span className={`inline-block text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                  selectedTicket.status === 'valid'
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-slate-800 text-slate-500'
                }`}>
                  {selectedTicket.status === 'valid' ? 'Válida' : 'Usada'}
                </span>
              </div>

              <div id="ticket-content" className="print:text-black">
                {selectedTicket.status === 'valid' && selectedTicket.qrToken && (
                  <div className="flex justify-center mb-6">
                    <div className="bg-white p-4 rounded-3xl print:border-4 print:border-black">
                      <QRCodeSVG value={selectedTicket.qrToken} size={200} />
                    </div>
                  </div>
                )}

                {selectedTicket.status === 'used' && (
                  <div className="text-center py-6 mb-6">
                    <span className="material-icons text-5xl text-slate-600">check_circle</span>
                    <p className="text-sm text-slate-500 mt-2">Esta entrada ya fue escaneada</p>
                  </div>
                )}

                <div className="space-y-2 print:hidden">
                  <button onClick={() => window.print()} className="w-full py-3 bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors">
                    <span className="material-icons text-sm">picture_as_pdf</span>
                    Descargar PDF / Imprimir
                  </button>
                  <button disabled className="w-full py-3 bg-black border border-white/20 text-slate-500 font-bold rounded-xl text-xs flex items-center justify-center gap-2 opacity-50 cursor-not-allowed">
                    <span className="material-icons text-sm">account_balance_wallet</span>
                    Añadir a Apple Wallet (Próximamente)
                  </button>
                </div>

                <div className="mt-4 p-4 bg-slate-950 print:bg-white print:border print:border-slate-300 rounded-xl text-[8px] text-slate-500 print:text-slate-800 leading-tight space-y-2 max-h-32 overflow-y-auto print:max-h-none text-left">
                  <p className="font-bold uppercase text-slate-400 print:text-black">Condiciones de Acceso y Política de Ticketing</p>
                  <p>1. ACCESO EXCLUSIVO MEDIANTE CÓDIGO QR: El acceso al recinto está condicionado estrictamente a la lectura óptica correcta del código QR emitido. Es responsabilidad única y exclusiva del asistente presentar el código QR en un dispositivo móvil con suficiente batería, pantalla en condiciones óptimas de legibilidad, o impreso en papel de forma clara.</p>
                  <p>2. INEXISTENCIA DE VALIDACIÓN MANUAL: Por motivos de seguridad y agilidad en el control de accesos, el personal de puerta NO realizará búsquedas manuales por nombre, DNI, apellidos ni justificantes de pago bancario. Si el código QR no puede ser escaneado por falta de batería, pantalla rota, fallo de cobertura o ausencia física del soporte, se denegará el acceso sin derecho a reembolso ni indemnización.</p>
                  <p>3. UN SOLO USO Y CUSTODIA: Cada entrada cuenta con un identificador criptográfico único. El primer escaneo en el acceso invalida automáticamente el código para usos posteriores. La custodia y confidencialidad del ticket corresponden al comprador.</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedTicket(null)}
                className="w-full mt-6 py-4 rounded-2xl bg-white/5 text-slate-400 font-black uppercase tracking-[0.2em] text-xs hover:bg-white/10 transition-all print:hidden"
              >
                Cerrar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
