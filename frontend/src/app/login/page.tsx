'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const { user, loginWithGoogle, loginWithPhone, setupRecaptcha } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [error, setError] = useState('');
  const [step, setStep] = useState('choice'); // choice, phone, code

  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (err) {
      setError('Error al iniciar sesión con Google.');
    }
  };

  const handleSendCode = async () => {
    try {
      setError('');
      setupRecaptcha('recaptcha-container');
      const result = await loginWithPhone(phoneNumber);
      setConfirmationResult(result);
      setStep('code');
    } catch (err) {
      setError('Error al enviar el código SMS. Verifica el número.');
      console.error(err);
    }
  };

  const handleVerifyCode = async () => {
    try {
      setError('');
      await confirmationResult.confirm(verificationCode);
    } catch (err) {
      setError('Código incorrecto. Inténtalo de nuevo.');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900 via-slate-950 to-black p-6">
      <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500">
            Gay Meet
          </h1>
          <p className="text-slate-400 font-medium">Encuentra tu conexión hoy</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-4 rounded-xl text-center">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {step === 'choice' && (
            <>
              <button
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 bg-white text-black font-bold py-4 rounded-2xl hover:bg-slate-200 transition-all duration-300 shadow-lg"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
                Continuar con Google
              </button>

              <button
                onClick={() => setStep('phone')}
                className="w-full bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 font-bold py-4 rounded-2xl hover:bg-indigo-600/30 transition-all duration-300"
              >
                Usar número de teléfono
              </button>
            </>
          )}

          {step === 'phone' && (
            <div className="space-y-4">
              <input
                type="tel"
                placeholder="+34 600 000 000"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
              />
              <button
                onClick={handleSendCode}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 font-bold py-4 rounded-2xl hover:opacity-90 transition-all shadow-lg shadow-purple-500/20"
              >
                Enviar código
              </button>
              <button onClick={() => setStep('choice')} className="w-full text-slate-500 text-sm font-medium">Volver</button>
              <div id="recaptcha-container"></div>
            </div>
          )}

          {step === 'code' && (
            <div className="space-y-4">
              <p className="text-center text-slate-300 text-sm">Introduce el código enviado a {phoneNumber}</p>
              <input
                type="text"
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-2xl p-4 text-white text-center text-2xl tracking-[1em] focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
              />
              <button
                onClick={handleVerifyCode}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 font-bold py-4 rounded-2xl hover:opacity-90 transition-all shadow-lg"
              >
                Verificar y entrar
              </button>
              <button onClick={() => setStep('phone')} className="w-full text-slate-500 text-sm font-medium">Cambiar número</button>
            </div>
          )}
        </div>

        <p className="text-center text-[10px] text-slate-500 leading-relaxed px-4">
          Al continuar, aceptas nuestros <span className="text-slate-400 underline cursor-pointer">Términos</span> y <span className="text-slate-400 underline cursor-pointer">Política de Privacidad</span>.
        </p>
      </div>
    </div>
  );
}
