'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-12 pb-32">
      <div className="max-w-3xl mx-auto space-y-12">
        <header className="space-y-4">
          <Link href="/login" prefetch={false} className="inline-flex items-center gap-2 text-fuchsia-500 font-black uppercase tracking-widest text-[10px] hover:translate-x-[-4px] transition-transform">
            <span className="material-icons text-sm">arrow_back</span>
            Volver
          </Link>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-500">
            Política de Privacidad
          </h1>
          <p className="text-slate-500 text-sm">Última actualización: 27 de mayo de 2026</p>
        </header>

        <main className="space-y-10 text-slate-300 leading-relaxed">
          <section className="space-y-4">
            <h2 className="text-xl font-black text-white uppercase tracking-wider border-b border-white/5 pb-2">1. Información que Recopilamos</h2>
            <p>
              Para proporcionar el servicio, recopilamos la siguiente información:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Datos de Cuenta:</strong> Nick, edad, correo electrónico o número de teléfono.</li>
              <li><strong>Contenido del Perfil:</strong> Fotos, biografía, altura, peso y preferencias de rol.</li>
              <li><strong>Datos de Ubicación:</strong> Tu geolocalización precisa mientras la aplicación está en uso y tienes activada la visibilidad.</li>
              <li><strong>Mensajería:</strong> Los mensajes enviados a través de nuestro chat.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-black text-white uppercase tracking-wider border-b border-white/5 pb-2">2. Cómo Utilizamos tus Datos</h2>
            <p>
              Tus datos se utilizan para:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Mostrarte en el mapa a otros usuarios cercanos.</li>
              <li>Permitir que otros usuarios vean tu perfil y se comuniquen contigo.</li>
              <li>Gestionar tu suscripción Premium y procesar pagos.</li>
              <li>Mejorar y proteger la seguridad de la aplicación.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-black text-white uppercase tracking-wider border-b border-white/5 pb-2">3. Compartir Información</h2>
            <p>
              No vendemos tus datos personales a terceros. Tu información de perfil y ubicación es visible para otros usuarios de la aplicación según tu configuración de visibilidad.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-black text-white uppercase tracking-wider border-b border-white/5 pb-2">4. Tus Derechos</h2>
            <p>
              Puedes acceder, rectificar o eliminar tus datos en cualquier momento desde la configuración de tu perfil. Si eliminas tu cuenta, tus datos personales serán borrados de nuestros servidores activos de forma inmediata.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-black text-white uppercase tracking-wider border-b border-white/5 pb-2">5. Seguridad</h2>
            <p>
              Implementamos medidas de seguridad para proteger tus datos, incluyendo encriptación y firewalls en nuestra infraestructura de Firebase (Google Cloud).
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-black text-white uppercase tracking-wider border-b border-white/5 pb-2">6. Cookies y Almacenamiento Local</h2>
            <p>
              Utilizamos almacenamiento local en tu dispositivo para mantener tu sesión iniciada y recordar tus preferencias de visualización.
            </p>
          </section>
        </main>

        <footer className="pt-12 border-t border-white/5 text-center">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">© 2026 Gay Meet App. Tu privacidad es nuestra prioridad.</p>
        </footer>
      </div>
    </div>
  );
}
