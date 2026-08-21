'use client';

import React, { useEffect, useRef, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import jsQR from 'jsqr';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, collectionGroup, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { useTranslation } from 'react-i18next';

function DoorScannerContent() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const eventId = searchParams.get('event');
  const token = searchParams.get('token');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [eventTitle, setEventTitle] = useState('');
  const [isScanning, setIsScanning] = useState(true);
  const [scanResult, setScanResult] = useState<{ status: 'VALID' | 'USED' | 'INVALID'; name?: string; message: string } | null>(null);
  const [scannedCount, setScannedCount] = useState(0);
  const [cameraStarted, setCameraStarted] = useState(false);

  // Modo Buscador
  const [searchQuery, setSearchQuery] = useState('');
  const [pinLength, setPinLength] = useState<4 | 6>(4);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isUnclaimedVenue, setIsUnclaimedVenue] = useState(false);
  const [mode, setMode] = useState<'scanner' | 'search'>('scanner');

  // 1. Validar el token de escáner del evento
  useEffect(() => {
    async function checkToken() {
      if (!eventId || !token) {
        setAuthorized(false);
        return;
      }
      try {
        let title = '';
        let found = false;
        let isUnclaimed = false;
        
        // 1. Try chills
        const chillRef = doc(db, 'chills', eventId);
        const snap = await getDoc(chillRef);
        if (snap.exists() && snap.data()?.scanner_token === token) {
          title = snap.data()?.title || 'Fiesta Privada';
          found = true;
        }

        // 2. Try venues events if not found
        if (!found) {
          const venueId = searchParams.get('venueId');
          if (venueId) {
            const eventRef = doc(db, `venues/${venueId}/events`, eventId);
            const eventSnap = await getDoc(eventRef);
            if (eventSnap.exists() && eventSnap.data()?.scanner_token === token) {
              title = eventSnap.data()?.title || eventSnap.data()?.name || 'Evento RRPP';
              found = true;
              
              const venueRef = doc(db, 'venues', venueId);
              const venueSnap = await getDoc(venueRef);
              if (venueSnap.exists() && venueSnap.data()?.isClaimed === false) {
                isUnclaimed = true;
              }
            }
          } else {
            // Fallback just in case (will fail without index, but backwards compatible)
            const eventsQuery = query(collectionGroup(db, 'events'), where('scanner_token', '==', token));
            const eventsSnap = await getDocs(eventsQuery);
            for (const d of eventsSnap.docs) {
              if (d.id === eventId) {
                title = d.data().title || 'Evento RRPP';
                found = true;

                const venueRef = d.ref.parent.parent;
                if (venueRef) {
                  const venueSnap = await getDoc(venueRef);
                  if (venueSnap.exists() && venueSnap.data()?.isClaimed === false) {
                    isUnclaimed = true;
                  }
                }
              }
            }
          }
        }

        if (found) {
          setEventTitle(title);
          setIsUnclaimedVenue(isUnclaimed);
          setAuthorized(true);
        } else {
          setAuthorized(false);
        }
      } catch (e) {
        console.error(e);
        setAuthorized(false);
      }
    }
    checkToken();
  }, [eventId, token]);

  // 2. Iniciar cámara y loop de detección con jsQR
  useEffect(() => {
    if (!authorized || !cameraStarted) return;

    let stream: MediaStream | null = null;
    let animId: number;

    async function initCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.setAttribute('muted', 'true');
          await videoRef.current.play();
        }
        requestAnimationFrame(tick);
      } catch (err) {
        console.error('Error accediendo a cámara', err);
      }
    }

    function tick() {
      if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA && canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          canvas.height = videoRef.current.videoHeight;
          canvas.width = videoRef.current.videoWidth;
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (code && isScanning) {
            handleScan(code.data);
          }
        }
      }
      animId = requestAnimationFrame(tick);
    }

    initCamera();

    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
      cancelAnimationFrame(animId);
    };
  }, [authorized, isScanning, mode, cameraStarted]);

  // 3. Procesar QR y actualizar Firestore
  const handleScan = async (qrData: string) => {
    setIsScanning(false);
    if ('vibrate' in navigator) navigator.vibrate(120);

    try {
      // Clean up CHILL-REQ- prefix if any
      const rawData = qrData.replace('CHILL-REQ-', '');
      const [requestId, bucketStr] = rawData.split('_');
      
      if (bucketStr) {
        const qrBucket = parseInt(bucketStr, 10);
        const currentBucket = Math.floor(Date.now() / 15000);
        if (Math.abs(currentBucket - qrBucket) > 1) {
          setScanResult({ status: 'INVALID', message: 'CÓDIGO EXPIRADO (CAPTURA)' });
          setTimeout(() => {
            setScanResult(null);
            setIsScanning(true);
          }, 1800);
          return;
        }
      }

      // We only have qrToken and we don't know venueId directly here, but we can call the cloud function.
      // Wait, validateTicketByDoorToken expects venueId, eventId, qrToken, doorAccessToken.
      // But we have eventId and token from searchParams!
      
      const venueId = searchParams.get('venueId') || eventId; // For independent events, venueId = eventId
      
      const validate = httpsCallable(functions, 'validateTicketByDoorToken');
      const result = await validate({
        qrToken: qrData,
        doorAccessToken: token,
        eventId,
        venueId,
      });

      const data = result.data as any;

      if (data.valid) {
        setScanResult({ 
          status: 'VALID', 
          name: data.ticket?.userName || 'Invitado', 
          message: data.message || 'ACCESO CORRECTO' 
        });
        setScannedCount(prev => prev + 1);
      } else {
        setScanResult({ 
          status: data.message === 'YA ESCANEADA' ? 'USED' : 'INVALID', 
          message: data.message 
        });
      }
    } catch (e: any) {
      console.error(e);
      setScanResult({ status: 'INVALID', message: e.message || 'ERROR DE LECTURA' });
    }

    setTimeout(() => {
      setScanResult(null);
      setIsScanning(true);
    }, 1800);
  };

  // Buscador Rápido (Teclado Numérico)
  useEffect(() => {
    if (mode !== 'search' || searchQuery.length !== pinLength) {
      return;
    }
    const searchPin = async () => {
      setIsSearching(true);
      try {
        const q1 = query(collection(db, 'chill_requests'), where('chill_id', '==', eventId));
        const snap1 = await getDocs(q1);
        let foundRequest: any = null;
        let isTicketCollection = false;
        snap1.forEach(d => {
          const data = d.data();
          const generatedPin = data.pin || (parseInt(d.id.replace(/[^a-f0-9]/gi, ''), 16) % Math.pow(10, pinLength)).toString().padStart(pinLength, '0');
          if (generatedPin === searchQuery && data.status === 'accepted') {
            foundRequest = { id: d.id, ...data };
          }
        });

        if (!foundRequest) {
          const q2 = query(collection(db, 'tickets'), where('eventId', '==', eventId));
          const snap2 = await getDocs(q2);
          snap2.forEach(d => {
            const data = d.data();
            const generatedPin = data.pin || data.pinCode || (parseInt(d.id.replace(/[^a-f0-9]/gi, ''), 16) % Math.pow(10, pinLength)).toString().padStart(pinLength, '0');
            if (generatedPin === searchQuery && data.status === 'valid') {
              foundRequest = { id: d.id, ...data };
              isTicketCollection = true;
            }
          });
        }

        if (foundRequest) {
          const isCheckedIn = isTicketCollection ? foundRequest.status === 'used' : foundRequest.checkedIn;
          if (isCheckedIn) {
            setScanResult({
              status: 'USED',
              name: foundRequest.user_nick || foundRequest.userName || foundRequest.client_name,
              message: `YA USADO`
            });
          } else {
            if (isTicketCollection) {
              await updateDoc(doc(db, 'tickets', foundRequest.id), {
                status: 'used',
                usedAt: new Date().toISOString()
              });
            } else {
              await updateDoc(doc(db, 'chill_requests', foundRequest.id), {
                checkedIn: true,
                checkedInAt: new Date().toISOString()
              });
            }
            setScanResult({ status: 'VALID', name: foundRequest.user_nick || foundRequest.userName || foundRequest.client_name, message: 'ACCESO CORRECTO' });
            setScannedCount(prev => prev + 1);
          }
        } else {
          setScanResult({ status: 'INVALID', message: 'PIN INVÁLIDO' });
        }
      } catch (e) {
        setScanResult({ status: 'INVALID', message: 'ERROR DE LECTURA' });
      } finally {
        setIsSearching(false);
        setTimeout(() => {
          setSearchQuery('');
          setScanResult(null);
        }, 1800);
      }
    };
    searchPin();
  }, [searchQuery, mode, eventId]);

  if (authorized === false) {
    return (
      <div className="min-h-screen bg-[#090a10] text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="text-4xl mb-3">⛔</div>
        <h1 className="text-xl font-bold text-red-400">{t('door_unauthorized')}</h1>
        <p className="text-xs text-gray-400 mt-2">{t('door_invalid_link')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07080d] text-white flex flex-col items-center justify-between p-4 font-sans select-none">
      {/* Header */}
      <header className="w-full max-w-sm flex justify-between items-center bg-[#11131f] border border-[#23273f] px-4 py-3 rounded-xl">
        <div>
          <span className="text-[9px] uppercase font-black tracking-widest text-[#a855f7] block">Control de Acceso</span>
          <h1 className="text-sm font-bold text-white truncate max-w-[200px]">{eventTitle || 'Cargando...'}</h1>
        </div>
        <div className="bg-[#1c1f38] px-3 py-1.5 rounded-lg border border-[#3b3f68] text-right">
          <span className="text-[8px] text-gray-400 block uppercase font-bold">Validados</span>
          <span className="text-lg font-black text-[#34d399] leading-none">{scannedCount}</span>
        </div>
      </header>

      {isUnclaimedVenue && (
        <div className="w-full max-w-sm mt-3 bg-yellow-900/30 border border-yellow-500/50 p-3 rounded-xl flex items-center justify-between shadow-[0_0_15px_rgba(234,179,8,0.2)]">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-yellow-500 mb-0.5 flex items-center gap-1">
              <span className="material-icons text-[12px]">storefront</span> Local No Reclamado
            </p>
            <p className="text-[10px] text-yellow-200/70 leading-tight">
              ¿Eres el dueño de {eventTitle || 'este local'}? Toma el control de las ventas.
            </p>
          </div>
          <a 
            href={`/business/claim?venue=${eventTitle}`}
            target="_blank"
            rel="noreferrer"
            className="bg-yellow-500 text-black text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-lg ml-3 whitespace-nowrap hover:bg-yellow-400 transition-colors"
          >
            Reclamar
          </a>
        </div>
      )}

      {/* Selector de Modo */}
      <div className="w-full max-w-sm flex bg-[#11131f] border border-[#23273f] rounded-lg p-1 my-3">
        <button 
          onClick={() => setMode('scanner')} 
          className={`flex-1 py-2 text-xs font-bold rounded-md transition-colors ${mode === 'scanner' ? 'bg-[#a855f7] text-white' : 'text-gray-400 hover:text-white'}`}
        >
          Escáner QR
        </button>
        <button 
          onClick={() => setMode('search')} 
          className={`flex-1 py-2 text-xs font-bold rounded-md transition-colors ${mode === 'search' ? 'bg-[#a855f7] text-white' : 'text-gray-400 hover:text-white'}`}
        >
          Buscador Manual
        </button>
      </div>

      <div className="flex-1 w-full flex flex-col justify-center items-center relative">

      {/* Visor de Cámara */}
      {mode === 'scanner' ? (
        <div className="relative w-full max-w-sm aspect-[3/4] bg-black rounded-2xl overflow-hidden border border-[#2b2f52] shadow-2xl flex items-center justify-center">
          {!cameraStarted ? (
            <div className="flex flex-col items-center justify-center p-6 text-center z-10">
              <div className="w-20 h-20 bg-amber-900/30 rounded-full flex items-center justify-center mb-4 border border-amber-500/50">
                <span className="material-icons text-4xl text-amber-400">photo_camera</span>
              </div>
              <h3 className="text-white font-bold text-lg mb-2">Permiso de Cámara</h3>
              <p className="text-gray-400 text-xs mb-6 px-4">Toca el botón para activar la cámara de forma segura.</p>
              <button 
                onClick={() => setCameraStarted(true)}
                className="bg-amber-600 hover:bg-amber-500 text-white font-black text-sm uppercase px-8 py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(59,130,246,0.4)] active:scale-95"
              >
                Activar Cámara
              </button>
            </div>
          ) : (
            <>
              <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
              <canvas ref={canvasRef} className="hidden" />

              {/* Retícula de escaneo */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
                <div className="w-52 h-52 border-2 border-dashed border-[#a855f7]/60 rounded-2xl relative animate-pulse">
                  <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-[#c084fc]" />
                  <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-[#c084fc]" />
                  <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-[#c084fc]" />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-[#c084fc]" />
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="w-full max-w-sm flex flex-col items-center justify-center">
          <div className="bg-[#11131f] border border-[#23273f] rounded-2xl w-full p-6 text-center shadow-xl relative">
            <div className="w-full flex justify-between items-center mb-6">
              <h2 className="text-xs text-[#a855f7] font-bold uppercase tracking-widest">Ingresa PIN</h2>
              <button 
                  onClick={() => {
                     setPinLength(pinLength === 4 ? 6 : 4);
                     setSearchQuery('');
                  }}
                  className="text-[10px] bg-[#1c1f38] hover:bg-amber-900/30 px-3 py-1 rounded-lg text-amber-400 font-bold border border-amber-900 transition-colors"
              >
                  {pinLength} DÍGITOS
              </button>
            </div>
            
            {/* Display de PIN */}
            <div className="flex justify-center gap-3 mb-8">
              {Array.from({ length: pinLength }).map((_, i) => (
                <div key={i} className={`w-12 h-16 rounded-xl flex items-center justify-center text-3xl font-black transition-colors ${searchQuery[i] ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'bg-[#1c1f38] text-transparent border border-[#3b3f68]'}`}>
                  {searchQuery[i] || '*'}
                </div>
              ))}
            </div>

            {/* Teclado Numérico */}
            <div className="grid grid-cols-3 gap-3 max-w-[240px] mx-auto">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  onClick={() => setSearchQuery(prev => prev.length < pinLength ? prev + num : prev)}
                  className="bg-[#1c1f38] hover:bg-[#a855f7] border border-[#3b3f68] hover:border-[#c084fc] rounded-xl h-14 text-2xl font-bold transition-all hover:scale-105 active:scale-95"
                >
                  {num}
                </button>
              ))}
              <div />
              <button
                onClick={() => setSearchQuery(prev => prev.length < pinLength ? prev + '0' : prev)}
                className="bg-[#1c1f38] hover:bg-[#a855f7] border border-[#3b3f68] hover:border-[#c084fc] rounded-xl h-14 text-2xl font-bold transition-all hover:scale-105 active:scale-95"
              >
                0
              </button>
              <button
                onClick={() => setSearchQuery(prev => prev.slice(0, -1))}
                className="bg-rose-900/30 hover:bg-rose-600 border border-rose-900/50 rounded-xl h-14 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
              >
                <span className="material-icons text-rose-400">backspace</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overlay de Resultado para ambos modos */}
      {scanResult && (
        <div className={`absolute inset-0 m-auto w-full max-w-sm aspect-[3/4] flex flex-col items-center justify-center p-6 text-center z-20 rounded-2xl shadow-2xl backdrop-blur-md ${
          scanResult.status === 'VALID' ? 'bg-emerald-950/95 border-4 border-emerald-500' : 
          scanResult.status === 'USED' ? 'bg-amber-950/95 border-4 border-amber-500' :
          'bg-rose-950/95 border-4 border-rose-500'
        }`}>
          <span className="text-5xl mb-2">{scanResult.status === 'VALID' ? '✅' : scanResult.status === 'USED' ? '⚠️' : '⛔'}</span>
          <h2 className="text-2xl font-black uppercase tracking-tight">{scanResult.message}</h2>
          {scanResult.name && (
            <p className="text-base font-bold text-white/90 mt-2 bg-slate-200 px-4 py-1.5 rounded-lg border border-slate-200">
              {scanResult.name}
            </p>
          )}
        </div>
      )}
      
      </div>

      {mode === 'scanner' && (
        <div className="w-full max-w-sm text-center text-[11px] text-gray-500 py-1 mt-2 mb-2">
          Escaneo continuo &bull; Enfoque directo al código QR
        </div>
      )}

      {isUnclaimedVenue && (
        <div className="mt-2 mb-6 max-w-sm w-full mx-auto px-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <a href="/business" className="block bg-gradient-to-r from-amber-500/20 to-orange-600/20 border border-amber-500/30 hover:border-amber-400/50 rounded-xl p-3 text-center transition-all hover:scale-[1.02] active:scale-95 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
             <div className="text-amber-400 font-black text-[13px] mb-1 tracking-tight">👑 ¿Eres el dueño de esta sala?</div>
             <div className="text-amber-100/90 text-[11px] leading-tight font-medium px-2">Activa el control total de accesos y RRPPs para todo tu local por 39 € / 89 € al mes.</div>
          </a>
        </div>
      )}
    </div>
  );
}

export default function DoorScannerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#07080d] text-white flex items-center justify-center text-xs">Cargando escáner...</div>}>
      <DoorScannerContent />
    </Suspense>
  );
}
