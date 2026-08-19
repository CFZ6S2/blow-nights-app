'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useRequireRole } from '@/hooks/useRequireRole';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';

export default function RRPPProfilePage() {
  const { user, profile } = useAuth();
  const { isReady } = useRequireRole(['rrpp', 'admin', 'superadmin'], '/rrpp/register');
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  if (!isReady) return <div className="min-h-screen bg-black flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-fuchsia-500" /></div>;

  return (
    <div className="min-h-screen bg-black text-white p-6 pb-24 font-sans">
      <div className="max-w-md mx-auto pt-8">
        <header className="mb-8">
          <div className="inline-block px-3 py-1 bg-fuchsia-900/30 text-fuchsia-400 rounded-full text-[10px] font-black tracking-widest uppercase mb-4 border border-fuchsia-500/20">
            Perfil Profesional
          </div>
          <h1 className="text-3xl font-black mb-2">Mi Cuenta</h1>
          <p className="text-sm text-slate-400">Datos y ajustes de tu cuenta de promotor.</p>
        </header>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-fuchsia-600 rounded-2xl flex items-center justify-center text-2xl font-black shadow-lg shadow-fuchsia-600/20">
              {profile?.nick?.[0]?.toUpperCase() || 'R'}
            </div>
            <div>
              <h2 className="text-xl font-bold">{profile?.nick || 'Promotor'}</h2>
              <p className="text-xs text-slate-400">{user?.email}</p>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-6">
            <div className="mb-4">
              <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1 block">Teléfono de Contacto</label>
              <div className="bg-black/50 border border-white/5 px-4 py-3 rounded-xl text-sm">
                {(profile as any)?.phone || 'No especificado'}
              </div>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1 block">Ciudad de Operación</label>
              <div className="bg-black/50 border border-white/5 px-4 py-3 rounded-xl text-sm capitalize">
                {(profile as any)?.city || 'No especificada'}
              </div>
            </div>
          </div>
        </div>

        <button 
          onClick={handleLogout}
          className="w-full mt-6 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold py-4 rounded-2xl transition-colors border border-red-500/20"
        >
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}
