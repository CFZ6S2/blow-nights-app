'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { collection, doc, setDoc, updateDoc, getDocs, query, where, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/lib/firebase';
import { motion } from 'framer-motion';

export default function SuperAdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<'ciudades' | 'facturacion' | 'locales'>('ciudades');

  // --- LOCALES STATE ---
  const [venues, setVenues] = useState<any[]>([]);
  const [newVenueName, setNewVenueName] = useState('');
  const [newVenueType, setNewVenueType] = useState('club');
  const [newVenueLat, setNewVenueLat] = useState('');
  const [newVenueLng, setNewVenueLng] = useState('');
  const [savingVenue, setSavingVenue] = useState(false);
  const [searchNick, setSearchNick] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchingUser, setSearchingUser] = useState(false);
  const [assigningVenueId, setAssigningVenueId] = useState<string | null>(null);

  // --- CIUDADES STATE ---
  const [cities, setCities] = useState<any[]>([]);
  const [newCitySlug, setNewCitySlug] = useState('');
  const [newCityName, setNewCityName] = useState('');
  const [newCityPartnerName, setNewCityPartnerName] = useState('');
  const [newCityPartnerEmail, setNewCityPartnerEmail] = useState('');
  const [newCityStripeId, setNewCityStripeId] = useState('');
  const [newCityAnnualFee, setNewCityAnnualFee] = useState('5000');
  const [savingCity, setSavingCity] = useState(false);

  // Asignar Partner a ciudad existente
  const [assigningCityId, setAssigningCityId] = useState<string | null>(null);
  const [searchEmail, setSearchEmail] = useState('');
  const [emailSearchResults, setEmailSearchResults] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (!loading && user && !isAdmin) router.push('/');
  }, [user, loading, isAdmin, router]);

  useEffect(() => {
    if (!isAdmin) return;
    const unsubVenues = onSnapshot(collection(db, 'venues'), (snap) => {
      const v: any[] = [];
      snap.forEach(d => v.push({ id: d.id, ...d.data() }));
      setVenues(v);
    });

    const unsubCities = onSnapshot(collection(db, 'cities'), (snap) => {
      const c: any[] = [];
      snap.forEach(d => c.push({ id: d.id, ...d.data() }));
      setCities(c);
    });

    return () => { unsubVenues(); unsubCities(); };
  }, [isAdmin]);

  // --- LOCALES LOGIC ---
  const handleCreateVenue = async () => {
    if (!newVenueName || !newVenueLat || !newVenueLng) return alert('Rellena todos los campos');
    setSavingVenue(true);
    try {
      const ref = doc(collection(db, 'venues'));
      await setDoc(ref, {
        name: newVenueName,
        type: newVenueType,
        location: { latitude: parseFloat(newVenueLat), longitude: parseFloat(newVenueLng) },
        isActive: true, currentCount: 0, cityId: 'madrid', ownerId: ''
      });
      setNewVenueName(''); setNewVenueLat(''); setNewVenueLng('');
      alert('Local creado con éxito.');
    } catch (e) {
      console.error(e);
      alert('Error al crear local');
    } finally {
      setSavingVenue(false);
    }
  };

  const handleSearchUser = async () => {
    if (!searchNick.trim()) return;
    setSearchingUser(true);
    try {
      const end = searchNick.replace(/.$/, c => String.fromCharCode(c.charCodeAt(0) + 1));
      const q = query(collection(db, 'users'), where('nick', '>=', searchNick), where('nick', '<', end));
      const snap = await getDocs(q);
      const users: any[] = [];
      snap.forEach(d => users.push({ id: d.id, ...d.data() }));
      setSearchResults(users);
    } catch (e) {
      console.error(e);
      alert('Error buscando usuario');
    } finally {
      setSearchingUser(false);
    }
  };

  const handleAssignOwner = async (venueId: string, targetUser: any) => {
    if (!confirm(`¿Asignar "${targetUser.nick}" como dueño de este local?`)) return;
    try {
      const assignRoleFunc = httpsCallable(functions, 'assignRole');
      await assignRoleFunc({ uid: targetUser.id, role: 'venue' });
      await updateDoc(doc(db, 'venues', venueId), { ownerId: targetUser.id });
      alert('Propietario asignado correctamente.');
      setAssigningVenueId(null);
    } catch (e) {
      console.error(e);
      alert('Error asignando propietario');
    }
  };

  // --- CITIES LOGIC ---
  const handleCreateCity = async () => {
    if (!newCitySlug || !newCityName || !newCityAnnualFee) return alert('Slug, Nombre y Canon son obligatorios.');
    setSavingCity(true);
    try {
      const cityRef = doc(db, 'cities', newCitySlug.toLowerCase());
      const now = new Date();
      const nextYear = new Date();
      nextYear.setFullYear(now.getFullYear() + 1);

      await setDoc(cityRef, {
        city_slug: newCitySlug.toLowerCase(),
        name: newCityName,
        partner_name: newCityPartnerName,
        partner_email: newCityPartnerEmail,
        partner_stripe_account_id: newCityStripeId,
        license: {
          annual_fee: parseInt(newCityAnnualFee),
          status: 'active',
          valid_from: now.toISOString(),
          expires_at: nextYear.toISOString(),
          auto_renew: true
        }
      });
      
      setNewCitySlug(''); setNewCityName(''); setNewCityPartnerName('');
      setNewCityPartnerEmail(''); setNewCityStripeId(''); setNewCityAnnualFee('5000');
      alert('Ciudad franquiciada creada con éxito.');
    } catch (e) {
      console.error(e);
      alert('Error creando ciudad.');
    } finally {
      setSavingCity(false);
    }
  };

  const handleSearchByEmail = async () => {
    if (!searchEmail.trim()) return;
    try {
      const q = query(collection(db, 'users'), where('email', '==', searchEmail.toLowerCase()));
      const snap = await getDocs(q);
      const res: any[] = [];
      snap.forEach(d => res.push({ id: d.id, ...d.data() }));
      setEmailSearchResults(res);
      if (res.length === 0) alert('No se encontró ningún usuario con ese email.');
    } catch(e) {
      console.error(e);
      alert('Error al buscar por email');
    }
  };

  const handleAssignCityAdmin = async (cityId: string, targetUser: any) => {
    if (!confirm(`¿Convertir a ${targetUser.email} en City Manager de ${cityId}?`)) return;
    try {
      const assignRoleFunc = httpsCallable(functions, 'assignRole');
      await assignRoleFunc({ uid: targetUser.id, role: 'cityAdmin', cityId: cityId });
      
      await updateDoc(doc(db, 'cities', cityId), {
        partner_email: targetUser.email,
        partner_name: targetUser.nick || targetUser.name || 'Sin nombre'
      });
      alert('City Manager asignado con éxito. Ahora tiene permisos sobre su ciudad.');
      setAssigningCityId(null);
    } catch(e) {
      console.error(e);
      alert('Error al asignar City Manager');
    }
  };

  if (loading || !isAdmin) return <div className="min-h-screen bg-slate-950" />;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-12 pb-32">
      <header className="mb-8">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => router.back()} className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
            <span className="material-icons">arrow_back</span>
          </button>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-fuchsia-400">Panel Maestro</h1>
            <p className="text-xs text-slate-400">SuperAdmin Global</p>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar border-b border-white/10 pb-2">
          <button onClick={() => setActiveTab('ciudades')} className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${activeTab === 'ciudades' ? 'bg-fuchsia-600 text-white' : 'bg-white/5 text-slate-400'}`}>Plazas y Licencias</button>
          <button onClick={() => setActiveTab('facturacion')} className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${activeTab === 'facturacion' ? 'bg-fuchsia-600 text-white' : 'bg-white/5 text-slate-400'}`}>Facturación Central</button>
          <button onClick={() => setActiveTab('locales')} className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${activeTab === 'locales' ? 'bg-fuchsia-600 text-white' : 'bg-white/5 text-slate-400'}`}>Directorio Locales</button>
        </div>
      </header>

      {/* TABS CONTENT */}

      {activeTab === 'ciudades' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <section className="bg-white/5 border border-white/10 p-6 rounded-3xl space-y-4">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-300">Activar Nueva Licencia</h2>
            <div className="space-y-3">
              <div className="flex gap-3">
                <input placeholder="City Slug (ej: ibiza)" value={newCitySlug} onChange={e => setNewCitySlug(e.target.value)} className="w-1/2 bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-fuchsia-500 outline-none" />
                <input placeholder="Nombre (ej: Ibiza)" value={newCityName} onChange={e => setNewCityName(e.target.value)} className="w-1/2 bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-fuchsia-500 outline-none" />
              </div>
              <input placeholder="Empresa / Nombre Partner" value={newCityPartnerName} onChange={e => setNewCityPartnerName(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-fuchsia-500 outline-none" />
              <input placeholder="Email del Partner" type="email" value={newCityPartnerEmail} onChange={e => setNewCityPartnerEmail(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-fuchsia-500 outline-none" />
              <input placeholder="Stripe Connect ID (acct_...)" value={newCityStripeId} onChange={e => setNewCityStripeId(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none" />
              <div className="flex items-center gap-3 bg-black/30 px-4 py-3 rounded-xl border border-white/10">
                <span className="text-sm text-slate-400">Canon Anual (€):</span>
                <input type="number" value={newCityAnnualFee} onChange={e => setNewCityAnnualFee(e.target.value)} className="bg-transparent font-mono font-bold text-green-400 outline-none w-24" />
              </div>
              <button onClick={handleCreateCity} disabled={savingCity} className="w-full bg-fuchsia-600 py-3 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-fuchsia-500 transition-colors mt-2">
                Dar de Alta Franquicia
              </button>
            </div>
          </section>

          <section className="bg-white/5 border border-white/10 p-6 rounded-3xl space-y-4 h-[60vh] flex flex-col">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-300">Ciudades Operativas</h2>
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 no-scrollbar">
              {cities.map(c => {
                const isMadrid = c.id === 'madrid';
                const isActive = c.license?.status === 'active';
                return (
                  <div key={c.id} className={`bg-black/30 border ${isMadrid ? 'border-fuchsia-500/50' : 'border-white/5'} p-4 rounded-2xl`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-lg">{c.name}</h3>
                          {isMadrid && <span className="bg-fuchsia-500/20 text-fuchsia-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Matriz Directa</span>}
                          {!isMadrid && <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{c.license?.status || 'No License'}</span>}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">Partner: <span className="text-white">{c.partner_name || 'Nadie'}</span> ({c.partner_email || 'Sin email'})</p>
                        <p className="text-[10px] text-blue-300 font-mono mt-1">Stripe: {c.partner_stripe_account_id || 'No vinculado'}</p>
                        
                        {!isMadrid && c.license && (
                          <div className="mt-2 bg-white/5 p-2 rounded-lg text-[10px] text-slate-400">
                            <p>Canon: <span className="text-green-400 font-mono font-bold">{c.license.annual_fee}€</span></p>
                            <p>Expira: {new Date(c.license.expires_at).toLocaleDateString()}</p>
                          </div>
                        )}
                      </div>
                      
                      {!isMadrid && (
                        <button 
                          onClick={() => setAssigningCityId(assigningCityId === c.id ? null : c.id)}
                          className="bg-white/10 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-white/20"
                        >
                          Asignar ROL
                        </button>
                      )}
                    </div>

                    {assigningCityId === c.id && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mt-4 pt-4 border-t border-white/10">
                        <div className="flex gap-2">
                          <input 
                            placeholder="Email exacto del usuario..." type="email"
                            value={searchEmail} onChange={e => setSearchEmail(e.target.value)}
                            className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-xs focus:border-fuchsia-500 outline-none"
                          />
                          <button onClick={handleSearchByEmail} className="bg-blue-600 px-3 py-2 rounded-lg text-xs font-bold">Buscar</button>
                        </div>
                        <div className="mt-3 space-y-2">
                          {emailSearchResults.map(u => (
                            <div key={u.id} className="flex justify-between items-center bg-white/5 p-2 rounded-lg">
                              <span className="text-xs font-bold">{u.email}</span>
                              <button onClick={() => handleAssignCityAdmin(c.id, u)} className="text-[10px] bg-green-600 px-2 py-1 rounded font-bold">Asignar CityAdmin</button>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {activeTab === 'facturacion' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-fuchsia-900/40 to-black border border-fuchsia-500/30 p-6 rounded-3xl">
              <h3 className="text-xs font-bold uppercase tracking-widest text-fuchsia-400 mb-2">Revenue Global Matriz</h3>
              <p className="text-4xl font-black font-mono">14.250 <span className="text-lg text-fuchsia-400">€</span></p>
              <p className="text-xs text-slate-400 mt-2">Mes actual (Simulación)</p>
            </div>
            <div className="bg-white/5 border border-white/10 p-6 rounded-3xl">
              <h3 className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-2">Ingresos por Ticketing (Madrid)</h3>
              <p className="text-3xl font-black font-mono">8.400 <span className="text-lg text-blue-400">€</span></p>
              <p className="text-[10px] text-slate-400 mt-2">100% Retenido</p>
            </div>
            <div className="bg-white/5 border border-white/10 p-6 rounded-3xl">
              <h3 className="text-xs font-bold uppercase tracking-widest text-green-400 mb-2">Royalties Red Partners</h3>
              <p className="text-3xl font-black font-mono">5.850 <span className="text-lg text-green-400">€</span></p>
              <p className="text-[10px] text-slate-400 mt-2">Suscripciones (60%) + Entradas (1% + 0.25€)</p>
            </div>
          </div>

          <section className="bg-white/5 border border-white/10 p-6 rounded-3xl">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-300 mb-6">Desglose Red de Franquicias</h2>
            <div className="space-y-6">
              {/* Dummy data for visual representation of the billing dashboard */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span>Madrid (Operación Propia)</span>
                  <span className="font-mono text-fuchsia-400">8.400 €</span>
                </div>
                <div className="w-full bg-black/50 rounded-full h-2">
                  <div className="bg-fuchsia-500 h-2 rounded-full" style={{ width: '100%' }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span>Barcelona (Partner)</span>
                  <span className="font-mono text-green-400">3.200 € Royalty / 8.000 € Bruto</span>
                </div>
                <div className="w-full bg-black/50 rounded-full h-2 flex">
                  <div className="bg-green-500 h-2 rounded-l-full" style={{ width: '40%' }}></div>
                  <div className="bg-white/20 h-2 rounded-r-full" style={{ width: '60%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span>Ibiza (Partner)</span>
                  <span className="font-mono text-green-400">2.650 € Royalty / 6.625 € Bruto</span>
                </div>
                <div className="w-full bg-black/50 rounded-full h-2 flex">
                  <div className="bg-green-500 h-2 rounded-l-full" style={{ width: '40%' }}></div>
                  <div className="bg-white/20 h-2 rounded-r-full" style={{ width: '60%' }}></div>
                </div>
              </div>
            </div>
            
            <div className="mt-8 p-4 bg-blue-900/20 border border-blue-500/30 rounded-xl flex items-start gap-3">
              <span className="material-icons text-blue-400">info</span>
              <p className="text-xs text-blue-200">
                Los cobros se procesan automáticamente mediante Stripe Connect. Tu cuenta matriz recibe el 100% de los pagos de Madrid, el 60% de las cuotas VIP de Partners y tu comisión pactada por entrada de las plazas franquiciadas. No se requieren transferencias manuales.
              </p>
            </div>
          </section>
        </div>
      )}

      {activeTab === 'locales' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <section className="bg-white/5 border border-white/10 p-6 rounded-3xl space-y-4">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-300">Crear Local / Punto</h2>
            <div className="space-y-3">
              <input placeholder="Nombre (ej: Parque del Retiro)" value={newVenueName} onChange={e => setNewVenueName(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-fuchsia-500 outline-none" />
              <select value={newVenueType} onChange={e => setNewVenueType(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-fuchsia-500 outline-none">
                <option value="cruising">Cruising Spot</option>
                <option value="club">Discoteca / Club</option>
                <option value="sauna">Sauna</option>
                <option value="bar">Bar</option>
              </select>
              <div className="flex gap-3">
                <input placeholder="Latitud (ej: 40.4168)" type="number" value={newVenueLat} onChange={e => setNewVenueLat(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-fuchsia-500 outline-none" />
                <input placeholder="Longitud (ej: -3.7038)" type="number" value={newVenueLng} onChange={e => setNewVenueLng(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-fuchsia-500 outline-none" />
              </div>
              <button onClick={handleCreateVenue} disabled={savingVenue} className="w-full bg-fuchsia-600 py-3 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-fuchsia-500 transition-colors">
                Crear Punto
              </button>
            </div>
          </section>

          <section className="bg-white/5 border border-white/10 p-6 rounded-3xl space-y-4 h-[60vh] flex flex-col">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-300">Directorio de Locales</h2>
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 no-scrollbar">
              {venues.map(v => (
                <div key={v.id} className="bg-black/30 border border-white/5 p-4 rounded-2xl">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold">{v.name}</h3>
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest">{v.type} | Ciudad: {v.cityId}</p>
                      <p className="text-[10px] text-slate-500 font-mono mt-1">Owner: {v.ownerId || 'Nadie'}</p>
                    </div>
                    <button onClick={() => setAssigningVenueId(assigningVenueId === v.id ? null : v.id)} className="bg-white/10 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-white/20">
                      Asignar
                    </button>
                  </div>
                  
                  {assigningVenueId === v.id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mt-4 pt-4 border-t border-white/10">
                      <div className="flex gap-2">
                        <input placeholder="Buscar por nickname..." value={searchNick} onChange={e => setSearchNick(e.target.value)} className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-xs focus:border-fuchsia-500 outline-none" />
                        <button onClick={handleSearchUser} disabled={searchingUser} className="bg-blue-600 px-3 py-2 rounded-lg text-xs font-bold">Buscar</button>
                      </div>
                      <div className="mt-3 space-y-2">
                        {searchResults.map(u => (
                          <div key={u.id} className="flex justify-between items-center bg-white/5 p-2 rounded-lg">
                            <span className="text-xs font-bold">{u.nick}</span>
                            <button onClick={() => handleAssignOwner(v.id, u)} className="text-[10px] bg-green-600 px-2 py-1 rounded font-bold">Elegir</button>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
