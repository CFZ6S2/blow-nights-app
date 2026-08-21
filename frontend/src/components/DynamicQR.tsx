'use client';

import { useState, useEffect } from 'react';
import QRCodeSVG from 'react-qr-code';

export default function DynamicQR({ ticketId, secretKey, fallbackToken, size = 200 }: { ticketId: string, secretKey?: string, fallbackToken?: string, size?: number }) {
  const [qrValue, setQrValue] = useState<string>('');
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!secretKey) {
      setQrValue(fallbackToken || '');
      return;
    }

    let intervalId: NodeJS.Timeout;
    
    const generateQR = async () => {
      try {
        const timestamp = Date.now();
        const encoder = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
          'raw',
          encoder.encode(secretKey),
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign']
        );
        
        const payload = `${ticketId}:${timestamp}`;
        const signatureBuffer = await crypto.subtle.sign(
          'HMAC',
          keyMaterial,
          encoder.encode(payload)
        );
        
        const signatureArray = Array.from(new Uint8Array(signatureBuffer));
        const signatureHex = signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');
        
        setQrValue(`dyn:${payload}:${signatureHex}`);
        setProgress(100);
      } catch (e) {
        console.error("Error generating dynamic QR", e);
        setQrValue(fallbackToken || '');
      }
    };

    generateQR();
    intervalId = setInterval(generateQR, 15000); // 15 seconds

    const progressInterval = setInterval(() => {
      setProgress(p => Math.max(0, p - (100 / (15000 / 100))));
    }, 100);

    return () => {
      clearInterval(intervalId);
      clearInterval(progressInterval);
    };
  }, [ticketId, secretKey, fallbackToken]);

  if (!qrValue) return <div className="animate-pulse bg-slate-800 rounded-3xl" style={{ width: size, height: size }}></div>;

  return (
    <div className="flex flex-col items-center w-full">
      <div className="bg-white p-4 rounded-3xl relative overflow-hidden print:border-4 print:border-black shadow-xl">
        <QRCodeSVG value={qrValue} size={size} />
        {secretKey && (
           <div className="absolute inset-0 bg-gradient-to-b from-transparent via-fuchsia-500/20 to-transparent w-full h-[50%] animate-[scan_2s_ease-in-out_infinite] pointer-events-none print:hidden" />
        )}
      </div>
      {secretKey && (
        <div className="w-48 mt-6 print:hidden">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] text-fuchsia-400 font-bold uppercase tracking-wider">QR Dinámico</span>
            <span className="text-[10px] text-slate-500 font-bold uppercase">{Math.ceil(progress / (100/15))}s</span>
          </div>
          <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-fuchsia-500 to-indigo-500 transition-all duration-100 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
