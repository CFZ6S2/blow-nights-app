'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import jsQR from 'jsqr';

type ScanResult = {
  valid: boolean;
  message: string;
  reason?: string;
  ticket?: {
    id: string;
    ticketType: string;
    userName: string;
    userPhoto: string;
  };
};

import { useTranslation } from 'react-i18next';

export default function ScannerPage() {
  const { t } = useTranslation();
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [manualToken, setManualToken] = useState('');
  const [validating, setValidating] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [mode, setMode] = useState<'camera' | 'manual'>('camera');
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef(true);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setScanning(true);
        scanningRef.current = true;
        startQRLoop();
      }
    } catch (err: any) {
      setCameraError(err.message || 'No se pudo acceder a la cámara');
      setMode('manual');
    }
  }, []);

  const startQRLoop = useCallback(() => {
    function tick() {
      if (!scanningRef.current) return;
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
          if (code && code.data) {
            scanningRef.current = false;
            validateToken(code.data);
            return;
          }
        }
      }
      animFrameRef.current = requestAnimationFrame(tick);
    }
    animFrameRef.current = requestAnimationFrame(tick);
  }, []);

  const stopCamera = useCallback(() => {
    scanningRef.current = false;
    cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const validateToken = async (token: string) => {
    if (!token || validating) return;
    setValidating(true);
    setResult(null);

    try {
      const validateTicket = httpsCallable(functions, 'validateTicket');
      const res = await validateTicket({ qrToken: token.trim() });
      setResult(res.data as ScanResult);
      stopCamera();
    } catch (err: any) {
      setResult({
        valid: false,
        message: err.message || 'Error al validar',
        reason: 'error',
      });
    } finally {
      setValidating(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setManualToken('');
    if (mode === 'camera') {
      scanningRef.current = true;
      startCamera();
    }
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-10 h-10 border-t-2 border-slate-700 rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-32">
      <main className="relative z-10 p-6 md:p-12 max-w-lg mx-auto space-y-6">
        <header className="pt-8 space-y-2">
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-3">
            <span className="material-icons text-slate-800">qr_code_scanner</span>
            {t('scanner_title')}
          </h1>
          <p className="text-xs text-slate-500">{t('scanner_subtitle')}</p>
        </header>

        <div className="flex gap-2">
          <button
            onClick={() => { setMode('camera'); setResult(null); }}
            className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${
              mode === 'camera'
                ? 'bg-fuchsia-500/20 border-slate-700/30 text-slate-800'
                : 'bg-white/5 border-white/10 text-slate-500'
            }`}
          >
            <span className="material-icons text-sm align-middle mr-1">photo_camera</span>
            {t('scanner_camera')}
          </button>
          <button
            onClick={() => { setMode('manual'); stopCamera(); setResult(null); }}
            className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${
              mode === 'manual'
                ? 'bg-fuchsia-500/20 border-slate-700/30 text-slate-800'
                : 'bg-white/5 border-white/10 text-slate-500'
            }`}
          >
            <span className="material-icons text-sm align-middle mr-1">keyboard</span>
            {t('scanner_manual')}
          </button>
        </div>

        {mode === 'camera' && !result && (
          <div className="space-y-4">
            <div className="relative rounded-3xl overflow-hidden bg-black aspect-[4/3] flex items-center justify-center">
              {!scanning && !cameraError && (
                <button
                  onClick={startCamera}
                  className="px-6 py-3 bg-slate-900 text-slate-900 font-bold rounded-2xl flex items-center gap-2 z-10"
                >
                  <span className="material-icons">photo_camera</span>
                  Activar Cámara
                </button>
              )}
              <video ref={videoRef} className="w-full h-full object-cover absolute inset-0" playsInline muted />
              <canvas ref={canvasRef} className="hidden" />
              {scanning && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-48 border-2 border-slate-700 rounded-3xl animate-pulse" />
                </div>
              )}
              {cameraError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                  <div className="text-center space-y-3 p-6">
                    <span className="material-icons text-4xl text-red-500">videocam_off</span>
                    <p className="text-xs text-slate-500">{cameraError}</p>
                  </div>
                </div>
              )}
            </div>
            <p className="text-[10px] text-center text-slate-600">
              Apunta la cámara al código QR de la entrada
            </p>
            <div className="space-y-2">
              <p className="text-[10px] text-slate-500 text-center">O introduce el token directamente:</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="Token del QR..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs text-slate-900 placeholder:text-slate-600 focus:outline-none focus:border-slate-700/50"
                />
                <button
                  onClick={() => validateToken(manualToken)}
                  disabled={!manualToken || validating}
                  className="px-6 py-3 rounded-2xl bg-slate-900 text-slate-900 text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
                >
                  {validating ? '...' : 'Validar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {mode === 'manual' && !result && (
          <div className="space-y-4">
            <div className="bg-white/5 border border-white/10 p-6 rounded-3xl space-y-4">
              <label className="text-xs font-bold text-slate-500 block">Token de la entrada</label>
              <input
                type="text"
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                placeholder="Pega aquí el token QR del cliente..."
                className="w-full bg-black/30 border border-white/10 rounded-2xl px-4 py-4 text-sm text-slate-900 placeholder:text-slate-600 focus:outline-none focus:border-slate-700/50 font-mono"
              />
              <button
                onClick={() => validateToken(manualToken)}
                disabled={!manualToken || validating}
                className="w-full py-4 rounded-2xl bg-slate-900 text-slate-900 text-xs font-black uppercase tracking-[0.2em] disabled:opacity-50 transition-all active:scale-95"
              >
                {validating ? 'Validando...' : 'Validar Entrada'}
              </button>
            </div>
          </div>
        )}

        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`border p-8 rounded-[3rem] text-center space-y-6 ${
                result.valid
                  ? 'bg-green-500/10 border-green-500/20'
                  : 'bg-red-500/10 border-red-500/20'
              }`}
            >
              <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto ${
                result.valid ? 'bg-green-500/20' : 'bg-red-500/20'
              }`}>
                <span className={`material-icons text-5xl ${
                  result.valid ? 'text-green-400' : 'text-red-400'
                }`}>
                  {result.valid ? 'check_circle' : 'cancel'}
                </span>
              </div>

              <div className="space-y-2">
                <h2 className={`text-xl font-black ${
                  result.valid ? 'text-green-400' : 'text-red-400'
                }`}>
                  {result.valid ? 'ACCESO PERMITIDO' : 'ACCESO DENEGADO'}
                </h2>
                <p className="text-sm text-slate-500">{result.message}</p>
              </div>

              {result.ticket && (
                <div className="bg-black/20 p-5 rounded-2xl space-y-3">
                  <div className="flex items-center justify-center gap-3">
                    {result.ticket.userPhoto && (
                      <img
                        src={result.ticket.userPhoto}
                        alt=""
                        className="w-12 h-12 rounded-2xl object-cover"
                      />
                    )}
                    <div className="text-left">
                      <p className="text-sm font-black">{result.ticket.userName}</p>
                      <p className="text-[10px] text-slate-500 capitalize">{result.ticket.ticketType}</p>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handleReset}
                className="w-full py-4 rounded-2xl bg-white/10 text-slate-900 font-black uppercase tracking-[0.2em] text-xs hover:bg-white/20 transition-all"
              >
                Escanear otra entrada
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
