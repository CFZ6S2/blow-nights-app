'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { collection, doc, setDoc, updateDoc, getDocs, query, where, onSnapshot, collectionGroup, deleteDoc, orderBy, limit } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/lib/firebase';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export default function SuperAdminPage() {
  const { t } = useTranslation();
  const { user, isSuperAdmin, loading } = useAuth();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<'roles' | 'ciudades' | 'facturacion' | 'locales' | 'eventos' | 'partners' | 'rrpps' | 'usuarios' | 'organizadores'>('usuarios');

  // --- LOCALES & EVENTOS STATE ---
  const [venues, setVenues] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
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

  // --- PARTNERS STATE ---
  const [partners, setPartners] = useState<any[]>([]);
  const [partnerSearch, setPartnerSearch] = useState('');
  const [partnerSearchResults, setPartnerSearchResults] = useState<any[]>([]);
  const [searchingPartner, setSearchingPartner] = useState(false);
  
  // --- APPLICATIONS STATE ---
  const [applications, setApplications] = useState<any[]>([]);

  // --- RRPP APPLICATIONS STATE ---
  const [rrppApplications, setRrppApplications] = useState<any[]>([]);
  const [processingRrpp, setProcessingRrpp] = useState<string | null>(null);

  // --- ORGANIZER APPLICATIONS STATE ---
  const [organizerApps, setOrganizerApps] = useState<any[]>([]);
  const [processingOrganizer, setProcessingOrganizer] = useState<string | null>(null);

  // --- ROLES STATE ---
  const [roleSearchEmail, setRoleSearchEmail] = useState('');
  const [roleSearchResult, setRoleSearchResult] = useState<any | null>(null);
  const [roleSearching, setRoleSearching] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');
  const [roleCityId, setRoleCityId] = useState('');
  const [roleVenueId, setRoleVenueId] = useState('');
  const [assigningRole, setAssigningRole] = useState(false);
  const [recentAssignments, setRecentAssignments] = useState<any[]>([]);
  const [ambassadorCities, setAmbassadorCities] = useState<string[]>([]);

  // --- RRPP STATE ---
  const [promoters, setPromoters] = useState<any[]>([]);
  const [newPromoterName, setNewPromoterName] = useState('');
  const [newPromoterVenueId, setNewPromoterVenueId] = useState('');
  const [newPromoterEventId, setNewPromoterEventId] = useState('');
  const [savingPromoter, setSavingPromoter] = useState(false);

  // --- USUARIOS STATE ---
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
  const [userSearching, setUserSearching] = useState(false);
  const [selectedUserDetail, setSelectedUserDetail] = useState<any | null>(null);
  const [adminActionLoading, setAdminActionLoading] = useState(false);
  
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [usersFilterCity, setUsersFilterCity] = useState<string>('all');
  const [loadingAllUsers, setLoadingAllUsers] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (!loading && user && !isSuperAdmin) router.push('/');
  }, [user, loading, isSuperAdmin, router]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    const errNoop = () => {};
    const unsubVenues = onSnapshot(collection(db, 'venues'), (snap) => {
      const v: any[] = [];
      snap.forEach(d => v.push({ id: d.id, ...d.data() }));
      setVenues(v);
    }, errNoop);

    const unsubCities = onSnapshot(collection(db, 'cities'), (snap) => {
      const c: any[] = [];
      snap.forEach(d => c.push({ id: d.id, ...d.data() }));
      setCities(c);
    }, errNoop);

    const unsubPartners = onSnapshot(query(collection(db, 'users'), where('isAssociatePartner', '==', true)), (snap) => {
      const p: any[] = [];
      snap.forEach(d => p.push({ id: d.id, ...d.data() }));
      setPartners(p);
    }, errNoop);

    const unsubApps = onSnapshot(query(collection(db, 'partner_applications'), where('status', '==', 'pending')), (snap) => {
      const a: any[] = [];
      snap.forEach(d => a.push({ id: d.id, ...d.data() }));
      setApplications(a);
    }, errNoop);

    const unsubRrppApps = onSnapshot(query(collection(db, 'rrpp_applications'), where('status', '==', 'pending')), (snap) => {
      const r: any[] = [];
      snap.forEach(d => r.push({ id: d.id, ...d.data() }));
      setRrppApplications(r);
    }, errNoop);

    const unsubOrganizerApps = onSnapshot(query(collection(db, 'organizer_applications'), where('status', '==', 'pending')), (snap) => {
      const o: any[] = [];
      snap.forEach(d => o.push({ id: d.id, ...d.data() }));
      setOrganizerApps(o);
    }, errNoop);

    const unsubPromoters = onSnapshot(collectionGroup(db, 'promoters'), (snap) => {
      const p: any[] = [];
      snap.forEach(d => {
        // d.ref.path: venues/VENUE_ID/events/EVENT_ID/promoters/PROMOTER_ID
        const pathSegments = d.ref.path.split('/');
        const venueId = pathSegments[1];
        const eventId = pathSegments[3];
        p.push({ id: d.id, venueId, eventId, ...d.data() });
      });
      setPromoters(p);
    }, errNoop);

    const unsubRoles = onSnapshot(
      query(collection(db, 'users'), where('role', 'in', ['venue', 'cityAdmin', 'admin', 'superadmin', 'rrpp', 'door', 'ambassador'])),
      (snap) => {
        const r: any[] = [];
        snap.forEach(d => r.push({ id: d.id, ...d.data() }));
        setRecentAssignments(r);
      },
      errNoop
    );

    return () => { unsubVenues(); unsubCities(); unsubPartners(); unsubApps(); unsubRrppApps(); unsubOrganizerApps(); unsubPromoters(); unsubRoles(); };
  }, [isSuperAdmin]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    const fetchRecentUsers = async () => {
      setLoadingAllUsers(true);
      try {
        const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(150));
        const snap = await getDocs(q);
        const u: any[] = [];
        snap.forEach(d => u.push({ id: d.id, ...d.data() }));
        setAllUsers(u);
        
        const qEvents = query(collection(db, 'events'), orderBy('created_at', 'desc'));
        const snapEvents = await getDocs(qEvents);
        setEvents(snapEvents.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingAllUsers(false);
      }
    };
    fetchRecentUsers();
  }, [isSuperAdmin]);

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

  const handleDeleteVenue = async (venueId: string, venueName: string) => {
    if (!confirm(`¿Seguro que quieres borrar "${venueName}"? Esta acción es irreversible.`)) return;
    try {
      await deleteDoc(doc(db, 'venues', venueId));
    } catch (e) {
      console.error(e);
      alert('Error al borrar el local');
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

  // --- USUARIOS LOGIC ---
  const handleAdminUserSearch = async () => {
    if (!userSearchQuery.trim()) return;
    setUserSearching(true);
    setSelectedUserDetail(null);
    try {
      // Intentar buscar por email exacto primero
      const qEmail = query(collection(db, 'users'), where('email', '==', userSearchQuery.toLowerCase().trim()));
      const snapEmail = await getDocs(qEmail);
      let results: any[] = [];
      snapEmail.forEach(d => results.push({ id: d.id, ...d.data() }));

      // Si no hay email, buscar por nick (prefijo)
      if (results.length === 0) {
        const end = userSearchQuery.replace(/.$/, c => String.fromCharCode(c.charCodeAt(0) + 1));
        const qNick = query(collection(db, 'users'), where('nick', '>=', userSearchQuery), where('nick', '<', end));
        const snapNick = await getDocs(qNick);
        snapNick.forEach(d => results.push({ id: d.id, ...d.data() }));
      }

      setUserSearchResults(results);
      if (results.length === 0) alert('No se encontraron usuarios con ese email o nick.');
    } catch (e) {
      console.error(e);
      alert('Error al buscar usuarios');
    } finally {
      setUserSearching(false);
    }
  };

  const handleAdminDeleteUser = async (uid: string) => {
    if (!confirm('¿ESTÁS SEGURO? Esta acción es IRREVERSIBLE. Se borrarán todos sus datos, fotos, likes, mensajes, etc.')) return;
    setAdminActionLoading(true);
    try {
      const { httpsCallable } = await import('firebase/functions');
      const deleteFunc = httpsCallable(functions, 'adminDeleteUser');
      await deleteFunc({ uid });
      alert('Usuario eliminado permanentemente.');
      setSelectedUserDetail(null);
      setUserSearchResults(prev => prev.filter(u => u.id !== uid));
      setAllUsers(prev => prev.filter(u => u.id !== uid));
    } catch (error: any) {
      console.error(error);
      alert('Error al eliminar: ' + error.message);
    } finally {
      setAdminActionLoading(false);
    }
  };

  const handleFastTrackRRPP = async (userId: string) => {
    if (!confirm('¿Convertir a este usuario en RRPP de forma directa?')) return;
    setAdminActionLoading(true);
    try {
      const { httpsCallable } = await import('firebase/functions');
      try {
        const approveFunc = httpsCallable(functions, 'approveRRPP');
        await approveFunc({ applicationId: userId, action: 'approve' });
      } catch (e: any) {
        const assignRoleFunc = httpsCallable(functions, 'assignRole');
        await assignRoleFunc({ uid: userId, role: 'rrpp' });
      }
      alert('¡Usuario convertido en RRPP con éxito!');
      setSelectedUserDetail({ ...selectedUserDetail, role: 'rrpp' });
      setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, role: 'rrpp' } : u));
    } catch (e: any) {
      console.error(e);
      alert('Error al convertir: ' + (e.message || 'Desconocido'));
    } finally {
      setAdminActionLoading(false);
    }
  };

  const handleAdminBanUser = async (uid: string) => {
    const reason = prompt('Motivo del baneo (opcional):');
    if (reason === null) return; // cancelado
    setAdminActionLoading(true);
    try {
      const ban = httpsCallable(functions, 'banUser');
      await ban({ uid, reason });
      alert('Usuario baneado exitosamente. Se le ha expulsado de la sesión y no podrá volver a entrar.');
      setSelectedUserDetail((prev: any) => prev ? { ...prev, banned: true, bannedReason: reason } : null);
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Error al banear usuario');
    } finally {
      setAdminActionLoading(false);
    }
  };
  const handleUpdateUserCity = async (userId: string, newCityId: string) => {
    if (!confirm(`¿Asignar territorio a ${newCityId || 'Ninguno'}?`)) return;
    setAdminActionLoading(true);
    try {
      await updateDoc(doc(db, 'users', userId), { city: newCityId, cityId: newCityId });
      setSelectedUserDetail((prev: any) => prev ? { ...prev, city: newCityId, cityId: newCityId } : null);
      setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, city: newCityId, cityId: newCityId } : u));
      setUserSearchResults(prev => prev.map(u => u.id === userId ? { ...u, city: newCityId, cityId: newCityId } : u));
      alert('Territorio actualizado correctamente.');
    } catch (e: any) {
      console.error(e);
      alert('Error actualizando el territorio: ' + (e.message || 'Desconocido'));
    } finally {
      setAdminActionLoading(false);
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
        partnerId: targetUser.id,
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

  // --- PARTNERS LOGIC ---
  const handleSearchNewPartner = async () => {
    if (!partnerSearch.trim()) return;
    setSearchingPartner(true);
    try {
      const q = query(collection(db, 'users'), where('email', '==', partnerSearch.toLowerCase()));
      const snap = await getDocs(q);
      const res: any[] = [];
      snap.forEach(d => res.push({ id: d.id, ...d.data() }));
      
      if (res.length === 0) {
        const end = partnerSearch.replace(/.$/, c => String.fromCharCode(c.charCodeAt(0) + 1));
        const qNick = query(collection(db, 'users'), where('nick', '>=', partnerSearch), where('nick', '<', end));
        const snapNick = await getDocs(qNick);
        snapNick.forEach(d => res.push({ id: d.id, ...d.data() }));
      }
      
      setPartnerSearchResults(res);
      if (res.length === 0) alert('No se encontró ningún usuario con ese email o nick.');
    } catch(e) {
      console.error(e);
      alert('Error al buscar');
    } finally {
      setSearchingPartner(false);
    }
  };

  const handleAssignAssociatePartner = async (userDoc: any) => {
    if (!confirm(`¿Convertir a ${userDoc.nick || userDoc.email} en Partner Asociado (RRPP)?`)) return;
    try {
      await updateDoc(doc(db, 'users', userDoc.id), { isAssociatePartner: true });
      alert('Usuario asignado como Partner Asociado.');
      setPartnerSearch('');
      setPartnerSearchResults([]);
    } catch (e) {
      console.error(e);
      alert('Error asignando partner');
    }
  };
  
  const handleRemoveAssociatePartner = async (userId: string, name: string) => {
    if (!confirm(`¿Quitar rol de Partner Asociado a ${name}?`)) return;
    try {
      await updateDoc(doc(db, 'users', userId), { isAssociatePartner: false });
    } catch (e) {
      console.error(e);
    }
  };

  // --- RRPPs LOGIC ---
  const handleCreatePromoter = async () => {
    if (!newPromoterName || !newPromoterVenueId || !newPromoterEventId) return alert('Rellena todos los campos');
    setSavingPromoter(true);
    try {
      // Usar pseudo-random predecible indexado por fecha para evitar problemas de pureza de React aunque aquí sea un handler
      const token = Math.random().toString(36).substr(2, 6).toUpperCase();
      const ref = doc(collection(db, `venues/${newPromoterVenueId}/events/${newPromoterEventId}/promoters`));
      await setDoc(ref, {
        name: newPromoterName,
        code: token,
        is_closed: false,
        liquidated_by_rrpp: false,
        liquidated_by_venue: false
      });
      setNewPromoterName('');
      alert('Promotor creado con éxito. Token: ' + token);
    } catch(e) {
      console.error(e);
      alert('Error creando promotor');
    } finally {
      setSavingPromoter(false);
    }
  };

  const handleTogglePromoterStatus = async (p: any) => {
    try {
      await updateDoc(doc(db, `venues/${p.venueId}/events/${p.eventId}/promoters`, p.id), {
        is_closed: !p.is_closed
      });
    } catch(e) {
      alert('Error cambiando estado');
    }
  };

  const copyPromoterLink = (token: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/rrpp?token=${token}`);
    alert('Enlace copiado al portapapeles');
  };

  // --- RRPP APPLICATIONS LOGIC ---
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

  // --- ORGANIZER APPLICATIONS LOGIC ---
  const handleOrganizerApplication = async (applicationId: string, action: 'approve' | 'reject') => {
    const label = action === 'approve' ? 'aprobar' : 'rechazar';
    if (!confirm(`¿Seguro que quieres ${label} esta solicitud de Organizador?`)) return;
    setProcessingOrganizer(applicationId);
    try {
      const approveOrganizer = httpsCallable(functions, 'approveOrganizer');
      await approveOrganizer({ applicationId, action });
      alert(action === 'approve' ? 'Organizador aprobado correctamente.' : 'Solicitud rechazada.');
    } catch (e: any) {
      console.error(e);
      alert('Error: ' + (e.message || 'Error procesando solicitud'));
    } finally {
      setProcessingOrganizer(null);
    }
  };



  // --- ROLES LOGIC ---
  const ROLE_OPTIONS = [
    { value: 'venue', label: 'Venue Manager', icon: 'storefront', color: 'text-blue-400', redirect: '/venue-admin' },
    { value: 'cityAdmin', label: 'City Manager', icon: 'location_city', color: 'text-green-400', redirect: '/city-manager' },
    { value: 'admin', label: 'Admin', icon: 'admin_panel_settings', color: 'text-purple-400', redirect: '/admin' },
    { value: 'superadmin', label: 'Super Admin', icon: 'shield', color: 'text-fuchsia-400', redirect: '/super-admin' },
    { value: 'door', label: 'Portero', icon: 'sensor_door', color: 'text-orange-400', redirect: '/door' },
    { value: 'ambassador', label: 'Ambassador', icon: 'handshake', color: 'text-yellow-400', redirect: '/ambassador' },
    { value: 'event_organizer', label: 'Organizador', icon: 'calendar_month', color: 'text-indigo-400', redirect: '/organizer' },
  ];

  const handleRoleSearch = async () => {
    if (!roleSearchEmail.trim()) return;
    setRoleSearching(true);
    setRoleSearchResult(null);
    try {
      const q = query(collection(db, 'users'), where('email', '==', roleSearchEmail.toLowerCase().trim()));
      const snap = await getDocs(q);
      if (snap.empty) {
        alert('No se encontró ningún usuario con ese email. El usuario debe haberse registrado primero.');
        setRoleSearching(false);
        return;
      }
      const userDoc = snap.docs[0];
      setRoleSearchResult({ id: userDoc.id, ...userDoc.data() });
      setSelectedRole(userDoc.data().role || '');
    } catch (e) {
      console.error(e);
      alert('Error al buscar');
    } finally {
      setRoleSearching(false);
    }
  };

  const handleAssignRole = async () => {
    if (!roleSearchResult || !selectedRole) return;
    setAssigningRole(true);
    try {
      const assignRoleFunc = httpsCallable(functions, 'assignRole');
      const params: any = { uid: roleSearchResult.id, role: selectedRole };
      if (selectedRole === 'cityAdmin' && roleCityId) {
        params.cityId = roleCityId;
        await updateDoc(doc(db, 'cities', roleCityId), {
          partnerId: roleSearchResult.id,
          partner_email: roleSearchResult.email,
          partner_name: roleSearchResult.nick || roleSearchResult.name || 'Sin nombre'
        });
      }
      if (selectedRole === 'venue' && roleVenueId) {
        await updateDoc(doc(db, 'venues', roleVenueId), { ownerId: roleSearchResult.id });
      }
      if (selectedRole === 'ambassador' && ambassadorCities.length > 0) {
        await Promise.all(
          ambassadorCities.map(cityId =>
            updateDoc(doc(db, 'cities', cityId), { ambassadorId: roleSearchResult.id })
          )
        );
      }
      await assignRoleFunc(params);
      alert(`Rol "${selectedRole}" asignado a ${roleSearchResult.email}. El cambio será efectivo en su próximo login.`);
      setRoleSearchResult({ ...roleSearchResult, role: selectedRole });
      setAmbassadorCities([]);
    } catch (e) {
      console.error(e);
      alert('Error al asignar rol');
    } finally {
      setAssigningRole(false);
    }
  };

  const handleRevokeRole = async (userId: string, userEmail: string) => {
    if (!confirm(`¿Revocar el rol de ${userEmail}? Volverá a ser usuario normal.`)) return;
    try {
      const assignRoleFunc = httpsCallable(functions, 'assignRole');
      await assignRoleFunc({ uid: userId, role: 'user' });
      alert('Rol revocado. El usuario verá la app normal en su próximo login.');
    } catch (e) {
      console.error(e);
      alert('Error al revocar rol');
    }
  };

  if (loading || !isSuperAdmin) return <div className="min-h-screen bg-slate-950" />;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-12 pb-32">
      <header className="mb-8">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => router.back()} className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
            <span className="material-icons">arrow_back</span>
          </button>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-fuchsia-400">{t('super_admin_title')}</h1>
            <p className="text-xs text-slate-400">{t('super_admin_subtitle')}</p>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar border-b border-white/10 pb-2">
          <button onClick={() => setActiveTab('usuarios')} className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${activeTab === 'usuarios' ? 'bg-fuchsia-600 text-white' : 'bg-white/5 text-slate-400'}`}>{t('tab_users')}</button>
          <button onClick={() => setActiveTab('roles')} className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${activeTab === 'roles' ? 'bg-fuchsia-600 text-white' : 'bg-white/5 text-slate-400'}`}>{t('tab_roles')}</button>
          <button onClick={() => setActiveTab('ciudades')} className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${activeTab === 'ciudades' ? 'bg-fuchsia-600 text-white' : 'bg-white/5 text-slate-400'}`}>{t('tab_cities')}</button>
          <button onClick={() => setActiveTab('partners')} className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${activeTab === 'partners' ? 'bg-fuchsia-600 text-white' : 'bg-white/5 text-slate-400'}`}>{t('tab_partners')}</button>
          <button onClick={() => setActiveTab('facturacion')} className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${activeTab === 'facturacion' ? 'bg-fuchsia-600 text-white' : 'bg-white/5 text-slate-400'}`}>{t('tab_billing')}</button>
          <button onClick={() => setActiveTab('locales')} className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${activeTab === 'locales' ? 'bg-fuchsia-600 text-white' : 'bg-white/5 text-slate-400'}`}>{t('tab_venues')}</button>
          <button onClick={() => setActiveTab('eventos')} className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${activeTab === 'eventos' ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-400'}`}>{t('tab_events')}</button>
          <button onClick={() => setActiveTab('rrpps')} className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${activeTab === 'rrpps' ? 'bg-fuchsia-600 text-white' : 'bg-white/5 text-slate-400'}`}>{t('tab_rrpps')}</button>
          <button onClick={() => setActiveTab('organizadores')} className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${activeTab === 'organizadores' ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-400'}`}>{t('tab_organizers')}</button>
        </div>
      </header>

      {/* TABS CONTENT */}

      {activeTab === 'usuarios' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <section className="bg-white/5 border border-white/10 p-6 rounded-3xl space-y-6">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-300">Buscar Usuarios</h2>
            <div className="flex gap-2">
              <input
                placeholder="Email o Nick..."
                type="text"
                value={userSearchQuery}
                onChange={e => setUserSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdminUserSearch()}
                className="flex-1 bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-fuchsia-500 outline-none"
              />
              <button onClick={handleAdminUserSearch} disabled={userSearching} className="bg-fuchsia-600 px-5 py-3 rounded-xl text-sm font-bold hover:bg-fuchsia-500 transition-colors disabled:opacity-50">
                {userSearching ? '...' : 'Buscar'}
              </button>
            </div>

            {userSearchResults.length > 0 ? (
              <div className="space-y-3">
                <p className="text-xs text-fuchsia-400 font-bold uppercase mb-2">Resultados de búsqueda ({userSearchResults.length})</p>
                {userSearchResults.map(u => (
                  <div 
                    key={u.id} 
                    onClick={() => setSelectedUserDetail(u)}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                      selectedUserDetail?.id === u.id
                        ? 'bg-fuchsia-500/10 border-fuchsia-500/50'
                        : 'bg-black/30 border-white/5 hover:border-white/20'
                    }`}
                  >
                    <img src={u.fotoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.nick || 'U')}&background=random`} alt={u.nick} className="w-10 h-10 rounded-full object-cover" />
                    <div className="flex-1">
                      <p className="font-bold text-sm flex items-center gap-2">
                        {u.nick || 'Sin nick'}
                        {u.banned && <span className="px-2 py-0.5 bg-red-900/30 text-red-400 text-[10px] rounded uppercase font-black">Baneado</span>}
                      </p>
                      <p className="text-[10px] text-slate-400">{u.email}</p>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 bg-white/5 px-2 py-1 rounded">{u.role || 'user'}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <p className="text-xs text-slate-400 font-bold uppercase">Últimos Registros</p>
                  <select
                    value={usersFilterCity}
                    onChange={e => setUsersFilterCity(e.target.value)}
                    className="bg-black/30 border border-white/10 rounded-lg px-2 py-1 text-xs outline-none"
                  >
                    <option value="all">Todas las ciudades</option>
                    {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                
                {loadingAllUsers ? (
                  <p className="text-sm text-slate-500 text-center py-4">Cargando usuarios...</p>
                ) : (
                  <div className="space-y-3 h-[50vh] overflow-y-auto pr-2 no-scrollbar">
                    {allUsers
                      .filter(u => usersFilterCity === 'all' || (u.city || u.cityId) === usersFilterCity)
                      .map(u => (
                      <div 
                        key={u.id} 
                        onClick={() => setSelectedUserDetail(u)}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                          selectedUserDetail?.id === u.id
                            ? 'bg-fuchsia-500/10 border-fuchsia-500/50'
                            : 'bg-black/30 border-white/5 hover:border-white/20'
                        }`}
                      >
                        <img src={u.fotoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.nick || 'U')}&background=random`} alt={u.nick} className="w-10 h-10 rounded-full object-cover" />
                        <div className="flex-1">
                          <p className="font-bold text-sm flex items-center gap-2">
                            {u.nick || 'Sin nick'}
                            {u.banned && <span className="px-2 py-0.5 bg-red-900/30 text-red-400 text-[10px] rounded uppercase font-black">Baneado</span>}
                          </p>
                          <p className="text-[10px] text-slate-400">{u.email}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[10px] uppercase font-bold text-slate-500 bg-white/5 px-2 py-0.5 rounded">{u.role || 'user'}</span>
                          {(u.city || u.cityId) && <span className="text-[9px] uppercase font-bold text-blue-400 bg-blue-900/20 px-2 py-0.5 rounded">{u.city || u.cityId}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="bg-white/5 border border-white/10 p-6 rounded-3xl h-[80vh] flex flex-col">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-300 mb-6">Detalle de Usuario</h2>
            {!selectedUserDetail ? (
              <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
                Selecciona un usuario para ver sus detalles
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto no-scrollbar space-y-6">
                <div className="flex items-center gap-4">
                  <img src={selectedUserDetail.fotoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUserDetail.nick || 'U')}&background=random`} alt={selectedUserDetail.nick} className="w-24 h-24 rounded-2xl object-cover shadow-lg border border-white/10" />
                  <div>
                    <h3 className="text-2xl font-black">{selectedUserDetail.nick || 'Usuario Sin Nombre'}</h3>
                    <p className="text-slate-400 text-sm mb-2">{selectedUserDetail.email}</p>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2 py-1 bg-white/10 text-white text-[10px] rounded uppercase font-bold">{selectedUserDetail.role || 'user'}</span>
                      {selectedUserDetail.premium && <span className="px-2 py-1 bg-yellow-500/20 text-yellow-500 text-[10px] rounded uppercase font-bold">Premium</span>}
                      {selectedUserDetail.banned && <span className="px-2 py-1 bg-red-900/30 text-red-400 text-[10px] rounded uppercase font-bold">Baneado</span>}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">ID (UID)</p>
                    <p className="text-xs font-mono text-slate-300 break-all">{selectedUserDetail.id}</p>
                  </div>
                  <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Creado</p>
                    <p className="text-xs text-slate-300">
                      {selectedUserDetail.createdAt ? new Date(selectedUserDetail.createdAt.seconds ? selectedUserDetail.createdAt.seconds * 1000 : selectedUserDetail.createdAt).toLocaleDateString() : 'Desconocido'}
                    </p>
                  </div>
                  <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Teléfono</p>
                    <p className="text-xs text-slate-300">{selectedUserDetail.phone || 'No registrado'}</p>
                  </div>
                  <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Ciudad RRPP</p>
                    <div className="flex items-center gap-2 mt-1">
                      <select
                        disabled={adminActionLoading}
                        value={selectedUserDetail.city || selectedUserDetail.cityId || ''}
                        onChange={(e) => handleUpdateUserCity(selectedUserDetail.id, e.target.value)}
                        className="bg-black/50 border border-white/20 rounded-lg px-2 py-1.5 text-xs text-white outline-none w-full appearance-none"
                      >
                        <option value="">N/A (Ninguna)</option>
                        {cities.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mt-8">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 border-b border-white/10 pb-2">Acciones de Moderación</p>
                  
                  <button 
                    onClick={async () => {
                      if (!user) return;
                      const { getOrCreateChat } = await import('@/hooks/useChat');
                      const chatId = await getOrCreateChat(user.uid, selectedUserDetail.id);
                      router.push(`/${selectedUserDetail.city || 'madrid'}/chat/detail?id=${chatId}`);
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-3 rounded-xl text-sm font-bold transition-colors"
                  >
                    <span className="material-icons text-sm">chat</span> Enviar Mensaje Directo
                  </button>

                  <button 
                    disabled={adminActionLoading || selectedUserDetail.role === 'rrpp'}
                    onClick={() => handleFastTrackRRPP(selectedUserDetail.id)}
                    className="w-full flex items-center justify-center gap-2 bg-fuchsia-900/20 hover:bg-fuchsia-900/40 text-fuchsia-400 border border-fuchsia-500/20 px-4 py-3 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                  >
                    <span className="material-icons text-sm">assignment_ind</span> {selectedUserDetail.role === 'rrpp' ? 'Ya es RRPP' : 'Convertir a RRPP'}
                  </button>

                  <button 
                    disabled={adminActionLoading || selectedUserDetail.banned}
                    onClick={() => handleAdminBanUser(selectedUserDetail.id)}
                    className="w-full flex items-center justify-center gap-2 bg-orange-900/20 hover:bg-orange-900/40 text-orange-400 border border-orange-500/20 px-4 py-3 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                  >
                    <span className="material-icons text-sm">block</span> {selectedUserDetail.banned ? 'Usuario ya Baneado' : 'Banear Usuario'}
                  </button>

                  <button 
                    disabled={adminActionLoading}
                    onClick={() => handleAdminDeleteUser(selectedUserDetail.id)}
                    className="w-full flex items-center justify-center gap-2 bg-red-900/20 hover:bg-red-900/50 text-red-400 border border-red-500/30 px-4 py-3 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                  >
                    <span className="material-icons text-sm">delete_forever</span> Eliminar Cuenta Definitivamente
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {activeTab === 'roles' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <section className="bg-white/5 border border-white/10 p-6 rounded-3xl space-y-6">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-300">Asignar Rol por Email</h2>

            <div className="flex gap-2">
              <input
                placeholder="Email del usuario..."
                type="email"
                value={roleSearchEmail}
                onChange={e => setRoleSearchEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleRoleSearch()}
                className="flex-1 bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-fuchsia-500 outline-none"
              />
              <button onClick={handleRoleSearch} disabled={roleSearching} className="bg-fuchsia-600 px-5 py-3 rounded-xl text-sm font-bold hover:bg-fuchsia-500 transition-colors disabled:opacity-50">
                {roleSearching ? '...' : 'Buscar'}
              </button>
            </div>

            {roleSearchResult && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <div className="bg-black/30 border border-white/10 p-4 rounded-2xl">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-fuchsia-500/20 flex items-center justify-center">
                      <span className="material-icons text-fuchsia-400">person</span>
                    </div>
                    <div>
                      <p className="font-bold text-lg">{roleSearchResult.nick || 'Sin nick'}</p>
                      <p className="text-xs text-slate-400">{roleSearchResult.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500">Rol actual:</span>
                    <span className={`px-2 py-1 rounded-lg font-bold uppercase tracking-wider ${
                      roleSearchResult.role && roleSearchResult.role !== 'user'
                        ? 'bg-fuchsia-500/20 text-fuchsia-400'
                        : 'bg-white/5 text-slate-500'
                    }`}>
                      {roleSearchResult.role || 'usuario'}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500 block">Nuevo rol</label>
                  <div className="grid grid-cols-1 gap-2">
                    {ROLE_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setSelectedRole(opt.value)}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                          selectedRole === opt.value
                            ? 'bg-fuchsia-500/10 border-fuchsia-500/50'
                            : 'bg-white/5 border-white/5 hover:border-white/20'
                        }`}
                      >
                        <span className={`material-icons ${opt.color}`}>{opt.icon}</span>
                        <div>
                          <p className="font-bold text-sm">{opt.label}</p>
                          <p className="text-[10px] text-slate-500">Redirige a {opt.redirect}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {selectedRole === 'cityAdmin' && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 block">Ciudad asignada</label>
                    <select
                      value={roleCityId}
                      onChange={e => setRoleCityId(e.target.value)}
                      className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-green-500 outline-none"
                    >
                      <option value="">Selecciona ciudad...</option>
                      {cities.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.id})</option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedRole === 'venue' && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 block">Local asignado</label>
                    <select
                      value={roleVenueId}
                      onChange={e => setRoleVenueId(e.target.value)}
                      className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none"
                    >
                      <option value="">Selecciona local...</option>
                      {venues.map(v => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedRole === 'ambassador' && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 block">Ciudades captadas por este Ambassador</label>
                    <p className="text-[10px] text-slate-500">Selecciona las ciudades donde captó al City Manager. El ambassador cobrará el 25% de la actividad de esas ciudades.</p>
                    <div className="max-h-48 overflow-y-auto space-y-1 no-scrollbar">
                      {cities.map(c => (
                        <label key={c.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={ambassadorCities.includes(c.id)}
                            onChange={e => {
                              if (e.target.checked) setAmbassadorCities(prev => [...prev, c.id]);
                              else setAmbassadorCities(prev => prev.filter(id => id !== c.id));
                            }}
                            className="accent-yellow-400"
                          />
                          <span className="text-sm">{c.emoji || ''} {c.name}</span>
                          {c.ambassadorId && <span className="text-[9px] text-yellow-400 ml-auto">Ya asignado</span>}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={handleAssignRole}
                  disabled={assigningRole || !selectedRole}
                  className="w-full bg-white hover:bg-slate-200 text-black font-black py-3 rounded-xl transition-all uppercase tracking-widest text-xs disabled:opacity-50"
                >
                  {assigningRole ? 'Asignando...' : `Asignar rol "${selectedRole}"`}
                </button>
              </motion.div>
            )}
          </section>

          <section className="bg-white/5 border border-white/10 p-6 rounded-3xl space-y-4 h-[70vh] flex flex-col">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-300">Usuarios con Rol Asignado ({recentAssignments.length})</h2>
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 no-scrollbar">
              {recentAssignments.length === 0 && <p className="text-sm text-slate-500">No hay usuarios con roles especiales.</p>}
              {recentAssignments.map(u => {
                const roleInfo = ROLE_OPTIONS.find(r => r.value === u.role);
                return (
                  <div key={u.id} className="bg-black/30 border border-white/5 p-4 rounded-2xl">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <span className={`material-icons ${roleInfo?.color || 'text-slate-400'}`}>{roleInfo?.icon || 'person'}</span>
                        <div>
                          <p className="font-bold text-sm">{u.nick || 'Sin nick'}</p>
                          <p className="text-[10px] text-slate-400">{u.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${roleInfo?.color || 'text-slate-400'} bg-white/5`}>
                          {roleInfo?.label || u.role}
                        </span>
                        <button
                          onClick={() => handleRevokeRole(u.id, u.email || u.nick)}
                          className="bg-red-900/30 text-red-400 px-2 py-1 rounded-lg text-[10px] font-bold hover:bg-red-900/60 transition-colors"
                        >
                          Revocar
                        </button>
                      </div>
                    </div>
                    {u.cityId && <p className="text-[10px] text-green-400 mt-1 ml-9">Ciudad: {u.cityId}</p>}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {activeTab === 'ciudades' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-8">
            {/* ALERTA CIUDADES CALIENTES (Franchise Trigger) */}
            {cities.filter(c => c.readyForFranchise).length > 0 && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-gradient-to-r from-red-600 to-orange-500 rounded-3xl p-6 shadow-2xl border-2 border-red-400/50">
                <div className="flex items-start gap-4">
                  <span className="text-4xl">🚨</span>
                  <div>
                    <h2 className="text-xl font-black text-white tracking-tight leading-none mb-1">¡Territorios Listos para Venta!</h2>
                    <p className="text-sm text-red-100/90 font-medium leading-tight mb-4">Estas plazas orgánicas superan los 2 locales. Es momento de contactar promotores y vender el Canon de City Manager (5.000€).</p>
                    <div className="space-y-2">
                      {cities.filter(c => c.readyForFranchise).map(c => (
                        <div key={c.id} className="flex justify-between items-center bg-black/20 rounded-xl px-4 py-2 border border-black/10">
                          <span className="font-bold text-white capitalize">{c.slug || c.id}</span>
                          <span className="text-xs font-black bg-white text-red-600 px-2 py-1 rounded-lg">{c.activeVenuesCount || 2} locales</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ALERTA SOLICITUDES PARTNERS */}
            {applications.length > 0 && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-slate-900 border-2 border-fuchsia-500/50 rounded-3xl p-6 shadow-2xl">
                <div className="flex items-start gap-4">
                  <span className="text-4xl">💼</span>
                  <div className="w-full">
                    <h2 className="text-xl font-black text-white tracking-tight leading-none mb-1">Nuevas Solicitudes de City Manager</h2>
                    <p className="text-sm text-slate-400 mb-4">Revisa y contacta a los candidatos para asignarles su plaza.</p>
                    <div className="space-y-3">
                      {applications.map(app => (
                        <div key={app.id} className="bg-black/30 rounded-xl p-4 border border-white/10">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-bold text-white text-lg">{app.name}</p>
                              <p className="text-xs text-fuchsia-400 font-bold uppercase">{app.cityId === 'other' ? 'Otra Ciudad' : app.cityId}</p>
                            </div>
                            <span className="px-2 py-1 bg-yellow-500/20 text-yellow-500 rounded-md text-xs font-bold uppercase">Pendiente</span>
                          </div>
                          <p className="text-sm text-slate-300 mb-1">📞 {app.phone} | ✉️ {app.email}</p>
                          <p className="text-xs text-slate-500 italic border-l-2 border-fuchsia-500/30 pl-2 mt-2">{app.experience}</p>
                          
                          <div className="mt-4 flex gap-2">
                            <button 
                              onClick={async () => {
                                if(confirm('¿Marcar como contactado/aprobado? Recuerda crear luego la plaza y asignarle el ID.')) {
                                  await updateDoc(doc(db, 'partner_applications', app.id), { status: 'approved' });
                                }
                              }} 
                              className="px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-500 rounded-lg text-xs font-bold uppercase transition-colors"
                            >
                              Marcar Revisada
                            </button>
                            <a href={`https://wa.me/${app.phone.replace(/\D/g, '')}?text=Hola%20${app.name},%20te%20escribo%20desde%20Blow%20Nights...`} target="_blank" rel="noreferrer" className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-xs font-bold uppercase transition-colors flex items-center gap-1">
                              WhatsApp
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

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
          </div>

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
                    <div className="flex gap-2">
                      <button onClick={() => setAssigningVenueId(assigningVenueId === v.id ? null : v.id)} className="bg-white/10 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-white/20">
                        Asignar
                      </button>
                      <button onClick={() => handleDeleteVenue(v.id, v.name)} className="bg-red-900/50 text-red-400 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-900 transition-colors">
                        Borrar
                      </button>
                    </div>
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

      {activeTab === 'eventos' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Eventos Independientes</h2>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/50">
                <tr>
                  <th className="p-4 font-bold text-slate-400">Evento</th>
                  <th className="p-4 font-bold text-slate-400">Organizador</th>
                  <th className="p-4 font-bold text-slate-400">Fecha</th>
                  <th className="p-4 font-bold text-slate-400">Tickets</th>
                  <th className="p-4 font-bold text-slate-400">Estado</th>
                  <th className="p-4 font-bold text-slate-400">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {events.map(e => {
                  const owner = allUsers.find(u => u.uid === e.organizerId);
                  return (
                    <tr key={e.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-4 font-bold">{e.title}</td>
                      <td className="p-4">{owner?.email || e.organizerId}</td>
                      <td className="p-4">{e.start_date?.toDate?.()?.toLocaleDateString() || ''}</td>
                      <td className="p-4">{e.stats?.total_sold || 0}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${e.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-slate-800 text-slate-400'}`}>
                          {e.status || 'active'}
                        </span>
                      </td>
                      <td className="p-4">
                        <button onClick={() => {
                          if (confirm('¿Borrar evento?')) deleteDoc(doc(db, 'events', e.id)).then(() => setEvents(events.filter(evt => evt.id !== e.id)));
                        }} className="text-red-400 hover:text-red-300">Borrar</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'partners' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <section className="bg-white/5 border border-white/10 p-6 rounded-3xl space-y-4">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-300">Dar de Alta Partner (RRPP)</h2>
            <div className="space-y-3">
              <div className="flex gap-2">
                <input 
                  placeholder="Buscar por email o nick exacto..." 
                  value={partnerSearch} 
                  onChange={e => setPartnerSearch(e.target.value)} 
                  className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-3 text-sm focus:border-fuchsia-500 outline-none" 
                />
                <button onClick={handleSearchNewPartner} disabled={searchingPartner} className="bg-fuchsia-600 px-4 py-3 rounded-lg text-sm font-bold hover:bg-fuchsia-500 transition-colors">
                  Buscar
                </button>
              </div>
              
              {partnerSearchResults.length > 0 && (
                <div className="mt-4 space-y-2">
                  {partnerSearchResults.map(u => (
                    <div key={u.id} className="flex justify-between items-center bg-white/10 p-3 rounded-xl">
                      <div>
                        <p className="font-bold">{u.nick || 'Sin Nick'}</p>
                        <p className="text-xs text-slate-400">{u.email}</p>
                      </div>
                      {!u.isAssociatePartner ? (
                        <button onClick={() => handleAssignAssociatePartner(u)} className="bg-green-600 px-3 py-2 rounded-lg text-xs font-bold hover:bg-green-500">Asignar</button>
                      ) : (
                        <span className="text-xs text-fuchsia-400 font-bold">Ya es Partner</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="bg-white/5 border border-white/10 p-6 rounded-3xl space-y-4 h-[60vh] flex flex-col">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-300">Partners Activos</h2>
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 no-scrollbar">
              {partners.length === 0 && <p className="text-sm text-slate-500">No hay partners asociados activos.</p>}
              {partners.map(p => (
                <div key={p.id} className="bg-black/30 border border-white/5 p-4 rounded-2xl flex justify-between items-center">
                  <div>
                    <h3 className="font-bold">{p.nick || 'Sin Nick'}</h3>
                    <p className="text-[11px] text-slate-400">{p.email || 'Sin email'}</p>
                  </div>
                  <button onClick={() => handleRemoveAssociatePartner(p.id, p.nick || p.email)} className="bg-red-900/50 text-red-400 px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-red-900 transition-colors uppercase">
                    Revocar
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {activeTab === 'rrpps' && (
        <div className="space-y-8">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-slate-900 border-2 border-fuchsia-500/50 rounded-3xl p-6 shadow-2xl">
              <div className="flex items-start gap-4">
                <span className="text-4xl">📋</span>
                <div className="w-full">
                  <h2 className="text-xl font-black text-white tracking-tight leading-none mb-1">Solicitudes RRPP Pendientes ({rrppApplications.length})</h2>
                  <p className="text-sm text-slate-400 mb-4">Revisa y aprueba o rechaza las solicitudes de RRPP independientes.</p>
                  <div className="space-y-3">
                    {rrppApplications.length === 0 && <p className="text-sm text-slate-500">No hay solicitudes RRPP pendientes.</p>}
                    {rrppApplications.map(app => (
                      <div key={app.id} className="bg-black/30 rounded-xl p-4 border border-white/10">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-bold text-white text-lg">{app.nick || 'Sin nick'}</p>
                            <p className="text-xs text-slate-400">{app.email}</p>
                          </div>
                          <span className="px-2 py-1 bg-yellow-500/20 text-yellow-500 rounded-md text-xs font-bold uppercase">Pendiente</span>
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
                  </div>
                </div>
              </div>
            </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <section className="md:col-span-1 bg-white/5 border border-white/10 p-6 rounded-3xl space-y-4 h-fit">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-300">Alta de RRPP Global</h2>
            <p className="text-xs text-slate-400 mb-4">Crea un enlace de RRPP y asígnalo a cualquier local.</p>
            <div className="space-y-3">
              <input 
                placeholder="Nombre del RRPP..." 
                value={newPromoterName} 
                onChange={e => setNewPromoterName(e.target.value)} 
                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-3 text-sm focus:border-fuchsia-500 outline-none" 
              />
              <select
                value={newPromoterVenueId}
                onChange={e => setNewPromoterVenueId(e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-3 text-sm focus:border-fuchsia-500 outline-none"
              >
                <option value="">Selecciona Local...</option>
                {venues.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
              <input 
                placeholder="ID del Evento (ej: 2026-08-20)..." 
                value={newPromoterEventId} 
                onChange={e => setNewPromoterEventId(e.target.value)} 
                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-3 text-sm focus:border-fuchsia-500 outline-none" 
              />
              <button 
                onClick={handleCreatePromoter} 
                disabled={savingPromoter} 
                className="w-full bg-fuchsia-600 px-4 py-3 rounded-lg text-sm font-bold hover:bg-fuchsia-500 transition-colors disabled:opacity-50"
              >
                {savingPromoter ? 'Generando...' : 'Generar Enlace RRPP'}
              </button>
            </div>
          </section>

          <section className="md:col-span-2 bg-white/5 border border-white/10 p-6 rounded-3xl space-y-4 flex flex-col h-[75vh]">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-300">Auditoría de Promotores ({promoters.length})</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 no-scrollbar">
              {promoters.length === 0 && <p className="text-sm text-slate-500">No hay promotores en la plataforma.</p>}
              
              {promoters.map(p => (
                <div key={p.id} className="bg-black/30 border border-white/5 p-4 rounded-2xl flex justify-between items-center">
                  <div>
                    <h3 className="font-bold flex items-center gap-2">
                      {p.name}
                      <span className="text-[9px] bg-slate-800 px-2 py-0.5 rounded font-mono text-slate-300">{p.code}</span>
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest">
                      Local: <span className="text-white">{p.venueId}</span> | Evento: <span className="text-white">{p.eventId}</span>
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${p.is_closed ? 'bg-red-900/50 text-red-400' : 'bg-green-900/50 text-green-400'}`}>
                        {p.is_closed ? 'Listas Cerradas' : 'Listas Abiertas'}
                      </span>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${p.liquidated_by_venue ? 'bg-blue-900/50 text-blue-400' : 'bg-slate-800 text-slate-400'}`}>
                        {p.liquidated_by_venue ? 'Liquidado' : 'Pendiente Pago'}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button onClick={() => copyPromoterLink(p.code)} className="bg-white/10 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-white/20 transition-colors uppercase">
                      Copiar Enlace
                    </button>
                    <button onClick={() => handleTogglePromoterStatus(p)} className="bg-white/5 border border-white/10 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-white/10 transition-colors uppercase">
                      {p.is_closed ? 'Reabrir Listas' : 'Bloquear Listas'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
        </div>
      )}

      {activeTab === 'organizadores' && (
        <div className="space-y-8">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-slate-900 border-2 border-indigo-500/50 rounded-3xl p-6 shadow-2xl">
              <div className="flex items-start gap-4">
                <span className="text-4xl">🎪</span>
                <div className="w-full">
                  <h2 className="text-xl font-black text-white tracking-tight leading-none mb-1">Solicitudes de Organizadores Pendientes ({organizerApps.length})</h2>
                  <p className="text-sm text-slate-400 mb-4">Revisa y aprueba o rechaza las solicitudes para organizar eventos independientes.</p>
                  <div className="space-y-3">
                    {organizerApps.length === 0 && <p className="text-sm text-slate-500">No hay solicitudes de organizadores pendientes.</p>}
                    {organizerApps.map(app => (
                      <div key={app.id} className="bg-black/30 rounded-xl p-4 border border-white/10">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-bold text-white text-lg">{app.nick || 'Sin nick'}</p>
                            <p className="text-xs text-slate-400">{app.email}</p>
                          </div>
                          <span className="px-2 py-1 bg-yellow-500/20 text-yellow-500 rounded-md text-xs font-bold uppercase">Pendiente</span>
                        </div>
                        <p className="text-sm text-slate-300 mb-1">📞 {app.phone} | 📍 {app.city}</p>
                        <div className="mt-4 flex gap-2">
                          <button
                            onClick={() => handleOrganizerApplication(app.id, 'approve')}
                            disabled={processingOrganizer === app.id}
                            className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-xs font-bold uppercase transition-colors disabled:opacity-50"
                          >
                            {processingOrganizer === app.id ? '...' : 'Aprobar'}
                          </button>
                          <button
                            onClick={() => handleOrganizerApplication(app.id, 'reject')}
                            disabled={processingOrganizer === app.id}
                            className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-xs font-bold uppercase transition-colors disabled:opacity-50"
                          >
                            Rechazar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
        </div>
      )}
    </div>
  );
}
