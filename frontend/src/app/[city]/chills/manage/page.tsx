'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCityRouter } from '@/hooks/useCityRouter';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, onSnapshot, updateDoc, increment } from 'firebase/firestore';
import { Chill, ChillRequest } from '@/types';
import { useTranslation } from 'react-i18next';

function ChillManageContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const { user, profile } = useAuth();
  const { cityPath, router } = useCityRouter();
  
  const [chill, setChill] = useState<Chill | null>(null);
  const [requests, setRequests] = useState<ChillRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Fetch Chill Info
  useEffect(() => {
    if (!user) return;
    
    const fetchChill = async () => {
      try {
        if (!id) return;
        const docRef = doc(db, 'chills', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const chillData = { id: docSnap.id, ...docSnap.data() } as Chill;
          // Verify ownership
          if (chillData.host_uid !== user.uid) {
            router.push(cityPath());
            return;
          }
          setChill(chillData);
        } else {
          router.push(cityPath());
        }
      } catch (err) {
        console.error("Error loading chill:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchChill();
  }, [id, user, router]);

  // Listen to pending requests
  useEffect(() => {
    if (!user || !chill || !id) return;

    const q = query(
      collection(db, 'chill_requests'),
      where('chill_id', '==', id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const pendingReqs: ChillRequest[] = [];
      snapshot.forEach((doc) => {
        pendingReqs.push({ id: doc.id, ...doc.data() } as ChillRequest);
      });
      setRequests(pendingReqs);
    });

    return () => unsubscribe();
  }, [id, user, chill]);

  if (loading) {
    return <div className="min-h-screen bg-[#0a0b12] flex items-center justify-center text-white text-xs">Cargando panel...</div>;
  }

  if (!chill) {
    return <div className="min-h-screen bg-[#0a0b12] flex items-center justify-center text-white text-xs">Evento no encontrado.</div>;
  }

  const doorUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/door?event=${chill.id}&token=${chill.scanner_token}`;

  const copyDoorLink = () => {
    navigator.clipboard.writeText(doorUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 1. Aceptar con Emisión de QR (In-App - Gasta 1 QR Credit)
  const handleAcceptInApp = async (req: ChillRequest) => {
    if (chill?.type === 'commercial' && (!profile?.qrCredits || profile.qrCredits <= 0)) {
      alert("No tienes Créditos QR. Recarga saldo para emitir pases.");
      return;
    }
    setProcessingId(req.id);
    try {
      const qrPayload = `CHILL-REQ-${req.id}`;
      await updateDoc(doc(db, 'chill_requests', req.id), {
        status: 'ACCEPTED',
        monetization_type: 'in_app',
        qr_code: qrPayload,
        checkedIn: false
      });

      await updateDoc(doc(db, 'chills', chill.id), {
        'stats.qrs_generated': increment(1)
      });
      
      // Descontar saldo de QR
      if (user && chill.type === 'commercial') {
        await updateDoc(doc(db, 'users', user.uid), {
          qrCredits: increment(-1)
        });
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleBuyDummyCredits = async () => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        qrCredits: increment(20)
      });
    } catch (err: any) {
      console.error(err);
    }
  };

  // 2. Aceptar con Dirección Libre (Out-of-App - Auditoría de venta externa)
  const handleAcceptOutOfApp = async (req: ChillRequest) => {
    setProcessingId(req.id);
    try {
      await updateDoc(doc(db, 'chill_requests', req.id), {
        status: 'ACCEPTED',
        monetization_type: 'out_of_app'
      });

      await updateDoc(doc(db, 'chills', chill.id), {
        'stats.address_reveals': increment(1)
      });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-4 space-y-4 text-white bg-[#0a0b12] min-h-screen">
      {/* Delegación de Puerta */}
      <div className="bg-[#121422] border border-[#2b2f4c] rounded-xl p-4 mt-8">
        <span className="text-[10px] font-bold uppercase text-[#a855f7] tracking-wider block">Delegación de Puerta</span>
        <h3 className="text-sm font-extrabold mt-1">Enlace para el Portero / Amigo</h3>
        <p className="text-xs text-gray-400 mt-1">
          Pásale este enlace por WhatsApp a quien controle el acceso. Podrá escanear sin registrarse.
        </p>
        <div className="mt-3 flex gap-2">
          <input 
            type="text" 
            readOnly 
            value={doorUrl} 
            className="w-full bg-[#08090f] border border-[#2b2e47] rounded-lg px-3 py-2 text-xs text-gray-400 font-mono select-all"
          />
          <button 
            onClick={copyDoorLink}
            className="bg-[#7c3aed] hover:bg-[#6d28d9] px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition"
          >
            {copied ? '¡Copiado!' : 'Copiar'}
          </button>
        </div>
      </div>

      {/* Métricas de Auditoría y Saldo */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-[#121422] border border-[#2b2f4c] p-2.5 rounded-xl">
          <span className="text-[9px] text-gray-400 block font-bold uppercase">QRs Emitidos</span>
          <span className="text-lg font-black text-emerald-400">{chill.stats?.qrs_generated || 0}</span>
        </div>
        <div className="bg-[#121422] border border-[#2b2f4c] p-2.5 rounded-xl relative group">
          <span className="text-[9px] text-gray-400 block font-bold uppercase">Saldo QRs</span>
          <span className="text-lg font-black text-amber-500">{profile?.qrCredits || 0}</span>
          {chill.type === 'commercial' && (
            <button onClick={handleBuyDummyCredits} className="absolute inset-0 bg-amber-500/20 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-xl transition text-[10px] font-bold text-amber-500 text-center leading-tight">
              +20 QRs<br/>(10€)
            </button>
          )}
        </div>
        <div className="bg-[#121422] border border-[#2b2f4c] p-2.5 rounded-xl">
          <span className="text-[9px] text-gray-400 block font-bold uppercase">Fuera de App</span>
          <span className="text-lg font-black text-fuchsia-400">{chill.stats?.address_reveals || 0}</span>
        </div>
      </div>

      {/* Solicitudes de Asistentes */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Solicitudes de Acceso</h3>
        {requests.filter(r => r.status === 'PENDING' || r.status === 'pending').length === 0 && (
          <p className="text-xs text-gray-500 py-4 text-center">No hay solicitudes pendientes</p>
        )}
        {requests.filter(r => r.status === 'PENDING' || r.status === 'pending').map(req => (
          <div key={req.id} className="bg-[#121422] border border-[#23273f] p-3 rounded-xl flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-white">{req.userName || req.user_nick}</p>
              <span className="text-[10px] text-gray-400">Solicitó hace unos minutos</span>
            </div>
            <div className="flex gap-2">
              <button
                disabled={processingId === req.id}
                onClick={() => handleAcceptInApp(req)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold px-3 py-2 rounded-lg transition"
              >
                Pase QR (+1€)
              </button>
              <button
                disabled={processingId === req.id}
                onClick={() => handleAcceptOutOfApp(req)}
                className="bg-[#1e2238] hover:bg-[#282d4a] text-gray-300 text-[11px] font-bold px-3 py-2 rounded-lg border border-[#3b3f66] transition"
              >
                Dar Ubicación
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ChillManagePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0b12] flex items-center justify-center text-white text-xs">Cargando panel...</div>}>
      <ChillManageContent />
    </Suspense>
  );
}
