'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db, functions } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';
import jsQR from 'jsqr';

export default function DoorScannerClient({ venueId, eventId }: { venueId: string; eventId: string }) {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [eventData, setEventData] = useState<any>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [scanMessage, setScanMessage] = useState<string>('');
  const [scanPerks, setScanPerks] = useState<string>('');

  useEffect(() => {
    if (!token) {
      setAuthorized(false);
      return;
    }

    const verifyToken = async () => {
      try {
        const docRef = doc(db, `venues/${venueId}/events`, eventId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists() && docSnap.data().door_access_token === token) {
          setEventData(docSnap.data());
          setAuthorized(true);
        } else {
          setAuthorized(false);
        }
      } catch (err) {
        console.error('Error verifying token:', err);
        setAuthorized(false);
      }
    };

    verifyToken();
  }, [venueId, eventId, token]);

  const startCamera = useCallback(async () => {
    if (!authorized) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setScanning(true);
        requestAnimationFrame(tick);
      }
    } catch (err: any) {
      console.error('Error accessing camera:', err);
      alert('Error al acceder a la cámara. Revisa los permisos.');
    }
  }, [authorized]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
  }, []);

  useEffect(() => {
    if (authorized && scanResult === 'idle') {
      startCamera();
    }
    return () => stopCamera();
  }, [authorized, scanResult, startCamera, stopCamera]);

  const tick = () => {
    if (!videoRef.current || !canvasRef.current || !scanning) return;

    if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current;
      const video = videoRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });

        if (code && code.data) {
          handleQRCode(code.data);
          return;
        }
      }
    }

    if (scanning) {
      requestAnimationFrame(tick);
    }
  };

  const triggerHaptic = (type: 'success' | 'error') => {
    if ('vibrate' in navigator) {
      if (type === 'success') navigator.vibrate([200, 100, 200]);
      if (type === 'error') navigator.vibrate([500]);
    }
  };

  const handleQRCode = async (qrData: string) => {
    setScanning(false);
    stopCamera();

    try {
      const validateTicketByDoorToken = httpsCallable(functions, 'validateTicketByDoorToken');
      const res = await validateTicketByDoorToken({
        qrToken: qrData,
        doorAccessToken: token,
        eventId: eventId,
        venueId: venueId
      });

      const data = res.data as any;
      if (data.valid) {
        setScanResult('valid');
        setScanMessage('VÁLIDO');
        setScanPerks(data.perks || '');
        triggerHaptic('success');
      } else {
        setScanResult('invalid');
        setScanMessage(data.message || 'NO VÁLIDO');
        setScanPerks('');
        triggerHaptic('error');
      }
    } catch (err: any) {
      setScanResult('invalid');
      setScanMessage(err.message || 'ERROR DE LECTURA');
      setScanPerks('');
      triggerHaptic('error');
    }

    setTimeout(() => {
      setScanResult('idle');
      setScanMessage('');
      setScanPerks('');
    }, 2000);
  };

  if (authorized === null) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white">Validando acceso...</div>;
  }

  if (authorized === false) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center text-white">
        <span className="material-icons text-6xl text-red-500 mb-4">gpp_bad</span>
        <h1 className="text-2xl font-black mb-2">Acceso Denegado</h1>
        <p className="text-slate-400">El token proporcionado es inválido o ha sido revocado.</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen w-full relative transition-colors duration-200 ${
      scanResult === 'valid' ? 'bg-green-500' :
      scanResult === 'invalid' ? 'bg-red-600' : 'bg-black'
    }`}>

      <div className="absolute top-0 inset-x-0 z-20 p-6 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
        <div>
          <h2 className="text-white font-black text-xl leading-none">{eventData?.title}</h2>
          <p className="text-white/70 text-xs font-bold mt-1">
            {eventData?.stats?.total_checked_in || 0} / {eventData?.stats?.total_sold || 0} DENTRO
          </p>
        </div>
        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md">
          <span className="material-icons text-white">qr_code_scanner</span>
        </div>
      </div>

      {scanResult === 'idle' && (
        <div className="absolute inset-0 z-10">
          <video ref={videoRef} className="w-full h-full object-cover" />
          <canvas ref={canvasRef} className="hidden" />

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-64 border-2 border-white/50 rounded-3xl relative">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white -mt-1 -ml-1 rounded-tl-xl" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white -mt-1 -mr-1 rounded-tr-xl" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white -mb-1 -ml-1 rounded-bl-xl" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white -mb-1 -mr-1 rounded-br-xl" />
            </div>
          </div>

          <div className="absolute bottom-10 inset-x-0 text-center z-20 pointer-events-none">
            <p className="text-white/70 font-bold tracking-widest uppercase text-sm">Apuntando al QR</p>
          </div>
        </div>
      )}

      {scanResult !== 'idle' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 text-center text-white">
          <span className="material-icons text-9xl drop-shadow-2xl mb-6">
            {scanResult === 'valid' ? 'check_circle' : 'cancel'}
          </span>
          <h1 className="text-5xl font-black drop-shadow-lg mb-2">{scanMessage}</h1>
          {scanPerks && (
            <div className="mt-8 bg-black/30 backdrop-blur-md px-8 py-4 rounded-3xl border border-white/20">
              <p className="text-lg font-black uppercase tracking-widest">ENTREGAR:</p>
              <p className="text-3xl font-black text-yellow-300 mt-2">{scanPerks}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
