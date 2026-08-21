'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ChillRequest, Chill } from '@/types';
import QRCode from 'react-qr-code';
import { Map, AlertCircle, MapPin, Key, UserPlus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import Link from 'next/link';
import { DEFAULT_CITY } from '@/lib/routes';
import { useTranslation } from 'react-i18next';

function TicketContent() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const { user } = useAuth();
  const { isReady } = useRequireAuth();

  const [request, setRequest] = useState<ChillRequest | null>(null);
  const [chill, setChill] = useState<Chill | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrToken, setQrToken] = useState('');
  const [exactAddress, setExactAddress] = useState<string | null>(null);

  const isAcceptedStatus = request?.status?.toLowerCase() === 'accepted';
  const isCheckedInStatus = request?.checkedIn;
  const generatedPin = request?.pin || (request ? (parseInt(request.id.replace(/[^a-f0-9]/gi, ''), 16) % 10000).toString().padStart(4, '0') : '0000');

  useEffect(() => {
    if (!isAcceptedStatus || isCheckedInStatus || !id) return;
    
    const updateToken = () => {
      const bucket = Math.floor(Date.now() / 15000); // Cambia cada 15s
      setQrToken(`CHILL-REQ-${id}_${bucket}`);
    };
    
    updateToken();
    const interval = setInterval(updateToken, 1000);
    return () => clearInterval(interval);
  }, [isAcceptedStatus, isCheckedInStatus, id]);

  // Escuchar en tiempo real la solicitud para revocaciones
  useEffect(() => {
    if (!id) return;
    
    const unsubscribe = onSnapshot(doc(db, 'chill_requests', id), async (docSnap) => {
      if (docSnap.exists()) {
        const reqData = { id: docSnap.id, ...docSnap.data() } as ChillRequest;
        setRequest(reqData);

        // Fetch Chill si no lo tenemos
        if (!chill) {
          const chillRef = doc(db, 'chills', reqData.chill_id || reqData.chillId || '');
          const chillSnap = await getDoc(chillRef);
          if (chillSnap.exists()) {
            setChill({ id: chillSnap.id, ...chillSnap.data() } as Chill);
          }
        }
      } else {
        setRequest(null);
      }
      setLoading(false);
    }, () => setLoading(false));

    return () => unsubscribe();
  }, [id, chill]);

  useEffect(() => {
    if (!chill) return;
    const chillId = chill.id;
    const privateRef = doc(db, 'chills', chillId, 'private', 'info');
    getDoc(privateRef).then((snap) => {
      if (snap.exists()) {
        setExactAddress(snap.data().exact_address || null);
      } else if ((chill as any).exact_address) {
        setExactAddress((chill as any).exact_address);
      }
    }).catch(() => {
      if ((chill as any).exact_address) {
        setExactAddress((chill as any).exact_address);
      }
    });
  }, [chill]);

  if (loading) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white text-xs font-mono">{t('ticket.generatingPass')}</div>;
  }

  if (!request || !chill) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-6">
        <AlertCircle size={48} className="text-red-500 mb-4" />
        <h1 className="text-xl font-bold">{t('ticket.passNotFoundTitle')}</h1>
        <p className="text-gray-400 text-center mt-2">{t('ticket.passNotFoundDesc')}</p>
      </div>
    );
  }

  if (user && request.user_uid !== user.uid) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-6">
        <AlertCircle size={48} className="text-red-500 mb-4" />
        <h1 className="text-xl font-bold">{t('ticket.accessDeniedTitle')}</h1>
        <p className="text-gray-400 text-center mt-2">{t('ticket.accessDeniedDesc')}</p>
      </div>
    );
  }

  const hasQRCode = !!request.qr_code;
  if (!isAcceptedStatus) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-6">
        <AlertCircle size={48} className="text-amber-500 mb-4" />
        <h1 className="text-xl font-bold">{t('ticket.passRevokedTitle')}</h1>
        <p className="text-gray-400 text-center mt-2">{t('ticket.passRevokedDesc')}</p>
      </div>
    );
  }

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${exactAddress ? encodeURIComponent(exactAddress) : `${chill.approx_lat},${chill.approx_lng}`}`;

  return (
    <div className="min-h-screen bg-black text-white p-4 flex flex-col items-center">
      
      <div className="w-full max-w-sm mt-8">
        {/* Etiqueta Superior */}
        <div className="bg-gradient-to-r from-amber-500 to-red-600 p-4 rounded-t-3xl text-center shadow-[0_0_20px_rgba(245,158,11,0.2)]">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">{t('ticket.digitalAccessPass')}</span>
          <h1 className="text-xl font-black text-white mt-1">{chill.title}</h1>
          <p className="text-xs text-white/90 mt-1 capitalize">{chill.type === 'commercial' ? t('ticket.privateParty') : t('ticket.socialChill')}</p>
        </div>

        {/* Cuerpo del Ticket */}
        <div className="bg-[#121422] rounded-b-3xl p-6 border border-[#2b2f4c] border-t-0 flex flex-col items-center shadow-xl">
          
          {hasQRCode ? (
            <>
              {isCheckedInStatus ? (
                <div className="w-48 h-48 bg-emerald-500/10 rounded-2xl flex items-center justify-center border-2 border-emerald-500/50 mb-6">
                  <div className="text-center text-emerald-400 font-bold">
                    <CheckCircle2 size={48} className="mx-auto mb-2" />
                    {t('ticket.passValidated')}
                  </div>
                </div>
              ) : (
                <div className="bg-white p-4 rounded-2xl mb-6 shadow-[0_0_30px_rgba(255,255,255,0.1)] relative overflow-hidden">
                  <QRCode value={qrToken || request.qr_code!} size={180} />
                  {/* Animación del scanner overlay */}
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-500/20 to-transparent w-full h-[50%] animate-[scan_2s_ease-in-out_infinite]" />
                </div>
              )}
              
              <div className="w-full flex flex-col items-center mb-6">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">{t('ticket.accessPin')}</p>
                <div className="text-3xl font-black tracking-widest text-white border border-slate-200 bg-slate-50 px-6 py-2 rounded-xl">
                  #{generatedPin}
                </div>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl mb-6 mt-2 max-w-[240px]">
                <p className="text-[9px] text-amber-500 font-bold uppercase tracking-widest mb-1 flex items-center justify-center gap-1">
                  <AlertCircle size={10} /> {t('ticket.attendeeNotice')}
                </p>
                <p className="text-[10px] text-amber-200/70 text-center leading-tight">
                  {t('ticket.disclaimer')}
                </p>
              </div>
            </>
          ) : (
            <div className="w-24 h-24 bg-amber-500/10 rounded-full flex items-center justify-center border border-amber-500/30 mb-6">
              <Key className="text-amber-500" size={32} />
            </div>
          )}

          {/* Información Desbloqueada */}
          <div className="w-full space-y-4">
            <div>
              <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block mb-1">{t('ticket.yourName')}</span>
              <p className="text-sm font-bold">{request.user_nick || request.userName}</p>
            </div>

            <div className="pt-4 border-t border-[#23273f]">
              <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider block mb-1">{t('ticket.unlockedLocation')}</span>
              <p className="text-sm font-medium text-gray-200">{exactAddress || t('ticket.loadingAddress')}</p>
              
              <a 
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 flex items-center justify-center gap-2 w-full bg-[#1e2238] hover:bg-[#282d4a] border border-[#3b3f66] text-white py-3 rounded-xl text-xs font-bold transition-all"
              >
                <Map size={16} className="text-blue-400" />
                {t('ticket.openInMaps')}
              </a>
            </div>

            {chill.instructions && (
              <div className="pt-4 border-t border-[#23273f]">
                <span className="text-[9px] text-amber-400 font-bold uppercase tracking-wider block mb-1">{t('ticket.arrivalInstructions')}</span>
                <p className="text-xs text-gray-300 italic">"{chill.instructions}"</p>
              </div>
            )}
          </div>
          
        </div>

        {/* Guest Checkout: Trojan Horse Banner */}
        {!user && (
          <div className="mt-6 bg-gradient-to-r from-blue-900/40 to-blue-900/40 border border-blue-500/30 rounded-2xl p-5 text-center shadow-lg relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-blue-700" />
            <UserPlus className="w-8 h-8 text-blue-400 mx-auto mb-2" />
            <h4 className="text-white font-bold mb-1">{t('ticket.seeWhoIsInside')}</h4>
            <p className="text-slate-400 text-xs mb-4">{t('ticket.createProfile')}</p>
            <Link 
              href={`/login?redirect=/ticket?id=${id}`}
              className="inline-block bg-white text-black font-bold uppercase tracking-widest text-[10px] px-6 py-3 rounded-xl hover:bg-slate-200 transition-colors"
            >
              {t('ticket.createProfileBtn')}
            </Link>
          </div>
        )}

        {/* Existing Link for logged in users (optional) */}
        {user && (
          <div className="mt-6 text-center">
            <Link href={`/${DEFAULT_CITY}/`} className="text-blue-400 text-xs font-bold uppercase tracking-wider hover:text-blue-300">
              <span dangerouslySetInnerHTML={{ __html: t('ticket.viewRadar') }} />
            </Link>
          </div>
        )}

        <p className="text-[10px] text-gray-600 text-center mt-6">
          {t('ticket.selfDestruct')}
        </p>

      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(200%); }
        }
      `}} />
    </div>
  );
}

export default function TicketPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <TicketContent />
    </Suspense>
  );
}

// Icono CheckCircle2 auxiliar
function CheckCircle2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
