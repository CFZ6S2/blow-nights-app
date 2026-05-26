'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (!loading && profile && profile.edad === null) {
      router.push('/setup-profile');
    }
  }, [user, profile, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!user || !profile) return null;

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-white p-8">
      <header className="flex justify-between items-center mb-12">
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-violet-500">
          Gay Meet App
        </h1>
        <button 
          onClick={logout}
          className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl transition-all text-sm font-medium"
        >
          Cerrar sesión
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
        <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-purple-500 shadow-lg shadow-purple-500/20">
          <img 
            src={profile.fotoUrl || `https://ui-avatars.com/api/?name=${profile.nick || 'User'}&background=random`} 
            alt="Profile" 
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <h2 className="text-3xl font-bold">¡Hola, {profile.nick}!</h2>
          <p className="text-slate-400 mt-2">Estás en modo: <span className="text-purple-400 font-bold capitalize">{profile.rol}</span> buscando <span className="text-pink-400 font-bold">{profile.intencion === 'quedar' ? 'quedar ahora' : 'conocer gente'}</span>.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl mt-8">
          <div className="bg-white/5 p-6 rounded-3xl border border-white/10 hover:bg-white/10 transition-all cursor-pointer group">
            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">📍</div>
            <h3 className="text-xl font-bold">Mapa</h3>
            <p className="text-sm text-slate-500 mt-2">Encuentra personas cerca de tu ubicación.</p>
          </div>
          <div className="bg-white/5 p-6 rounded-3xl border border-white/10 hover:bg-white/10 transition-all cursor-pointer group">
            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">💬</div>
            <h3 className="text-xl font-bold">Chats</h3>
            <p className="text-sm text-slate-500 mt-2">Conversa con tus conexiones en tiempo real.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
