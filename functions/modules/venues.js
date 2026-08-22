const { onDocumentCreated, onDocumentWritten } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { geohashForLocation, distanceBetween } = require("geofire-common");
const { admin, db } = require("../lib/init");

exports.updateGeohash = onDocumentWritten("locations/{userId}", async (event) => {
  const data = event.data?.after?.data();
  if (!data || !data.lat || !data.lng) return null;

  const geohash = geohashForLocation([data.lat, data.lng]);
  if (data.geohash === geohash) return null;

  return event.data.after.ref.update({
    geohash: geohash,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
});

exports.cleanupAvailability = onSchedule("every 5 minutes", async (event) => {
  const now = admin.firestore.Timestamp.now();
  const expiredUsers = await db.collection("users")
    .where("disponibleHasta", "<", now)
    .get();

  const chunks = [];
  for (let i = 0; i < expiredUsers.docs.length; i += 500) {
    chunks.push(expiredUsers.docs.slice(i, i + 500));
  }
  await Promise.all(chunks.map(chunk => {
    const batch = db.batch();
    chunk.forEach(doc => batch.update(doc.ref, { disponibleHasta: null }));
    return batch.commit();
  }));
});

exports.cleanupExpiredCheckins = onSchedule({
  schedule: "0 14 * * *",
  timeZone: "Europe/Madrid",
}, async () => {
  const now = admin.firestore.Timestamp.now();
  const expired = await db.collection("checkins")
    .where("expiresAt", "<", now)
    .get();

  if (expired.empty) return;

  const venueDecrements = {};
  const batchSize = 500;
  let ops = [];
  for (const d of expired.docs) {
    const venueId = d.data().venueId;
    if (venueId) venueDecrements[venueId] = (venueDecrements[venueId] || 0) + 1;
    ops.push(d.ref.delete());
    if (ops.length >= batchSize) {
      await Promise.all(ops);
      ops = [];
    }
  }
  if (ops.length) await Promise.all(ops);

  for (const [venueId, count] of Object.entries(venueDecrements)) {
    const venueRef = db.collection("venues").doc(venueId);
    await venueRef.update({
      currentCount: admin.firestore.FieldValue.increment(-count)
    }).catch(() => {});

    const venueSnap = await venueRef.get().catch(() => null);
    if (venueSnap?.exists) {
      const v = venueSnap.data();
      await db.collection("live_sense").doc(venueId).set({
        current_count: Math.max(0, (v.currentCount || 0)),
        venue_name: v.name || "",
        venue_type: v.type || "",
        cityId: v.cityId || "",
        capacity: v.capacity || null,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
        hourly_entries: {},
      }, { merge: true });
    }
  }
  console.log(`Cleaned up ${expired.size} expired checkins.`);
});

exports.onCheckinCreated = onDocumentCreated("checkins/{checkinId}", async (event) => {
  const data = event.data?.data();
  if (!data?.venueId) return null;
  const venueRef = db.collection("venues").doc(data.venueId);
  const venueSnap = await venueRef.get();
  if (!venueSnap.exists) return null;
  const venueData = venueSnap.data();
  const newCount = (venueData.currentCount || 0) + 1;

  await venueRef.update({
    currentCount: admin.firestore.FieldValue.increment(1),
  });

  const hour = new Date().getHours();
  await db.collection("live_sense").doc(data.venueId).set({
    current_count: newCount,
    venue_name: venueData.name || "",
    venue_type: venueData.type || "",
    cityId: venueData.cityId || data.cityId || "",
    capacity: venueData.capacity || null,
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
    [`hourly_entries.h${hour}`]: admin.firestore.FieldValue.increment(1),
  }, { merge: true });
});

exports.checkFranchiseTrigger = onDocumentWritten("venues/{venueId}", async (event) => {
  const after = event.data.after;
  if (!after.exists) return;

  const before = event.data.before;
  const data = after.data();
  if (!data.isActive || !data.cityId) return;

  if (before.exists) {
    const prev = before.data();
    if (prev.isActive === data.isActive && prev.cityId === data.cityId) return;
  }

  const cityId = data.cityId;

  const venuesSnap = await db.collection("venues")
    .where("cityId", "==", cityId)
    .where("isActive", "==", true)
    .count()
    .get();

  const activeCount = venuesSnap.data().count;

  if (activeCount >= 2) {
    const cityRef = db.collection("cities").doc(cityId);
    const citySnap = await cityRef.get();

    let hasManager = false;
    if (citySnap.exists) {
      const cData = citySnap.data();
      if (cData.partnerId || cData.managerId) {
        hasManager = true;
      }
    }

    if (!hasManager) {
      await cityRef.set({
        readyForFranchise: true,
        activeVenuesCount: activeCount,
        slug: cityId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      console.log(`Franchise trigger activated for ${cityId} with ${activeCount} venues!`);
    } else if (citySnap.exists) {
      await cityRef.update({
        activeVenuesCount: activeCount,
        readyForFranchise: false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
  }
});

exports.createRRPPParty = onCall(async (request) => {
  const { auth, data } = request;
  if (!auth) throw new HttpsError('unauthenticated', 'Login requerido');

  const { lat, lng, eventName, eventDate, eventTime, ticketType, address, flyerUrl } = data;
  let { venueName } = data;

  if (!lat || !lng || !eventName || !venueName || !address) {
    throw new HttpsError('invalid-argument', 'Lat, lng, eventName, venueName y address son obligatorios');
  }

  const callerUid = auth.uid;

  // 1. Obtener todos los venues para comprobar distancia
  const venuesSnap = await db.collection('venues').get();
  
  let collisionVenue = null;
  for (const doc of venuesSnap.docs) {
    const vData = doc.data();
    if (vData.location && vData.location.latitude && vData.location.longitude) {
      const distance = distanceBetween(
        [lat, lng],
        [vData.location.latitude, vData.location.longitude]
      );
      // Si la distancia es menor a 0.05 km (50 metros) y es un local verificado/existente
      if (distance < 0.05 && vData.isClaimed !== false) {
        collisionVenue = vData;
        break;
      }
    }
  }

  // 2. Si hay colisión, aplicar regla Anti-Piratería (Baneo Automático)
  if (collisionVenue) {
    console.warn(`[ANTI-HIJACK] RRPP ${callerUid} intentó crear fiesta en un local existente (${collisionVenue.name}). Baneando...`);
    
    // Marcar en Firestore como baneado
    await db.collection('users').doc(callerUid).update({
      isBanned: true,
      bannedAt: admin.firestore.FieldValue.serverTimestamp(),
      bannedBy: 'system',
      bannedReason: 'Intento de creación de fiesta en local verificado (Anti-Piratería)'
    });

    // Desactivar cuenta en Auth
    await admin.auth().updateUser(callerUid, { disabled: true });
    await admin.auth().revokeRefreshTokens(callerUid);

    throw new HttpsError('permission-denied', 'Estás intentando crear un evento en un local que ya tiene venta oficial. Tu cuenta ha sido bloqueada.');
  }

  // 3. Si no hay colisión, proceder a crear el venue (no reclamado), el evento y el promotor
  const callerDoc = await db.collection('users').doc(callerUid).get();
  const callerCity = callerDoc.exists ? (callerDoc.data().cityId || callerDoc.data().city || 'other') : 'other';

  const batch = db.batch();

  // Create unverified venue
  const venueRef = db.collection('venues').doc();
  const venueId = venueRef.id;

  batch.set(venueRef, {
    name: venueName,
    address,
    type: 'club',
    isActive: true,
    isClaimed: false,
    cityId: callerCity,
    ownerId: 'unclaimed',
    currentCount: 0,
    location: { latitude: lat, longitude: lng },
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  // Create Event
  const eventId = new Date().toISOString().split('T')[0] + '-' + Math.random().toString(36).substr(2, 5);
  const scannerToken = 'DOOR-' + Math.random().toString(36).substr(2, 6).toUpperCase();
  const eventRef = db.collection(`venues/${venueId}/events`).doc(eventId);
  
  batch.set(eventRef, {
    title: eventName,
    date: eventDate || new Date().toISOString().split('T')[0],
    time: eventTime || null,
    ticketType: ticketType || 'general',
    scanner_token: scannerToken,
    flyerUrl: flyerUrl || null,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  // Create Promoter Token
  const userDoc = await db.collection('users').doc(callerUid).get();
  const promoterName = userDoc.exists ? userDoc.data().nick : 'RRPP';
  
  const token = Math.random().toString(36).substr(2, 6).toUpperCase();
  const promoterRef = db.collection(`venues/${venueId}/events/${eventId}/promoters`).doc();
  
  batch.set(promoterRef, {
    userId: callerUid,
    name: promoterName,
    code: token,
    access_token: token,
    is_closed: false,
    liquidated_by_rrpp: false,
    liquidated_by_venue: false
  });

  await batch.commit();

  return {
    success: true,
    venueId,
    eventId,
    token,
    scannerToken
  };
});

exports.deleteRRPPParty = onCall(async (request) => {
  const { auth, data } = request;
  if (!auth) throw new HttpsError('unauthenticated', 'Login requerido');

  const { promoterToken } = data;
  if (!promoterToken) throw new HttpsError('invalid-argument', 'Token requerido');

  // Find the promoter doc
  const promotersQuery = await db.collectionGroup('promoters').where('access_token', '==', promoterToken).limit(1).get();
  if (promotersQuery.empty) throw new HttpsError('not-found', 'Fiesta no encontrada');

  const promoterDoc = promotersQuery.docs[0];
  if (promoterDoc.data().userId !== auth.uid) {
    throw new HttpsError('permission-denied', 'No eres el dueño de esta fiesta');
  }

  const pathParts = promoterDoc.ref.path.split('/');
  
  let eventIdActual;
  let isIndependent = false;

  if (pathParts.length >= 6 && pathParts[0] === 'venues') {
    eventIdActual = pathParts[3];
  } else if (pathParts.length >= 4 && pathParts[0] === 'events') {
    eventIdActual = pathParts[1];
    isIndependent = true;
  } else {
    throw new HttpsError('internal', 'Ruta de promotor no reconocida');
  }

  // Check sales
  const ticketsQuery = await db.collection("tickets")
    .where("eventId", "==", eventIdActual)
    .where("rrpp_id", "==", promoterDoc.id)
    .get();

  let sold = 0;
  ticketsQuery.forEach(doc => {
    if (doc.data().status === "valid" || doc.data().status === "used") sold++;
  });

  if (sold > 0) {
    throw new HttpsError('failed-precondition', 'No se puede borrar una fiesta con entradas vendidas');
  }

  // Delete the promoter doc (and event if it's the only one, but for simplicity just delete promoter doc)
  await promoterDoc.ref.delete();
  
  return { success: true };
});
