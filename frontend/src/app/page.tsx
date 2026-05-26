import MainMap from '@/components/Map';

export default function Home() {
  const { user, profile, loading, logout } = useAuth();
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
    <div className="flex flex-col min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <header className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border border-purple-500">
            <img 
              src={profile.fotoUrl || `https://ui-avatars.com/api/?name=${profile.nick || 'User'}&background=random`} 
              alt="Profile" 
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-violet-500">
              Gay Meet
            </h1>
            <p className="text-[10px] text-slate-400">¡Hola, {profile.nick}!</p>
          </div>
        </div>
        <button 
          onClick={logout}
          className="bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl transition-all text-xs font-medium border border-white/5"
        >
          Salir
        </button>
      </header>

      <main className="flex-1 space-y-8 max-w-4xl mx-auto w-full">
        {/* Sección del Mapa */}
        <section className="space-y-4">
          <div className="flex justify-between items-end">
            <h2 className="text-xl font-bold">Cerca de ti</h2>
            <span className="text-xs text-purple-400 font-medium">Ubicación aproximada</span>
          </div>
          <MainMap />
        </section>
        
        {/* Acciones Rápidas */}
        <div className="grid grid-cols-2 gap-4">
          <Link 
            href="/chat"
            className="bg-white/5 p-5 rounded-3xl border border-white/10 hover:bg-white/10 transition-all cursor-pointer group text-left"
          >
            <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">💬</div>
            <h3 className="font-bold">Chats</h3>
            <p className="text-[10px] text-slate-500 mt-1">Mensajes pendientes</p>
          </Link>
          <div className="bg-white/5 p-5 rounded-3xl border border-white/10 hover:bg-white/10 transition-all cursor-pointer group text-left">
            <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">⭐</div>
            <h3 className="font-bold">Premium</h3>
            <p className="text-[10px] text-slate-500 mt-1">Ver planes</p>
          </div>
        </div>
      </main>
    </div>
  );
}
