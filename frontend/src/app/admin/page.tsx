'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { db, functions } from '@/lib/firebase';
import {
  collection,
  query,
  onSnapshot,
  updateDoc,
  doc,
  orderBy
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminDashboard() {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    totalUsers: 0,
    onlineUsers: 0,
    premiumUsers: 0,
    pendingReports: 0,
    pendingVerifications: 0
  });
  const [reports, setReports] = useState<any[]>([]);
  const [verifications, setVerifications] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('stats');
  const [searchQuery, setSearchQuery] = useState('');
  const [platformSettings, setPlatformSettings] = useState<{ enableDarkNightsBridge?: boolean } | null>(null);
  const [banTarget, setBanTarget] = useState<{ uid: string; nick: string } | null>(null);
  const [banReason, setBanReason] = useState('');
  const [banning, setBanning] = useState(false);

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push('/');
    }
  }, [isAdmin, loading, router]);

  useEffect(() => {
    if (!isAdmin) return;

    const unsubSettings = onSnapshot(doc(db, 'settings', 'platform'), (docSnap) => {
      if (docSnap.exists()) {
        setPlatformSettings(docSnap.data() as any);
      } else {
        setPlatformSettings({ enableDarkNightsBridge: false });
      }
    });

    // Real-time Stats
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const allUsers = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      setUsers(allUsers);
      setStats(prev => ({
        ...prev,
        totalUsers: snapshot.size,
        onlineUsers: allUsers.filter(u => u.online).length,
        premiumUsers: allUsers.filter(u => u.premium).length
      }));
    });

    const unsubReports = onSnapshot(
      query(collection(db, 'reports'), orderBy('timestamp', 'desc')), 
      (snapshot) => {
        const allReports = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
        setReports(allReports);
        setStats(prev => ({
          ...prev,
          pendingReports: allReports.filter(r => r.status === 'pending').length
        }));
      }
    );

    const unsubVerifications = onSnapshot(
      query(collection(db, 'verifications'), orderBy('timestamp', 'desc')),
      (snapshot) => {
        const allVers = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
        setVerifications(allVers);
        setStats(prev => ({
          ...prev,
          pendingVerifications: allVers.filter(v => v.status === 'pending').length
        }));
      }
    );

    return () => {
      unsubUsers();
      unsubReports();
      unsubVerifications();
    };
  }, [isAdmin]);

  const togglePremium = async (userId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        premium: !currentStatus
      });
    } catch (error) {
      console.error("Error updating premium status:", error);
    }
  };

  const resolveReport = async (reportId: string) => {
    try {
      await updateDoc(doc(db, 'reports', reportId), {
        status: 'resolved'
      });
    } catch (error) {
      console.error("Error resolving report:", error);
    }
  };

  const handleVerification = async (userId: string, status: string) => {
    try {
      await updateDoc(doc(db, 'verifications', userId), { status });
      await updateDoc(doc(db, 'users', userId), { 
        verified: status === 'approved',
        verificationStatus: status 
      });
    } catch (error) {
      console.error("Error handling verification:", error);
    }
  };

  const handleBan = async () => {
    if (!banTarget) return;
    setBanning(true);
    try {
      const banUserFn = httpsCallable(functions, 'banUser');
      await banUserFn({ uid: banTarget.uid, reason: banReason || undefined });
      setBanTarget(null);
      setBanReason('');
    } catch (error: any) {
      console.error("Error banning user:", error);
      alert('Error al banear: ' + (error.message || 'Error desconocido'));
    } finally {
      setBanning(false);
    }
  };

  if (loading || !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-fuchsia-500"></div>
      </div>
    );
  }

  const filteredUsers = users.filter(u => 
    u.nick?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.id.includes(searchQuery)
  );

  const exportCSV = () => {
    const headers = ['ID', 'Nick', 'Edad', 'Online', 'Premium', 'Creado', 'Invitaciones'];
    const rows = users.map(u => [
      u.id,
      u.nick || '',
      u.edad || '',
      u.online ? 'Sí' : 'No',
      u.premium ? 'Sí' : 'No',
      u.createdAt?.toDate?.()?.toISOString?.() || '',
      u.invitesCount || 0
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gaymeet-users-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJSON = () => {
    const data = users.map(u => ({
      id: u.id,
      nick: u.nick,
      edad: u.edad,
      online: u.online,
      premium: u.premium,
      createdAt: u.createdAt?.toDate?.()?.toISOString?.() || null,
      invitesCount: u.invitesCount || 0
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gaymeet-users-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 pb-24">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-black bg-gradient-to-r from-fuchsia-500 to-indigo-500 bg-clip-text text-transparent">
          ADMIN DASHBOARD
        </h1>
        <p className="text-slate-400 text-sm">Bienvenido, César. Control total del sistema.</p>
      </header>

      {/* Control Central de Ecosistema */}
      <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-4 mb-8 shadow-xl">
        <h2 className="text-lg font-black text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          <span className="material-icons text-fuchsia-500">settings_input_component</span>
          Ecosistema
        </h2>
        
        <div className="flex items-center justify-between p-4 bg-black/50 rounded-xl border border-white/5">
          <div>
            <h3 className="font-bold">Puente Dark Nights</h3>
            <p className="text-xs text-slate-400">Permite a los usuarios saltar al circuito general</p>
          </div>
          <button
            onClick={async () => {
              const newVal = !platformSettings?.enableDarkNightsBridge;
              const { setDoc, doc } = await import('firebase/firestore');
              const { db } = await import('@/lib/firebase');
              await setDoc(doc(db, 'settings', 'platform'), { enableDarkNightsBridge: newVal }, { merge: true });
            }}
            className={`w-14 h-8 rounded-full relative transition-colors duration-300 ${platformSettings?.enableDarkNightsBridge ? 'bg-fuchsia-600' : 'bg-slate-700'}`}
          >
            <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform duration-300 ${platformSettings?.enableDarkNightsBridge ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <StatCard 
          label="Usuarios" 
          value={stats.totalUsers} 
          icon="people" 
          color="from-fuchsia-500/20 to-fuchsia-500/5" 
          border="border-fuchsia-500/20"
        />
        <StatCard 
          label="Online" 
          value={stats.onlineUsers} 
          icon="sensors" 
          color="from-emerald-500/20 to-emerald-500/5" 
          border="border-emerald-500/20"
        />
        <StatCard 
          label="Premium" 
          value={stats.premiumUsers} 
          icon="star" 
          color="from-amber-500/20 to-amber-500/5" 
          border="border-amber-500/20"
        />
        <StatCard 
          label="Reportes" 
          value={stats.pendingReports} 
          icon="report_problem" 
          color="from-rose-500/20 to-rose-500/5" 
          border="border-rose-500/20"
        />
        <StatCard 
          label="Verif." 
          value={stats.pendingVerifications} 
          icon="verified" 
          color="from-blue-500/20 to-blue-500/5" 
          border="border-blue-500/20"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        <TabButton active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} label="General" icon="dashboard" />
        <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} label="Usuarios" icon="group" />
        <TabButton active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} label="Reportes" icon="gavel" />
        <TabButton active={activeTab === 'verifications'} onClick={() => setActiveTab('verifications')} label="Verificaciones" icon="verified" />
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'stats' && (
          <motion.div
            key="stats"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span className="material-icons text-fuchsia-400">trending_up</span>
                Actividad Reciente
              </h2>
              <div className="space-y-4">
                {/* Aquí podrías añadir un gráfico o mini lista de últimas acciones */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-slate-900/50 rounded-2xl p-4 border border-white/5 text-center">
                    <p className="text-3xl font-black text-fuchsia-400">{stats.totalUsers}</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Usuarios Totales</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-2xl p-4 border border-white/5 text-center">
                    <p className="text-3xl font-black text-amber-400">
                      {stats.totalUsers > 0 ? Math.round((stats.premiumUsers / stats.totalUsers) * 100) : 0}%
                    </p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Conversión Premium</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-2xl p-4 border border-white/5 text-center">
                    <p className="text-3xl font-black text-emerald-400">
                      {stats.totalUsers > 0 ? Math.round((stats.onlineUsers / stats.totalUsers) * 100) : 0}%
                    </p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Usuarios Online</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-2xl p-4 border border-white/5 text-center">
                    <p className="text-3xl font-black text-rose-400">{stats.pendingReports}</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Reportes Pendientes</p>
                  </div>
                </div>
                <h3 className="text-sm font-bold text-slate-400 mb-3">Últimos Registros</h3>
                <div className="space-y-2">
                  {[...users].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).slice(0, 5).map(u => (
                    <div key={u.id} className="flex items-center gap-3 py-2 border-b border-white/5">
                      <img src={u.fotoUrl || '/placeholder-user.png'} className="w-8 h-8 rounded-full object-cover" alt={u.nick} />
                      <div className="flex-1">
                        <p className="text-sm font-bold">{u.nick || 'Sin nick'}</p>
                        <p className="text-[10px] text-slate-500">{u.createdAt?.toDate?.()?.toLocaleDateString('es-ES') || 'Sin fecha'}</p>
                      </div>
                      {u.premium && <span className="text-[9px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-black">PREMIUM</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'users' && (
          <motion.div
            key="users"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="flex gap-2 mb-4">
              <button
                onClick={exportCSV}
                className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600/30 transition-all"
              >
                <span className="material-icons text-sm">download</span>
                CSV
              </button>
              <button
                onClick={exportJSON}
                className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-600/30 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600/30 transition-all"
              >
                <span className="material-icons text-sm">data_object</span>
                JSON
              </button>
            </div>
            <div className="relative">
              <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">search</span>
              <input 
                type="text"
                placeholder="Buscar por nick o ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:border-fuchsia-500/50 transition-colors"
              />
            </div>

            <div className="space-y-3">
              {filteredUsers.map(u => (
                <div key={u.id} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img 
                        src={u.fotoUrl || '/placeholder-user.png'} 
                        alt={u.nick}
                        className="w-10 h-10 rounded-full object-cover border border-white/20"
                      />
                      {u.online && <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-950"></div>}
                    </div>
                    <div>
                      <p className="font-bold text-sm">{u.nick || 'Sin nick'}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{u.id.substring(0, 8)}...</p>
                    </div>
                  </div>
                  <div className="flex gap-2 items-center">
                    {u.banned && (
                      <span className="text-[9px] bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded-full font-black">BANNED</span>
                    )}
                    <button
                      onClick={() => togglePremium(u.id, u.premium)}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${
                        u.premium
                          ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                          : 'bg-white/5 text-slate-400 border border-white/10 hover:border-amber-500/30'
                      }`}
                    >
                      {u.premium ? 'PREMIUM' : 'HACER PREMIUM'}
                    </button>
                    {!u.banned && (
                      <button
                        onClick={() => setBanTarget({ uid: u.id, nick: u.nick || u.id.substring(0, 8) })}
                        className="px-3 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-all"
                      >
                        BAN
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'reports' && (
          <motion.div
            key="reports"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {reports.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <span className="material-icons text-4xl mb-2">check_circle</span>
                <p>No hay reportes pendientes</p>
              </div>
            ) : (
              reports.map(report => (
                <div key={report.id} className="bg-white/5 backdrop-blur-md border border-rose-500/10 rounded-2xl p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <span className="material-icons text-rose-500 text-sm">warning</span>
                      <span className="text-xs font-bold uppercase tracking-wider text-rose-400">{report.reason}</span>
                    </div>
                    <span className="text-[10px] text-slate-500">
                      {report.timestamp?.toDate().toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 bg-black/20 p-2 rounded-lg italic">
                    "{report.details || 'Sin detalles adicionales'}"
                  </p>
                  <div className="flex justify-between items-center pt-2">
                    <div className="text-[10px] text-slate-500">
                      ID Reportado: <span className="font-mono">{report.reportedId}</span>
                    </div>
                    {report.status === 'pending' ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const reported = users.find(u => u.id === report.reportedId);
                            setBanTarget({ uid: report.reportedId, nick: reported?.nick || report.reportedId.substring(0, 8) });
                            setBanReason(report.reason || '');
                          }}
                          className="bg-rose-500/20 text-rose-400 border border-rose-500/30 px-3 py-1 rounded-full text-[10px] font-bold"
                        >
                          BAN
                        </button>
                        <button
                          onClick={() => resolveReport(report.id)}
                          className="bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 px-3 py-1 rounded-full text-[10px] font-bold"
                        >
                          RESOLVER
                        </button>
                      </div>
                    ) : (
                      <span className="text-emerald-500 text-[10px] font-bold flex items-center gap-1">
                        <span className="material-icons text-xs">done_all</span> RESUELTO
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </motion.div>
        )}

        {activeTab === 'verifications' && (
          <motion.div
            key="verifications"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {verifications.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <span className="material-icons text-4xl mb-2">verified</span>
                <p>No hay solicitudes de verificación</p>
              </div>
            ) : (
              verifications.map(ver => (
                <div key={ver.id} className="bg-white/5 backdrop-blur-md border border-blue-500/10 rounded-2xl p-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <span className="material-icons text-blue-500">face</span>
                      </div>
                      <div>
                        <p className="font-bold text-sm">{ver.nick}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{ver.userId.substring(0, 8)}...</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${
                      ver.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : 
                      ver.status === 'rejected' ? 'bg-rose-500/20 text-rose-400' : 
                      'bg-amber-500/20 text-amber-400'
                    }`}>
                      {ver.status}
                    </span>
                  </div>
                  
                  <div className="relative aspect-video rounded-xl overflow-hidden border border-white/10">
                    <img src={ver.photoUrl} alt="Verificación" className="w-full h-full object-cover" />
                  </div>

                  {ver.status === 'pending' && (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleVerification(ver.userId, 'approved')}
                        className="flex-1 bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest"
                      >
                        APROBAR
                      </button>
                      <button 
                        onClick={() => handleVerification(ver.userId, 'rejected')}
                        className="flex-1 bg-rose-600/20 text-rose-400 border border-rose-600/30 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest"
                      >
                        RECHAZAR
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ban Confirmation Modal */}
      <AnimatePresence>
        {banTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => { setBanTarget(null); setBanReason(''); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-rose-500/30 rounded-2xl p-6 w-full max-w-sm space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center">
                  <span className="material-icons text-rose-500">gavel</span>
                </div>
                <div>
                  <h3 className="font-bold text-lg">Banear usuario</h3>
                  <p className="text-xs text-slate-400">{banTarget.nick}</p>
                </div>
              </div>
              <p className="text-sm text-slate-300">
                Se revocará su sesión, se deshabilitará su cuenta y no podrá escribir datos.
              </p>
              <textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Motivo del ban (opcional)..."
                className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-rose-500/50 resize-none h-20"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => { setBanTarget(null); setBanReason(''); }}
                  className="flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-wider border border-white/15 text-slate-400 hover:bg-white/5 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleBan}
                  disabled={banning}
                  className="flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-wider bg-rose-600 text-white hover:bg-rose-700 transition-all disabled:opacity-50"
                >
                  {banning ? 'Baneando...' : 'Confirmar ban'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ label, value, icon, color, border }: { label: string, value: number, icon: string, color: string, border: string }) {
  return (
    <div className={`bg-gradient-to-br ${color} backdrop-blur-xl border ${border} rounded-3xl p-4 flex flex-col items-center justify-center text-center`}>
      <span className="material-icons text-xl mb-1 opacity-60">{icon}</span>
      <span className="text-2xl font-black">{value}</span>
      <span className="text-[10px] uppercase font-bold tracking-widest opacity-60">{label}</span>
    </div>
  );
}

function TabButton({ active, onClick, label, icon }: { active: boolean, onClick: () => void, label: string, icon: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-bold transition-all whitespace-nowrap ${
        active 
          ? 'bg-fuchsia-600 text-white shadow-[0_0_20px_rgba(192,38,211,0.4)]' 
          : 'bg-white/5 text-slate-400 border border-white/5 hover:bg-white/10'
      }`}
    >
      <span className="material-icons text-lg">{icon}</span>
      {label}
    </button>
  );
}
