'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { db, functions } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { 
  collection, 
  query, 
  onSnapshot,
  updateDoc, 
  doc, 
  orderBy,
  limit,
  getDocs,
  startAfter,
  where
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminDashboard() {
  const { t } = useTranslation();
  const { user, isAdmin, isSuperAdmin, loading } = useAuth();
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
  const [rrppApps, setRrppApps] = useState<any[]>([]);
  const [processingRrpp, setProcessingRrpp] = useState<string | null>(null);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [loadingUsers, setLoadingUsers] = useState(false);
  
  const [activeTab, setActiveTab] = useState('stats');
  const [searchQuery, setSearchQuery] = useState('');
  const [platformSettings, setPlatformSettings] = useState<{ enableDarkNightsBridge?: boolean } | null>(null);

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push('/');
    }
  }, [isAdmin, loading, router]);

  useEffect(() => {
    if (!isAdmin) return;

    // 1. Obtener estadísticas agregadas mediante Cloud Function optimizada
    const fetchAnalytics = async () => {
      try {
        const getAdminAnalyticsFn = httpsCallable(functions, 'getAdminAnalytics');
        const res: any = await getAdminAnalyticsFn();
        if (res.data?.success) {
          setStats(res.data.stats);
        }
      } catch (err) {
        console.error("Error cargando analytics:", err);
      }
    };
    fetchAnalytics();

    // Settings en tiempo real (pesan muy poco)
    const errNoop = (e: any) => console.error("Snapshot error", e);

    const unsubSettings = onSnapshot(doc(db, 'settings', 'platform'), (docSnap) => {
      if (docSnap.exists()) {
        setPlatformSettings(docSnap.data() as any);
      } else {
        setPlatformSettings({ enableDarkNightsBridge: false });
      }
    }, errNoop);

    // Reportes pendientes en tiempo real
    const unsubReports = onSnapshot(
      query(collection(db, 'reports'), orderBy('timestamp', 'desc'), limit(50)),
      (snapshot) => {
        const allReports = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
        setReports(allReports);
      },
      errNoop
    );

    // Verificaciones pendientes en tiempo real
    const unsubVerifications = onSnapshot(
      query(collection(db, 'verifications'), orderBy('timestamp', 'desc'), limit(50)),
      (snapshot) => {
        const allVers = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
        setVerifications(allVers);
      },
      errNoop
    );

    // RRPP Apps en tiempo real
    const unsubRrppApps = onSnapshot(
      query(collection(db, 'rrpp_applications'), where('status', '==', 'pending')),
      (snapshot) => {
        const apps = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
        setRrppApps(apps);
      },
      errNoop
    );

    // Carga inicial paginada de usuarios (primeros 25)
    loadMoreUsers(true);

    return () => {
      unsubSettings();
      unsubReports();
      unsubVerifications();
      unsubRrppApps();
    };
  }, [isAdmin]);

  const loadMoreUsers = async (reset = false) => {
    if (loadingUsers) return;
    setLoadingUsers(true);
    try {
      let q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(25));
      if (!reset && lastVisible) {
        q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), startAfter(lastVisible), limit(25));
      }
      const snapshot = await getDocs(q);
      const newUsers = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      
      setLastVisible(snapshot.docs[snapshot.docs.length - 1] || null);
      setUsers(prev => reset ? newUsers : [...prev, ...newUsers]);
    } catch (e) {
      console.error("Error cargando usuarios paginados:", e);
    } finally {
      setLoadingUsers(false);
    }
  };

  const togglePremium = async (userId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        premium: !currentStatus
      });
      setUsers(users.map(u => u.id === userId ? { ...u, premium: !currentStatus } : u));
    } catch (error) {
      console.error("Error updating premium status:", error);
    }
  };

  const resolveReport = async (reportId: string) => {
    try {
      await updateDoc(doc(db, 'reports', reportId), { status: 'resolved' });
    } catch (error) {
      console.error("Error resolving report:", error);
    }
  };

  const handleAdminDeleteUser = async (uid: string) => {
    if (!confirm('🛑 ATENCIÓN: ¿Estás completamente seguro de ELIMINAR esta cuenta? NO SE PUEDE DESHACER.')) return;
    try {
      const adminDelete = httpsCallable(functions, 'adminDeleteUser');
      await adminDelete({ uid });
      alert('Cuenta eliminada completamente.');
      setUsers(users.filter(u => u.id !== uid));
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Error al eliminar usuario');
    }
  };

  const handleAdminBanUser = async (uid: string) => {
    const reason = prompt('Motivo del baneo (opcional):');
    if (reason === null) return;
    try {
      const ban = httpsCallable(functions, 'banUser');
      await ban({ uid, reason });
      alert('Usuario baneado exitosamente.');
      setUsers(users.map(u => u.id === uid ? { ...u, banned: true, bannedReason: reason } : u));
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Error al banear usuario');
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

  const handleRrppApplication = async (applicationId: string, action: 'approve' | 'reject') => {
    const label = action === 'approve' ? 'aprobar' : 'rechazar';
    if (!confirm(`¿Seguro que quieres ${label} esta solicitud RRPP?`)) return;
    setProcessingRrpp(applicationId);
    try {
      const approveRRPP = httpsCallable(functions, 'approveRRPP');
      await approveRRPP({ applicationId, action });
      alert(action === 'approve' ? 'RRPP aprobado correctamente.' : 'Solicitud rechazada.');
    } catch (e: any) {
      console.error(e);
      alert('Error: ' + (e.message || 'Error procesando solicitud'));
    } finally {
      setProcessingRrpp(null);
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

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 pb-24">
      {/* Header */}
      <header className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-black bg-gradient-to-r from-fuchsia-500 to-indigo-500 bg-clip-text text-transparent">
              ADMIN DASHBOARD
            </h1>
            <p className="text-slate-400 text-sm">{t('admin.subtitle')}</p>
          </div>
          <div className="flex gap-2">
            {isSuperAdmin && (
              <button onClick={() => router.push('/super-admin')} className="bg-fuchsia-600/20 text-fuchsia-400 border border-fuchsia-600/50 px-4 py-2 rounded-xl text-xs font-black uppercase hover:bg-fuchsia-600/30 transition-all">
                Panel Maestro
              </button>
            )}
            <button onClick={() => router.push('/')} className="bg-white/5 text-slate-400 border border-white/10 px-4 py-2 rounded-xl text-xs font-bold hover:bg-white/10 transition-all">
              Volver
            </button>
          </div>
        </div>
      </header>

      {/* Control Central de Ecosistema */}
      <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-4 mb-8 shadow-xl">
        <h2 className="text-lg font-black text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          <span className="material-icons text-fuchsia-500">settings_input_component</span>
          Ecosistema
        </h2>
        
        <div className="flex items-center justify-between p-4 bg-black/50 rounded-xl border border-white/5">
          <div>
            <h3 className="font-bold">{t('admin.dark_nights_bridge')}</h3>
            <p className="text-xs text-slate-400">{t('admin.dark_nights_desc')}</p>
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
        <StatCard label={t('admin.users')} value={stats.totalUsers} icon="people" color="from-fuchsia-500/20 to-fuchsia-500/5" border="border-fuchsia-500/20" />
        <StatCard label={t('admin.online')} value={stats.onlineUsers} icon="sensors" color="from-emerald-500/20 to-emerald-500/5" border="border-emerald-500/20" />
        <StatCard label={t('admin.premium')} value={stats.premiumUsers} icon="star" color="from-amber-500/20 to-amber-500/5" border="border-amber-500/20" />
        <StatCard label={t('admin.reports')} value={stats.pendingReports} icon="report_problem" color="from-rose-500/20 to-rose-500/5" border="border-rose-500/20" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        <TabButton active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} label={t('admin.general')} icon="dashboard" />
        <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} label={t('admin.users')} icon="group" />
        <TabButton active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} label={t('admin.reports')} icon="gavel" />
        <TabButton active={activeTab === 'verifications'} onClick={() => setActiveTab('verifications')} label={t('admin.verifications')} icon="verified" />
        <TabButton active={activeTab === 'rrpps'} onClick={() => setActiveTab('rrpps')} label={`${t('admin.rrpp')} (${rrppApps.length})`} icon="assignment_ind" />
      </div>

      {/* Content Tabs */}
      <AnimatePresence mode="wait">
        {activeTab === 'rrpps' && (
          <motion.div key="rrpps" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
            {rrppApps.length === 0 && <p className="text-sm text-slate-500">{t('admin.no_rrpp')}</p>}
            {rrppApps.map(app => (
              <div key={app.id} className="bg-white/5 backdrop-blur-md border border-fuchsia-500/30 rounded-2xl p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-bold text-white text-lg">{app.nick || 'Sin nick'}</p>
                    <p className="text-xs text-slate-400">{app.email}</p>
                  </div>
                  <span className="px-2 py-1 bg-yellow-500/20 text-yellow-500 rounded-md text-xs font-bold uppercase">{t('admin.pending')}</span>
                </div>
                <p className="text-sm text-slate-300 mb-1">📞 {app.phone} | 📍 {app.city}</p>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => handleRrppApplication(app.id, 'approve')}
                    disabled={processingRrpp === app.id}
                    className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-xs font-bold uppercase transition-colors disabled:opacity-50"
                  >
                    {processingRrpp === app.id ? '...' : 'Aprobar'}
                  </button>
                  <button
                    onClick={() => handleRrppApplication(app.id, 'reject')}
                    disabled={processingRrpp === app.id}
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-xs font-bold uppercase transition-colors disabled:opacity-50"
                  >
                    Rechazar
                  </button>
                  <a href={`https://wa.me/${app.phone?.replace(/\D/g, '')}?text=Hola%20${app.nick || ''},%20te%20escribo%20desde%20Blow%20Nights%20sobre%20tu%20solicitud%20RRPP...`} target="_blank" rel="noreferrer" className="px-4 py-2 bg-[#25D366] hover:bg-[#1ebe5d] rounded-lg text-xs font-bold uppercase transition-colors flex items-center gap-1">
                    WhatsApp
                  </a>
                </div>
              </div>
            ))}
          </motion.div>
        )}
        {activeTab === 'stats' && (
          <motion.div key="stats" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span className="material-icons text-fuchsia-400">trending_up</span>
                Ratios del Sistema
              </h2>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-900/50 rounded-2xl p-4 border border-white/5 text-center">
                  <p className="text-3xl font-black text-amber-400">
                    {stats.totalUsers > 0 ? Math.round((stats.premiumUsers / stats.totalUsers) * 100) : 0}%
                  </p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">{t('admin.conversion_premium')}</p>
                </div>
                <div className="bg-slate-900/50 rounded-2xl p-4 border border-white/5 text-center">
                  <p className="text-3xl font-black text-emerald-400">
                    {stats.totalUsers > 0 ? Math.round((stats.onlineUsers / stats.totalUsers) * 100) : 0}%
                  </p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">{t('admin.users_online')}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'users' && (
          <motion.div key="users" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
            <div className="relative">
              <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">search</span>
              <input 
                type="text"
                placeholder={t('admin.filter_nick')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:border-fuchsia-500/50 transition-colors"
              />
            </div>

            <div className="space-y-3">
              {filteredUsers.map(u => (
                <div key={u.id} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={u.fotoUrl || '/placeholder-user.png'} alt={u.nick} className="w-10 h-10 rounded-full object-cover border border-white/20" />
                    <div>
                      <p className="font-bold text-sm">{u.nick || 'Sin nick'}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{u.id.substring(0, 8)}...</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-end">
                    <button 
                      onClick={() => togglePremium(u.id, u.premium)}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${
                        u.premium ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' : 'bg-white/5 text-slate-400 border border-white/10'
                      }`}
                    >
                      {u.premium ? 'PREMIUM' : 'PREMIUM'}
                    </button>
                    <button 
                      disabled={u.banned}
                      onClick={() => handleAdminBanUser(u.id)}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${
                        u.banned ? 'bg-red-900/30 text-red-500 border border-red-900/50' : 'bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500/20'
                      }`}
                    >
                      {u.banned ? 'BANEADO' : 'BANEAR'}
                    </button>
                    <button 
                      onClick={() => handleAdminDeleteUser(u.id)}
                      className="px-3 py-1 rounded-full text-[10px] font-bold transition-all bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
                    >
                      ELIMINAR
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {lastVisible && (
              <button 
                onClick={() => loadMoreUsers(false)}
                disabled={loadingUsers}
                className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-2xl text-xs font-bold text-slate-300 border border-white/10 transition-all"
              >
                {loadingUsers ? 'Cargando...' : 'Cargar más usuarios'}
              </button>
            )}
          </motion.div>
        )}

        {activeTab === 'reports' && (
          <motion.div key="reports" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
            {reports.map(report => (
              <div key={report.id} className="bg-white/5 backdrop-blur-md border border-rose-500/10 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-rose-400 uppercase">{report.reason}</span>
                  {report.status === 'pending' ? (
                    <button onClick={() => resolveReport(report.id)} className="bg-emerald-500/20 text-emerald-500 px-3 py-1 rounded-full text-[10px] font-bold">{t('admin.resolve')}</button>
                  ) : (
                    <span className="text-emerald-500 text-[10px] font-bold">{t('admin.resolved')}</span>
                  )}
                </div>
              </div>
            ))}
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
    <button onClick={onClick} className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-bold transition-all whitespace-nowrap ${active ? 'bg-fuchsia-600 text-white shadow-lg' : 'bg-white/5 text-slate-400 border border-white/5'}`}>
      <span className="material-icons text-lg">{icon}</span>
      {label}
    </button>
  );
}
