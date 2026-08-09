'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-12 pb-32">
      <div className="max-w-3xl mx-auto space-y-12">
        <header className="space-y-4">
          <Link href="/login" prefetch={false} className="inline-flex items-center gap-2 text-fuchsia-500 font-black uppercase tracking-widest text-[10px] hover:translate-x-[-4px] transition-transform">
            <span className="material-icons text-sm">arrow_back</span>
            Volver
          </Link>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-500">
            Términos de Servicio
          </h1>
          <p className="text-slate-500 text-sm">Última actualización: 27 de mayo de 2026</p>
        </header>

        <main className="space-y-10 text-slate-300 leading-relaxed">
          <section className="space-y-4">
            <h2 className="text-xl font-black text-white uppercase tracking-wider border-b border-white/5 pb-2">1. Aceptación de los Términos</h2>
            <p>
              Al acceder o utilizar Gay Meet, aceptas estar legalmente vinculado por estos Términos de Servicio. Si no estás de acuerdo con alguna parte de estos términos, no debes utilizar la aplicación.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-black text-white uppercase tracking-wider border-b border-white/5 pb-2">2. Requisitos de Edad</h2>
            <p>
              Debes tener al menos 18 años de edad para crear una cuenta y utilizar Gay Meet. El uso de la aplicación por menores de edad está estrictamente prohibido y resultará en la eliminación inmediata de la cuenta.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-black text-white uppercase tracking-wider border-b border-white/5 pb-2">3. Conducta del Usuario</h2>
            <p>
              Te comprometes a utilizar la aplicación de manera respetuosa. Queda prohibido:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Acosar, intimidar o difamar a otros usuarios.</li>
              <li>Publicar contenido ilegal, obsceno, pornográfico (sin consentimiento) o que incite al odio.</li>
              <li>Suplantar la identidad de otra persona.</li>
              <li>Utilizar la aplicación para fines comerciales no autorizados o spam.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-black text-white uppercase tracking-wider border-b border-white/5 pb-2">4. Geolocalización y Privacidad</h2>
            <p>
              Gay Meet es una aplicación basada en la ubicación. Al activar tu visibilidad, compartes tu ubicación aproximada con otros usuarios. Entiendes y aceptas que esta es la funcionalidad principal de la aplicación.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-black text-white uppercase tracking-wider border-b border-white/5 pb-2">5. Suscripciones Premium</h2>
            <p>
              Las suscripciones Premium otorgan acceso a funciones adicionales. Los pagos se procesan a través de proveedores externos (Stripe). Las suscripciones se renuevan automáticamente a menos que se cancelen antes del final del periodo actual.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-black text-white uppercase tracking-wider border-b border-white/5 pb-2">6. Terminación de Cuenta</h2>
            <p>
              Nos reservamos el derecho de suspender o eliminar cualquier cuenta que viole estos términos o por cualquier otra razón que consideremos necesaria para mantener la seguridad de la comunidad.
            </p>
          </section>
        </main>

        <footer className="pt-12 border-t border-white/5 text-center">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">© 2026 Gay Meet App. Todos los derechos reservados.</p>
        </footer>
      </div>
    </div>
  );
}
